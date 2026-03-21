import type { domain_UserVersesPageResponse } from "@/api/models/domain_UserVersesPageResponse";
import type { domain_VerseListItem } from "@/api/models/domain_VerseListItem";
import { UserVersesService } from "@/api/services/UserVersesService";

type ListUserVersesArgs = Parameters<typeof UserVersesService.listUserVerses>;

export async function fetchUserVersesPage(params: {
  telegramId: ListUserVersesArgs[0];
  orderBy?: ListUserVersesArgs[2];
  order?: ListUserVersesArgs[3];
  filter?: ListUserVersesArgs[4];
  bookId?: ListUserVersesArgs[5];
  search?: ListUserVersesArgs[6];
  tagSlugs?: string[];
  limit?: ListUserVersesArgs[8];
  startWith?: ListUserVersesArgs[9];
}): Promise<domain_UserVersesPageResponse> {
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

  return UserVersesService.listUserVerses(
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
}

function pageTotalCount(page: domain_UserVersesPageResponse): number {
  const items = page.items ?? [];
  const t = page.totalCount ?? page.total;
  if (typeof t === "number" && Number.isFinite(t)) {
    return Math.max(0, Math.round(t));
  }
  return items.length;
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

    const batch = page.items ?? [];
    if (batch.length === 0) break;

    all.push(...batch);

    const total = pageTotalCount(page);
    if (batch.length < FETCH_ALL_PAGE_SIZE) break;
    if (total > 0 && all.length >= total) break;
  }

  return all;
}
