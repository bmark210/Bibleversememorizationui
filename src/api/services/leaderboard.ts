export type LeaderboardEntry = {
  rank: number;
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  streakDays: number;
  weeklyRepetitions: number;
  isCurrentUser: boolean;
};

export type CurrentUserLeaderboardSnapshot = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  rank: number | null;
  score: number;
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
    score: toSafeInt(data.score, { min: 0, max: 100 }),
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
    score: toSafeInt(data.score, { min: 0, max: 100 }),
    streakDays: toSafeInt(data.streakDays, { min: 0 }),
    weeklyRepetitions: toSafeInt(data.weeklyRepetitions, { min: 0 }),
  };
}

export function normalizeDashboardLeaderboard(value: unknown): DashboardLeaderboard {
  const data = (value ?? {}) as Partial<DashboardLeaderboard>;
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

  const url = `/api/users/leaderboard${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;
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
  return normalizeDashboardLeaderboard(payload);
}
