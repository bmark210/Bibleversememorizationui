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
  // Создаёт новую привязку стиха к пользователю с начальными параметрами.
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

    const existing = await prisma.userVerse.findUnique({
      where: {
        telegramId_externalVerseId: {
          telegramId,
          externalVerseId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "Стих уже добавлен в ваш список стихов" });
    }

    const verse = await prisma.userVerse.create({
      data: {
        telegramId,
        externalVerseId,
        masteryLevel,
        repetitions,
        lastReviewedAt: lastReviewedAt ? new Date(lastReviewedAt) : undefined,
        nextReviewAt: nextReviewAt ? new Date(nextReviewAt) : undefined,
      },
    });

    return res.status(201).json(verse);
  } catch (error) {
    console.error("Error creating/updating verse:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
