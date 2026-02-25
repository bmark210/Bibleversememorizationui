import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import { VerseStatus } from '@/generated/prisma';
import type { DailyGoalPlan } from './types';

export type DailyGoalVerseSource = {
  id?: string | number | null;
  externalVerseId?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  nextReviewAt?: string | Date | null;
  lastReviewedAt?: string | Date | null;
};

type TrainingBatchPreferencesLike = {
  newVersesCount: number;
  reviewVersesCount: number;
};

type DailyGoalPlannerOptions = {
  dayKey: string;
};

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getVerseIdentity(verse: DailyGoalVerseSource) {
  return String(verse.externalVerseId ?? verse.id ?? '');
}

function sortByMostRecentlyUpdatedDesc<T extends DailyGoalVerseSource>(a: T, b: T) {
  const aUpdated = parseDateValue(a.updatedAt)?.getTime();
  const bUpdated = parseDateValue(b.updatedAt)?.getTime();
  const aUpdatedSafe = aUpdated ?? Number.NEGATIVE_INFINITY;
  const bUpdatedSafe = bUpdated ?? Number.NEGATIVE_INFINITY;
  if (aUpdatedSafe !== bUpdatedSafe) return bUpdatedSafe - aUpdatedSafe;

  const aLast = parseDateValue(a.lastReviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bLast = parseDateValue(b.lastReviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aLast !== bLast) return bLast - aLast;

  const aCreated = parseDateValue(a.createdAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bCreated = parseDateValue(b.createdAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aCreated !== bCreated) return bCreated - aCreated;

  return getVerseIdentity(a).localeCompare(getVerseIdentity(b));
}

export function buildDailyGoalPlan<T extends DailyGoalVerseSource>(
  todayVerses: T[],
  prefs: TrainingBatchPreferencesLike,
  options: DailyGoalPlannerOptions
): DailyGoalPlan {
  const requestedNew = Math.max(0, Math.round(Number(prefs.newVersesCount) || 0));
  const requestedReview = Math.max(0, Math.round(Number(prefs.reviewVersesCount) || 0));

  const newPool = todayVerses
    .filter((verse) => normalizeDisplayVerseStatus(verse.status) === VerseStatus.LEARNING)
    .sort(sortByMostRecentlyUpdatedDesc);

  const reviewPool = todayVerses
    .filter((verse) => {
      const status = normalizeDisplayVerseStatus(verse.status);
      return status === 'REVIEW';
    })
    .sort(sortByMostRecentlyUpdatedDesc);

  const newTargets = requestedNew > 0 ? newPool.slice(0, requestedNew) : [];
  const reviewTargets = requestedReview > 0 ? reviewPool.slice(0, requestedReview) : [];

  return {
    dayKey: options.dayKey,
    prefsSnapshot: { newVersesCount: requestedNew, reviewVersesCount: requestedReview },
    requestedCounts: { new: requestedNew, review: requestedReview },
    availableCounts: { new: newTargets.length, review: reviewTargets.length },
    targetVerseIds: {
      new: newTargets.map(getVerseIdentity).filter(Boolean),
      review: reviewTargets.map(getVerseIdentity).filter(Boolean),
    },
    shortages: {
      new: Math.max(0, requestedNew - newTargets.length),
      review: Math.max(0, requestedReview - reviewTargets.length),
    },
  };
}

export function getVerseId(value: DailyGoalVerseSource) {
  return getVerseIdentity(value);
}
