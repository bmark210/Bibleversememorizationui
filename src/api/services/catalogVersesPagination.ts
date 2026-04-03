import type { domain_CatalogVersesPageResponse } from "@/api/models/domain_CatalogVersesPageResponse";
import { CatalogService } from "@/api/services/CatalogService";

export async function fetchCatalogVersesPage(params: {
  telegramId?: string;
  bookId?: number;
  tagSlugs?: string[];
  search?: string;
  orderBy: "bible" | "popularity" | "createdAt";
  order: "asc" | "desc";
  limit: number;
  startWith?: number;
}): Promise<domain_CatalogVersesPageResponse> {
  const tagSlugs =
    params.tagSlugs && params.tagSlugs.length > 0
      ? params.tagSlugs.join(",")
      : undefined;
  return CatalogService.listCatalogVerses(
    params.telegramId,
    undefined,
    params.bookId,
    tagSlugs,
    params.search,
    params.orderBy,
    params.order,
    params.limit,
    params.startWith
  );
}
