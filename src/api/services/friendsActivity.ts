import type { domain_DashboardCompactFriendActivityEntry } from "@/api/models/domain_DashboardCompactFriendActivityEntry";
import type { domain_DashboardCompactFriendsActivityResponse } from "@/api/models/domain_DashboardCompactFriendsActivityResponse";
import { UsersService } from "@/api/services/UsersService";

/** Page size for dashboard friends-activity windows (matches API default for compact activity). */
export const FRIENDS_ACTIVITY_WINDOW_SIZE = 12;

export type DashboardCompactFriendActivityEntry =
  domain_DashboardCompactFriendActivityEntry;

export type DashboardCompactFriendsActivityResponse =
  domain_DashboardCompactFriendsActivityResponse;

export async function fetchDashboardFriendsActivity(params: {
  telegramId: string;
  limit?: number;
  offset?: number;
}): Promise<DashboardCompactFriendsActivityResponse> {
  const limit = params.limit ?? FRIENDS_ACTIVITY_WINDOW_SIZE;
  return UsersService.listFriendsActivityCompact(
    params.telegramId,
    limit,
    params.offset,
  );
}
