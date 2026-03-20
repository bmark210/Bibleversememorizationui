import { publicApiUrl } from "@/lib/publicApiBase";

export type FriendPlayerListItem = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  isFriend: boolean;
  lastActiveAt: string | null;
  masteredVerses: number;
  weeklyRepetitions: number;
  dailyStreak: number;
  xp: number;
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
  xp: number;
};

export type DashboardFriendsActivitySummary = {
  friendsTotal: number;
  activeLast7Days: number;
  avgWeeklyRepetitions: number;
  avgStreakDays: number;
  avgXp: number;
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
    avgXp: 0,
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

  const masteredRaw =
    (data as { masteredVerses?: unknown }).masteredVerses ??
    (data as { versesCount?: unknown }).versesCount;

  const nickname = toNullableString((data as { nickname?: unknown }).nickname);

  return {
    telegramId,
    name: toSafeString(data.name, nickname ?? `Участник #${telegramId.slice(-4)}`),
    avatarUrl: toNullableString(data.avatarUrl),
    isFriend: Boolean(data.isFriend),
    lastActiveAt: toNullableString(
      (data as { lastActiveAt?: unknown }).lastActiveAt ?? (data as { at?: unknown }).at
    ),
    masteredVerses: toSafeInt(masteredRaw, { min: 0 }),
    weeklyRepetitions: toSafeInt(data.weeklyRepetitions, { min: 0 }),
    dailyStreak: toSafeInt(data.dailyStreak, { min: 0 }),
    xp: toSafeInt((data as { score?: unknown }).score ?? data.xp, { min: 0 }),
  };
}

function normalizeFriendPlayersPageResponse(
  value: unknown
): FriendPlayersPageResponse {
  const data = (value ?? {}) as Partial<FriendPlayersPageResponse>;
  const itemsRaw = Array.isArray(data.items) ? data.items : [];

  const totalRaw =
    (data as { totalCount?: unknown }).totalCount ??
    (data as { total?: unknown }).total;
  const startRaw =
    (data as { startWith?: unknown }).startWith ??
    (data as { offset?: unknown }).offset;

  return {
    items: itemsRaw
      .map((item) => normalizeFriendPlayerListItem(item))
      .filter((item): item is FriendPlayerListItem => item != null),
    totalCount: toSafeInt(totalRaw, { min: 0 }),
    limit: toSafeInt(data.limit, { min: 1, max: 50 }),
    startWith: toSafeInt(startRaw, { min: 0 }),
  };
}

function normalizeFriendsMutationResponse(value: unknown): FriendsMutationResponse {
  const data = (value ?? {}) as Partial<FriendsMutationResponse> & { status?: string };
  const status = toSafeString(data.status, "");
  if (
    status === "added" ||
    status === "already-following" ||
    status === "removed" ||
    status === "not-following"
  ) {
    return { status };
  }
  const lower = status.toLowerCase();
  if (lower.includes("remove") || lower === "deleted") {
    return { status: "removed" };
  }
  if (lower === "not-following" || lower === "not_following") {
    return { status: "not-following" };
  }
  if (lower === "ok" || lower === "success" || status.length > 0) {
    return { status: "added" };
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

  const actNickname = toNullableString((data as { nickname?: unknown }).nickname);

  return {
    telegramId,
    name: toSafeString(data.name, actNickname ?? `Участник #${telegramId.slice(-4)}`),
    avatarUrl: toNullableString(data.avatarUrl),
    lastActiveAt: toNullableString(
      (data as { lastActiveAt?: unknown }).lastActiveAt ?? (data as { at?: unknown }).at
    ),
    masteredVerses: toSafeInt(
      (data as { masteredVerses?: unknown }).masteredVerses ??
        (data as { versesCount?: unknown }).versesCount,
      { min: 0 }
    ),
    weeklyRepetitions: toSafeInt(data.weeklyRepetitions, { min: 0 }),
    dailyStreak: toSafeInt(data.dailyStreak, { min: 0 }),
    xp: toSafeInt((data as { score?: unknown }).score ?? data.xp, { min: 0 }),
  };
}

function normalizeDashboardFriendsActivity(
  value: unknown
): DashboardFriendsActivity {
  const data = (value ?? {}) as Partial<DashboardFriendsActivity> & {
    items?: unknown[];
  };

  const itemsFromGo = Array.isArray(data.items) ? data.items : null;
  if (itemsFromGo && !data.summary) {
    const entries = itemsFromGo
      .map((entry) => normalizeDashboardFriendActivityEntry(entry))
      .filter((entry): entry is DashboardFriendActivityEntry => entry != null);
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        friendsTotal: entries.length,
        activeLast7Days: 0,
        avgWeeklyRepetitions: 0,
        avgStreakDays: 0,
        avgXp: 0,
      },
      entries,
    };
  }

  const entriesRaw = Array.isArray(data.entries) ? data.entries : [];
  const summary = (data.summary ?? {}) as Partial<DashboardFriendsActivitySummary>;

  return {
    generatedAt: toSafeString(data.generatedAt, new Date().toISOString()),
    summary: {
      friendsTotal: toSafeInt(summary.friendsTotal, { min: 0 }),
      activeLast7Days: toSafeInt(summary.activeLast7Days, { min: 0 }),
      avgWeeklyRepetitions: toSafeInt(summary.avgWeeklyRepetitions, { min: 0 }),
      avgStreakDays: toSafeInt(summary.avgStreakDays, { min: 0 }),
      avgXp: toSafeInt(summary.avgXp, { min: 0 }),
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

  const url = publicApiUrl(
    `/api/users/${encodeURIComponent(telegramId)}/players${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`
  );
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

  const url = publicApiUrl(
    `/api/users/${encodeURIComponent(telegramId)}/friends${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`
  );
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
  const response = await fetch(
    publicApiUrl(`/api/users/${encodeURIComponent(telegramId)}/friends`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetTelegramId }),
    }
  );

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(payload?.error || `Failed to add friend: ${response.status}`);
  }

  return normalizeFriendsMutationResponse(await response.json());
}

export async function removeFriend(
  telegramId: string,
  targetTelegramId: string
): Promise<FriendsMutationResponse> {
  const response = await fetch(
    publicApiUrl(
      `/api/users/${encodeURIComponent(telegramId)}/friends/${encodeURIComponent(
        targetTelegramId
      )}`
    ),
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
  params: { limit?: number } = {}
): Promise<DashboardFriendsActivity> {
  const searchParams = new URLSearchParams();
  if (params.limit != null && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(Math.round(params.limit)));
  }

  const url = publicApiUrl(
    `/api/users/${encodeURIComponent(telegramId)}/friends/activity${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`
  );
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(
      payload?.error || `Failed to fetch friends activity: ${response.status}`
    );
  }

  return normalizeDashboardFriendsActivity(await response.json());
}
