import type { UserVersesPageResponse } from "../models/UserVersesPageResponse";
import type { UserVerse } from "../models/UserVerse";
import { UserVersesService } from "./UserVersesService";

type GetApiUsersVersesParams = {
  telegramId: string;
  status?: "NEW" | "LEARNING" | "STOPPED";
  orderBy?: "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  filter?: "all" | "new" | "learning" | "review" | "stopped";
  limit?: number;
  cursorId?: number;
};

type FetchAllUserVersesParams = Omit<GetApiUsersVersesParams, "cursorId"> & {
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
    params.cursorId
  );
}

export async function fetchAllUserVerses(
  params: FetchAllUserVersesParams
): Promise<Array<UserVerse>> {
  const pageLimit = params.pageLimit ?? 50;
  const items: Array<UserVerse> = [];
  let cursorId: number | undefined;

  while (true) {
    const page = await fetchUserVersesPage({
      ...params,
      limit: pageLimit,
      cursorId,
    });
    items.push(...page.items);
    if (!page.hasMore || page.nextCursorId == null) break;
    cursorId = page.nextCursorId;
  }

  return items;
}
