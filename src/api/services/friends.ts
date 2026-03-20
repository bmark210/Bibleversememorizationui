import type { domain_DashboardFriendsActivityResponse } from "@/api/models/domain_DashboardFriendsActivityResponse";
import type { domain_FriendPlayerListItem } from "@/api/models/domain_FriendPlayerListItem";
import type { domain_FriendPlayersPageResponse } from "@/api/models/domain_FriendPlayersPageResponse";
import type { api_ActionStatusResponse } from "@/api/models/api_ActionStatusResponse";
import { UsersService } from "@/api/services/UsersService";

export type FriendPlayerListItem = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
  dailyStreak: number;
  lastActiveAt?: string | null;
  weeklyRepetitions?: number;
  isFriend?: boolean;
};

export type FriendPlayersPageResponse = {
  items: Array<FriendPlayerListItem>;
  totalCount: number;
};

export const EMPTY_FRIEND_PLAYERS_PAGE: FriendPlayersPageResponse = {
  items: [],
  totalCount: 0,
};

export type DashboardFriendsActivity = {
  entries: Array<{
    telegramId: string;
    name: string;
    avatarUrl: string | null;
    lastActiveAt: string | null;
    dailyStreak: number;
    xp: number;
  }>;
  summary: {
    friendsTotal: number;
    activeLast7Days?: number;
    avgStreakDays?: number;
    avgWeeklyRepetitions?: number;
    avgXp?: number;
  };
};

function mapSocialOrFriendItem(
  raw: domain_FriendPlayerListItem
): FriendPlayerListItem {
  const extended = raw as domain_FriendPlayerListItem & {
    xp?: number;
    dailyStreak?: number;
    weeklyRepetitions?: number;
    lastActiveAt?: string;
  };
  const telegramId = String(raw.telegramId ?? "");
  const name =
    raw.name?.trim() ||
    (raw.nickname?.trim()
      ? raw.nickname.trim().startsWith("@")
        ? raw.nickname.trim()
        : `@${raw.nickname.trim()}`
      : telegramId || "Игрок");

  return {
    telegramId,
    name,
    avatarUrl: raw.avatarUrl?.trim() ? raw.avatarUrl.trim() : null,
    xp: Math.max(0, Math.round(extended.xp ?? 0)),
    dailyStreak: Math.max(0, Math.round(extended.dailyStreak ?? 0)),
    lastActiveAt: extended.lastActiveAt?.trim()
      ? extended.lastActiveAt.trim()
      : null,
    weeklyRepetitions: extended.weeklyRepetitions ?? raw.versesCount,
    isFriend: raw.isFriend,
  };
}

function normalizeFriendsPage(
  raw: domain_FriendPlayersPageResponse
): FriendPlayersPageResponse {
  const items = (raw.items ?? []).map(mapSocialOrFriendItem);
  const totalCount = raw.total ?? items.length;
  return {
    items,
    totalCount: Math.max(0, Math.round(totalCount)),
  };
}

export async function fetchFriendsPage(
  telegramId: string,
  params?: { search?: string; limit?: number; startWith?: number }
): Promise<FriendPlayersPageResponse> {
  const raw = await UsersService.listFriends(
    telegramId,
    params?.search,
    params?.limit ?? 20,
    params?.startWith
  );
  return normalizeFriendsPage(raw);
}

export async function fetchPlayersPage(
  telegramId: string,
  params?: { search?: string; limit?: number; startWith?: number }
): Promise<FriendPlayersPageResponse> {
  const raw = await UsersService.listPlayers(
    telegramId,
    params?.search,
    params?.limit ?? 20,
    params?.startWith
  );
  return normalizeFriendsPage(raw);
}

export async function addFriend(
  telegramId: string,
  friendTelegramId: string
): Promise<api_ActionStatusResponse> {
  return UsersService.addFriend(telegramId, {
    targetTelegramId: friendTelegramId,
  });
}

export async function removeFriend(
  telegramId: string,
  friendTelegramId: string
): Promise<api_ActionStatusResponse> {
  return UsersService.removeFriend(telegramId, friendTelegramId);
}

function mapFriendsActivity(
  raw: domain_DashboardFriendsActivityResponse
): DashboardFriendsActivity {
  const entries = (raw.entries ?? []).map((e) => ({
    telegramId: String(e.telegramId ?? ""),
    name: e.name?.trim() || String(e.telegramId ?? "Друг"),
    avatarUrl: e.avatarUrl?.trim() ? e.avatarUrl.trim() : null,
    lastActiveAt: e.lastActiveAt?.trim() ? e.lastActiveAt.trim() : null,
    dailyStreak: Math.max(0, Math.round(e.dailyStreak ?? 0)),
    xp: Math.max(0, Math.round(e.xp ?? 0)),
  }));

  const summary = raw.summary ?? {};

  return {
    entries,
    summary: {
      friendsTotal: Math.max(0, Math.round(summary.friendsTotal ?? entries.length)),
      activeLast7Days: summary.activeLast7Days,
      avgStreakDays: summary.avgStreakDays,
      avgWeeklyRepetitions: summary.avgWeeklyRepetitions,
      avgXp: summary.avgXp,
    },
  };
}

export async function fetchDashboardFriendsActivity(
  telegramId: string,
  params?: { limit?: number }
): Promise<DashboardFriendsActivity> {
  const raw = await UsersService.listFriendsActivity(
    telegramId,
    params?.limit ?? 6
  );
  return mapFriendsActivity(raw);
}
