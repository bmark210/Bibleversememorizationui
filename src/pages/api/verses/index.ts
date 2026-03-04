import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getBibleBookNameRu } from "@/app/types/bible";
import { VerseStatus } from "@/generated/prisma";
import {
  TRAINING_STAGE_MASTERY_MAX,
  REPEAT_THRESHOLD_FOR_MASTERED,
} from "@/shared/training/constants";
import {
  getHelloaoChapterVerseMap,
  normalizeHelloaoTranslation,
} from "@/shared/bible/helloao";
import {
  expandParsedExternalVerseNumbers,
  formatParsedExternalVerseReference,
  parseExternalVerseId,
} from "@/shared/bible/externalVerseId";

const DEFAULT_TRANSLATION = "rus_syn";
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const MAX_TAG_SLUGS = 30;

function parseTagSlugs(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const chunks = Array.isArray(value) ? value : [value];
  const normalized = chunks
    .flatMap((chunk) => chunk.split(","))
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());

  const unique = Array.from(new Set(normalized));
  if (unique.length > MAX_TAG_SLUGS) {
    throw new Error(`tagSlugs must contain at most ${MAX_TAG_SLUGS} values`);
  }
  return unique;
}

function buildGroupKey(translation: string, book: number, chapter: number) {
  return `${translation}|${book}|${chapter}`;
}

