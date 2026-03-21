import type { bible_memory_db_internal_domain_VerseListItem } from "@/api/models/bible_memory_db_internal_domain_VerseListItem";
import type { domain_UserVersesPageResponse } from "@/api/models/domain_UserVersesPageResponse";
import { UserVersesService } from "@/api/services/UserVersesService";

/** Должен совпадать с VerseListStatusFilter в списке стихов (без импорта из app — избегаем циклов). */
export type UserVersesListFilter =
  | "catalog"
  | "friends"
  | "learning"
  | "review"
  | "mastered"
  | "stopped"
  | "my";

const LIST_PAGE_LIMIT = 100;

type FetchUserVersesPageParams = {
  telegramId: string;
  orderBy: "bible" | "popularity" | "updatedAt";
  order: "asc" | "desc";
  filter: UserVersesListFilter;
  bookId?: number;
  search?: string;
  tagSlugs?: string[];
  limit: number;
  startWith?: number;
};

function apiFilter(
  filter: UserVersesListFilter
): "friends" | "my" | "learning" | "review" | "mastered" | "stopped" {
  if (filter === "catalog") {
    return "my";
  }
  return filter;
}

export async function fetchUserVersesPage(
  params: FetchUserVersesPageParams
): Promise<domain_UserVersesPageResponse> {
  const tagSlugs =
    params.tagSlugs && params.tagSlugs.length > 0
      ? params.tagSlugs.join(",")
      : undefined;
  return UserVersesService.listUserVerses(
    params.telegramId,
    undefined,
    params.orderBy,
    params.order,
    apiFilter(params.filter),
    params.bookId,
    params.search,
    tagSlugs,
    params.limit,
    params.startWith
  );
}

export async function fetchAllUserVerses(params: {
  telegramId: string;
}): Promise<Array<bible_memory_db_internal_domain_VerseListItem>> {
  const out: Array<bible_memory_db_internal_domain_VerseListItem> = [];
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
      LIST_PAGE_LIMIT,
      startWith
    );
    const batch = page.items ?? [];
    out.push(...batch);
    if (batch.length < LIST_PAGE_LIMIT) {
      break;
    }
    startWith += batch.length;
  }

  return out;
}
