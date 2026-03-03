export type UserDashboardStats = {
  totalVerses: number;
  learningVerses: number;
  reviewVerses: number;
  masteredVerses: number;
  stoppedVerses: number;
  dueReviewVerses: number;
  totalRepetitions: number;
  averageProgressPercent: number;
  bestVerseReference: string | null;
  dailyStreak: number;
};

export const EMPTY_USER_DASHBOARD_STATS: UserDashboardStats = {
  totalVerses: 0,
  learningVerses: 0,
  reviewVerses: 0,
  masteredVerses: 0,
  stoppedVerses: 0,
  dueReviewVerses: 0,
  totalRepetitions: 0,
  averageProgressPercent: 0,
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
  const data = (value ?? {}) as Partial<UserDashboardStats>;

  return {
    totalVerses: toSafeNonNegativeInt(data.totalVerses),
    learningVerses: toSafeNonNegativeInt(data.learningVerses),
    reviewVerses: toSafeNonNegativeInt(data.reviewVerses),
    masteredVerses: toSafeNonNegativeInt(data.masteredVerses),
    stoppedVerses: toSafeNonNegativeInt(data.stoppedVerses),
    dueReviewVerses: toSafeNonNegativeInt(data.dueReviewVerses),
    totalRepetitions: toSafeNonNegativeInt(data.totalRepetitions),
    averageProgressPercent: Math.max(
      0,
      Math.min(100, toSafeNonNegativeInt(data.averageProgressPercent))
    ),
    bestVerseReference: toNullableString(data.bestVerseReference),
    dailyStreak: toSafeNonNegativeInt(data.dailyStreak),
  };
}

export async function fetchUserDashboardStats(
  telegramId: string
): Promise<UserDashboardStats> {
  const response = await fetch(
    `/api/users/${encodeURIComponent(telegramId)}/stats`
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
