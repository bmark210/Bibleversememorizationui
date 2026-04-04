import type { bible_memory_db_internal_domain_DashboardCompactFriendActivityEntry } from "@/api/models/bible_memory_db_internal_domain_DashboardCompactFriendActivityEntry";
import type { bible_memory_db_internal_domain_DashboardCompactFriendsActivityResponse } from "@/api/models/bible_memory_db_internal_domain_DashboardCompactFriendsActivityResponse";
import { UsersService } from "./UsersService";

export type DashboardCompactFriendActivityEntry =
  bible_memory_db_internal_domain_DashboardCompactFriendActivityEntry;
export type DashboardCompactFriendsActivityResponse =
  bible_memory_db_internal_domain_DashboardCompactFriendsActivityResponse;

export const DASHBOARD_FRIENDS_ACTIVITY_LIMIT = 12;

export async function fetchDashboardFriendsActivity(params: {
  telegramId: string;
  limit?: number;
}): Promise<DashboardCompactFriendsActivityResponse> {
  const response = await UsersService.listFriendsActivityCompact(
    params.telegramId,
    params.limit ?? DASHBOARD_FRIENDS_ACTIVITY_LIMIT,
  );

  return {
    ...response,
    entries: response.entries ?? [],
    activeLast7Days: response.activeLast7Days ?? 0,
    friendsTotal: response.friendsTotal ?? 0,
  };
}