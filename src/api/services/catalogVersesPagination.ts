import type { UserVersesPageResponse } from "../models/UserVersesPageResponse";

type FetchCatalogVersesPageParams = {
  telegramId?: string;
  translation?: string;
  bookId?: number;
  tagSlugs?: string[];
  orderBy?: "createdAt" | "bible" | "popularity";
  order?: "asc" | "desc";
  limit?: number;
  startWith?: number;
};

export async function fetchCatalogVersesPage(
  params: FetchCatalogVersesPageParams
): Promise<UserVersesPageResponse> {
  const searchParams = new URLSearchParams();
  if (params.telegramId) searchParams.set("telegramId", params.telegramId);
  if (params.translation) searchParams.set("translation", params.translation);
  if (params.bookId != null) searchParams.set("bookId", String(params.bookId));
  if (params.tagSlugs && params.tagSlugs.length > 0) {
    searchParams.set("tagSlugs", params.tagSlugs.join(","));
  }
  if (params.orderBy) searchParams.set("orderBy", params.orderBy);
  if (params.order) searchParams.set("order", params.order);
  if (params.limit != null) searchParams.set("limit", String(params.limit));
  if (params.startWith != null) searchParams.set("startWith", String(params.startWith));

  const response = await fetch(`/api/verses?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch catalog verses: ${response.status}`);
  }
  return response.json() as Promise<UserVersesPageResponse>;
}
