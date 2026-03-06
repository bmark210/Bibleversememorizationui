import type { NextApiRequest, NextApiResponse } from "next";
import {
  countVerseTagLinks,
  deleteTagById,
  findTagByTitle,
  updateTagTitle,
} from "@/modules/verses/infrastructure/verseRepository";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Tag ID is required" });
  }

  if (req.method === "DELETE") {
    return handleDelete(res, id);
  }

  if (req.method === "PATCH") {
    return handlePatch(req, res, id);
  }

  res.setHeader("Allow", "DELETE, PATCH");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleDelete(res: NextApiResponse, id: string) {
  try {
    const linksCount = await countVerseTagLinks(id);

    if (linksCount > 0) {
      return res.status(409).json({
        error: "Tag is linked to one or more verses",
        linksCount,
      });
    }

    const deleted = await deleteTagById(id);
    if (!deleted) {
      return res.status(404).json({ error: "Tag not found" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { title } = (req.body ?? {}) as { title?: string };
    const normalizedTitle = title?.trim();
    if (!normalizedTitle) {
      return res.status(400).json({ error: "title is required" });
    }

    const duplicate = await findTagByTitle(normalizedTitle);

    if (duplicate && duplicate.id !== id) {
      return res.status(409).json({ error: "Tag with this title already exists" });
    }

    const updated = await updateTagTitle({
      id,
      title: normalizedTitle,
    });
    return res.status(200).json(updated);
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
