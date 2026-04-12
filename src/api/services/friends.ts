import type { domain_FriendPlayerListItem } from "../models/domain_FriendPlayerListItem";
import type { domain_FriendPlayersPageResponse } from "../models/domain_FriendPlayersPageResponse";
import { UsersService } from "./UsersService";

export type { domain_FriendPlayerListItem };
export type { domain_FriendPlayersPageResponse };

export async function fetchFriendsPage(
  telegramId: string,
  params: { search?: string; limit: number; startWith: number },
): Promise<domain_FriendPlayersPageResponse> {
  return UsersService.listFriends(
    telegramId,
    params.search,
    params.limit,
    params.startWith,
  );
}

export async function fetchPlayersPage(
  telegramId: string,
  params: { search?: string; limit: number; startWith: number },
): Promise<domain_FriendPlayersPageResponse> {
  return UsersService.listPlayers(
    telegramId,
    params.search,
    params.limit,
    params.startWith,
  );
}

/** Бэкенд отвечает `followed` / `unfollowed`; UI ожидает `added` / `removed`. */
export async function addFriend(
  telegramId: string,
  targetTelegramId: string,
): Promise<{ status: "added" }> {
  await UsersService.addFriend(telegramId, { targetTelegramId });
  return { status: "added" };
}

export async function removeFriend(
  telegramId: string,
  friendTelegramId: string,
): Promise<{ status: "removed" }> {
  await UsersService.removeFriend(telegramId, friendTelegramId);
  return { status: "removed" };
}
