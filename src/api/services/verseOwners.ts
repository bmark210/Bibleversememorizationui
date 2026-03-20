import type { domain_SocialPlayerListItem } from "@/api/models/domain_SocialPlayerListItem";
import { UserVersesService } from "@/api/services/UserVersesService";
import type { FriendPlayerListItem } from "@/api/services/friends";

export type VerseOwnersScope = "friends" | "players";

function mapOwnerItem(raw: domain_SocialPlayerListItem): FriendPlayerListItem {
  const telegramId = String(raw.telegramId ?? "");
  const name =
    raw.name?.trim() ||
    (raw.telegramId ? `ID ${raw.telegramId}` : "Игрок");

  return {
    telegramId,
    name,
    avatarUrl: raw.avatarUrl?.trim() ? raw.avatarUrl.trim() : null,
    xp: Math.max(0, Math.round(raw.xp ?? 0)),
    dailyStreak: Math.max(0, Math.round(raw.dailyStreak ?? 0)),
    lastActiveAt: raw.lastActiveAt?.trim() ? raw.lastActiveAt.trim() : null,
    weeklyRepetitions: raw.weeklyRepetitions,
  };
}

export async function fetchVerseOwnersPage(
  viewerTelegramId: string,
  externalVerseId: string,
  params: {
    scope: VerseOwnersScope;
    limit?: number;
    startWith?: number;
  }
): Promise<{ items: Array<FriendPlayerListItem>; totalCount: number }> {
  const raw = await UserVersesService.listVerseOwners(
    viewerTelegramId,
    externalVerseId,
    params.scope,
    params.limit ?? 20,
    params.startWith
  );

  const items = (raw.items ?? []).map(mapOwnerItem);
  const totalCount = raw.totalCount ?? items.length;

  return {
    items,
    totalCount: Math.max(0, Math.round(totalCount)),
  };
}
