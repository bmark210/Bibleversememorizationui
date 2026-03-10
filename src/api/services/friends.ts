export type FriendPlayerListItem = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  isFriend: boolean;
  lastActiveAt: string | null;
  masteredVerses: number;
  weeklyRepetitions: number;
  dailyStreak: number;
  averageProgressPercent: number;
};

export type FriendPlayersPageResponse = {
  items: FriendPlayerListItem[];
  totalCount: number;
  limit: number;
  startWith: number;
};

export type FriendsMutationResponse = {
  status: "added" | "already-following" | "removed" | "not-following";
};

export type DashboardFriendActivityEntry = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  lastActiveAt: string | null;
  masteredVerses: number;
  weeklyRepetitions: number;
  dailyStreak: number;
  averageProgressPercent: number;
};

export type DashboardFriendsActivitySummary = {
  friendsTotal: number;
  activeLast7Days: number;
  avgWeeklyRepetitions: number;
  avgStreakDays: number;
  avgProgressPercent: number;
};

export type DashboardFriendsActivity = {
  generatedAt: string;
  summary: DashboardFriendsActivitySummary;
  entries: DashboardFriendActivityEntry[];
};

export const EMPTY_FRIEND_PLAYERS_PAGE: FriendPlayersPageResponse = {
  items: [],
  totalCount: 0,
  limit: 8,
  startWith: 0,
};

export const EMPTY_DASHBOARD_FRIENDS_ACTIVITY: DashboardFriendsActivity = {
  generatedAt: new Date(0).toISOString(),
  summary: {
    friendsTotal: 0,
    activeLast7Days: 0,
    avgWeeklyRepetitions: 0,
    avgStreakDays: 0,
    avgProgressPercent: 0,
  },
  entries: [],
};

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

function toSafeInt(value: unknown, options?: { min?: number; max?: number }) {
  const numeric = Number(value);
  const min = options?.min ?? 0;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

export function normalizeFriendPlayerListItem(value: unknown): FriendPlayerListItem | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<FriendPlayerListItem>;
  const telegramId = toSafeString(data.telegramId);
  if (!telegramId) return null;

  return {
    telegramId,
    name: toSafeString(data.name, `Участник #${telegramId.slice(-4)}`),
    avatarUrl: toNullableString(data.avatarUrl),
    isFriend: Boolean(data.isFriend),
    lastActiveAt: toNullableString(data.lastActiveAt),
    masteredVerses: toSafeInt((data as { masteredVerses?: unknown }).masteredVerses, { min: 0 }),
    weeklyRepetitions: toSafeInt(data.weeklyRepetitions, { min: 0 }),
    dailyStreak: toSafeInt(data.dailyStreak, { min: 0 }),
    averageProgressPercent: toSafeInt(data.averageProgressPercent, {
      min: 0,
      max: 100,
    }),
  };
}

function normalizeFriendPlayersPageResponse(
  value: unknown
): FriendPlayersPageResponse {
  const data = (value ?? {}) as Partial<FriendPlayersPageResponse>;
  const itemsRaw = Array.isArray(data.items) ? data.items : [];

  return {
    items: itemsRaw
      .map((item) => normalizeFriendPlayerListItem(item))
      .filter((item): item is FriendPlayerListItem => item != null),
    totalCount: toSafeInt(data.totalCount, { min: 0 }),
    limit: toSafeInt(data.limit, { min: 1, max: 50 }),
    startWith: toSafeInt(data.startWith, { min: 0 }),
  };
}

function normalizeFriendsMutationResponse(value: unknown): FriendsMutationResponse {
  const data = (value ?? {}) as Partial<FriendsMutationResponse>;
  const status = toSafeString(data.status, "");
  if (
    status === "added" ||
    status === "already-following" ||
    status === "removed" ||
    status === "not-following"
  ) {
    return { status };
  }
  return { status: "already-following" };
}

export function normalizeDashboardFriendActivityEntry(
  value: unknown
): DashboardFriendActivityEntry | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<DashboardFriendActivityEntry>;
  const telegramId = toSafeString(data.telegramId);
  if (!telegramId) return null;

  return {
    telegramId,
    name: toSafeString(data.name, `Участник #${telegramId.slice(-4)}`),
    avatarUrl: toNullableString(data.avatarUrl),
    lastActiveAt: toNullableString(data.lastActiveAt),
    masteredVerses: toSafeInt((data as { masteredVerses?: unknown }).masteredVerses, { min: 0 }),
    weeklyRepetitions: toSafeInt(data.weeklyRepetitions, { min: 0 }),
    dailyStreak: toSafeInt(data.dailyStreak, { min: 0 }),
    averageProgressPercent: toSafeInt(data.averageProgressPercent, {
      min: 0,
      max: 100,
    }),
  };
}

