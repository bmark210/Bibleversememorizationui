export type PlayerProfile = {
  telegramId: string;
  displayName: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  isCurrentUser: boolean;
  isFriend: boolean;
  lastActiveAt: string | null;
  masteredVerses: number;
  weeklyRepetitions: number;
  dailyStreak: number;
  averageProgressPercent: number;
  createdAt: string | null;
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

function buildFallbackName(telegramId: string) {
  return `Участник #${telegramId.slice(-4) || telegramId}`;
}

function normalizePlayerProfile(value: unknown): PlayerProfile | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Partial<PlayerProfile>;
  const telegramId = toSafeString(data.telegramId);
  if (!telegramId) return null;

  return {
    telegramId,
    displayName: toSafeString(data.displayName, buildFallbackName(telegramId)),
    name: toNullableString(data.name),
    nickname: toNullableString(data.nickname),
    avatarUrl: toNullableString(data.avatarUrl),
    isCurrentUser: Boolean(data.isCurrentUser),
    isFriend: Boolean(data.isFriend),
    lastActiveAt: toNullableString(data.lastActiveAt),
    masteredVerses: toSafeInt(data.masteredVerses, { min: 0 }),
    weeklyRepetitions: toSafeInt(data.weeklyRepetitions, { min: 0 }),
    dailyStreak: toSafeInt(data.dailyStreak, { min: 0 }),
    averageProgressPercent: toSafeInt(data.averageProgressPercent, {
      min: 0,
      max: 100,
    }),
    createdAt: toNullableString(data.createdAt),
  };
}

async function parseResponsePayload(response: Response) {
  return (await response.json().catch(() => null)) as { error?: string } | null;
}

export async function fetchPlayerProfile(
  viewerTelegramId: string,
  targetTelegramId: string
): Promise<PlayerProfile> {
  const response = await fetch(
    `/api/users/${encodeURIComponent(viewerTelegramId)}/players/${encodeURIComponent(
      targetTelegramId
    )}`
  );

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(
      payload?.error || `Failed to fetch player profile: ${response.status}`
    );
  }

  const profile = normalizePlayerProfile(await response.json());
  if (!profile) {
    throw new Error("Invalid player profile payload");
  }

  return profile;
}
