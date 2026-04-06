import type { domain_UserVersesPageResponse } from "@/api/models/domain_UserVersesPageResponse";
import { UserVersesService } from "./UserVersesService";

type FetchUserVersesPageParams = {
  telegramId: string;
  status?: "MY" | "LEARNING" | "STOPPED";
  orderBy?: "createdAt" | "updatedAt" | "bible" | "popularity";
  order?: "asc" | "desc";
  filter?: "catalog" | "my" | "learning" | "review" | "mastered" | "stopped";
  bookId?: number;
  search?: string;
  tagSlugs?: string[];
  limit?: number;
  startWith?: number;
};

export async function fetchUserVersesPage(
  params: FetchUserVersesPageParams,
): Promise<domain_UserVersesPageResponse> {
  const response = await UserVersesService.listUserVerses(
    params.telegramId,
    params.status,
    params.orderBy,
    params.order,
    params.filter,
    params.bookId,
    params.search,
    params.tagSlugs?.filter(Boolean).join(",") || undefined,
    params.limit ?? 20,
    params.startWith,
  );

  return {
    ...response,
    items: response.items ?? [],
    limit: response.limit ?? params.limit ?? 20,
    offset: response.offset ?? params.startWith ?? 0,
    total: response.total ?? response.totalCount ?? response.items?.length ?? 0,
    totalCount: response.totalCount ?? response.total ?? response.items?.length ?? 0,
  };
}

export async function fetchAllUserVerses(params: {
  telegramId: string;
}): Promise<domain_UserVersesPageResponse["items"]> {
  const response = await fetchUserVersesPage({
    telegramId: params.telegramId,
    limit: 100,
  });
  return response.items ?? [];
}