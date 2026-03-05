import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getBibleBookNameRu } from "@/app/types/bible";
import { VerseStatus } from "@/generated/prisma";
import { Prisma } from "@/generated/prisma/client";
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
const DEFAULT_CATALOG_ORDER_BY = "createdAt";
const DEFAULT_CATALOG_ORDER = "desc";

type CatalogOrderBy = "createdAt" | "bible" | "popularity";
type CatalogOrder = "asc" | "desc";

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

async function fetchGlobalOwnerCountByVerseId(
  verseIds: string[]
): Promise<Map<string, number>> {
  const uniqueVerseIds = Array.from(new Set(verseIds.filter(Boolean)));
  if (uniqueVerseIds.length === 0) return new Map();

  const rows = await prisma.userVerse.groupBy({
    by: ["verseId"],
    where: {
      verseId: {
        in: uniqueVerseIds,
      },
    },
    _count: {
      _all: true,
    },
  });

  return new Map(
    rows.map((row) => [row.verseId, Math.max(0, row._count._all ?? 0)] as const)
  );
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

async function fetchPaginatedCatalogVerses(options: {
  verseWhere?: Prisma.VerseWhereInput;
  tagSlugs: string[];
  orderBy: CatalogOrderBy;
  order: CatalogOrder;
  startWith: number;
  limit: number;
}) {
  const { verseWhere, tagSlugs, orderBy, order, startWith, limit } = options;

  if (orderBy === "createdAt") {
    return prisma.verse.findMany({
      where: verseWhere,
      orderBy: { createdAt: order },
      skip: startWith,
      take: limit,
      include: { tags: { include: { tag: true } } },
    });
  }

  if (orderBy === "popularity") {
    const directionSql = order === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const tagFilterSql =
      tagSlugs.length > 0
        ? Prisma.sql`
            WHERE EXISTS (
              SELECT 1
              FROM "VerseTag" vt
              INNER JOIN "Tag" t ON t.id = vt."tagId"
              WHERE vt."verseId" = v.id
                AND t.slug IN (${Prisma.join(tagSlugs)})
            )
          `
        : Prisma.empty;

    const rawRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT v.id
      FROM "Verse" v
      LEFT JOIN "UserVerse" uv ON uv."verseId" = v.id
      ${tagFilterSql}
      GROUP BY v.id, v."createdAt"
      ORDER BY COUNT(uv.id) ${directionSql}, v."createdAt" DESC, v.id ASC
      OFFSET ${startWith}
      LIMIT ${limit}
    `);

    const verseIds = rawRows.map((row) => row.id);
    if (verseIds.length === 0) return [];

    const verses = await prisma.verse.findMany({
      where: { id: { in: verseIds } },
      include: { tags: { include: { tag: true } } },
    });
    const verseById = new Map(verses.map((verse) => [verse.id, verse]));

    return verseIds
      .map((id) => verseById.get(id))
      .filter((verse): verse is (typeof verses)[number] => Boolean(verse));
  }

  const directionSql = order === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const tagFilterSql =
    tagSlugs.length > 0
      ? Prisma.sql`
          WHERE EXISTS (
            SELECT 1
            FROM "VerseTag" vt
            INNER JOIN "Tag" t ON t.id = vt."tagId"
            WHERE vt."verseId" = v.id
              AND t.slug IN (${Prisma.join(tagSlugs)})
          )
        `
      : Prisma.empty;

  const rawRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT v.id
    FROM "Verse" v
    ${tagFilterSql}
    ORDER BY
      CAST(split_part(v."externalVerseId", '-', 1) AS integer) ${directionSql},
      CAST(split_part(v."externalVerseId", '-', 2) AS integer) ${directionSql},
      CAST(split_part(v."externalVerseId", '-', 3) AS integer) ${directionSql},
      COALESCE(
        NULLIF(split_part(v."externalVerseId", '-', 4), '')::integer,
        CAST(split_part(v."externalVerseId", '-', 3) AS integer)
      ) ${directionSql},
      v.id ${directionSql}
    OFFSET ${startWith}
    LIMIT ${limit}
  `);

  const verseIds = rawRows.map((row) => row.id);
  if (verseIds.length === 0) return [];

  const verses = await prisma.verse.findMany({
    where: { id: { in: verseIds } },
    include: { tags: { include: { tag: true } } },
  });
  const verseById = new Map(verses.map((verse) => [verse.id, verse]));

  return verseIds
    .map((id) => verseById.get(id))
    .filter((verse): verse is (typeof verses)[number] => Boolean(verse));
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
      fetchPaginatedCatalogVerses({
        verseWhere,
        tagSlugs,
        orderBy,
        order,
        startWith,
        limit,
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

    // Fetch helloao texts, user's UserVerse rows and global owners counts in parallel
    const [textsMap, userVerseRows, globalOwnerCountByVerseId] = await Promise.all([
      fetchHelloaoTexts(groupedRequests),
      telegramIdParam && verseIds.length > 0
        ? prisma.userVerse.findMany({
            where: { telegramId: telegramIdParam, verseId: { in: verseIds } },
            select: {
              verseId: true,
              status: true,
              masteryLevel: true,
              repetitions: true,
              referenceScore: true,
              incipitScore: true,
              lastTrainingModeId: true,
              lastReviewedAt: true,
              nextReviewAt: true,
            },
          })
        : Promise.resolve([] as UserVerseRow[]),
      fetchGlobalOwnerCountByVerseId(verseIds),
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
