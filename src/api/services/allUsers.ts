export type AllUsersEntry = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
  dailyStreak: number;
};

export type AllUsersResponse = {
  generatedAt: string;
  totalCount: number;
  entries: AllUsersEntry[];
};

export const EMPTY_ALL_USERS_RESPONSE: AllUsersResponse = {
  generatedAt: new Date(0).toISOString(),
  totalCount: 0,
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

export function normalizeAllUsersEntry(value: unknown): AllUsersEntry | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<AllUsersEntry>;
  const telegramId = toSafeString(data.telegramId);
  if (!telegramId) return null;

  return {
    telegramId,
    name: toSafeString(data.name, `Участник #${telegramId.slice(-4)}`),
    avatarUrl: toNullableString(data.avatarUrl),
    xp: toSafeInt(data.xp, { min: 0 }),
    dailyStreak: toSafeInt(data.dailyStreak, { min: 0 }),
  };
}

export function normalizeAllUsersResponse(value: unknown): AllUsersResponse {
  const data = (value ?? {}) as Partial<AllUsersResponse>;
  const entriesRaw = Array.isArray(data.entries) ? data.entries : [];

  return {
    generatedAt: toSafeString(data.generatedAt, new Date().toISOString()),
    totalCount: toSafeInt(data.totalCount, { min: 0 }),
    entries: entriesRaw
      .map((entry) => normalizeAllUsersEntry(entry))
      .filter((entry): entry is AllUsersEntry => entry != null),
  };
}

export async function fetchAllUsers(
  params: { limit?: number } = {}
): Promise<AllUsersResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit != null && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(Math.round(params.limit)));
  }

  const url = `/api/users${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      payload?.error || `Failed to fetch all users: ${response.status}`
    );
  }

  return normalizeAllUsersResponse(await response.json());
}
