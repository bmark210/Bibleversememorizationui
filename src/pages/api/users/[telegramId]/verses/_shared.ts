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
  type DisplayStatus,
  mapUserVerseToVerseCardDto,
  type UserVerseWithLegacyNullableProgress,
  type UserVersesPageResponse,
  type VerseCardDto,
  type VersePopularityScope,
  type VerseCardTagDto,
  type VerseTagLinkWithTag,
} from "./verseCard.types";
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from "@/shared/training/constants";

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

export type UserVersesOrderBy = "createdAt" | "updatedAt" | "bible" | "popularity";
export type UserVersesOrder = "asc" | "desc";
export type UserVersesFilter =
  | "catalog"
  | "friends"
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
const DEFAULT_REFERENCE_TRAINER_LIMIT = 12;

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
  if (!value) return undefined;
  if (
    value === "createdAt" ||
    value === "updatedAt" ||
    value === "bible" ||
    value === "popularity"
  ) {
    return value;
  }
  throw new UserVersesApiError(
    400,
    "orderBy must be one of: createdAt, updatedAt, bible, popularity"
  );
}

function parseOrder(value: string | undefined): UserVersesOrder | undefined {
  if (!value) return undefined;
  if (value === "asc" || value === "desc") return value;
  throw new UserVersesApiError(400, "order must be one of: asc, desc");
}

function parseFilter(value: string | undefined): UserVersesFilter | undefined {
  if (!value) return undefined;
  if (
    value === "catalog" ||
    value === "friends" ||
    value === "my" ||
    value === "learning" ||
    value === "review" ||
    value === "mastered" ||
    value === "stopped"
  ) {
      return value;
  }
  throw new UserVersesApiError(
    400,
    "filter must be one of: catalog, friends, my, learning, review, mastered, stopped"
  );
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
    if (query.filter === "friends") return undefined;
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
  if (!filter || filter === "catalog" || filter === "friends") return verses;
  if (filter === "learning") return verses.filter((verse) => verse.status === VerseStatus.LEARNING);
  if (filter === "review") return verses.filter((verse) => verse.status === "REVIEW");
  if (filter === "mastered") return verses.filter((verse) => verse.status === "MASTERED");
  if (filter === "my") return verses.filter((verse) => verse.status !== "CATALOG");
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
  if (orderBy === "bible" || orderBy === "popularity") return undefined;
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

function toMillis(value: Date | string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function computeSelfPopularityValue(input: {
  masteryLevel: number;
  repetitions: number;
}): number {
  const masteryLevel = Math.max(0, Math.round(Number(input.masteryLevel ?? 0)));
  const repetitions = Math.max(0, Math.round(Number(input.repetitions ?? 0)));
  const boundedProgress = Math.min(
    masteryLevel + repetitions,
    TOTAL_REPEATS_AND_STAGE_MASTERY_MAX
  );
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (boundedProgress / TOTAL_REPEATS_AND_STAGE_MASTERY_MAX) * 100
      )
    )
  );
}

function withPopularity(
  verse: VerseCardDto,
  scope: VersePopularityScope,
  value: number
): VerseCardDto {
  return {
    ...verse,
    popularityScope: scope,
    popularityValue: Math.max(0, Math.round(value)),
  };
}

function withSelfPopularity(verse: VerseCardDto): VerseCardDto {
  return withPopularity(
    verse,
    "self",
    computeSelfPopularityValue({
      masteryLevel: verse.masteryLevel,
      repetitions: verse.repetitions,
    })
  );
}

function sortVerseCardsByBibleOrder(
  verses: VerseCardDto[],
  order?: UserVersesOrder
): VerseCardDto[] {
  const direction = order === "desc" ? -1 : 1;
  return [...verses].sort((a, b) => {
    const byBible =
      compareExternalVerseIdsInBibleOrder(a.externalVerseId, b.externalVerseId) *
      direction;
    if (byBible !== 0) return byBible;
    return a.externalVerseId.localeCompare(b.externalVerseId) * direction;
  });
}

