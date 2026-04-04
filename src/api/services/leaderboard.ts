import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import { UsersService } from "./UsersService";

export const DASHBOARD_LEADERBOARD_WINDOW_SIZE = 25;

export async function fetchDashboardLeaderboard(params: {
  telegramId: string;
  limit?: number;
  offset?: number;
}): Promise<domain_UserLeaderboardResponse> {
  const response = await UsersService.getLeaderboard(
    params.telegramId,
    params.limit ?? DASHBOARD_LEADERBOARD_WINDOW_SIZE,
    params.offset,
  );

  return {
    ...response,
    items: response.items ?? [],
    limit: response.limit ?? params.limit ?? DASHBOARD_LEADERBOARD_WINDOW_SIZE,
    offset: response.offset ?? params.offset ?? 0,
    totalParticipants: response.totalParticipants ?? response.items?.length ?? 0,
  };
}