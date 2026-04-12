import type { domain_CatalogVerseLookupResponse } from "@/api/models/domain_CatalogVerseLookupResponse";
import type { domain_CatalogVersesPageResponse } from "@/api/models/domain_CatalogVersesPageResponse";
import type { api_LookupCatalogVersesRequest } from "@/api/models/api_LookupCatalogVersesRequest";
import { CatalogService } from "@/api/services/CatalogService";

export type FetchCatalogVersesPageParams = {
  telegramId?: string;
  translation?: "NRT" | "SYNOD" | "RBS2" | "BTI";
  bookId?: number;
  popularOnly?: boolean;
  /** Comma-separated slugs or a list (will be joined). */
  tagSlugs?: string | string[];
  search?: string;
  orderBy?: string;
  order?: string;
  limit: number;
  startWith?: number;
};

function normalizeTagSlugs(
  tagSlugs?: string | string[],
): string | undefined {
  if (tagSlugs == null) return undefined;
  if (Array.isArray(tagSlugs)) {
    const joined = tagSlugs.map((s) => String(s).trim()).filter(Boolean).join(",");
    return joined || undefined;
  }
  const s = tagSlugs.trim();
  return s || undefined;
}

export async function fetchCatalogVersesPage(
  params: FetchCatalogVersesPageParams,
): Promise<domain_CatalogVersesPageResponse> {
  const {
    telegramId,
    translation,
    bookId,
    popularOnly,
    tagSlugs,
    search,
    orderBy = "createdAt",
    order = "desc",
    limit,
    startWith,
  } = params;

  return CatalogService.listCatalogVerses(
    telegramId,
    translation,
    bookId,
    popularOnly,
    normalizeTagSlugs(tagSlugs),
    search,
    orderBy,
    order,
    limit,
    startWith,
  );
}

export async function lookupCatalogVerses(
  request: api_LookupCatalogVersesRequest,
): Promise<domain_CatalogVerseLookupResponse> {
  return CatalogService.lookupCatalogVerses(request);
}
