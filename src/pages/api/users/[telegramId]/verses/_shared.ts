import type { ParsedUrlQuery } from "querystring";
import { prisma } from "@/lib/prisma";
import { getBibleBookNameRu } from "@/app/types/bible";
import { VerseStatus } from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { TRAINING_STAGE_MASTERY_MAX } from "@/shared/training/constants";

const DEFAULT_BOLLS_TRANSLATION = "SYNOD";
const BOLLS_BATCH_URL = "https://bolls.life/get-verses/";

type ParsedExternalVerseId = {
  book: number;
  chapter: number;
  verse: number;
};

export type UserVersesOrderBy = "createdAt" | "updatedAt";
export type UserVersesOrder = "asc" | "desc";
export type UserVersesFilter = "all" | "new" | "learning" | "review" | "stopped";

export type UserVersesListQuery = {
  status?: VerseStatus;
  orderBy?: UserVersesOrderBy;
  order?: UserVersesOrder;
  filter?: UserVersesFilter;
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
  limit?: number;
  startWith?: number;
};

export type UserVersesPageResponse = {
  items: Array<Record<string, unknown>>;
  totalCount: number;
};

const DEFAULT_USER_VERSES_PAGE_LIMIT = 20;
const MAX_USER_VERSES_PAGE_LIMIT = 50;

export class UserVersesApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "UserVersesApiError";
  }
}

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

function getSingleQueryValue(query: ParsedUrlQuery, key: string): string | undefined {
  const value = query[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

function parseStatus(value: string | undefined): VerseStatus | undefined {
  if (!value) return undefined;
  if (value === VerseStatus.NEW) return VerseStatus.NEW;
  if (value === VerseStatus.LEARNING) return VerseStatus.LEARNING;
  if (value === VerseStatus.STOPPED) return VerseStatus.STOPPED;
  return undefined;
}

function parseOrderBy(value: string | undefined): UserVersesOrderBy | undefined {
  if (value === "createdAt" || value === "updatedAt") return value;
  return undefined;
}

function parseOrder(value: string | undefined): UserVersesOrder | undefined {
  if (value === "asc" || value === "desc") return value;
  return undefined;
}

function parseFilter(value: string | undefined): UserVersesFilter | undefined {
  if (!value) return undefined;
  if (value === "all" || value === "new" || value === "learning" || value === "review" || value === "stopped") {
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

export function parseUserVersesListQuery(query: ParsedUrlQuery): UserVersesListQuery {
  return {
    status: parseStatus(getSingleQueryValue(query, "status")),
    orderBy: parseOrderBy(getSingleQueryValue(query, "orderBy")),
    order: parseOrder(getSingleQueryValue(query, "order")),
    filter: parseFilter(getSingleQueryValue(query, "filter")),
    limit: parsePageLimit(getSingleQueryValue(query, "limit")),
    startWith: parseStartWith(getSingleQueryValue(query, "startWith")),
  };
}

export function buildWhereForUserVersesListQuery(query: UserVersesListQuery): Record<string, unknown> | undefined {
  if (query.filter) {
    if (query.filter === "all") return undefined;
    if (query.filter === "new") return { status: VerseStatus.NEW };
    if (query.filter === "stopped") return { status: VerseStatus.STOPPED };
    if (query.filter === "learning") {
      return {
        status: VerseStatus.LEARNING,
        masteryLevel: { lte: TRAINING_STAGE_MASTERY_MAX },
      };
    }
    if (query.filter === "review") {
      return {
        status: VerseStatus.LEARNING,
        masteryLevel: { gt: TRAINING_STAGE_MASTERY_MAX },
      };
    }
  }

  if (query.status) return { status: query.status };
  return undefined;
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

function buildUserVersesOrderBy(
  orderBy?: UserVersesOrderBy,
  order?: UserVersesOrder
): Prisma.UserVerseOrderByWithRelationInput[] {
  const field = orderBy ?? "createdAt";
  const direction = order ?? "desc";
  return [
    { [field]: direction } as Prisma.UserVerseOrderByWithRelationInput,
    { id: direction },
  ];
}

async function getUserTranslationForTelegram(telegramId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true, translation: true },
  });

  if (!user) {
    throw new UserVersesApiError(404, "User not found");
  }

  return user.translation ?? DEFAULT_BOLLS_TRANSLATION;
}

async function enrichUserVerses(
  verses: Array<Prisma.UserVerseGetPayload<Record<string, never>>>,
  translation: string
) {
  if (verses.length === 0) {
    return verses;
  }

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

  return verses.map((verse) => {
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
}

export async function fetchEnrichedUserVerses({
  telegramId,
  where,
  orderBy,
  order,
}: FetchEnrichedUserVersesOptions) {
  const translation = await getUserTranslationForTelegram(telegramId);
  const verses = await prisma.userVerse.findMany({
    where: buildUserVersesWhere(telegramId, where),
    orderBy: buildUserVersesOrderBy(orderBy, order),
  });

  return enrichUserVerses(verses, translation);
}

export async function fetchPaginatedEnrichedUserVerses({
  telegramId,
  where,
  orderBy,
  order,
  limit,
  startWith,
}: FetchPaginatedEnrichedUserVersesOptions): Promise<UserVersesPageResponse> {
  const pageLimit = limit ?? DEFAULT_USER_VERSES_PAGE_LIMIT;
  const translation = await getUserTranslationForTelegram(telegramId);
  const prismaWhere = buildUserVersesWhere(telegramId, where);
  const pageOffset = Math.max(0, startWith ?? 0);

  const [rawItems, totalCount] = await Promise.all([
    prisma.userVerse.findMany({
      where: prismaWhere,
      orderBy: buildUserVersesOrderBy(orderBy, order),
      skip: pageOffset,
      take: pageLimit,
    }),
    prisma.userVerse.count({
      where: prismaWhere,
    }),
  ]);

  const enrichedItems = await enrichUserVerses(rawItems, translation);

  return {
    items: enrichedItems as Array<Record<string, unknown>>,
    totalCount,
  };
}
