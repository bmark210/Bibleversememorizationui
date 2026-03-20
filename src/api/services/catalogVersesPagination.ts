import type { UserVersesPageResponse } from "../models/UserVersesPageResponse";
import { publicApiUrl } from "@/lib/publicApiBase";

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

  const response = await fetch(publicApiUrl(`/api/verses?${searchParams.toString()}`));
  if (!response.ok) {
    throw new Error(`Failed to fetch catalog verses: ${response.status}`);
  }
  const raw = (await response.json()) as UserVersesPageResponse & {
    total?: number;
  };
  const totalCount =
    typeof (raw as { totalCount?: number }).totalCount === "number"
      ? (raw as { totalCount: number }).totalCount
      : typeof raw.total === "number"
        ? raw.total
        : raw.items?.length ?? 0;
  return { ...raw, totalCount };
}
