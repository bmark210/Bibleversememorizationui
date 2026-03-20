import type { domain_VerseListItem } from "@/api/models/domain_VerseListItem";
import { CatalogService } from "@/api/services/CatalogService";

export async function fetchCatalogVersesPage(params: {
  telegramId: string;
  bookId?: number;
  tagSlugs?: string[];
  orderBy: string;
  order: string;
  limit?: number;
  startWith?: number;
}): Promise<{ items: Array<domain_VerseListItem>; totalCount: number }> {
  const tagSlugsStr =
    params.tagSlugs && params.tagSlugs.length > 0
      ? params.tagSlugs.join(",")
      : undefined;

  const response = await CatalogService.listCatalogVerses(
    params.telegramId,
    undefined,
    params.bookId,
    tagSlugsStr,
    params.orderBy,
    params.order,
    params.limit ?? 20,
    params.startWith
  );

  const items = response.items ?? [];
  const totalCount = response.totalCount ?? items.length;

  return {
    items,
    totalCount: Math.max(0, Math.round(totalCount)),
  };
}
