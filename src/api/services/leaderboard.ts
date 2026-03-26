import { OpenAPI } from "@/api/core/OpenAPI";
import { request } from "@/api/core/request";
import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";

export const DASHBOARD_LEADERBOARD_WINDOW_SIZE = 20;

export async function fetchDashboardLeaderboard(params: {
  telegramId: string;
  limit?: number;
  offset?: number;
}): Promise<domain_UserLeaderboardResponse> {
  const { telegramId, limit = DASHBOARD_LEADERBOARD_WINDOW_SIZE, offset = 0 } = params;

  return request<domain_UserLeaderboardResponse>(OpenAPI, {
    method: "GET",
    url: "/api/users/leaderboard",
    query: {
      telegramId,
      limit,
      offset,
    },
    errors: {
      500: "Internal Server Error",
    },
  });
}