function sortVerseCardsBySelfPopularity(params: {
  verses: VerseCardDto[];
  updatedAtByExternalVerseId: Map<string, number>;
  order?: UserVersesOrder;
}): VerseCardDto[] {
  const direction = params.order === "asc" ? -1 : 1;
  return [...params.verses].sort((a, b) => {
    const aPopularity = Math.max(0, Math.round(Number(a.popularityValue ?? 0)));
    const bPopularity = Math.max(0, Math.round(Number(b.popularityValue ?? 0)));
    if (aPopularity !== bPopularity) {
      return (bPopularity - aPopularity) * direction;
    }

    const aUpdated =
      params.updatedAtByExternalVerseId.get(a.externalVerseId) ??
      Number.NEGATIVE_INFINITY;
    const bUpdated =
      params.updatedAtByExternalVerseId.get(b.externalVerseId) ??
      Number.NEGATIVE_INFINITY;
    if (aUpdated !== bUpdated) {
      return (bUpdated - aUpdated) * direction;
    }

    return compareExternalVerseIdsInBibleOrder(a.externalVerseId, b.externalVerseId);
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

type ReferenceTrainerDisplayStatus = Extract<
  DisplayStatus,
  "LEARNING" | "REVIEW" | "MASTERED"
>;

type ReferenceTrainerContextPrompt = {
  text: string;
  reference: string;
};

function resolveContextDistance(status: ReferenceTrainerDisplayStatus): number {
  if (status === "MASTERED") return 3;
  if (status === "REVIEW") return 2;
  return 1;
}

function getMaxVerseNumber(chapterMap: Map<number, string>): number {
  let max = 0;
  for (const verseNumber of chapterMap.keys()) {
    if (verseNumber > max) max = verseNumber;
  }
  return max;
}

function hasVerseText(chapterMap: Map<number, string>, verseNumber: number): boolean {
  const text = chapterMap.get(verseNumber);
  return typeof text === "string" && text.trim().length > 0;
}

function findNearestAvailableVerse(params: {
  chapterMap: Map<number, string>;
  startVerse: number;
  step: -1 | 1;
}): number | null {
  const { chapterMap, startVerse, step } = params;
  if (chapterMap.size === 0) return null;

  if (step < 0) {
    for (let verse = startVerse; verse >= 1; verse -= 1) {
      if (hasVerseText(chapterMap, verse)) return verse;
    }
    return null;
  }

  const maxVerse = getMaxVerseNumber(chapterMap);
  if (maxVerse <= 0 || startVerse > maxVerse) return null;

  for (let verse = startVerse; verse <= maxVerse; verse += 1) {
    if (hasVerseText(chapterMap, verse)) return verse;
  }
  return null;
}

function resolveContextVerseNumber(params: {
  chapterMap: Map<number, string>;
  targetVerse: number;
  status: ReferenceTrainerDisplayStatus;
}): number | null {
  const { chapterMap, targetVerse, status } = params;
  if (targetVerse <= 0 || chapterMap.size === 0) return null;

  const distance = resolveContextDistance(status);
  const backwardCandidate = targetVerse - distance;

  if (backwardCandidate >= 1) {
    return findNearestAvailableVerse({
      chapterMap,
      startVerse: backwardCandidate,
      step: -1,
    });
  }

  return findNearestAvailableVerse({
    chapterMap,
    startVerse: targetVerse + 1,
    step: 1,
  });
}

async function buildReferenceTrainerContextPrompts(
  sampledRows: Array<{
    verse: { externalVerseId: string };
    displayStatus: ReferenceTrainerDisplayStatus;
  }>,
  translation: string
): Promise<Map<string, ReferenceTrainerContextPrompt>> {
  const prompts = new Map<string, ReferenceTrainerContextPrompt>();
  if (sampledRows.length === 0) return prompts;

  const groups = new Map<
    string,
    {
      book: number;
      chapter: number;
      rows: Array<{
        externalVerseId: string;
        targetVerse: number;
        status: ReferenceTrainerDisplayStatus;
      }>;
    }
  >();

  for (const row of sampledRows) {
    const externalVerseId = row.verse.externalVerseId;
    const parsed = parseExternalVerseId(externalVerseId);
    if (!parsed) continue;

    const key = buildGroupKey(translation, parsed.book, parsed.chapter);
    const existing = groups.get(key);
    const item = {
      externalVerseId,
      targetVerse: parsed.verseStart,
      status: row.displayStatus,
    };

    if (existing) {
      existing.rows.push(item);
      continue;
    }

    groups.set(key, {
      book: parsed.book,
      chapter: parsed.chapter,
      rows: [item],
    });
  }

  await Promise.all(
    Array.from(groups.values()).map(async (group) => {
      let chapterMap = new Map<number, string>();
      try {
        chapterMap = await getHelloaoChapterVerseMap({
          translation,
          book: group.book,
          chapter: group.chapter,
        });
      } catch {
        chapterMap = new Map();
      }

      if (chapterMap.size === 0) return;

      for (const row of group.rows) {
        const contextVerse = resolveContextVerseNumber({
          chapterMap,
          targetVerse: row.targetVerse,
          status: row.status,
        });
        if (!contextVerse) continue;

        const contextText = chapterMap.get(contextVerse)?.trim();
        if (!contextText) continue;

        prompts.set(row.externalVerseId, {
          text: contextText,
          reference: formatParsedExternalVerseReference(
            {
              book: group.book,
              chapter: group.chapter,
              verseStart: contextVerse,
              verseEnd: contextVerse,
            },
            getBibleBookNameRu(group.book)
          ),
        });
      }
    })
  );

  return prompts;
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
      referenceScore: true,
      incipitScore: true,
      contextScore: true,
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

  const candidates = learningRows
    .map((row) => ({
      ...row,
      displayStatus: computeDisplayStatus(
        row.status,
        row.masteryLevel,
        row.repetitions
      ),
    }))
    .filter(
      (
        row
      ): row is typeof row & {
        displayStatus: ReferenceTrainerDisplayStatus;
      } =>
        row.displayStatus === VerseStatus.LEARNING ||
        row.displayStatus === "REVIEW" ||
        row.displayStatus === "MASTERED"
    );

  if (candidates.length === 0) return [];

  const sampled = shuffleInPlace([...candidates]).slice(0, limit);
  const enrichedById = await enrichExternalVerseIds(
    sampled.map((row) => row.verse.externalVerseId),
    translation
  );
  const contextPromptByExternalVerseId = await buildReferenceTrainerContextPrompts(
    sampled,
    translation
  );

  return sampled.map((row) => {
    const externalVerseId = row.verse.externalVerseId;
    const enriched = enrichedById.get(externalVerseId);
    const contextPrompt = contextPromptByExternalVerseId.get(externalVerseId);
    const source = {
      externalVerseId,
      status: row.status,
      masteryLevel: row.masteryLevel,
      repetitions: row.repetitions,
      referenceScore: row.referenceScore,
      incipitScore: row.incipitScore,
      contextScore: row.contextScore,
      lastTrainingModeId: row.lastTrainingModeId,
      lastReviewedAt: row.lastReviewedAt,
      nextReviewAt: row.nextReviewAt,
      tags: enriched?.tags ?? [],
      text: enriched?.text,
      reference: enriched?.reference,
      contextPromptText: contextPrompt?.text,
      contextPromptReference: contextPrompt?.reference,
    } as unknown as UserVerseWithLegacyNullableProgress & {
      text?: string;
      reference?: string;
      contextPromptText?: string;
      contextPromptReference?: string;
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

async function fetchPaginatedFriendVerses(options: {
  telegramId: string;
  translation: string;
  orderBy?: UserVersesOrderBy;
  order?: UserVersesOrder;
  search?: string;
  tagSlugs?: string[];
  limit: number;
  startWith: number;
}): Promise<UserVersesPageResponse> {
  const follows = await prisma.userFollow.findMany({
    where: { followerTelegramId: options.telegramId },
    select: { followingTelegramId: true },
  });
  const followingTelegramIds = Array.from(
    new Set(
      follows
        .map((follow) => follow.followingTelegramId)
        .filter((value): value is string => Boolean(value))
    )
  );

  if (followingTelegramIds.length === 0) {
    return { items: [], totalCount: 0 };
  }

  const friendVerseWhere = applyTagFilterToUserVersesWhere(
    {
      telegramId: {
        in: followingTelegramIds,
      },
    },
    options.tagSlugs
  );

  const aggregatedFriendVerses = await prisma.userVerse.groupBy({
    by: ["verseId"],
    where: friendVerseWhere,
    _count: {
      _all: true,
    },
    _max: {
      updatedAt: true,
    },
  });

  if (aggregatedFriendVerses.length === 0) {
    return { items: [], totalCount: 0 };
  }

  const verseIds = aggregatedFriendVerses.map((entry) => entry.verseId);
  const [verses, myRows] = await Promise.all([
    prisma.verse.findMany({
      where: {
        id: {
          in: verseIds,
        },
      },
      select: {
        id: true,
        externalVerseId: true,
      },
    }),
    prisma.userVerse.findMany({
      where: {
        telegramId: options.telegramId,
        verseId: {
          in: verseIds,
        },
      },
      include: {
        verse: {
          select: {
            externalVerseId: true,
          },
        },
      },
    }),
  ]);

  const verseById = new Map(
    verses.map((verse) => [verse.id, verse.externalVerseId] as const)
  );
  const externalVerseIds = Array.from(
    new Set(
      verseIds
        .map((verseId) => verseById.get(verseId))
        .filter((value): value is string => Boolean(value))
    )
  );
  const [enrichedByExternalVerseId] = await Promise.all([
    enrichExternalVerseIds(externalVerseIds, options.translation),
  ]);

  const myRowByVerseId = new Map(
    myRows.map((row) => [row.verseId, row] as const)
  );
  const friendsCountByExternalVerseId = new Map<string, number>();
  const lastFriendActivityByExternalVerseId = new Map<string, number>();

  const items = aggregatedFriendVerses
    .map((aggregate) => {
      const externalVerseId = verseById.get(aggregate.verseId);
      if (!externalVerseId) return null;

      const friendsCount = Math.max(0, aggregate._count._all ?? 0);
      const lastFriendActivityAt = aggregate._max.updatedAt ?? null;
      const enriched = enrichedByExternalVerseId.get(externalVerseId);
      const myRow = myRowByVerseId.get(aggregate.verseId);

      const baseCard = myRow
        ? mapUserVerseToVerseCardDto({
            ...(myRow as UserVerseWithLegacyNullableProgress),
            externalVerseId,
            tags: enriched?.tags ?? [],
            text: enriched?.text,
            reference: enriched?.reference,
          })
        : ({
            externalVerseId,
            status: "CATALOG",
            masteryLevel: 0,
            repetitions: 0,
            referenceScore: 50,
            incipitScore: 50,
            contextScore: 50,
            lastTrainingModeId: null,
            lastReviewedAt: null,
            nextReviewAt: null,
            tags: enriched?.tags ?? [],
            text: enriched?.text ?? "",
            reference: enriched?.reference ?? externalVerseId,
          } satisfies VerseCardDto);

      friendsCountByExternalVerseId.set(externalVerseId, friendsCount);
      lastFriendActivityByExternalVerseId.set(
        externalVerseId,
        toMillis(lastFriendActivityAt)
      );

      return withPopularity(baseCard, "friends", friendsCount);
    })
    .filter((item): item is VerseCardDto => Boolean(item));

  const filteredItems = filterVerseCardsBySearch(items, options.search);
  const direction = options.order === "asc" ? -1 : 1;
  const sortedItems =
    options.orderBy === "bible"
      ? sortVerseCardsByBibleOrder(filteredItems, options.order)
      : [...filteredItems].sort((a, b) => {
          const aCount =
            friendsCountByExternalVerseId.get(a.externalVerseId) ??
            Math.max(0, Number(a.popularityValue ?? 0));
          const bCount =
            friendsCountByExternalVerseId.get(b.externalVerseId) ??
            Math.max(0, Number(b.popularityValue ?? 0));
          const aLast =
            lastFriendActivityByExternalVerseId.get(a.externalVerseId) ??
            Number.NEGATIVE_INFINITY;
          const bLast =
            lastFriendActivityByExternalVerseId.get(b.externalVerseId) ??
            Number.NEGATIVE_INFINITY;
          const primaryIsPopularity = options.orderBy === "popularity";
          if (primaryIsPopularity) {
            if (aCount !== bCount) return (bCount - aCount) * direction;
            if (aLast !== bLast) return (bLast - aLast) * direction;
          } else {
            if (aLast !== bLast) return (bLast - aLast) * direction;
            if (aCount !== bCount) return (bCount - aCount) * direction;
          }

          return compareExternalVerseIdsInBibleOrder(
            a.externalVerseId,
            b.externalVerseId
          );
        });

  return {
    items: sortedItems.slice(options.startWith, options.startWith + options.limit),
    totalCount: sortedItems.length,
  };
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
  const pageOffset = Math.max(0, startWith ?? 0);
  const hasSearch = Boolean(normalizeSearchTerm(search));
  const useBibleOrdering = orderBy === "bible";
  const usePopularityOrdering = orderBy === "popularity";
  const translation = await getUserTranslationForTelegram(telegramId);

  if (displayFilter === "friends") {
    return fetchPaginatedFriendVerses({
      telegramId,
      translation,
      orderBy,
      order,
      search,
      tagSlugs,
      limit: pageLimit,
      startWith: pageOffset,
    });
  }

  const prismaWhere = applyTagFilterToUserVersesWhere(
    buildUserVersesWhere(telegramId, where),
    tagSlugs
  );
  const prismaOrderBy = buildUserVersesOrderBy(orderBy, order);

  if (
    useBibleOrdering &&
    !usePopularityOrdering &&
    !isComputedDisplayFilter(displayFilter) &&
    !hasSearch
  ) {
    const rawRows = await prisma.userVerse.findMany({
      where: prismaWhere,
      include: { verse: true },
    });
    const orderedRows = sortUserVerseRowsByBibleOrder(rawRows, order);
    const paginatedRows = orderedRows.slice(pageOffset, pageOffset + pageLimit);
    const enrichedItems = (await enrichUserVerses(
      flattenVerseRows(paginatedRows),
      translation
    )).map(withSelfPopularity);

    return {
      items: enrichedItems,
      totalCount: orderedRows.length,
    };
  }

  if (usePopularityOrdering || isComputedDisplayFilter(displayFilter) || hasSearch) {
    const rawRows = await prisma.userVerse.findMany({
      where: prismaWhere,
      orderBy: usePopularityOrdering ? undefined : prismaOrderBy,
      include: { verse: true },
    });
    const orderedRows = useBibleOrdering
      ? sortUserVerseRowsByBibleOrder(rawRows, order)
      : rawRows;
    const updatedAtByExternalVerseId = new Map(
      orderedRows.map((row) => [row.verse.externalVerseId, toMillis(row.updatedAt)] as const)
    );
    const enrichedItems = (await enrichUserVerses(
      flattenVerseRows(orderedRows),
      translation
    )).map(withSelfPopularity);
    const filteredByDisplay = filterVerseCardsByDisplayFilter(
      enrichedItems,
      displayFilter
    );
    const filteredItems = filterVerseCardsBySearch(filteredByDisplay, search);

    const sortedItems = usePopularityOrdering
      ? sortVerseCardsBySelfPopularity({
          verses: filteredItems,
          updatedAtByExternalVerseId,
          order,
        })
      : useBibleOrdering
        ? sortVerseCardsByBibleOrder(filteredItems, order)
        : filteredItems;

    return {
      items: sortedItems.slice(pageOffset, pageOffset + pageLimit),
      totalCount: sortedItems.length,
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

  const enrichedItems = (await enrichUserVerses(
    flattenVerseRows(rawRows),
    translation
  )).map(withSelfPopularity);

  return {
    items: enrichedItems,
    totalCount,
  };
}