function normalizeDashboardFriendsActivity(
  value: unknown
): DashboardFriendsActivity {
  const data = (value ?? {}) as Partial<DashboardFriendsActivity>;
  const entriesRaw = Array.isArray(data.entries) ? data.entries : [];
  const summary = (data.summary ?? {}) as Partial<DashboardFriendsActivitySummary>;

  return {
    generatedAt: toSafeString(data.generatedAt, new Date().toISOString()),
    summary: {
      friendsTotal: toSafeInt(summary.friendsTotal, { min: 0 }),
      activeLast7Days: toSafeInt(summary.activeLast7Days, { min: 0 }),
      avgWeeklyRepetitions: toSafeInt(summary.avgWeeklyRepetitions, { min: 0 }),
      avgStreakDays: toSafeInt(summary.avgStreakDays, { min: 0 }),
      avgProgressPercent: toSafeInt(summary.avgProgressPercent, {
        min: 0,
        max: 100,
      }),
    },
    entries: entriesRaw
      .map((entry) => normalizeDashboardFriendActivityEntry(entry))
      .filter((entry): entry is DashboardFriendActivityEntry => entry != null),
  };
}

async function parseResponsePayload(response: Response) {
  return (await response.json().catch(() => null)) as { error?: string } | null;
}

function appendListQuery(
  searchParams: URLSearchParams,
  params: {
    search?: string;
    limit?: number;
    startWith?: number;
  }
) {
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.limit != null && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(Math.round(params.limit)));
  }
  if (params.startWith != null && Number.isFinite(params.startWith)) {
    searchParams.set("startWith", String(Math.max(0, Math.round(params.startWith))));
  }
}

export async function fetchPlayersPage(
  telegramId: string,
  params: {
    search?: string;
    limit?: number;
    startWith?: number;
  } = {}
): Promise<FriendPlayersPageResponse> {
  const searchParams = new URLSearchParams();
  appendListQuery(searchParams, params);

  const url = `/api/users/${encodeURIComponent(telegramId)}/players${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(payload?.error || `Failed to fetch players: ${response.status}`);
  }

  return normalizeFriendPlayersPageResponse(await response.json());
}

export async function fetchFriendsPage(
  telegramId: string,
  params: {
    search?: string;
    limit?: number;
    startWith?: number;
  } = {}
): Promise<FriendPlayersPageResponse> {
  const searchParams = new URLSearchParams();
  appendListQuery(searchParams, params);

  const url = `/api/users/${encodeURIComponent(telegramId)}/friends${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(payload?.error || `Failed to fetch friends: ${response.status}`);
  }

  return normalizeFriendPlayersPageResponse(await response.json());
}

export async function addFriend(
  telegramId: string,
  targetTelegramId: string
): Promise<FriendsMutationResponse> {
  const response = await fetch(`/api/users/${encodeURIComponent(telegramId)}/friends`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      targetTelegramId: targetTelegramId.trim(),
    }),
  });

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(payload?.error || `Failed to add friend: ${response.status}`);
  }

  return normalizeFriendsMutationResponse(await response.json());
}

export async function removeFriend(
  telegramId: string,
  friendTelegramId: string
): Promise<FriendsMutationResponse> {
  const response = await fetch(
    `/api/users/${encodeURIComponent(telegramId)}/friends/${encodeURIComponent(
      friendTelegramId
    )}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(payload?.error || `Failed to remove friend: ${response.status}`);
  }

  return normalizeFriendsMutationResponse(await response.json());
}

export async function fetchDashboardFriendsActivity(
  telegramId: string,
  params: {
    limit?: number;
  } = {}
): Promise<DashboardFriendsActivity> {
  const searchParams = new URLSearchParams();
  if (params.limit != null && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(Math.max(1, Math.round(params.limit))));
  }

  const url = `/api/users/${encodeURIComponent(telegramId)}/friends/activity${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(
      payload?.error ||
        `Failed to fetch dashboard friends activity: ${response.status}`
    );
  }

  return normalizeDashboardFriendsActivity(await response.json());
}
