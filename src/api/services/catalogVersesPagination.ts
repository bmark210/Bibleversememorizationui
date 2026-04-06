import type { domain_CatalogVersesPageResponse } from "@/api/models/domain_CatalogVersesPageResponse";
import { CatalogService } from "./CatalogService";

type FetchCatalogVersesPageParams = {
  telegramId?: string;
  translation?: "NRT" | "SYNOD" | "RBS2" | "BTI";
  bookId?: number;
  tagSlugs?: string[];
  search?: string;
  orderBy?: string;
  order?: string;
  limit?: number;
  startWith?: number;
};

export async function fetchCatalogVersesPage(
  params: FetchCatalogVersesPageParams,
): Promise<domain_CatalogVersesPageResponse> {
  const response = await CatalogService.listCatalogVerses(
    params.telegramId,
    params.translation,
    params.bookId,
    params.tagSlugs?.filter(Boolean).join(",") || undefined,
    params.search,
    params.orderBy ?? "createdAt",
    params.order ?? "desc",
    params.limit ?? 20,
    params.startWith,
  );

  return {
    ...response,
    items: response.items ?? [],
    totalCount: response.totalCount ?? response.items?.length ?? 0,
  };
}