function toIsoOrNull(value: Date | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeProgress(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

type DisplayStatus = VerseStatus | "REVIEW" | "MASTERED" | "CATALOG";

function computeDisplayStatus(
  status: VerseStatus | null | undefined,
  masteryLevel: number,
  repetitions: number
): DisplayStatus {
  if (!status || status === VerseStatus.MY) return VerseStatus.MY;
  if (status === VerseStatus.STOPPED) return VerseStatus.STOPPED;
  // LEARNING branch — check for review/mastered thresholds
  if (repetitions >= REPEAT_THRESHOLD_FOR_MASTERED) return "MASTERED";
  if (masteryLevel >= TRAINING_STAGE_MASTERY_MAX) return "REVIEW";
  return VerseStatus.LEARNING;
}

type UserVerseRow = {
  verseId: string;
  status: VerseStatus;
  masteryLevel: number;
  repetitions: number;
  lastTrainingModeId: number | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

async function fetchHelloaoTexts(
  groupedRequests: Array<{ translation: string; book: number; chapter: number; verses: number[] }>
): Promise<Map<string, Map<number, string>>> {
  const textsMap = new Map<string, Map<number, string>>();
  if (groupedRequests.length === 0) return textsMap;

  await Promise.all(
    groupedRequests.map(async (req) => {
      const key = buildGroupKey(req.translation, req.book, req.chapter);
      try {
        const chapterMap = await getHelloaoChapterVerseMap({
          translation: req.translation,
          book: req.book,
          chapter: req.chapter,
        });
        const map = textsMap.get(key) ?? new Map<number, string>();
        req.verses.forEach((verse) => {
          const text = chapterMap.get(verse);
          if (typeof text === "string") {
            map.set(verse, text);
          }
        });
        textsMap.set(key, map);
      } catch {
        // Proceed without text if helloao is unavailable
      }
    })
  );

  return textsMap;
}

function appendParsedVersesToRequestGroup(
  requestGroups: Map<
    string,
    { translation: string; book: number; chapter: number; verses: number[] }
  >,
  translation: string,
  externalVerseId: string
) {
  const parsed = parseExternalVerseId(externalVerseId);
  if (!parsed) return;

  const key = buildGroupKey(translation, parsed.book, parsed.chapter);
  const existing = requestGroups.get(key);
  const verses = expandParsedExternalVerseNumbers(parsed);

  if (existing) {
    existing.verses.push(...verses);
    return;
  }

  requestGroups.set(key, {
    translation,
    book: parsed.book,
    chapter: parsed.chapter,
    verses,
  });
}

function toExternalVerseTextAndReference(
  externalVerseId: string,
  translation: string,
  textsMap: Map<string, Map<number, string>>
): { text?: string; reference?: string } {
  const parsed = parseExternalVerseId(externalVerseId);
  if (!parsed) return {};

  const chapterMap = textsMap.get(buildGroupKey(translation, parsed.book, parsed.chapter));
  const text = expandParsedExternalVerseNumbers(parsed)
    .map((verse) => chapterMap?.get(verse))
    .filter((chunk): chunk is string => typeof chunk === "string" && chunk.length > 0)
    .join(" ")
    .trim();

  return {
    text: text || undefined,
    reference: formatParsedExternalVerseReference(
      parsed,
      getBibleBookNameRu(parsed.book)
    ),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const limitRaw = Number(req.query.limit ?? DEFAULT_PAGE_LIMIT);
  const limit = Math.min(
    Math.max(1, Number.isInteger(limitRaw) ? limitRaw : DEFAULT_PAGE_LIMIT),
    MAX_PAGE_LIMIT
  );
  const startWith = Math.max(0, Number(req.query.startWith ?? 0));

  const telegramIdParam = Array.isArray(req.query.telegramId)
    ? req.query.telegramId[0]
    : req.query.telegramId;

  const translationOverride = Array.isArray(req.query.translation)
    ? req.query.translation[0]
    : req.query.translation;
  let tagSlugs: string[] = [];
  try {
    tagSlugs = parseTagSlugs(req.query.tagSlugs);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid tagSlugs query",
    });
  }

  try {
    const verseWhere =
      tagSlugs.length > 0
        ? {
            tags: {
              some: {
                tag: {
                  slug: {
                    in: tagSlugs,
                  },
                },
              },
            },
          }
        : undefined;

    // Fetch verses page, total count, and user's translation preference in parallel
    const [verses, totalCount, userRecord] = await Promise.all([
      prisma.verse.findMany({
        where: verseWhere,
        orderBy: { createdAt: "desc" },
        skip: startWith,
        take: limit,
        include: { tags: { include: { tag: true } } },
      }),
      prisma.verse.count({
        where: verseWhere,
      }),
      telegramIdParam
        ? prisma.user.findUnique({
            where: { telegramId: telegramIdParam },
            select: { translation: true },
          })
        : null,
    ]);

    const translation = normalizeHelloaoTranslation(
      translationOverride ?? userRecord?.translation ?? DEFAULT_TRANSLATION
    );

    // Build helloao chapter request groups
    const requestGroups = new Map<
      string,
      { translation: string; book: number; chapter: number; verses: number[] }
    >();
    for (const verse of verses) {
      appendParsedVersesToRequestGroup(requestGroups, translation, verse.externalVerseId);
    }
    const groupedRequests = Array.from(requestGroups.values()).map((g) => ({
      ...g,
      verses: Array.from(new Set(g.verses)),
    }));

    const verseIds = verses.map((v) => v.id);

    // Fetch helloao texts and user's UserVerse rows in parallel
    const [textsMap, userVerseRows] = await Promise.all([
      fetchHelloaoTexts(groupedRequests),
      telegramIdParam && verseIds.length > 0
        ? prisma.userVerse.findMany({
            where: { telegramId: telegramIdParam, verseId: { in: verseIds } },
            select: {
              verseId: true,
              status: true,
              masteryLevel: true,
              repetitions: true,
              lastTrainingModeId: true,
              lastReviewedAt: true,
              nextReviewAt: true,
            },
          })
        : Promise.resolve([] as UserVerseRow[]),
    ]);

    // Build lookup: Verse.id → UserVerse progress
    const userVerseMap = new Map<string, UserVerseRow>();
    for (const uv of userVerseRows) {
      userVerseMap.set(uv.verseId, uv);
    }

    const items = verses.map((verse) => {
      const enriched = toExternalVerseTextAndReference(
        verse.externalVerseId,
        translation,
        textsMap
      );
      const tags = verse.tags.map((vt) => ({
        id: vt.tag.id,
        slug: vt.tag.slug,
        title: vt.tag.title,
      }));

      const uv = userVerseMap.get(verse.id);

      if (uv) {
        // Verse is in the user's collection — use their actual status and progress
        const isLearning = uv.status === VerseStatus.LEARNING;
        const masteryLevel = isLearning ? normalizeProgress(uv.masteryLevel) : 0;
        const repetitions = isLearning ? normalizeProgress(uv.repetitions) : 0;
        return {
          externalVerseId: verse.externalVerseId,
          status: computeDisplayStatus(uv.status, masteryLevel, repetitions),
          masteryLevel,
          repetitions,
          lastTrainingModeId: typeof uv.lastTrainingModeId === "number" ? uv.lastTrainingModeId : null,
          lastReviewedAt: toIsoOrNull(uv.lastReviewedAt),
          nextReviewAt: toIsoOrNull(uv.nextReviewAt),
          tags,
          text: enriched.text ?? "",
          reference: enriched.reference ?? verse.externalVerseId,
        };
      }

      // Verse not in the user's collection — catalog item (no user progress)
      return {
        externalVerseId: verse.externalVerseId,
        status: "CATALOG" as DisplayStatus,
        masteryLevel: 0,
        repetitions: 0,
        lastTrainingModeId: null,
        lastReviewedAt: null,
        nextReviewAt: null,
        tags,
        text: enriched.text ?? "",
        reference: enriched.reference ?? verse.externalVerseId,
      };
    });

    return res.status(200).json({ items, totalCount });
  } catch (error) {
    console.error("Error fetching catalog verses:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
