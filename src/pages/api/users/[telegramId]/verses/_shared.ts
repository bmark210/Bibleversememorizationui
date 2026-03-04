import type { ParsedUrlQuery } from "querystring";
import { prisma } from "@/lib/prisma";
import { getBibleBookNameRu } from "@/app/types/bible";
import { VerseStatus } from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  getHelloaoChapterVerseMap,
  normalizeHelloaoTranslation,
} from "@/shared/bible/helloao";
import {
  expandParsedExternalVerseNumbers,
  formatParsedExternalVerseReference,
  parseExternalVerseId,
} from "@/shared/bible/externalVerseId";
import {
  computeDisplayStatus,
  mapUserVerseToVerseCardDto,
  type UserVerseWithLegacyNullableProgress,
  type UserVersesPageResponse,
  type VerseCardDto,
  type VerseCardTagDto,
  type VerseTagLinkWithTag,
} from "./verseCard.types";

const DEFAULT_HELLOAO_TRANSLATION = "rus_syn";

type CachedHelloaoChapter = {
  expiresAt: number;
  verses: Map<number, string>;
};

const HELLOAO_CHAPTER_TEXT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const helloaoChapterTextCache = new Map<string, CachedHelloaoChapter>();

function getCachedHelloaoChapter(key: string): CachedHelloaoChapter | null {
  const cached = helloaoChapterTextCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    helloaoChapterTextCache.delete(key);
    return null;
  }
  return cached;
}

function upsertCachedHelloaoVerse(key: string, verse: number, text: string) {
  const now = Date.now();
  const cached = getCachedHelloaoChapter(key);
  if (cached) {
    cached.verses.set(verse, text);
    return;
  }
  helloaoChapterTextCache.set(key, {
    expiresAt: now + HELLOAO_CHAPTER_TEXT_CACHE_TTL_MS,
    verses: new Map([[verse, text]]),
  });
}

type HelloaoChapterRequest = {
  translation: string;
  book: number;
  chapter: number;
  verses: number[];
};

export type UserVersesOrderBy = "createdAt" | "updatedAt" | "bible";
export type UserVersesOrder = "asc" | "desc";
export type UserVersesFilter =
  | "catalog"
  | "my"
  | "learning"
  | "review"
  | "mastered"
  | "stopped";

export type UserVersesListQuery = {
  status?: VerseStatus;
  orderBy?: UserVersesOrderBy;
  order?: UserVersesOrder;
  filter?: UserVersesFilter;
  search?: string;
  tagSlugs?: string[];
  limit?: number;
  startWith?: number;
};

type FetchEnrichedUserVersesOptions = {
  telegramId: string;
  where?: Record<string, unknown>;
  orderBy?: UserVersesOrderBy;
  order?: UserVersesOrder;
};

type FetchPaginatedEnrichedUserVersesOptions = FetchEnrichedUserVersesOptions & {
  displayFilter?: UserVersesFilter;
  search?: string;
  tagSlugs?: string[];
  limit?: number;
  startWith?: number;
};

const DEFAULT_USER_VERSES_PAGE_LIMIT = 20;
const MAX_USER_VERSES_PAGE_LIMIT = 50;
const MAX_USER_VERSES_SEARCH_LENGTH = 100;
const MAX_USER_VERSES_TAG_FILTER_SIZE = 30;
const DEFAULT_REFERENCE_TRAINER_LIMIT = 50;

export class UserVersesApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "UserVersesApiError";
  }
}

const buildGroupKey = (translation: string, book: number, chapter: number) =>
  `${translation}|${book}|${chapter}`;

async function fetchHelloaoBatchToTextsMap(
  requests: HelloaoChapterRequest[],
  textsMap: Map<string, Map<number, string>>
) {
  if (requests.length === 0) return;

  await Promise.all(
    requests.map(async (request) => {
      try {
        const key = buildGroupKey(request.translation, request.book, request.chapter);
        const map = textsMap.get(key) ?? new Map<number, string>();
        const chapterMap = await getHelloaoChapterVerseMap({
          translation: request.translation,
          book: request.book,
          chapter: request.chapter,
        });

        request.verses.forEach((verse) => {
          const text = chapterMap.get(verse);
          if (typeof text === "string") {
            map.set(verse, text);
            upsertCachedHelloaoVerse(key, verse, text);
          }
        });

        textsMap.set(key, map);
      } catch (error) {
        console.warn("Не удалось получить тексты от helloao:", error);
      }
    })
  );
}

