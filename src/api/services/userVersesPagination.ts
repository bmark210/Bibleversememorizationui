import type { bible_memory_db_internal_domain_VerseListItem as VerseListItem } from "../models/bible_memory_db_internal_domain_VerseListItem";
import type { UserVersesPageResponse } from "../models/UserVersesPageResponse";
import { publicApiUrl } from "@/lib/publicApiBase";

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

  const url = publicApiUrl(
    `/api/users/${encodeURIComponent(params.telegramId)}/verses?${searchParams.toString()}`
  );
  const response = await fetch(url);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error || `Failed to fetch user verses: ${response.status}`);
  }

  const raw = (await response.json()) as UserVersesPageResponse & {
    total?: number;
    offset?: number;
  };
  const totalCount =
    typeof (raw as { totalCount?: number }).totalCount === "number"
      ? (raw as { totalCount: number }).totalCount
      : typeof raw.total === "number"
        ? raw.total
        : raw.items?.length ?? 0;
  return { ...raw, totalCount };
}

export async function fetchAllUserVerses(
  params: FetchAllUserVersesParams
): Promise<Array<VerseListItem>> {
  const pageLimit = params.pageLimit ?? 50;
  const items: Array<VerseListItem> = [];
  let startWith = 0;

  while (true) {
    const page = await fetchUserVersesPage({
      ...params,
      limit: pageLimit,
      startWith,
    });
    items.push(...(page.items ?? []));
    if (!page.items?.length) break;
    const nextOffset = startWith + page.items.length;
    if (nextOffset >= (page.totalCount ?? 0)) break;
    startWith = nextOffset;
  }

  return items;
}
