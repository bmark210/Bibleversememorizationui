import type { domain_UserLeaderboardCurrentUser } from "@/api/models/domain_UserLeaderboardCurrentUser";
import type { domain_UserLeaderboardEntry } from "@/api/models/domain_UserLeaderboardEntry";
import { UsersService } from "@/api/services/UsersService";

export type DashboardLeaderboardEntry = {
  rank: number;
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
  streakDays: number;
  weeklyRepetitions: number;
  isCurrentUser: boolean;
};

export type DashboardLeaderboardCurrentUser = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  rank: number | null;
  weeklyRepetitions: number;
  streakDays: number;
  xp: number;
  inTop: boolean;
};

export type DashboardLeaderboard = {
  entries: Array<DashboardLeaderboardEntry>;
  currentUser: DashboardLeaderboardCurrentUser | null;
  totalParticipants: number;
};

function entryName(entry: domain_UserLeaderboardEntry): string {
  const n = entry.name?.trim();
  if (n) return n;
  const nick = entry.nickname?.trim();
  if (nick) return nick.startsWith("@") ? nick : `@${nick}`;
  return entry.telegramId ?? "Игрок";
}

function mapEntry(
  entry: domain_UserLeaderboardEntry,
  viewerTelegramId: string
): DashboardLeaderboardEntry {
  const telegramId = String(entry.telegramId ?? "");
  return {
    rank: Math.max(1, Math.round(entry.rank ?? 0)),
    telegramId,
    name: entryName(entry),
    avatarUrl: entry.avatarUrl?.trim() ? entry.avatarUrl.trim() : null,
    xp: Math.max(0, Math.round(entry.xp ?? entry.score ?? 0)),
    streakDays: 0,
    weeklyRepetitions: Math.max(
      0,
      Math.round(entry.versesCount ?? entry.score ?? 0)
    ),
    isCurrentUser: telegramId === viewerTelegramId,
  };
}

function buildCurrentUser(
  viewerTelegramId: string,
  apiCurrent: domain_UserLeaderboardCurrentUser | undefined,
  items: Array<domain_UserLeaderboardEntry>
): DashboardLeaderboardCurrentUser | null {
  if (!apiCurrent && items.length === 0) return null;

  const selfFromList = items.find(
    (e) => String(e.telegramId ?? "") === viewerTelegramId
  );

  const rank =
    apiCurrent?.rank != null ? Math.round(apiCurrent.rank) : selfFromList?.rank != null
      ? Math.round(selfFromList.rank!)
      : null;

  return {
    telegramId: viewerTelegramId,
    name: selfFromList ? entryName(selfFromList) : "Вы",
    avatarUrl:
      selfFromList?.avatarUrl?.trim() ? selfFromList.avatarUrl.trim() : null,
    rank,
    weeklyRepetitions: Math.max(
      0,
      Math.round(
        apiCurrent?.versesCount ?? selfFromList?.versesCount ?? selfFromList?.score ?? 0
      )
    ),
    streakDays: 0,
    xp: Math.max(
      0,
      Math.round(apiCurrent?.xp ?? selfFromList?.xp ?? selfFromList?.score ?? 0)
    ),
    inTop: Boolean(apiCurrent?.inTop),
  };
}

export async function fetchDashboardLeaderboard(params: {
  telegramId: string;
  limit?: number;
}): Promise<DashboardLeaderboard> {
  const { telegramId, limit = 25 } = params;
  const raw = await UsersService.getLeaderboard(telegramId, limit);
  const items = raw.items ?? [];
  const mappedEntries = items.map((e) => mapEntry(e, telegramId));
  const currentUser = buildCurrentUser(telegramId, raw.currentUser, items);

  return {
    entries: mappedEntries,
    currentUser,
    totalParticipants: Math.max(
      0,
      Math.round(raw.totalParticipants ?? mappedEntries.length)
    ),
  };
}
