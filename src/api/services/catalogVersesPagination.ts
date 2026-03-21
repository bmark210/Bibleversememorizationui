import type { domain_CatalogVersesPageResponse } from "@/api/models/domain_CatalogVersesPageResponse";
import { CatalogService } from "@/api/services/CatalogService";

export async function fetchCatalogVersesPage(params: {
  telegramId: string;
  bookId?: number;
  tagSlugs?: string[];
  orderBy: string;
  order: string;
  limit?: number;
  startWith?: number;
}): Promise<domain_CatalogVersesPageResponse> {
  const tagSlugsStr =
    params.tagSlugs && params.tagSlugs.length > 0
      ? params.tagSlugs.join(",")
      : undefined;

  return CatalogService.listCatalogVerses(
    params.telegramId,
    undefined,
    params.bookId,
    tagSlugsStr,
    params.orderBy,
    params.order,
    params.limit ?? 20,
    params.startWith
  );
}
