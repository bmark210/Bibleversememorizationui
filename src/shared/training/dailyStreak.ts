const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeStreakValue(value: number | null | undefined): number {
  const parsed = Math.round(Number(value ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function toUtcDayIndex(value: Date): number {
  return Math.floor(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) /
      MS_PER_DAY
  );
}

export function computeNextDailyStreakOnReview(params: {
  currentStreak: number | null | undefined;
  latestReviewedAt: Date | null;
  reviewedAt: Date;
}): { shouldUpdate: boolean; nextStreak: number } {
  const currentStreak = normalizeStreakValue(params.currentStreak);
  const latestReviewedAt = params.latestReviewedAt;
  const reviewDay = toUtcDayIndex(params.reviewedAt);

  if (!latestReviewedAt) {
    return { shouldUpdate: true, nextStreak: 1 };
  }

  const latestDay = toUtcDayIndex(latestReviewedAt);

  if (reviewDay < latestDay) {
    return { shouldUpdate: false, nextStreak: currentStreak };
  }

  if (reviewDay === latestDay) {
    if (currentStreak > 0) {
      return { shouldUpdate: false, nextStreak: currentStreak };
    }
    return { shouldUpdate: true, nextStreak: 1 };
  }

  if (reviewDay === latestDay + 1) {
    return { shouldUpdate: true, nextStreak: Math.max(1, currentStreak) + 1 };
  }

  return { shouldUpdate: true, nextStreak: 1 };
}

export function computeActiveDailyStreak(params: {
  storedStreak: number | null | undefined;
  latestReviewedAt: Date | null;
  now?: Date;
}): number {
  const storedStreak = normalizeStreakValue(params.storedStreak);
  if (storedStreak <= 0 || !params.latestReviewedAt) {
    return 0;
  }

  const now = params.now ?? new Date();
  const latestDay = toUtcDayIndex(params.latestReviewedAt);
  const today = toUtcDayIndex(now);

  if (latestDay < today - 1) {
    return 0;
  }

  return storedStreak;
}
