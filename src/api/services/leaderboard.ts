import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import { UsersService } from "./UsersService";

export const DASHBOARD_LEADERBOARD_PREVIEW_SIZE = 3;
export const LEADERBOARD_WINDOW_SIZE = 30;

export async function fetchDashboardLeaderboard(params: {
  telegramId: string;
  limit?: number;
  offset?: number;
  aroundCurrent?: boolean;
}): Promise<domain_UserLeaderboardResponse> {
  const response = await UsersService.getLeaderboard(
    params.telegramId,
    params.limit ?? LEADERBOARD_WINDOW_SIZE,
    params.offset,
    params.aroundCurrent,
  );

  return {
    ...response,
    items: response.items ?? [],
    limit: response.limit ?? params.limit ?? LEADERBOARD_WINDOW_SIZE,
    offset: response.offset ?? params.offset ?? 0,
    totalParticipants: response.totalParticipants ?? response.items?.length ?? 0,
  };
}
