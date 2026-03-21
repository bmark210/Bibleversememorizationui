import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import { UsersService } from "@/api/services/UsersService";

/** Размер страницы рейтинга на главной */
export const DASHBOARD_LEADERBOARD_PAGE_SIZE = 5;

export async function fetchDashboardLeaderboard(params: {
  telegramId: string;
  /** Явная страница (1-based). Не передавать — бэкенд отдаёт страницу с текущим пользователем. */
  page?: number;
  pageSize?: number;
}): Promise<domain_UserLeaderboardResponse> {
  const { telegramId, page, pageSize = DASHBOARD_LEADERBOARD_PAGE_SIZE } = params;
  return UsersService.getLeaderboard(telegramId, undefined, page, pageSize);
}
