import type { NextApiRequest, NextApiResponse } from "next";
import {
  createTag,
  getAllTags,
} from "@/modules/verses/infrastructure/verseRepository";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

type CreateTagPayload = {
  slug?: string;
  title?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Поддерживаем получение списка и создание тегов.
  if (req.method === "GET") {
    return handleGet(res);
  }

  if (req.method === "POST") {
    return handlePost(req, res);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleGet(res: NextApiResponse) {
  // Находится и возвращает список всех тегов, отсортированных по названию.
  try {
    const tags = await getAllTags();

    const collator = new Intl.Collator(["ru", "en"], {
      sensitivity: "base",
      numeric: true,
    });

    tags.sort((a, b) => collator.compare(a.title.trim(), b.title.trim()));

    return res.status(200).json(tags);
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  // Создаёт новый тег при наличии slug и title.
  try {
    const body = req.body as CreateTagPayload;
    const { slug, title } = body ?? {};

    if (!slug || !title) {
      return res.status(400).json({ error: "slug and title are required" });
    }

    const tag = await createTag({ slug, title });

    return res.status(201).json(tag);
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
