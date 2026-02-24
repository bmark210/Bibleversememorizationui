import type { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { TRAINING_STAGE_MASTERY_MAX } from '@/shared/training/constants';

export type VerseListStatusFilter = 'all' | 'learning' | 'review' | 'stopped' | 'new';
export type VerseStageVisualKey = Exclude<VerseListStatusFilter, 'all'>;

export type FilterVisualTheme = {
  dotClassName: string;
  activeTabClassName: string;
  currentBadgeClassName: string;
  statusBadgeClassName: string;
  cardClassName: string;
};

export const VERSE_LIST_PAGE_SIZE = 5;
export const SCROLL_ACTIVATION_DELTA_PX = 4;
export const AUTO_LOAD_BOTTOM_THRESHOLD_PX = 0;
export const PREFETCH_ROWS = 0;
export const LOAD_MORE_SKELETON_DELAY_MS = 160;

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

export function getVerseStageVisual(status: VerseStatus, masteryLevel: number): {
  key: VerseStageVisualKey;
  label: string;
} {
  if (status === VerseStatus.NEW) {
    return { key: 'new', label: 'Новый' };
  }

  if (status === VerseStatus.STOPPED) {
    return { key: 'stopped', label: 'На паузе' };
  }

  if (status === VerseStatus.LEARNING && masteryLevel > TRAINING_STAGE_MASTERY_MAX) {
    return { key: 'review', label: 'Повторение' };
  }

  return { key: 'learning', label: 'Изучение' };
}

export function getVerseCardLayoutSignature(
  verse: Pick<Verse, 'status' | 'masteryLevel' | 'repetitions'>
): 'new' | 'learning-progress' | 'review-pill' | 'stopped-progress' | 'stopped-repeat' {
  const masteryLevel = Number(verse.masteryLevel ?? 0);

  if (verse.status === VerseStatus.NEW) {
    return 'new';
  }

  if (verse.status === VerseStatus.LEARNING) {
    return masteryLevel > TRAINING_STAGE_MASTERY_MAX ? 'review-pill' : 'learning-progress';
  }

  return masteryLevel > TRAINING_STAGE_MASTERY_MAX ? 'stopped-repeat' : 'stopped-progress';
}
