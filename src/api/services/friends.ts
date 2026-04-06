import type { domain_FriendPlayersPageResponse } from "@/api/models/domain_FriendPlayersPageResponse";
import { UsersService } from "./UsersService";

export const EMPTY_FRIEND_PLAYERS_PAGE: domain_FriendPlayersPageResponse = {
  items: [],
  limit: 0,
  offset: 0,
  total: 0,
};

type FriendsPageParams = {
  search?: string;
  limit?: number;
  startWith?: number;
};

function normalizePage(
  page: domain_FriendPlayersPageResponse,
  fallback: FriendsPageParams,
): domain_FriendPlayersPageResponse {
  return {
    items: page.items ?? [],
    limit: page.limit ?? fallback.limit ?? 20,
    offset: page.offset ?? fallback.startWith ?? 0,
    total: page.total ?? page.items?.length ?? 0,
  };
}

export async function fetchPlayersPage(
  telegramId: string,
  params: FriendsPageParams = {},
): Promise<domain_FriendPlayersPageResponse> {
  const page = await UsersService.listPlayers(
    telegramId,
    params.search,
    params.limit ?? 20,
    params.startWith,
  );
  return normalizePage(page, params);
}

export async function fetchFriendsPage(
  telegramId: string,
  params: FriendsPageParams = {},
): Promise<domain_FriendPlayersPageResponse> {
  const page = await UsersService.listFriends(
    telegramId,
    params.search,
    params.limit ?? 20,
    params.startWith,
  );
  return normalizePage(page, params);
}

export async function addFriend(telegramId: string, friendTelegramId: string) {
  const response = await UsersService.addFriend(telegramId, {
    targetTelegramId: friendTelegramId,
  });
  return {
    ...response,
    status: response.status ?? "added",
  };
}

export async function removeFriend(telegramId: string, friendTelegramId: string) {
  const response = await UsersService.removeFriend(telegramId, friendTelegramId);
  return {
    ...response,
    status: response.status ?? "removed",
  };
}