function appendParsedVersesToRequestGroup(
  requestGroups: Map<string, HelloaoChapterRequest>,
  normalizedTranslation: string,
  externalVerseId: string
) {
  const parsed = parseExternalVerseId(externalVerseId);
  if (!parsed) return;

  const key = buildGroupKey(normalizedTranslation, parsed.book, parsed.chapter);
  const existing = requestGroups.get(key);
  const verses = expandParsedExternalVerseNumbers(parsed);

  if (existing) {
    existing.verses.push(...verses);
    return;
  }

  requestGroups.set(key, {
    translation: normalizedTranslation,
    book: parsed.book,
    chapter: parsed.chapter,
    verses,
  });
}

function toExternalVerseTextAndReference(
  externalVerseId: string,
  normalizedTranslation: string,
  textsMap: Map<string, Map<number, string>>
): { text?: string; reference?: string } {
  const parsed = parseExternalVerseId(externalVerseId);
  if (!parsed) return {};

  const chapterMap = textsMap.get(
    buildGroupKey(normalizedTranslation, parsed.book, parsed.chapter)
  );
  const verseNumbers = expandParsedExternalVerseNumbers(parsed);
  const text = verseNumbers
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

function getSingleQueryValue(query: ParsedUrlQuery, key: string): string | undefined {
  const value = query[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

function parseStatus(value: string | undefined): VerseStatus | undefined {
  if (!value) return undefined;
  if (value === VerseStatus.MY) return VerseStatus.MY;
  if (value === VerseStatus.LEARNING) return VerseStatus.LEARNING;
  if (value === VerseStatus.STOPPED) return VerseStatus.STOPPED;
  return undefined;
}

function parseOrderBy(value: string | undefined): UserVersesOrderBy | undefined {
  if (value === "createdAt" || value === "updatedAt" || value === "bible") return value;
  return undefined;
}

function parseOrder(value: string | undefined): UserVersesOrder | undefined {
  if (value === "asc" || value === "desc") return value;
  return undefined;
}

function parseFilter(value: string | undefined): UserVersesFilter | undefined {
  if (!value) return undefined;
  if (
    value === "catalog" ||
    value === "my" ||
    value === "learning" ||
    value === "review" ||
    value === "mastered" ||
    value === "stopped"
  ) {
    return value;
  }
  return undefined;
}

function parsePageLimit(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_USER_VERSES_PAGE_LIMIT) {
    throw new UserVersesApiError(
      400,
      `limit must be an integer between 1 and ${MAX_USER_VERSES_PAGE_LIMIT}`
    );
  }
  return parsed;
}

function parseStartWith(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new UserVersesApiError(400, "startWith must be a non-negative integer");
  }
  return parsed;
}

function parseSearch(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > MAX_USER_VERSES_SEARCH_LENGTH) {
    throw new UserVersesApiError(
      400,
      `search must be at most ${MAX_USER_VERSES_SEARCH_LENGTH} characters`
    );
  }
  return normalized;
}

function parseTagSlugs(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  const chunks = Array.isArray(value) ? value : [value];
  const normalized = chunks
    .flatMap((chunk) => chunk.split(","))
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());

  if (normalized.length === 0) return undefined;

  const unique = Array.from(new Set(normalized));
  if (unique.length > MAX_USER_VERSES_TAG_FILTER_SIZE) {
    throw new UserVersesApiError(
      400,
      `tagSlugs must contain at most ${MAX_USER_VERSES_TAG_FILTER_SIZE} values`
    );
  }

  return unique;
}

export function parseUserVersesListQuery(query: ParsedUrlQuery): UserVersesListQuery {
  return {
    status: parseStatus(getSingleQueryValue(query, "status")),
    orderBy: parseOrderBy(getSingleQueryValue(query, "orderBy")),
    order: parseOrder(getSingleQueryValue(query, "order")),
    filter: parseFilter(getSingleQueryValue(query, "filter")),
    search: parseSearch(getSingleQueryValue(query, "search")),
    tagSlugs: parseTagSlugs(query.tagSlugs),
    limit: parsePageLimit(getSingleQueryValue(query, "limit")),
    startWith: parseStartWith(getSingleQueryValue(query, "startWith")),
  };
}

