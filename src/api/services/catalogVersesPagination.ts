import type { domain_CatalogVersesPageResponse } from "@/api/models/domain_CatalogVersesPageResponse";
import type { bible_memory_db_internal_domain_VerseListItem as BackendVerse } from "@/api/models/bible_memory_db_internal_domain_VerseListItem";
import { publicApiUrl } from "@/lib/publicApiBase";

type FetchCatalogVersesPageParams = {
  telegramId?: string;
  translation?: "NRT" | "SYNOD" | "RBS2" | "BTI";
  bookId?: number;
  popularOnly?: boolean;
  tagSlugs?: string[];
  search?: string;
  orderBy?: string;
  order?: string;
  limit?: number;
  startWith?: number;
};

type LookupCatalogVersesParams = {
  telegramId?: string;
  translation?: "NRT" | "SYNOD" | "RBS2" | "BTI";
  externalVerseIds: string[];
};

type LookupCatalogVersesResponse = {
  items: BackendVerse[];
};

export async function fetchCatalogVersesPage(
  params: FetchCatalogVersesPageParams,
): Promise<domain_CatalogVersesPageResponse> {
  const query = new URLSearchParams();

  if (params.telegramId) query.set("telegramId", params.telegramId);
  if (params.translation) query.set("translation", params.translation);
  if (typeof params.bookId === "number")
    query.set("bookId", String(params.bookId));
  if (params.popularOnly) query.set("popularOnly", "true");
  if (params.tagSlugs?.length) {
    query.set("tagSlugs", params.tagSlugs.filter(Boolean).join(","));
  }
  if (params.search?.trim()) query.set("search", params.search.trim());
  query.set("orderBy", params.orderBy ?? "createdAt");
  query.set("order", params.order ?? "desc");
  query.set("limit", String(params.limit ?? 20));
  if (typeof params.startWith === "number")
    query.set("startWith", String(params.startWith));

  const response = await fetch(
    publicApiUrl(`/api/verses?${query.toString()}`),
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error.trim()) {
        message = payload.error.trim();
      }
    } catch {
      // Keep the status-based message if the response body is not JSON.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as domain_CatalogVersesPageResponse;

  return {
    ...payload,
    items: payload.items ?? [],
    totalCount: payload.totalCount ?? payload.items?.length ?? 0,
  };
}

export async function lookupCatalogVerses(
  params: LookupCatalogVersesParams,
): Promise<LookupCatalogVersesResponse> {
  const externalVerseIds = Array.from(
    new Set(params.externalVerseIds.map((id) => id.trim()).filter(Boolean)),
  );
  if (externalVerseIds.length === 0) {
    return { items: [] };
  }

  const response = await fetch(publicApiUrl("/api/verses/lookup"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      telegramId: params.telegramId,
      translation: params.translation,
      externalVerseIds,
    }),
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error.trim()) {
        message = payload.error.trim();
      }
    } catch {
      // Keep the status-based message if the response body is not JSON.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as LookupCatalogVersesResponse;
  return {
    items: payload.items ?? [],
  };
}
