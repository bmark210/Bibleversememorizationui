import type { bible_memory_db_internal_domain_UserVersesPageResponse } from "../models/bible_memory_db_internal_domain_UserVersesPageResponse";
import type { bible_memory_db_internal_domain_VerseListItem } from "../models/bible_memory_db_internal_domain_VerseListItem";
import { UserVersesService } from "./UserVersesService";

export type FetchUserVersesPageParams = {
  telegramId: string;
  status?: "QUEUE" | "LEARNING" | "STOPPED";
  orderBy?: "createdAt" | "updatedAt" | "bible" | "popularity";
  order?: "asc" | "desc";
  filter?: "catalog" | "my" | "learning" | "review" | "mastered" | "stopped";
  bookId?: number;
  popularOnly?: boolean;
  search?: string;
  tagSlugs?: string | string[];
  limit: number;
  startWith?: number;
};

function normalizeTagSlugs(
  tagSlugs?: string | string[],
): string | undefined {
  if (tagSlugs == null) return undefined;
  if (Array.isArray(tagSlugs)) {
    const joined = tagSlugs.map((s) => String(s).trim()).filter(Boolean).join(",");
    return joined || undefined;
  }
  const s = tagSlugs.trim();
  return s || undefined;
}

export async function fetchUserVersesPage(
  params: FetchUserVersesPageParams,
): Promise<bible_memory_db_internal_domain_UserVersesPageResponse> {
  return UserVersesService.listUserVerses(
    params.telegramId,
    params.status,
    params.orderBy,
    params.order,
    params.filter,
    params.bookId,
    params.popularOnly,
    params.search,
    normalizeTagSlugs(params.tagSlugs),
    params.limit,
    params.startWith,
  );
}

const ALL_VERSES_PAGE_SIZE = 100;

/** Загружает все стихи пользователя (filter `my`) постранично. */
export async function fetchAllUserVerses(params: {
  telegramId: string;
}): Promise<bible_memory_db_internal_domain_VerseListItem[]> {
  const all: bible_memory_db_internal_domain_VerseListItem[] = [];
  let startWith = 0;

  for (;;) {
    const page = await UserVersesService.listUserVerses(
      params.telegramId,
      undefined,
      "updatedAt",
      "desc",
      "my",
      undefined,
      undefined,
      undefined,
      undefined,
      ALL_VERSES_PAGE_SIZE,
      startWith,
    );

    const items = page.items ?? [];
    if (items.length === 0) {
      break;
    }

    all.push(...items);

    const total = page.totalCount ?? page.total ?? all.length;
    if (items.length < ALL_VERSES_PAGE_SIZE || all.length >= total) {
      break;
    }

    startWith += items.length;
  }

  return all;
}
