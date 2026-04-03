import type { domain_FriendPlayersPageResponse } from "@/api/models/domain_FriendPlayersPageResponse";
import type { internal_api_ActionStatusResponse } from "@/api/models/internal_api_ActionStatusResponse";
import { UsersService } from "@/api/services/UsersService";

export const EMPTY_FRIEND_PLAYERS_PAGE: domain_FriendPlayersPageResponse = {
  items: [],
  total: 0,
  limit: 0,
  offset: 0,
};

export function fetchFriendsPage(
  telegramId: string,
  opts?: { search?: string; limit?: number; startWith?: number }
): Promise<domain_FriendPlayersPageResponse> {
  return UsersService.listFriends(
    telegramId,
    opts?.search,
    opts?.limit ?? 20,
    opts?.startWith
  );
}

export function fetchPlayersPage(
  telegramId: string,
  opts?: { search?: string; limit?: number; startWith?: number }
): Promise<domain_FriendPlayersPageResponse> {
  return UsersService.listPlayers(
    telegramId,
    opts?.search,
    opts?.limit ?? 20,
    opts?.startWith
  );
}

export function addFriend(
  telegramId: string,
  targetTelegramId: string
): Promise<internal_api_ActionStatusResponse> {
  return UsersService.addFriend(telegramId, {
    targetTelegramId,
  });
}

export function removeFriend(
  telegramId: string,
  friendTelegramId: string
): Promise<internal_api_ActionStatusResponse> {
  return UsersService.removeFriend(telegramId, friendTelegramId);
}