export function buildWhereForUserVersesListQuery(query: UserVersesListQuery): Record<string, unknown> | undefined {
  if (query.filter) {
    if (query.filter === "catalog") return undefined;
    if (query.filter === "my") return undefined; // все стихи пользователя, без фильтра по статусу
    if (query.filter === "stopped") return { status: VerseStatus.STOPPED };
    if (
      query.filter === "learning" ||
      query.filter === "review" ||
      query.filter === "mastered"
    ) {
      // Computed display statuses are filtered after DTO mapping to handle legacy null progress values safely.
      return { status: VerseStatus.LEARNING };
    }
  }

  if (query.status) return { status: query.status };
  return undefined;
}

type ComputedDisplayFilter = Extract<UserVersesFilter, "learning" | "review" | "mastered">;

function isComputedDisplayFilter(filter: UserVersesFilter | undefined): filter is ComputedDisplayFilter {
  return filter === "learning" || filter === "review" || filter === "mastered";
}

function filterVerseCardsByDisplayFilter(verses: VerseCardDto[], filter: UserVersesFilter | undefined) {
  if (!filter || filter === "catalog") return verses;
  if (filter === "learning") return verses.filter((verse) => verse.status === VerseStatus.LEARNING);
  if (filter === "review") return verses.filter((verse) => verse.status === "REVIEW");
  if (filter === "mastered") return verses.filter((verse) => verse.status === "MASTERED");
  if (filter === "my") return verses.filter((verse) => verse.status === VerseStatus.MY);
  if (filter === "stopped") return verses.filter((verse) => verse.status === VerseStatus.STOPPED);
  return verses;
}

function normalizeSearchTerm(search: string | undefined): string | undefined {
  if (!search) return undefined;
  const normalized = search.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function matchesVerseCardSearch(verse: VerseCardDto, search: string): boolean {
  if (verse.externalVerseId.toLowerCase().includes(search)) return true;
  if ((verse.reference ?? "").toLowerCase().includes(search)) return true;
  if ((verse.text ?? "").toLowerCase().includes(search)) return true;
  return verse.tags.some(
    (tag) =>
      tag.slug.toLowerCase().includes(search) ||
      tag.title.toLowerCase().includes(search)
  );
}

function filterVerseCardsBySearch(verses: VerseCardDto[], search: string | undefined): VerseCardDto[] {
  const normalizedSearch = normalizeSearchTerm(search);
  if (!normalizedSearch) return verses;
  return verses.filter((verse) => matchesVerseCardSearch(verse, normalizedSearch));
}

function buildUserVersesWhere(
  telegramId: string,
  where?: Record<string, unknown>
): Prisma.UserVerseWhereInput {
  return {
    telegramId,
    ...(where ?? {}),
  } as Prisma.UserVerseWhereInput;
}

function applyTagFilterToUserVersesWhere(
  where: Prisma.UserVerseWhereInput,
  tagSlugs?: string[]
): Prisma.UserVerseWhereInput {
  if (!tagSlugs || tagSlugs.length === 0) return where;

  return {
    AND: [
      where,
      {
        verse: {
          tags: {
            some: {
              tag: {
                slug: {
                  in: tagSlugs,
                },
              },
            },
          },
        },
      },
    ],
  } satisfies Prisma.UserVerseWhereInput;
}

function buildUserVersesOrderBy(
  orderBy?: UserVersesOrderBy,
  order?: UserVersesOrder
): Prisma.UserVerseOrderByWithRelationInput[] | undefined {
  if (orderBy === "bible") return undefined;
  const field = orderBy ?? "createdAt";
  const direction = order ?? "desc";
  return [
    { [field]: direction } as Prisma.UserVerseOrderByWithRelationInput,
    { id: direction },
  ];
}

function compareExternalVerseIdsInBibleOrder(aId: string, bId: string): number {
  const a = parseExternalVerseId(aId);
  const b = parseExternalVerseId(bId);

  if (!a && !b) return aId.localeCompare(bId);
  if (!a) return 1;
  if (!b) return -1;

  if (a.book !== b.book) return a.book - b.book;
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  if (a.verseStart !== b.verseStart) return a.verseStart - b.verseStart;
  if (a.verseEnd !== b.verseEnd) return a.verseEnd - b.verseEnd;
  return aId.localeCompare(bId);
}

type UserVerseRowWithVerse = Prisma.UserVerseGetPayload<{
  include: { verse: true };
}>;

function sortUserVerseRowsByBibleOrder(
  rows: UserVerseRowWithVerse[],
  order?: UserVersesOrder
): UserVerseRowWithVerse[] {
  const direction = order === "desc" ? -1 : 1;

  return [...rows].sort((a, b) => {
    const byExternalVerseId =
      compareExternalVerseIdsInBibleOrder(
        a.verse.externalVerseId,
        b.verse.externalVerseId
      ) * direction;
    if (byExternalVerseId !== 0) return byExternalVerseId;
    return (a.id - b.id) * direction;
  });
}

export async function getUserTranslationForTelegram(telegramId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true, translation: true },
  });

  if (!user) {
    throw new UserVersesApiError(404, "User not found");
  }

  return normalizeHelloaoTranslation(user.translation ?? DEFAULT_HELLOAO_TRANSLATION);
}

