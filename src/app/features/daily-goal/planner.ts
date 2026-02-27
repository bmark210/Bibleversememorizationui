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

function getVerseIdentity(verse: DailyGoalVerseSource) {
  return String(verse.externalVerseId ?? verse.id ?? '');
}

export function buildDailyGoalPlan<T extends DailyGoalVerseSource>(
  todayVerses: T[],
  prefs: TrainingBatchPreferencesLike,
  options: DailyGoalPlannerOptions
): DailyGoalPlan {
  const requestedNew = Math.max(0, Math.round(Number(prefs.newVersesCount) || 0));
  const requestedReview = Math.max(0, Math.round(Number(prefs.reviewVersesCount) || 0));

  const availableNew = todayVerses.filter(
    (verse) => normalizeDisplayVerseStatus(verse.status) === VerseStatus.LEARNING
  ).length;

  const availableReview = todayVerses.filter((verse) => {
    const status = normalizeDisplayVerseStatus(verse.status);
    return status === 'REVIEW';
  }).length;

  return {
    dayKey: options.dayKey,
    prefsSnapshot: { newVersesCount: requestedNew, reviewVersesCount: requestedReview },
    requestedCounts: { new: requestedNew, review: requestedReview },
    availableCounts: { new: availableNew, review: availableReview },
    shortages: {
      new: Math.max(0, requestedNew - availableNew),
      review: Math.max(0, requestedReview - availableReview),
    },
  };
}

export function getVerseId(value: DailyGoalVerseSource) {
  return getVerseIdentity(value);
}
