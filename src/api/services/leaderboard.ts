import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import { UsersService } from "@/api/services/UsersService";

/** Rows loaded when opening the full leaderboard dialog / scrolling windows. */
export const LEADERBOARD_WINDOW_SIZE = 25;

/** Rows for the compact dashboard preview (centered around the user when `aroundCurrent` is true). */
export const DASHBOARD_LEADERBOARD_PREVIEW_SIZE = 10;

export async function fetchDashboardLeaderboard(params: {
  telegramId?: string;
  limit?: number;
  offset?: number;
  aroundCurrent?: boolean;
}): Promise<domain_UserLeaderboardResponse> {
  return UsersService.getLeaderboard(
    params.telegramId,
    params.aroundCurrent,
    params.limit ?? LEADERBOARD_WINDOW_SIZE,
    params.offset,
  );
}
