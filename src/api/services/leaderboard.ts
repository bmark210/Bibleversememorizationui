import { publicApiUrl } from "@/lib/publicApiBase";

export type LeaderboardEntry = {
  rank: number;
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
  streakDays: number;
  weeklyRepetitions: number;
  isCurrentUser: boolean;
};

export type CurrentUserLeaderboardSnapshot = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  rank: number | null;
  xp: number;
  streakDays: number;
  weeklyRepetitions: number;
};

export type DashboardLeaderboard = {
  generatedAt: string;
  totalParticipants: number;
  entries: LeaderboardEntry[];
  currentUser: CurrentUserLeaderboardSnapshot | null;
};

export const EMPTY_DASHBOARD_LEADERBOARD: DashboardLeaderboard = {
  generatedAt: new Date(0).toISOString(),
  totalParticipants: 0,
  entries: [],
  currentUser: null,
};

function toSafeInt(value: unknown, options?: { min?: number; max?: number }) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return options?.min ?? 0;
  const rounded = Math.round(numeric);
  const min = options?.min ?? Number.NEGATIVE_INFINITY;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  return Math.max(min, Math.min(max, rounded));
}

function toSafeString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLeaderboardEntry(
  value: unknown,
  index: number
): LeaderboardEntry {
  const data = (value ?? {}) as Partial<LeaderboardEntry>;
  const rank = toSafeInt(data.rank, { min: 1 });
  const telegramId = toSafeString(data.telegramId);
  const fallbackName = telegramId
    ? `Участник #${telegramId.slice(-4)}`
    : `Участник #${index + 1}`;

  return {
    rank,
    telegramId,
    name: toSafeString(data.name, fallbackName),
    avatarUrl: toNullableString(data.avatarUrl),
    xp: toSafeInt(data.xp, { min: 0 }),
    streakDays: toSafeInt(data.streakDays, { min: 0 }),
    weeklyRepetitions: toSafeInt(data.weeklyRepetitions, { min: 0 }),
    isCurrentUser: Boolean(data.isCurrentUser),
  };
}

function normalizeCurrentUserSnapshot(
  value: unknown
): CurrentUserLeaderboardSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<CurrentUserLeaderboardSnapshot>;
  const telegramId = toSafeString(data.telegramId);
  if (!telegramId) return null;

  const rankValue = data.rank;
  const rank =
    rankValue == null
      ? null
      : toSafeInt(rankValue, {
          min: 1,
        });

  return {
    telegramId,
    name: toSafeString(data.name, `Участник #${telegramId.slice(-4)}`),
    avatarUrl: toNullableString(data.avatarUrl),
    rank,
    xp: toSafeInt(data.xp, { min: 0 }),
    streakDays: toSafeInt(data.streakDays, { min: 0 }),
    weeklyRepetitions: toSafeInt(data.weeklyRepetitions, { min: 0 }),
  };
}

type GoLeaderboardPayload = {
  items?: unknown[];
  entries?: unknown[];
  currentUser?: unknown;
  totalParticipants?: unknown;
  generatedAt?: unknown;
};

export function normalizeDashboardLeaderboard(
  value: unknown,
  viewerTelegramId?: string | null
): DashboardLeaderboard {
  const data = (value ?? {}) as Partial<DashboardLeaderboard> & GoLeaderboardPayload;

  const goItems = Array.isArray(data.items) ? data.items : null;
  if (goItems && !Array.isArray(data.entries)) {
    const tid = (viewerTelegramId ?? "").trim();
    const entries = goItems.map((entry, index) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      const telegramId = toSafeString(row.telegramId);
      const rank = toSafeInt(row.rank, { min: index + 1 });
      const xp = toSafeInt(row.score ?? row.xp ?? row.versesCount, { min: 0 });
      const nick = toNullableString(row.nickname as string | undefined);
      return {
        rank,
        telegramId,
        name: toSafeString(row.name, nick ?? `Участник #${telegramId.slice(-4) || String(index)}`),
        avatarUrl: toNullableString(row.avatarUrl),
        xp,
        streakDays: toSafeInt(row.streakDays ?? row.dailyStreak, { min: 0 }),
        weeklyRepetitions: toSafeInt(row.weeklyRepetitions, { min: 0 }),
        isCurrentUser: Boolean(tid && telegramId === tid),
      };
    });

    const cu = (data.currentUser ?? null) as Record<string, unknown> | null;
    let currentUser: CurrentUserLeaderboardSnapshot | null = null;
    if (cu && tid) {
      const rankVal = cu.rank;
      const rankParsed =
        rankVal == null
          ? null
          : toSafeInt(rankVal, {
              min: 1,
            });
      currentUser = {
        telegramId: tid,
        name: `Участник #${tid.slice(-4)}`,
        avatarUrl: null,
        rank: rankParsed,
        xp: toSafeInt(cu.xp ?? cu.score ?? cu.versesCount, { min: 0 }),
        streakDays: toSafeInt(cu.streakDays ?? cu.dailyStreak, { min: 0 }),
        weeklyRepetitions: toSafeInt(cu.weeklyRepetitions, { min: 0 }),
      };
    }

    const rawTotal = Number(data.totalParticipants);
    const totalParticipants =
      Number.isFinite(rawTotal) && rawTotal >= 0
        ? Math.round(rawTotal)
        : entries.length;

    return {
      generatedAt: toSafeString(data.generatedAt, new Date().toISOString()),
      totalParticipants,
      entries,
      currentUser,
    };
  }

  const entriesRaw = Array.isArray(data.entries) ? data.entries : [];

  return {
    generatedAt: toSafeString(data.generatedAt, new Date().toISOString()),
    totalParticipants: toSafeInt(data.totalParticipants, { min: 0 }),
    entries: entriesRaw.map((entry, index) => normalizeLeaderboardEntry(entry, index)),
    currentUser: normalizeCurrentUserSnapshot(data.currentUser),
  };
}

type FetchDashboardLeaderboardParams = {
  telegramId?: string | null;
  limit?: number;
};

export async function fetchDashboardLeaderboard(
  params: FetchDashboardLeaderboardParams = {}
): Promise<DashboardLeaderboard> {
  const searchParams = new URLSearchParams();
  if (params.telegramId?.trim()) {
    searchParams.set("telegramId", params.telegramId.trim());
  }
  if (params.limit != null && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(Math.round(params.limit)));
  }

  const url = publicApiUrl(
    `/api/users/leaderboard${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
  );
  const response = await fetch(url);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      payload?.error || `Failed to fetch leaderboard: ${response.status}`
    );
  }

  const payload = await response.json();
  return normalizeDashboardLeaderboard(payload, params.telegramId);
}
