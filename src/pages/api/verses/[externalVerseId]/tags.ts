import type { NextApiRequest, NextApiResponse } from "next";
import {
  attachTagToVerse,
  countVerseTagLinks,
  deleteTagById,
  findTagsByIds,
  findTagsBySlugs,
  getTagBySlug,
  getTagsForVerseExternalVerseId,
  getVerseByExternalVerseId,
  removeTagFromVerse,
  replaceVerseTags,
} from "@/modules/verses/infrastructure/verseRepository";
import {
  canonicalizeExternalVerseId,
  MAX_EXTERNAL_VERSE_RANGE_SIZE,
} from "@/shared/bible/externalVerseId";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

type ModifyTagPayload = {
  tagId?: string;
  tagSlug?: string;
  deleteTagIfUnused?: boolean;
};

type ReplaceVerseTagsPayload = {
  tagIds?: string[];
  tagSlugs?: string[];
};

const EXTERNAL_VERSE_ID_VALIDATION_ERROR =
  `externalVerseId must be in format "book-chapter-verse" or "book-chapter-verseStart-verseEnd" with range up to ${MAX_EXTERNAL_VERSE_RANGE_SIZE} verses`;

async function resolveTagId(payload: ModifyTagPayload) {
  if (payload.tagId) {
    return payload.tagId;
  }

  if (payload.tagSlug) {
    const tag = await getTagBySlug(payload.tagSlug);
    return tag?.id;
  }

  return undefined;
}

// VerseTag now references Verse.id (verseId FK), so we resolve externalVerseId → Verse first
async function resolveVerseId(externalVerseId: string): Promise<string | null> {
  const verse = await getVerseByExternalVerseId(externalVerseId);
  return verse?.id ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { externalVerseId } = req.query;
  if (!externalVerseId || Array.isArray(externalVerseId)) {
    return res.status(400).json({ error: "externalVerseId is required" });
  }
  const isGlobalTagManagement = externalVerseId === "__global__";
  const canonicalExternalVerseId = isGlobalTagManagement
    ? externalVerseId
    : canonicalizeExternalVerseId(externalVerseId);
  if (!canonicalExternalVerseId) {
    return res.status(400).json({ error: EXTERNAL_VERSE_ID_VALIDATION_ERROR });
  }

  // Управляет привязками тегов к стихам (список, добавление, удаление).
  if (req.method === "GET") {
    return handleGet(res, canonicalExternalVerseId);
  }

  if (req.method === "POST") {
    return handlePost(req, res, canonicalExternalVerseId);
  }

  if (req.method === "DELETE") {
    return handleDelete(req, res, canonicalExternalVerseId);
  }

  if (req.method === "PUT") {
    return handlePut(req, res, canonicalExternalVerseId);
  }

  res.setHeader("Allow", "GET, POST, DELETE, PUT");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleGet(res: NextApiResponse, externalVerseId: string) {
  // Возвращает список тегов, связанных с указанным стихом.
  try {
    const tags = await getTagsForVerseExternalVerseId(externalVerseId);

    const collator = new Intl.Collator(["ru", "en"], {
      sensitivity: "base",
      numeric: true,
    });

    tags.sort((a, b) => collator.compare(a.title, b.title));

    return res.status(200).json(tags);
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
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

    const link = await attachTagToVerse({ verseId, tagId });

    return res.status(201).json(link);
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
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
      const linksCount = await countVerseTagLinks(tagId);

      if (linksCount > 0) {
        return res.status(409).json({
          error: "Tag is linked to one or more verses",
          linksCount,
        });
      }

      const deleted = await deleteTagById(tagId);
      if (!deleted) {
        return res.status(404).json({ error: "Tag not found" });
      }

      return res.status(200).json({ ok: true, deletedTagId: tagId });
    }

    const verseId = await resolveVerseId(externalVerseId);
    if (!verseId) {
      return res.status(404).json({ error: "Verse not found" });
    }

    const removed = await removeTagFromVerse({ verseId, tagId });
    if (!removed) {
      throw new Error("Verse tag link not found");
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
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
    const byIds = await findTagsByIds(tagIdsFromBody);
    byIds.forEach((tag) => resolvedTagIds.add(tag.id));
    const existingIds = new Set(byIds.map((tag) => tag.id));
    missingTagIds = tagIdsFromBody.filter((id) => !existingIds.has(id));
  }

  if (tagSlugsFromBody.length > 0) {
    const bySlugs = await findTagsBySlugs(tagSlugsFromBody);
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

    await replaceVerseTags({ verseId, tagIds });
    const tags = await getTagsForVerseExternalVerseId(externalVerseId);

    return res.status(200).json({
      ok: true,
      tags,
    });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