async function fetchTagsForVerses(
  externalVerseIds: string[]
): Promise<Map<string, VerseCardTagDto[]>> {
  const uniqueIds = Array.from(new Set(externalVerseIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map();
  }

  // VerseTag now references Verse via verseId FK; externalVerseId lives on the Verse relation
  const links: VerseTagLinkWithTag[] = await prisma.verseTag.findMany({
    where: {
      verse: { externalVerseId: { in: uniqueIds } },
    },
    select: {
      verse: {
        select: { externalVerseId: true },
      },
      tag: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
    },
  });

  const tagsByVerseId = new Map<string, VerseCardTagDto[]>();

  for (const link of links) {
    const key = link.verse.externalVerseId;
    const current = tagsByVerseId.get(key) ?? [];
    current.push(link.tag);
    tagsByVerseId.set(key, current);
  }

  return tagsByVerseId;
}

async function enrichUserVerses(
  verses: UserVerseWithLegacyNullableProgress[],
  translation: string
): Promise<VerseCardDto[]> {
  if (verses.length === 0) {
    return [];
  }
  const normalizedTranslation = normalizeHelloaoTranslation(translation);

  const requestGroups = new Map<
    string,
    HelloaoChapterRequest
  >();

  for (const verse of verses) {
    appendParsedVersesToRequestGroup(
      requestGroups,
      normalizedTranslation,
      verse.externalVerseId
    );
  }

  const groupedRequests = Array.from(requestGroups.values());
  const textsMap = new Map<string, Map<number, string>>();
  const tagsByVerseIdPromise = fetchTagsForVerses(verses.map((verse) => verse.externalVerseId));

  // Дедупаем номера стихов внутри группы (меньше payload и CPU на парсинг ответа).
  groupedRequests.forEach((req) => {
    req.verses = Array.from(new Set(req.verses));
  });

  // Используем in-memory TTL cache по главам, чтобы не дергать helloao повторно при листании/рендерах.
  const missingRequests = groupedRequests
    .map((req) => {
      const key = buildGroupKey(req.translation, req.book, req.chapter);
      const cached = getCachedHelloaoChapter(key);
      if (cached) {
        // Подкладываем всё, что уже есть.
        textsMap.set(key, new Map(cached.verses));
        const missingVerses = req.verses.filter((v) => !cached.verses.has(v));
        return missingVerses.length > 0 ? { ...req, verses: missingVerses } : null;
      }
      textsMap.set(key, new Map());
      return req;
    })
    .filter((req): req is HelloaoChapterRequest => Boolean(req));

  await fetchHelloaoBatchToTextsMap(missingRequests, textsMap);

  const tagsByVerseId = await tagsByVerseIdPromise;

  return verses.map((verse) => {
    const enriched = toExternalVerseTextAndReference(
      verse.externalVerseId,
      normalizedTranslation,
      textsMap
    );

    return mapUserVerseToVerseCardDto({
      ...verse,
      text: enriched.text,
      reference: enriched.reference,
      tags: tagsByVerseId.get(verse.externalVerseId) ?? [],
    });
  });
}

// Flatten externalVerseId from the verse relation so enrichUserVerses doesn't need to change
function flattenVerseRows(
  rows: Array<{ verse: { externalVerseId: string }; [key: string]: unknown }>
): UserVerseWithLegacyNullableProgress[] {
  return rows.map((row) => ({
    ...row,
    externalVerseId: row.verse.externalVerseId,
  })) as UserVerseWithLegacyNullableProgress[];
}

export async function fetchEnrichedUserVerses({
  telegramId,
  where,
  orderBy,
  order,
}: FetchEnrichedUserVersesOptions): Promise<VerseCardDto[]> {
  const translation = await getUserTranslationForTelegram(telegramId);
  const prismaOrderBy = buildUserVersesOrderBy(orderBy, order);
  const rawRows = await prisma.userVerse.findMany({
    where: buildUserVersesWhere(telegramId, where),
    orderBy: prismaOrderBy,
    include: { verse: true },
  });

  const orderedRows =
    orderBy === "bible" ? sortUserVerseRowsByBibleOrder(rawRows, order) : rawRows;

  return enrichUserVerses(flattenVerseRows(orderedRows), translation);
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

export async function fetchRandomReferenceTrainerVerses(options: {
  telegramId: string;
  limit?: number;
}): Promise<VerseCardDto[]> {
  const limit = Math.max(1, Math.min(DEFAULT_REFERENCE_TRAINER_LIMIT, Math.round(options.limit ?? DEFAULT_REFERENCE_TRAINER_LIMIT)));
  const translation = await getUserTranslationForTelegram(options.telegramId);

  const learningRows = await prisma.userVerse.findMany({
    where: {
      telegramId: options.telegramId,
      status: VerseStatus.LEARNING,
    },
    select: {
      status: true,
      masteryLevel: true,
      repetitions: true,
      lastTrainingModeId: true,
      lastReviewedAt: true,
      nextReviewAt: true,
      verse: {
        select: {
          externalVerseId: true,
        },
      },
    },
  });

  const candidates = learningRows.filter((row) => {
    const displayStatus = computeDisplayStatus(row.status, row.masteryLevel, row.repetitions);
    return displayStatus === VerseStatus.LEARNING || displayStatus === "MASTERED";
  });

  if (candidates.length === 0) return [];

  const sampled = shuffleInPlace([...candidates]).slice(0, limit);
  const enrichedById = await enrichExternalVerseIds(
    sampled.map((row) => row.verse.externalVerseId),
    translation
  );

  return sampled.map((row) => {
    const externalVerseId = row.verse.externalVerseId;
    const enriched = enrichedById.get(externalVerseId);
    const source = {
      externalVerseId,
      status: row.status,
      masteryLevel: row.masteryLevel,
      repetitions: row.repetitions,
      lastTrainingModeId: row.lastTrainingModeId,
      lastReviewedAt: row.lastReviewedAt,
      nextReviewAt: row.nextReviewAt,
      tags: enriched?.tags ?? [],
      text: enriched?.text,
      reference: enriched?.reference,
    } as unknown as UserVerseWithLegacyNullableProgress & {
      text?: string;
      reference?: string;
      tags?: VerseCardTagDto[];
    };
    return mapUserVerseToVerseCardDto(source);
  });
}

export type EnrichedExternalVerse = {
  externalVerseId: string;
  text: string;
  reference: string;
  tags: VerseCardTagDto[];
};

export async function enrichExternalVerseIds(
  externalVerseIds: string[],
  translation: string
): Promise<Map<string, EnrichedExternalVerse>> {
  const unique = Array.from(new Set(externalVerseIds.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const normalizedTranslation = normalizeHelloaoTranslation(translation);

  const requestGroups = new Map<
    string,
    HelloaoChapterRequest
  >();

  for (const id of unique) {
    appendParsedVersesToRequestGroup(requestGroups, normalizedTranslation, id);
  }

  const groupedRequests = Array.from(requestGroups.values());
  const textsMap = new Map<string, Map<number, string>>();
  const tagsByVerseIdPromise = fetchTagsForVerses(unique);

  groupedRequests.forEach((req) => {
    req.verses = Array.from(new Set(req.verses));
  });

  const missingRequests = groupedRequests
    .map((req) => {
      const key = buildGroupKey(req.translation, req.book, req.chapter);
      const cached = getCachedHelloaoChapter(key);
      if (cached) {
        textsMap.set(key, new Map(cached.verses));
        const missingVerses = req.verses.filter((v) => !cached.verses.has(v));
        return missingVerses.length > 0 ? { ...req, verses: missingVerses } : null;
      }
      textsMap.set(key, new Map());
      return req;
    })
    .filter((req): req is HelloaoChapterRequest => Boolean(req));

  await fetchHelloaoBatchToTextsMap(missingRequests, textsMap);

  const tagsByVerseId = await tagsByVerseIdPromise;
  const result = new Map<string, EnrichedExternalVerse>();

  for (const id of unique) {
    const enriched = toExternalVerseTextAndReference(
      id,
      normalizedTranslation,
      textsMap
    );
    result.set(id, {
      externalVerseId: id,
      text: enriched.text ?? "",
      reference: enriched.reference ?? id,
      tags: tagsByVerseId.get(id) ?? [],
    });
  }

  return result;
}

export async function fetchPaginatedEnrichedUserVerses({
  telegramId,
  where,
  orderBy,
  order,
  displayFilter,
  search,
  tagSlugs,
  limit,
  startWith,
}: FetchPaginatedEnrichedUserVersesOptions): Promise<UserVersesPageResponse> {
  const pageLimit = limit ?? DEFAULT_USER_VERSES_PAGE_LIMIT;
  const translation = await getUserTranslationForTelegram(telegramId);
  const prismaWhere = applyTagFilterToUserVersesWhere(
    buildUserVersesWhere(telegramId, where),
    tagSlugs
  );
  const pageOffset = Math.max(0, startWith ?? 0);
  const hasSearch = Boolean(normalizeSearchTerm(search));
  const prismaOrderBy = buildUserVersesOrderBy(orderBy, order);
  const useBibleOrdering = orderBy === "bible";

  if (useBibleOrdering) {
    const rawRows = await prisma.userVerse.findMany({
      where: prismaWhere,
      include: { verse: true },
    });
    const orderedRows = sortUserVerseRowsByBibleOrder(rawRows, order);

    if (isComputedDisplayFilter(displayFilter) || hasSearch) {
      const enrichedItems = await enrichUserVerses(flattenVerseRows(orderedRows), translation);
      const filteredByDisplay = filterVerseCardsByDisplayFilter(enrichedItems, displayFilter);
      const filteredItems = filterVerseCardsBySearch(filteredByDisplay, search);

      return {
        items: filteredItems.slice(pageOffset, pageOffset + pageLimit),
        totalCount: filteredItems.length,
      };
    }

    const paginatedRows = orderedRows.slice(pageOffset, pageOffset + pageLimit);
    const enrichedItems = await enrichUserVerses(flattenVerseRows(paginatedRows), translation);

    return {
      items: enrichedItems,
      totalCount: orderedRows.length,
    };
  }

  if (isComputedDisplayFilter(displayFilter) || hasSearch) {
    const rawRows = await prisma.userVerse.findMany({
      where: prismaWhere,
      orderBy: prismaOrderBy,
      include: { verse: true },
    });

    const enrichedItems = await enrichUserVerses(flattenVerseRows(rawRows), translation);
    const filteredByDisplay = filterVerseCardsByDisplayFilter(enrichedItems, displayFilter);
    const filteredItems = filterVerseCardsBySearch(filteredByDisplay, search);

    return {
      items: filteredItems.slice(pageOffset, pageOffset + pageLimit),
      totalCount: filteredItems.length,
    };
  }

  const [rawRows, totalCount] = await Promise.all([
    prisma.userVerse.findMany({
      where: prismaWhere,
      orderBy: prismaOrderBy,
      skip: pageOffset,
      take: pageLimit,
      include: { verse: true },
    }),
    prisma.userVerse.count({
      where: prismaWhere,
    }),
  ]);

  const enrichedItems = await enrichUserVerses(flattenVerseRows(rawRows), translation);

  return {
    items: enrichedItems,
    totalCount,
  };
}
