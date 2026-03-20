import type { domain_VerseListItem } from "@/api/models/domain_VerseListItem";
import { UserVersesService } from "@/api/services/UserVersesService";

export type UserVersesSemanticFilter =
  | "friends"
  | "my"
  | "learning"
  | "review"
  | "mastered"
  | "stopped";

export type FetchUserVersesPageParams = {
  telegramId: string;
  orderBy?: "createdAt" | "updatedAt" | "bible" | "popularity";
  order?: "asc" | "desc";
  filter?: UserVersesSemanticFilter;
  bookId?: number;
  search?: string;
  tagSlugs?: string[];
  limit?: number;
  startWith?: number;
};

function normalizeTotalCount(
  raw: { total?: number; totalCount?: number },
  itemsLength: number
): number {
  const t = raw.totalCount ?? raw.total;
  if (typeof t === "number" && Number.isFinite(t)) {
    return Math.max(0, Math.round(t));
  }
  return itemsLength;
}

export async function fetchUserVersesPage(
  params: FetchUserVersesPageParams
): Promise<{ items: Array<domain_VerseListItem>; totalCount: number }> {
  const {
    telegramId,
    orderBy = "updatedAt",
    order = "desc",
    filter,
    bookId,
    search,
    tagSlugs,
    limit = 20,
    startWith,
  } = params;

  const tagSlugsStr =
    tagSlugs && tagSlugs.length > 0 ? tagSlugs.join(",") : undefined;

  const response = await UserVersesService.listUserVerses(
    telegramId,
    undefined,
    orderBy,
    order,
    filter,
    bookId,
    search,
    tagSlugsStr,
    limit,
    startWith
  );

  const items = response.items ?? [];
  return {
    items,
    totalCount: normalizeTotalCount(response, items.length),
  };
}

const FETCH_ALL_PAGE_SIZE = 100;

/** Все стихи пользователя (без семантического filter) — для дашборда тренировки. */
export async function fetchAllUserVerses(params: {
  telegramId: string;
}): Promise<Array<domain_VerseListItem>> {
  const { telegramId } = params;
  const all: Array<domain_VerseListItem> = [];

  while (true) {
    const page = await fetchUserVersesPage({
      telegramId,
      orderBy: "updatedAt",
      order: "desc",
      limit: FETCH_ALL_PAGE_SIZE,
      startWith: all.length,
    });

    if (page.items.length === 0) break;

    all.push(...page.items);

    if (page.items.length < FETCH_ALL_PAGE_SIZE) break;
    if (page.totalCount > 0 && all.length >= page.totalCount) break;
  }

  return all;
}
