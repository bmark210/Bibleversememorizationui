import { OpenAPI } from "@/api/core/OpenAPI";
import { request } from "@/api/core/request";

export const DASHBOARD_FRIENDS_ACTIVITY_LIMIT = 12;

export type DashboardCompactFriendActivityEntry = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  lastActiveAt: string | null;
  dailyStreak: number;
};

export type DashboardCompactFriendsActivityResponse = {
  generatedAt: string;
  friendsTotal: number;
  activeLast7Days: number;
  entries: Array<DashboardCompactFriendActivityEntry>;
};

export async function fetchDashboardFriendsActivity(params: {
  telegramId: string;
  limit?: number;
}): Promise<DashboardCompactFriendsActivityResponse> {
  const {
    telegramId,
    limit = DASHBOARD_FRIENDS_ACTIVITY_LIMIT,
  } = params;

  return request<DashboardCompactFriendsActivityResponse>(OpenAPI, {
    method: "GET",
    url: "/api/users/{telegramId}/friends/activity/compact",
    path: {
      telegramId,
    },
    query: {
      limit,
    },
    errors: {
      404: "Not Found",
      500: "Internal Server Error",
    },
  });
}
