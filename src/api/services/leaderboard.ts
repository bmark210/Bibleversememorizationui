import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import { UsersService } from "@/api/services/UsersService";

/** Совпадает с размером страницы в карточке дашборда. */
export const DASHBOARD_LEADERBOARD_PAGE_SIZE = 5;

/** Репозиторий на сервере обрезает limit (см. ListLeaderboard). */
const LEADERBOARD_CLIENT_SLICE_CAP = 50;

function isServerPaginated(
  body: domain_UserLeaderboardResponse
): body is domain_UserLeaderboardResponse & {
  page: number;
  totalPages: number;
} {
  return (
    typeof body.page === "number" &&
    typeof body.totalPages === "number" &&
    Array.isArray(body.items)
  );
}

/**
 * Лидерборд с полями page / pageSize / totalPages для UI.
 * Если бэкенд отдаёт только limit (текущий OpenAPI), подрезаем до pageSize на клиенте
 * в пределах первых LEADERBOARD_CLIENT_SLICE_CAP участников — см. reference/leaderboard-pagination-handler.example.go.
 */
export async function fetchDashboardLeaderboard(params: {
  telegramId: string;
  pageSize: number;
  page?: number;
}): Promise<domain_UserLeaderboardResponse> {
  const { telegramId, pageSize, page } = params;

  const raw = await UsersService.getLeaderboard(
    telegramId,
    LEADERBOARD_CLIENT_SLICE_CAP
  );

  if (isServerPaginated(raw)) {
    return {
      ...raw,
      pageSize: raw.pageSize ?? pageSize,
    };
  }

  const totalParticipants = raw.totalParticipants ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalParticipants / pageSize));
  const rank = raw.currentUser?.rank;
  const anchorPage =
    rank != null && rank >= 1
      ? Math.floor((rank - 1) / pageSize) + 1
      : 1;
  const requestedPage = page ?? anchorPage;
  const resolvedPage = Math.min(
    Math.max(1, requestedPage),
    totalPages
  );
  const start = (resolvedPage - 1) * pageSize;
  const items = (raw.items ?? []).slice(start, start + pageSize);

  return {
    ...raw,
    items,
    page: resolvedPage,
    pageSize,
    totalPages,
  };
}
