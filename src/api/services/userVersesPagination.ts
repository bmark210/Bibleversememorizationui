import type { UserVersesPageResponse } from "../models/UserVersesPageResponse";
import type { UserVerse } from "../models/UserVerse";
import { UserVersesService } from "./UserVersesService";

type GetApiUsersVersesParams = {
  telegramId: string;
  status?: "NEW" | "LEARNING" | "STOPPED";
  orderBy?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  filter?: "all" | "new" | "learning" | "review" | "mastered" | "stopped";
  limit?: number;
  startWith?: number;
};

type FetchAllUserVersesParams = Omit<GetApiUsersVersesParams, "startWith"> & {
  pageLimit?: number;
};

export async function fetchUserVersesPage(
  params: GetApiUsersVersesParams
): Promise<UserVersesPageResponse> {
  return UserVersesService.getApiUsersVerses(
    params.telegramId,
    params.status,
    params.orderBy,
    params.order,
    params.filter,
    params.limit,
    params.startWith
  );
}

export async function fetchAllUserVerses(
  params: FetchAllUserVersesParams
): Promise<Array<UserVerse>> {
  const pageLimit = params.pageLimit ?? 50;
  const items: Array<UserVerse> = [];
  let startWith = 0;

  while (true) {
    const page = await fetchUserVersesPage({
      ...params,
      limit: pageLimit,
      startWith,
    });
    items.push(...page.items);
    if (page.items.length === 0) break;
    const nextOffset = startWith + page.items.length;
    if (nextOffset >= page.totalCount) break;
    startWith = nextOffset;
  }

  return items;
}
