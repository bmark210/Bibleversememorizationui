import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import { UsersService } from "@/api/services/UsersService";

export async function fetchDashboardLeaderboard(params: {
  telegramId: string;
  limit?: number;
}): Promise<domain_UserLeaderboardResponse> {
  const { telegramId, limit = 25 } = params;
  return UsersService.getLeaderboard(telegramId, limit);
}
