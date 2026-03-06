import type { NextApiRequest, NextApiResponse } from "next";
import { isAdminTelegramId } from "@/lib/admins";
import {
  deleteCatalogVerseByExternalVerseId,
  getVerseAdminSummary,
} from "@/modules/verses/infrastructure/verseRepository";
import {
  canonicalizeExternalVerseId,
  MAX_EXTERNAL_VERSE_RANGE_SIZE,
} from "@/shared/bible/externalVerseId";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

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
    const summary = await getVerseAdminSummary(canonicalExternalVerseId);
    if (!summary) {
      return res.status(404).json({ error: "Verse not found" });
    }
    return res.status(200).json(summary);
  }

  if (req.method === "DELETE") {
    try {
      const summary = await getVerseAdminSummary(canonicalExternalVerseId);
      if (!summary) {
        return res.status(404).json({ error: "Verse not found" });
      }

      if (!summary.canDelete) {
        return res.status(409).json({
          error: "Verse is linked to one or more users",
          userLinksCount: summary.userLinksCount,
        });
      }

      await deleteCatalogVerseByExternalVerseId(canonicalExternalVerseId);

      return res.status(200).json({ ok: true, deletedExternalVerseId: canonicalExternalVerseId });
    } catch (error) {
      return handleApiError(
        res,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method Not Allowed" });
}
