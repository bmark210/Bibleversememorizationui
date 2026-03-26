import type { Verse } from "@/app/domain/verse";
import { VerseStatus } from '@/shared/domain/verseStatus';
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import { REPEAT_THRESHOLD_FOR_MASTERED, TRAINING_STAGE_MASTERY_MAX } from '@/shared/training/constants';

export type VerseListStatusFilter =
  | "catalog"
  | "friends"
  | "learning"
  | "review"
  | "mastered"
  | "stopped"
  | "my";
export type VerseListSortBy = "updatedAt" | "bible" | "popularity";
export type VerseStageVisualKey = VerseListStatusFilter;
export type StoppedVerseStageKind = "progress" | "review" | "mastered";

export type FilterVisualTheme = {
  dotClassName: string;
  activeTabClassName: string;
  currentBadgeClassName: string;
  statusBadgeClassName: string;
  cardClassName: string;
};

export const VERSE_LIST_PAGE_SIZE = 20;
export const SCROLL_ACTIVATION_DELTA_PX = 8;
export const AUTO_LOAD_BOTTOM_THRESHOLD_PX = 0;
export const PREFETCH_ROWS = 6;
// Minimum time to keep the list skeleton visible (initial fetch and load-more requests).
export const LOAD_MORE_SKELETON_DELAY_MS = 250;
export const STOPPED_REVIEW_MASTERY_THRESHOLD = TRAINING_STAGE_MASTERY_MAX;
export const STOPPED_MASTERED_REPETITIONS_THRESHOLD = REPEAT_THRESHOLD_FOR_MASTERED;
export const DEFAULT_VERSE_LIST_STATUS_FILTER: VerseListStatusFilter = "catalog";
export const DEFAULT_VERSE_LIST_SORT_BY: VerseListSortBy = "bible";

export const FILTER_VISUAL_THEME: Record<VerseListStatusFilter, FilterVisualTheme> = {
  catalog: {
    dotClassName: 'bg-text-muted',
    activeTabClassName: 'border-border-default bg-bg-elevated text-text-secondary shadow-[var(--shadow-soft)]',
    currentBadgeClassName: 'border-border-default bg-bg-elevated text-text-secondary',
    statusBadgeClassName: 'border-border-default bg-bg-elevated text-text-secondary',
    cardClassName: 'bg-gradient-to-br from-bg-subtle via-bg-surface to-bg-elevated',
  },
  friends: {
    dotClassName: 'bg-status-community',
    activeTabClassName: 'border-status-community/30 bg-status-community-soft text-status-community shadow-[var(--shadow-soft)]',
    currentBadgeClassName:
      'border-status-community/25 bg-status-community-soft text-status-community',
    statusBadgeClassName:
      'border-status-community/25 bg-status-community-soft text-status-community',
    cardClassName: 'bg-gradient-to-br from-status-community-soft via-bg-surface to-bg-elevated',
  },
  learning: {
    dotClassName: 'bg-status-learning',
    activeTabClassName:
      'border-status-learning/30 bg-status-learning-soft text-status-learning shadow-[var(--shadow-soft)]',
    currentBadgeClassName:
      'border-status-learning/25 bg-status-learning-soft text-status-learning',
    statusBadgeClassName:
      'border-status-learning/25 bg-status-learning-soft text-status-learning',
    cardClassName: 'bg-gradient-to-br from-status-learning-soft via-bg-surface to-bg-elevated',
  },
  review: {
    dotClassName: 'bg-status-review',
    activeTabClassName:
      'border-status-review/30 bg-status-review-soft text-status-review shadow-[var(--shadow-soft)]',
    currentBadgeClassName:
      'border-status-review/25 bg-status-review-soft text-status-review',
    statusBadgeClassName:
      'border-status-review/25 bg-status-review-soft text-status-review',
    cardClassName: 'bg-gradient-to-br from-status-review-soft via-bg-surface to-bg-elevated',
  },
  mastered: {
    dotClassName: 'bg-status-mastered',
    activeTabClassName:
      'border-status-mastered/30 bg-status-mastered-soft text-status-mastered shadow-[var(--shadow-soft)]',
    currentBadgeClassName:
      'border-status-mastered/25 bg-status-mastered-soft text-status-mastered',
    statusBadgeClassName:
      'border-status-mastered/25 bg-status-mastered-soft text-status-mastered',
    cardClassName: 'bg-gradient-to-br from-status-mastered-soft via-bg-surface to-bg-elevated',
  },
  stopped: {
    dotClassName: 'bg-status-paused',
    activeTabClassName: 'border-status-paused/30 bg-status-paused-soft text-status-paused shadow-[var(--shadow-soft)]',
    currentBadgeClassName:
      'border-status-paused/25 bg-status-paused-soft text-status-paused',
    statusBadgeClassName:
      'border-status-paused/25 bg-status-paused-soft text-status-paused',
    cardClassName: 'bg-gradient-to-br from-status-paused-soft via-bg-surface to-bg-elevated',
  },
  my: {
    dotClassName: 'bg-status-collection',
    activeTabClassName: 'border-status-collection/30 bg-status-collection-soft text-status-collection shadow-[var(--shadow-soft)]',
    currentBadgeClassName:
      'border-status-collection/25 bg-status-collection-soft text-status-collection',
    statusBadgeClassName:
      'border-status-collection/25 bg-status-collection-soft text-status-collection',
    cardClassName: 'bg-gradient-to-br from-status-collection-soft via-bg-surface to-bg-elevated',
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
  if (status === "CATALOG") {
    return { key: "catalog", label: "Каталог" };
  }

  if (status === VerseStatus.MY) {
    return { key: "my", label: "Мой" };
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
  | 'catalog'
  | 'my'
  | 'learning-progress'
  | 'review-pill'
  | 'stopped-progress'
  | 'stopped-repeat'
  | 'stopped-mastered' {
  const status = normalizeDisplayVerseStatus(verse.status);

  if (status === 'CATALOG') {
    return 'catalog';
  }

  if (status === VerseStatus.MY) {
    return 'my';
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
