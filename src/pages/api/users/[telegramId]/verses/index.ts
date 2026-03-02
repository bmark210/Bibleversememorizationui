import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import {
  buildWhereForUserVersesListQuery,
  fetchPaginatedEnrichedUserVerses,
  parseUserVersesListQuery,
  UserVersesApiError,
} from "./_shared";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method === "GET") {
    return handleGet(req, res, telegramId);
  }

  if (req.method === "POST") {
    return handlePost(req, res);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, telegramId: string) {
  // Возвращает все стихи для конкретного пользователя вместе с текстами из helloao.
  try {
    const query = parseUserVersesListQuery(req.query);
    const page = await fetchPaginatedEnrichedUserVerses({
      telegramId,
      where: buildWhereForUserVersesListQuery(query),
      displayFilter: query.filter,
      search: query.search,
      tagSlugs: query.tagSlugs,
      orderBy: query.orderBy,
      order: query.order,
      limit: query.limit,
      startWith: query.startWith,
    });

    
    
    return res.status(200).json(page);
  } catch (error) {
    if (error instanceof UserVersesApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Error fetching user verses:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  // Добавляет стих в глобальный каталог без привязки к пользователю.
  try {
    const body = req.body as { externalVerseId?: string };
    const { externalVerseId } = body;

    if (!externalVerseId) {
      return res.status(400).json({ error: "externalVerseId is required" });
    }

    const globalVerse = await prisma.verse.upsert({
      where: { externalVerseId },
      update: {},
      create: { externalVerseId },
    });

    return res.status(201).json({ externalVerseId: globalVerse.externalVerseId, id: globalVerse.id });
  } catch (error) {
    console.error("Error creating verse:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
