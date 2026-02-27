import type { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import { TRAINING_STAGE_MASTERY_MAX } from '@/shared/training/constants';

export type VerseListStatusFilter =
  | 'all'
  | 'learning'
  | 'review'
  | 'mastered'
  | 'stopped'
  | 'new';
export type VerseStageVisualKey = Exclude<VerseListStatusFilter, 'all'>;
export type StoppedVerseStageKind = 'progress' | 'review' | 'mastered';

export type FilterVisualTheme = {
  dotClassName: string;
  activeTabClassName: string;
  currentBadgeClassName: string;
  statusBadgeClassName: string;
  cardClassName: string;
};

export const VERSE_LIST_PAGE_SIZE = 5;
export const SCROLL_ACTIVATION_DELTA_PX = 0;
export const AUTO_LOAD_BOTTOM_THRESHOLD_PX = 0;
export const PREFETCH_ROWS = 0;
// Minimum time to keep the list skeleton visible (initial fetch and load-more requests).
export const LOAD_MORE_SKELETON_DELAY_MS = 500;
export const STOPPED_REVIEW_MASTERY_THRESHOLD = TRAINING_STAGE_MASTERY_MAX;
export const STOPPED_MASTERED_REPETITIONS_THRESHOLD = 5;

export const FILTER_VISUAL_THEME: Record<VerseListStatusFilter, FilterVisualTheme> = {
  all: {
    dotClassName: 'bg-foreground/60',
    activeTabClassName: 'border-foreground/20 bg-foreground/8 text-foreground',
    currentBadgeClassName: 'border-foreground/15 bg-foreground/5 text-foreground/90',
    statusBadgeClassName: 'border-border/70 bg-background/80 text-foreground/90',
    cardClassName: 'bg-card border-border/70',
  },
  learning: {
    dotClassName: 'bg-emerald-400',
    activeTabClassName:
      'border-emerald-500/30 bg-emerald-500/14 text-emerald-700 dark:text-emerald-300',
    currentBadgeClassName:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    statusBadgeClassName:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    cardClassName: 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/7 via-card to-card',
  },
  review: {
    dotClassName: 'bg-violet-400',
    activeTabClassName:
      'border-violet-500/30 bg-violet-500/14 text-violet-700 dark:text-violet-300',
    currentBadgeClassName:
      'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    statusBadgeClassName:
      'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    cardClassName: 'border-violet-500/22 bg-gradient-to-br from-violet-500/9 via-card to-card',
  },
  mastered: {
    dotClassName: 'bg-amber-400',
    activeTabClassName:
      'border-amber-500/30 bg-amber-500/14 text-amber-800 dark:text-amber-300',
    currentBadgeClassName:
      'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    statusBadgeClassName:
      'border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-300',
    cardClassName:
      'border-amber-500/28 bg-gradient-to-br from-amber-400/14 via-card to-yellow-300/6',
  },
  stopped: {
    dotClassName: 'bg-rose-400',
    activeTabClassName: 'border-rose-500/30 bg-rose-500/14 text-rose-700 dark:text-rose-300',
    currentBadgeClassName:
      'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    statusBadgeClassName:
      'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    cardClassName: 'border-rose-500/18 bg-gradient-to-br from-rose-500/6 via-card to-card',
  },
  new: {
    dotClassName: 'bg-sky-400',
    activeTabClassName: 'border-sky-500/30 bg-sky-500/14 text-sky-700 dark:text-sky-300',
    currentBadgeClassName:
      'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    statusBadgeClassName:
      'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    cardClassName: 'border-sky-500/18 bg-gradient-to-br from-sky-500/6 via-card to-card',
  },
};

export function getStoppedVerseStageKind(
  verse: Pick<Verse, 'masteryLevel' | 'repetitions'>
): StoppedVerseStageKind {
  const masteryLevel = Math.max(0, Number(verse.masteryLevel ?? 0));
  const repetitions = Math.max(0, Number(verse.repetitions ?? 0));

  if (masteryLevel < STOPPED_REVIEW_MASTERY_THRESHOLD) {
    return 'progress';
  }

  if (repetitions >= STOPPED_MASTERED_REPETITIONS_THRESHOLD) {
    return 'mastered';
  }

  return 'review';
}

export function getVerseStageVisual(
  verse: Pick<Verse, 'status' | 'masteryLevel' | 'repetitions'>
): {
  key: VerseStageVisualKey;
  label: string;
} {
  const status = normalizeDisplayVerseStatus(verse.status);
  if (status === VerseStatus.NEW) {
    return { key: 'new', label: 'Новый' };
  }

  if (status === VerseStatus.STOPPED) {
    const stoppedKind = getStoppedVerseStageKind(verse);
    if (stoppedKind === 'mastered') {
      return { key: 'stopped', label: 'Выучено · пауза' };
    }
    if (stoppedKind === 'review') {
      return { key: 'stopped', label: 'Повторение · пауза' };
    }
    return { key: 'stopped', label: 'На паузе' };
  }

  if (status === 'MASTERED') {
    return { key: 'mastered', label: 'Выучено' };
  }

  if (status === 'REVIEW') {
    return { key: 'review', label: 'Повторение' };
  }

  return { key: 'learning', label: 'Изучение' };
}

export function getVerseCardLayoutSignature(
  verse: Pick<Verse, 'status' | 'masteryLevel' | 'repetitions'>
):
  | 'new'
  | 'learning-progress'
  | 'review-pill'
  | 'stopped-progress'
  | 'stopped-repeat'
  | 'stopped-mastered' {
  const status = normalizeDisplayVerseStatus(verse.status);

  if (status === VerseStatus.NEW) {
    return 'new';
  }

  if (status === VerseStatus.LEARNING) {
    return 'learning-progress';
  }

  if (status === 'REVIEW' || status === 'MASTERED') {
    return 'review-pill';
  }

  const stoppedKind = getStoppedVerseStageKind(verse);
  if (stoppedKind === 'mastered') return 'stopped-mastered';
  if (stoppedKind === 'review') return 'stopped-repeat';
  return 'stopped-progress';
}
