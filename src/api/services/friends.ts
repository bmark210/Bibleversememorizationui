import type { domain_DashboardFriendsActivityResponse } from "@/api/models/domain_DashboardFriendsActivityResponse";
import type { domain_FriendPlayersPageResponse } from "@/api/models/domain_FriendPlayersPageResponse";
import type { api_ActionStatusResponse } from "@/api/models/api_ActionStatusResponse";
import { UsersService } from "@/api/services/UsersService";

export const EMPTY_FRIEND_PLAYERS_PAGE: domain_FriendPlayersPageResponse = {
  items: [],
  total: 0,
};

export async function fetchFriendsPage(
  telegramId: string,
  params?: { search?: string; limit?: number; startWith?: number }
): Promise<domain_FriendPlayersPageResponse> {
  return UsersService.listFriends(
    telegramId,
    params?.search,
    params?.limit ?? 20,
    params?.startWith
  );
}

export async function fetchPlayersPage(
  telegramId: string,
  params?: { search?: string; limit?: number; startWith?: number }
): Promise<domain_FriendPlayersPageResponse> {
  return UsersService.listPlayers(
    telegramId,
    params?.search,
    params?.limit ?? 20,
    params?.startWith
  );
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

export async function fetchDashboardFriendsActivity(
  telegramId: string,
  params?: { limit?: number }
): Promise<domain_DashboardFriendsActivityResponse> {
  return UsersService.listFriendsActivity(
    telegramId,
    params?.limit ?? 6
  );
}
