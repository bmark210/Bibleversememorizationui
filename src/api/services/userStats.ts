import { publicApiUrl } from "@/lib/publicApiBase";

export type UserDashboardStats = {
  totalVerses: number;
  learningStatusVerses: number;
  learningVerses: number;
  reviewVerses: number;
  masteredVerses: number;
  stoppedVerses: number;
  dueReviewVerses: number;
  totalRepetitions: number;
  xp: number;
  bestVerseReference: string | null;
  dailyStreak: number;
};

export const EMPTY_USER_DASHBOARD_STATS: UserDashboardStats = {
  totalVerses: 0,
  learningStatusVerses: 0,
  learningVerses: 0,
  reviewVerses: 0,
  masteredVerses: 0,
  stoppedVerses: 0,
  dueReviewVerses: 0,
  totalRepetitions: 0,
  xp: 0,
  bestVerseReference: null,
  dailyStreak: 0,
};

function toSafeNonNegativeInt(value: unknown): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return 0;
  return Math.max(0, Math.round(normalized));
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeUserDashboardStats(value: unknown): UserDashboardStats {
  const data = (value ?? {}) as Partial<UserDashboardStats> & {
    versesCount?: unknown;
    masteredCount?: unknown;
    xp?: unknown;
  };

  if (
    typeof data.versesCount === "number" &&
    data.totalVerses === undefined &&
    data.learningVerses === undefined
  ) {
    const total = toSafeNonNegativeInt(data.versesCount);
    const mastered = toSafeNonNegativeInt(data.masteredCount);
    return {
      totalVerses: total,
      learningStatusVerses: 0,
      learningVerses: Math.max(0, total - mastered),
      reviewVerses: 0,
      masteredVerses: mastered,
      stoppedVerses: 0,
      dueReviewVerses: 0,
      totalRepetitions: 0,
      xp: toSafeNonNegativeInt(data.xp),
      bestVerseReference: null,
      dailyStreak: toSafeNonNegativeInt(data.dailyStreak),
    };
  }

  return {
    totalVerses: toSafeNonNegativeInt(data.totalVerses),
    learningStatusVerses: toSafeNonNegativeInt(data.learningStatusVerses),
    learningVerses: toSafeNonNegativeInt(data.learningVerses),
    reviewVerses: toSafeNonNegativeInt(data.reviewVerses),
    masteredVerses: toSafeNonNegativeInt(data.masteredVerses),
    stoppedVerses: toSafeNonNegativeInt(data.stoppedVerses),
    dueReviewVerses: toSafeNonNegativeInt(data.dueReviewVerses),
    totalRepetitions: toSafeNonNegativeInt(data.totalRepetitions),
    xp: toSafeNonNegativeInt(data.xp),
    bestVerseReference: toNullableString(data.bestVerseReference),
    dailyStreak: toSafeNonNegativeInt(data.dailyStreak),
  };
}

export async function fetchUserDashboardStats(
  telegramId: string
): Promise<UserDashboardStats> {
  const response = await fetch(
    publicApiUrl(`/api/users/${encodeURIComponent(telegramId)}/stats`)
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      payload?.error || `Failed to fetch user dashboard stats: ${response.status}`
    );
  }

  const payload = await response.json();
  return normalizeUserDashboardStats(payload);
}
