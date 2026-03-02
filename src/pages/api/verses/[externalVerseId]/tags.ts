import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

type ModifyTagPayload = {
  tagId?: string;
  tagSlug?: string;
  deleteTagIfUnused?: boolean;
};

async function resolveTagId(payload: ModifyTagPayload) {
  if (payload.tagId) {
    return payload.tagId;
  }

  if (payload.tagSlug) {
    const tag = await prisma.tag.findUnique({
      where: { slug: payload.tagSlug },
      select: { id: true },
    });
    return tag?.id;
  }

  return undefined;
}

// VerseTag now references Verse.id (verseId FK), so we resolve externalVerseId → Verse first
async function resolveVerseId(externalVerseId: string): Promise<string | null> {
  const verse = await prisma.verse.findUnique({
    where: { externalVerseId },
    select: { id: true },
  });
  return verse?.id ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { externalVerseId } = req.query;
  if (!externalVerseId || Array.isArray(externalVerseId)) {
    return res.status(400).json({ error: "externalVerseId is required" });
  }

  // Управляет привязками тегов к стихам (список, добавление, удаление).
  if (req.method === "GET") {
    return handleGet(res, externalVerseId);
  }

  if (req.method === "POST") {
    return handlePost(req, res, externalVerseId);
  }

  if (req.method === "DELETE") {
    return handleDelete(req, res, externalVerseId);
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleGet(res: NextApiResponse, externalVerseId: string) {
  // Возвращает список тегов, связанных с указанным стихом.
  try {
    const tags = await prisma.tag.findMany({
      where: {
        verses: {
          some: {
            verse: { externalVerseId },
          },
        },
      },
      orderBy: { title: "asc" },
    });

    const collator = new Intl.Collator(["ru", "en"], {
      sensitivity: "base",
      numeric: true,
    });

    tags.sort((a, b) => collator.compare(a.title, b.title));

    return res.status(200).json(tags);
  } catch (error) {
    console.error("Error fetching verse tags:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, externalVerseId: string) {
  // Создаёт или подтверждает связь тега со стихом.
  try {
    const body = req.body as ModifyTagPayload;
    const tagId = await resolveTagId(body ?? {});

    if (!tagId) {
      return res.status(400).json({ error: "tagId or tagSlug is required" });
    }

    const verseId = await resolveVerseId(externalVerseId);
    if (!verseId) {
      return res.status(404).json({ error: "Verse not found" });
    }

    const link = await prisma.verseTag.upsert({
      where: {
        verseId_tagId: {
          verseId,
          tagId,
        },
      },
      update: {},
      create: {
        verseId,
        tagId,
      },
    });

    return res.status(201).json(link);
  } catch (error) {
    console.error("Error creating verse tag:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, externalVerseId: string) {
  // Удаляет привязку тега к стиху или удаляет сам тег, если это безопасно.
  try {
    const body = req.body as ModifyTagPayload;
    const tagId = await resolveTagId(body ?? {});

    if (!tagId) {
      return res.status(400).json({ error: "tagId or tagSlug is required" });
    }

    if (body?.deleteTagIfUnused) {
      const linksCount = await prisma.verseTag.count({
        where: { tagId },
      });

      if (linksCount > 0) {
        return res.status(409).json({
          error: "Tag is linked to one or more verses",
          linksCount,
        });
      }

      try {
        await prisma.tag.delete({
          where: { id: tagId },
        });
        return res.status(200).json({ ok: true, deletedTagId: tagId });
      } catch (deleteError) {
        const isNotFound =
          deleteError instanceof Error &&
          deleteError.message.includes("Record to delete does not exist");
        if (isNotFound) {
          return res.status(404).json({ error: "Tag not found" });
        }
        throw deleteError;
      }
    }

    const verseId = await resolveVerseId(externalVerseId);
    if (!verseId) {
      return res.status(404).json({ error: "Verse not found" });
    }

    await prisma.verseTag.delete({
      where: {
        verseId_tagId: {
          verseId,
          tagId,
        },
      },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error deleting verse tag:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
