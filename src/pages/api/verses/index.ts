import type { NextApiRequest, NextApiResponse } from "next";
import { getBibleBookNameRu } from "@/app/types/bible";
import { VerseStatus } from "@/generated/prisma";
import { computeDisplayStatus as computeTrainingDisplayStatus } from "@/modules/training/application/computeDisplayStatus";
import { getUserByTelegramId } from "@/modules/users/infrastructure/userRepository";
import {
  countCatalogVerses,
  getCatalogVersesPage,
  getGlobalOwnerCountByVerseIds,
  getVerseOwnerPreviewByVerseIds,
  getUserCatalogProgressByVerseIds,
} from "@/modules/verses/infrastructure/verseRepository";
import {
  getHelloaoChapterVerseMap,
  normalizeHelloaoTranslation,
} from "@/shared/bible/helloao";
import {
  expandParsedExternalVerseNumbers,
  formatParsedExternalVerseReference,
  parseExternalVerseId,
} from "@/shared/bible/externalVerseId";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

const DEFAULT_TRANSLATION = "rus_syn";
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const MAX_TAG_SLUGS = 30;
const DEFAULT_CATALOG_ORDER_BY = "createdAt";
const DEFAULT_CATALOG_ORDER = "desc";

type CatalogOrderBy = "createdAt" | "bible" | "popularity";
type CatalogOrder = "asc" | "desc";
type PopularityPreviewUser = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
};

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

function parseCatalogOrderBy(value: string | undefined): CatalogOrderBy | null {
  if (!value) return DEFAULT_CATALOG_ORDER_BY;
  if (value === "createdAt" || value === "bible" || value === "popularity") return value;
  return null;
}

function parseCatalogOrder(value: string | undefined): CatalogOrder | null {
  if (!value) return DEFAULT_CATALOG_ORDER;
  if (value === "asc" || value === "desc") return value;
  return null;
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

function normalizeSkillScore(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildPublicName(input: {
  telegramId: string;
  name: string | null;
  nickname: string | null;
}): string {
  const name = input.name?.trim();
  if (name) return name;

  const nickname = input.nickname?.trim();
  if (nickname) {
    return nickname.startsWith("@") ? nickname : `@${nickname}`;
  }

  return `Участник #${input.telegramId.slice(-4) || input.telegramId}`;
}

function mapPopularityPreviewUsers(
  users: Array<{
    telegramId: string;
    name: string | null;
    nickname: string | null;
    avatarUrl: string | null;
  }>
): PopularityPreviewUser[] {
  return users.map((user) => ({
    telegramId: user.telegramId,
    name: buildPublicName({
      telegramId: user.telegramId,
      name: user.name,
      nickname: user.nickname,
    }),
    avatarUrl: user.avatarUrl ?? null,
  }));
}

type DisplayStatus = VerseStatus | "REVIEW" | "MASTERED" | "CATALOG";

function computeDisplayStatus(
  status: VerseStatus | null | undefined,
  masteryLevel: number,
  repetitions: number
): DisplayStatus {
  if (!status || status === VerseStatus.MY) return VerseStatus.MY;
  if (status === VerseStatus.STOPPED) return VerseStatus.STOPPED;
  return computeTrainingDisplayStatus(masteryLevel, repetitions);
}

type UserVerseRow = {
  verseId: string;
  status: VerseStatus;
  masteryLevel: number;
  repetitions: number;
  referenceScore: number;
  incipitScore: number;
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

  const limitValue = Array.isArray(req.query.limit)
    ? req.query.limit[0]
    : req.query.limit;
  const startWithValue = Array.isArray(req.query.startWith)
    ? req.query.startWith[0]
    : req.query.startWith;
  const parsedLimit = limitValue == null ? DEFAULT_PAGE_LIMIT : Number(limitValue);
  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > MAX_PAGE_LIMIT
  ) {
    return res.status(400).json({
      error: `limit must be an integer between 1 and ${MAX_PAGE_LIMIT}`,
    });
  }
  const parsedStartWith = startWithValue == null ? 0 : Number(startWithValue);
  if (!Number.isInteger(parsedStartWith) || parsedStartWith < 0) {
    return res.status(400).json({
      error: "startWith must be a non-negative integer",
    });
  }
  const limit = parsedLimit;
  const startWith = parsedStartWith;
  const orderByRaw = Array.isArray(req.query.orderBy)
    ? req.query.orderBy[0]
    : req.query.orderBy;
  const orderRaw = Array.isArray(req.query.order)
    ? req.query.order[0]
    : req.query.order;

  const orderBy = parseCatalogOrderBy(orderByRaw);
  if (!orderBy) {
    return res.status(400).json({
      error: `orderBy must be one of: createdAt, bible, popularity`,
    });
  }

  const order = parseCatalogOrder(orderRaw);
  if (!order) {
    return res.status(400).json({
      error: `order must be one of: asc, desc`,
    });
  }

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
    // Fetch verses page, total count, and user's translation preference in parallel
    const [verses, totalCount, userRecord] = await Promise.all([
      getCatalogVersesPage({
        tagSlugs,
        orderBy,
        order,
        startWith,
        limit,
      }),
      countCatalogVerses(tagSlugs),
      telegramIdParam ? getUserByTelegramId(telegramIdParam) : Promise.resolve(null),
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

    // Fetch helloao texts, user's UserVerse rows and global owners counts in parallel
    const [textsMap, userVerseRows, globalOwnerCountByVerseId, previewUsersByVerseId] =
      await Promise.all([
      fetchHelloaoTexts(groupedRequests),
      telegramIdParam && verseIds.length > 0
        ? getUserCatalogProgressByVerseIds({
            telegramId: telegramIdParam,
            verseIds,
          })
        : Promise.resolve([] as UserVerseRow[]),
      getGlobalOwnerCountByVerseIds(verseIds),
      getVerseOwnerPreviewByVerseIds({
        verseIds,
        scope: "players",
        limitPerVerse: 3,
      }),
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
      const tags = verse.tags;
      const globalOwnersCount = globalOwnerCountByVerseId.get(verse.id) ?? 0;

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
          referenceScore: normalizeSkillScore(uv.referenceScore),
          incipitScore: normalizeSkillScore(uv.incipitScore),
          lastTrainingModeId: typeof uv.lastTrainingModeId === "number" ? uv.lastTrainingModeId : null,
          lastReviewedAt: toIsoOrNull(uv.lastReviewedAt),
          nextReviewAt: toIsoOrNull(uv.nextReviewAt),
          tags,
          popularityScope: "players" as const,
          popularityValue: globalOwnersCount,
          popularityPreviewUsers: mapPopularityPreviewUsers(
            previewUsersByVerseId.get(verse.id) ?? []
          ),
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
        referenceScore: 50,
        incipitScore: 50,
        lastTrainingModeId: null,
        lastReviewedAt: null,
        nextReviewAt: null,
        tags,
        popularityScope: "players" as const,
        popularityValue: globalOwnersCount,
        popularityPreviewUsers: mapPopularityPreviewUsers(
          previewUsersByVerseId.get(verse.id) ?? []
        ),
        text: enriched.text ?? "",
        reference: enriched.reference ?? verse.externalVerseId,
      };
    });

    return res.status(200).json({ items, totalCount });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
