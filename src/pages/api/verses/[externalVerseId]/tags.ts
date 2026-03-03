import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

type ModifyTagPayload = {
  tagId?: string;
  tagSlug?: string;
  deleteTagIfUnused?: boolean;
};

type ReplaceVerseTagsPayload = {
  tagIds?: string[];
  tagSlugs?: string[];
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

  if (req.method === "PUT") {
    return handlePut(req, res, externalVerseId);
  }

  res.setHeader("Allow", "GET, POST, DELETE, PUT");
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

async function resolveTagIdsForReplace(payload: ReplaceVerseTagsPayload): Promise<{
  tagIds: string[];
  missingTagIds: string[];
  missingTagSlugs: string[];
}> {
  const tagIdsFromBody = Array.from(new Set(normalizeStringArray(payload.tagIds)));
  const tagSlugsFromBody = Array.from(new Set(normalizeStringArray(payload.tagSlugs)));

  const resolvedTagIds = new Set<string>();
  let missingTagIds: string[] = [];
  let missingTagSlugs: string[] = [];

  if (tagIdsFromBody.length > 0) {
    const byIds = await prisma.tag.findMany({
      where: { id: { in: tagIdsFromBody } },
      select: { id: true },
    });
    byIds.forEach((tag) => resolvedTagIds.add(tag.id));
    const existingIds = new Set(byIds.map((tag) => tag.id));
    missingTagIds = tagIdsFromBody.filter((id) => !existingIds.has(id));
  }

  if (tagSlugsFromBody.length > 0) {
    const bySlugs = await prisma.tag.findMany({
      where: { slug: { in: tagSlugsFromBody } },
      select: { id: true, slug: true },
    });
    bySlugs.forEach((tag) => resolvedTagIds.add(tag.id));
    const existingSlugs = new Set(bySlugs.map((tag) => tag.slug));
    missingTagSlugs = tagSlugsFromBody.filter((slug) => !existingSlugs.has(slug));
  }

  return {
    tagIds: Array.from(resolvedTagIds),
    missingTagIds,
    missingTagSlugs,
  };
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, externalVerseId: string) {
  // Полностью заменяет набор тегов стиха.
  try {
    const body = (req.body ?? {}) as ReplaceVerseTagsPayload;
    const verseId = await resolveVerseId(externalVerseId);
    if (!verseId) {
      return res.status(404).json({ error: "Verse not found" });
    }

    const { tagIds, missingTagIds, missingTagSlugs } = await resolveTagIdsForReplace(body);
    if (missingTagIds.length > 0 || missingTagSlugs.length > 0) {
      return res.status(400).json({
        error: "Some tags were not found",
        missingTagIds,
        missingTagSlugs,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.verseTag.deleteMany({
        where: { verseId },
      });

      if (tagIds.length > 0) {
        await tx.verseTag.createMany({
          data: tagIds.map((tagId) => ({
            verseId,
            tagId,
          })),
          skipDuplicates: true,
        });
      }
    });

    const tags = await prisma.tag.findMany({
      where: {
        verses: {
          some: { verseId },
        },
      },
      orderBy: { title: "asc" },
    });

    return res.status(200).json({
      ok: true,
      tags,
    });
  } catch (error) {
    console.error("Error replacing verse tags:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
