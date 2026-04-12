import type { bible_memory_db_internal_domain_DashboardCompactFriendActivityEntry } from "@/api/models/bible_memory_db_internal_domain_DashboardCompactFriendActivityEntry";
import type { bible_memory_db_internal_domain_DashboardCompactFriendsActivityResponse } from "@/api/models/bible_memory_db_internal_domain_DashboardCompactFriendsActivityResponse";
import { UsersService } from "@/api/services/UsersService";

/** Page size for dashboard friends-activity windows (matches API default for compact activity). */
export const FRIENDS_ACTIVITY_WINDOW_SIZE = 12;

export type DashboardCompactFriendActivityEntry =
  bible_memory_db_internal_domain_DashboardCompactFriendActivityEntry;

export type DashboardCompactFriendsActivityResponse =
  bible_memory_db_internal_domain_DashboardCompactFriendsActivityResponse;

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
