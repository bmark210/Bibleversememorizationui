import type { UserVersesPageResponse } from "../models/UserVersesPageResponse";

type FetchCatalogVersesPageParams = {
  telegramId?: string;
  translation?: string;
  limit?: number;
  startWith?: number;
};

export async function fetchCatalogVersesPage(
  params: FetchCatalogVersesPageParams
): Promise<UserVersesPageResponse> {
  const searchParams = new URLSearchParams();
  if (params.telegramId) searchParams.set("telegramId", params.telegramId);
  if (params.translation) searchParams.set("translation", params.translation);
  if (params.limit != null) searchParams.set("limit", String(params.limit));
  if (params.startWith != null) searchParams.set("startWith", String(params.startWith));

  const response = await fetch(`/api/verses?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch catalog verses: ${response.status}`);
  }
  return response.json() as Promise<UserVersesPageResponse>;
}
