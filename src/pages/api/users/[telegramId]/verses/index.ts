import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getBibleBookNameRu } from "@/app/types/bible";

const DEFAULT_BOLLS_TRANSLATION = "SYNOD";
const BOLLS_BATCH_URL = "https://bolls.life/get-verses/";

type UpsertVersePayload = {
  externalVerseId?: string;
  masteryLevel?: number;
  repetitions?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
};

type ParsedExternalVerseId = {
  book: number;
  chapter: number;
  verse: number;
};

const parseExternalVerseId = (value?: string): ParsedExternalVerseId | null => {
  if (!value) return null;
  const parts = value.split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  const [book, chapter, verse] = parts;
  if (!book || !chapter || !verse) return null;
  return { book, chapter, verse };
};

const buildGroupKey = (translation: string, book: number, chapter: number) =>
  `${translation}|${book}|${chapter}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method === "GET") {
    return handleGet(res, telegramId);
  }

  if (req.method === "POST") {
    return handlePost(req, res, telegramId);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleGet(res: NextApiResponse, telegramId: string) {
  // Возвращает все стихи для конкретного пользователя вместе с текстами из Bolls.
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, translation: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const verses = await prisma.userVerse.findMany({
      where: { telegramId },
    });

    if (verses.length === 0) {
      return res.status(200).json(verses);
    }

    const translation = user.translation ?? DEFAULT_BOLLS_TRANSLATION;

    const requestGroups = new Map<
      string,
      {
        translation: string;
        book: number;
        chapter: number;
        verses: number[];
      }
    >();

    for (const verse of verses) {
      const parsed = parseExternalVerseId(verse.externalVerseId);
      if (!parsed) continue;

      const key = buildGroupKey(translation, parsed.book, parsed.chapter);
      const existing = requestGroups.get(key);
      if (existing) {
        existing.verses.push(parsed.verse);
      } else {
        requestGroups.set(key, {
          translation,
          book: parsed.book,
          chapter: parsed.chapter,
          verses: [parsed.verse],
        });
      }
    }

    const groupedRequests = Array.from(requestGroups.values());
    const textsMap = new Map<string, Map<number, string>>();

    if (groupedRequests.length > 0) {
      const response = await fetch(BOLLS_BATCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupedRequests),
      });

      if (response.ok) {
        const payload = (await response.json()) as Array<Array<{ verse: number; text: string }>>;

        payload.forEach((items, index) => {
          const request = groupedRequests[index];
          if (!request) return;
          const map = new Map<number, string>();
          items?.forEach((item) => {
            if (typeof item?.verse === "number" && typeof item?.text === "string") {
              map.set(item.verse, item.text);
            }
          });
          textsMap.set(buildGroupKey(request.translation, request.book, request.chapter), map);
        });
      } else {
        console.warn("Не удалось получить тексты от Bolls:", response.status);
      }
    }

    const enriched = verses.map((verse) => {
      const parsed = parseExternalVerseId(verse.externalVerseId);
      if (!parsed) return verse;
      const key = buildGroupKey(translation, parsed.book, parsed.chapter);
      const text = textsMap.get(key)?.get(parsed.verse);
      return {
        ...verse,
        text,
        reference: `${getBibleBookNameRu(parsed.book)} ${parsed.chapter}:${parsed.verse}`,
      };
    });

    return res.status(200).json(enriched);
  } catch (error) {
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
