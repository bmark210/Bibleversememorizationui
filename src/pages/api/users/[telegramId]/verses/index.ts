import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import {
  buildWhereForUserVersesListQuery,
  fetchPaginatedEnrichedUserVerses,
  parseUserVersesListQuery,
  UserVersesApiError,
} from "./_shared";

type UpsertVersePayload = {
  externalVerseId?: string;
  masteryLevel?: number;
  repetitions?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method === "GET") {
    return handleGet(req, res, telegramId);
  }

  if (req.method === "POST") {
    return handlePost(req, res, telegramId);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, telegramId: string) {
  // Возвращает все стихи для конкретного пользователя вместе с текстами из Bolls.
  try {
    const query = parseUserVersesListQuery(req.query);
    const page = await fetchPaginatedEnrichedUserVerses({
      telegramId,
      where: buildWhereForUserVersesListQuery(query),
      displayFilter: query.filter,
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

async function handlePost(req: NextApiRequest, res: NextApiResponse, telegramId: string) {
  // Создаёт глобальный Verse (если его нет), затем привязывает его к пользователю с начальным прогрессом.
  try {
    const body = req.body as UpsertVersePayload;
    const { externalVerseId, masteryLevel = 0, repetitions = 0, lastReviewedAt, nextReviewAt } = body;

    if (!externalVerseId) {
      return res.status(400).json({ error: "externalVerseId is required" });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Ensure the verse exists in the global catalog; create it if it doesn't yet.
    const globalVerse = await prisma.verse.upsert({
      where: { externalVerseId },
      update: {},
      create: { externalVerseId },
    });

    const existing = await prisma.userVerse.findUnique({
      where: {
        telegramId_verseId: {
          telegramId,
          verseId: globalVerse.id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "Стих уже добавлен в ваш список стихов" });
    }

    const userVerse = await prisma.userVerse.create({
      data: {
        telegramId,
        verseId: globalVerse.id,
        masteryLevel,
        repetitions,
        lastReviewedAt: lastReviewedAt ? new Date(lastReviewedAt) : undefined,
        nextReviewAt: nextReviewAt ? new Date(nextReviewAt) : undefined,
      },
    });

    return res.status(201).json({ ...userVerse, externalVerseId });
  } catch (error) {
    console.error("Error creating/updating verse:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
