import type { UserVersesPageResponse } from "../models/UserVersesPageResponse";
import type { UserVerse } from "../models/UserVerse";

type GetApiUsersVersesParams = {
  telegramId: string;
  status?: "MY" | "LEARNING" | "STOPPED";
  orderBy?: "createdAt" | "updatedAt" | "bible" | "popularity";
  order?: "asc" | "desc";
  filter?:
    | "catalog"
    | "friends"
    | "my"
    | "learning"
    | "review"
    | "mastered"
    | "stopped";
  bookId?: number;
  search?: string;
  tagSlugs?: string[];
  limit?: number;
  startWith?: number;
};

type FetchAllUserVersesParams = Omit<GetApiUsersVersesParams, "startWith"> & {
  pageLimit?: number;
};

export async function fetchUserVersesPage(
  params: GetApiUsersVersesParams
): Promise<UserVersesPageResponse> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.orderBy) searchParams.set("orderBy", params.orderBy);
  if (params.order) searchParams.set("order", params.order);
  if (params.filter) searchParams.set("filter", params.filter);
  if (params.bookId != null) searchParams.set("bookId", String(params.bookId));
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.tagSlugs && params.tagSlugs.length > 0) {
    searchParams.set("tagSlugs", params.tagSlugs.join(","));
  }
  if (params.limit != null) searchParams.set("limit", String(params.limit));
  if (params.startWith != null) searchParams.set("startWith", String(params.startWith));

  const url = `/api/users/${encodeURIComponent(params.telegramId)}/verses?${searchParams.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error || `Failed to fetch user verses: ${response.status}`);
  }

  return response.json() as Promise<UserVersesPageResponse>;
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
