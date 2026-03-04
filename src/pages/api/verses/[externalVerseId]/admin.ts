import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { isAdminTelegramId } from "@/lib/admins";
import {
  canonicalizeExternalVerseId,
  MAX_EXTERNAL_VERSE_RANGE_SIZE,
} from "@/shared/bible/externalVerseId";

type VerseAdminSummary = {
  externalVerseId: string;
  userLinksCount: number;
  tagLinksCount: number;
  canDelete: boolean;
};

const EXTERNAL_VERSE_ID_VALIDATION_ERROR =
  `externalVerseId must be in format "book-chapter-verse" or "book-chapter-verseStart-verseEnd" with range up to ${MAX_EXTERNAL_VERSE_RANGE_SIZE} verses`;

function getSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function resolveRequesterTelegramId(req: NextApiRequest): string {
  const fromQuery = getSingleValue(req.query.telegramId);
  if (fromQuery) return fromQuery;

  const fromHeader = getSingleValue(req.headers["x-telegram-id"]);
  if (fromHeader) return fromHeader;

  return "";
}

async function getVerseSummary(externalVerseId: string): Promise<VerseAdminSummary | null> {
  const verse = await prisma.verse.findUnique({
    where: { externalVerseId },
    select: {
      externalVerseId: true,
      _count: {
        select: {
          userVerses: true,
          tags: true,
        },
      },
    },
  });

  if (!verse) return null;

  return {
    externalVerseId: verse.externalVerseId,
    userLinksCount: verse._count.userVerses,
    tagLinksCount: verse._count.tags,
    canDelete: verse._count.userVerses === 0,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { externalVerseId } = req.query;
  if (!externalVerseId || Array.isArray(externalVerseId)) {
    return res.status(400).json({ error: "externalVerseId is required" });
  }
  const canonicalExternalVerseId = canonicalizeExternalVerseId(externalVerseId);
  if (!canonicalExternalVerseId) {
    return res.status(400).json({ error: EXTERNAL_VERSE_ID_VALIDATION_ERROR });
  }

  const requesterTelegramId = resolveRequesterTelegramId(req);
  if (!isAdminTelegramId(requesterTelegramId)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (req.method === "GET") {
    const summary = await getVerseSummary(canonicalExternalVerseId);
    if (!summary) {
      return res.status(404).json({ error: "Verse not found" });
    }
    return res.status(200).json(summary);
  }

  if (req.method === "DELETE") {
    try {
      const summary = await getVerseSummary(canonicalExternalVerseId);
      if (!summary) {
        return res.status(404).json({ error: "Verse not found" });
      }

      if (!summary.canDelete) {
        return res.status(409).json({
          error: "Verse is linked to one or more users",
          userLinksCount: summary.userLinksCount,
        });
      }

      await prisma.$transaction(async (tx) => {
        const verse = await tx.verse.findUnique({
          where: { externalVerseId: canonicalExternalVerseId },
          select: { id: true },
        });
        if (!verse) return;

        await tx.verseTag.deleteMany({
          where: { verseId: verse.id },
        });

        await tx.verse.delete({
          where: { id: verse.id },
        });
      });

      return res.status(200).json({ ok: true, deletedExternalVerseId: canonicalExternalVerseId });
    } catch (error) {
      console.error("Error deleting verse from catalog:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method Not Allowed" });
}
