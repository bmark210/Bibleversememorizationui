import type { Verse } from "@/app/domain/verse";
import { VerseStatus } from '@/shared/domain/verseStatus';
import {
  getVerseDisplayStatus,
  resolvePausedVerseKind,
  resolveVerseJourneyPhase,
  type PausedVerseKind,
} from '@/shared/verseRules';

export type VerseListStatusFilter =
  | "catalog"
  | "learning"
  | "review"
  | "mastered"
  | "stopped"
  | "my";
export type VerseListSortBy = "updatedAt" | "bible" | "popularity";
export type VerseStageVisualKey = VerseListStatusFilter | "queue";
export type StoppedVerseStageKind = PausedVerseKind;

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
export const DEFAULT_VERSE_LIST_STATUS_FILTER: VerseListStatusFilter = "my";
export const DEFAULT_VERSE_LIST_SORT_BY: VerseListSortBy = "bible";

export const FILTER_VISUAL_THEME: Record<VerseListStatusFilter, FilterVisualTheme> = {
  catalog: {
    dotClassName: 'bg-text-muted',
    activeTabClassName: 'border-border-default bg-bg-elevated text-text-secondary shadow-[var(--shadow-soft)]',
    currentBadgeClassName: 'border-border-default bg-bg-elevated text-text-secondary',
    statusBadgeClassName: 'border-border-default bg-bg-elevated text-text-secondary',
    cardClassName: 'bg-gradient-to-br from-bg-subtle via-bg-surface to-bg-elevated',
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
  verse: Pick<Verse, 'flow' | 'masteryLevel' | 'repetitions'>
): StoppedVerseStageKind {
  return resolvePausedVerseKind(verse);
}

export function getVerseStageVisual(
  verse: Pick<Verse, 'status' | 'flow' | 'masteryLevel' | 'repetitions'>
): {
  key: VerseStageVisualKey;
  label: string;
} {
  const status = getVerseDisplayStatus(verse);
  const phase = resolveVerseJourneyPhase(verse);

  if (phase === 'catalog') return { key: 'catalog', label: 'Каталог' };
  if (phase === 'queue') return { key: 'queue', label: 'В очереди' };
  if (phase === 'my') return { key: 'my', label: 'Мой' };

  if (status === VerseStatus.STOPPED) {
    const stoppedKind = getStoppedVerseStageKind(verse);
    if (stoppedKind === 'mastered') return { key: 'stopped', label: 'Выучено · пауза' };
    if (stoppedKind === 'review') return { key: 'stopped', label: 'Повторение · пауза' };
    return { key: 'stopped', label: 'На паузе' };
  }

  if (phase === 'mastered') return { key: 'mastered', label: 'Выучено' };
  if (phase === 'review') return { key: 'review', label: 'Повторение' };
  return { key: 'learning', label: 'Изучение' };
}

export function getVerseCardLayoutSignature(
  verse: Pick<Verse, 'status' | 'flow' | 'masteryLevel' | 'repetitions'>
):
  | 'catalog'
  | 'my'
  | 'learning-progress'
  | 'review-pill'
  | 'stopped-progress'
  | 'stopped-repeat'
  | 'stopped-mastered' {
  const phase = resolveVerseJourneyPhase(verse);
  const status = getVerseDisplayStatus(verse);

  if (phase === 'catalog') return 'catalog';
  if (phase === 'queue' || phase === 'my') return 'my';
  if (phase === 'learning' && status !== VerseStatus.STOPPED) return 'learning-progress';
  if ((phase === 'review' || phase === 'mastered') && status !== VerseStatus.STOPPED) {
    return 'review-pill';
  }

  const stoppedKind = getStoppedVerseStageKind(verse);
  if (stoppedKind === 'mastered') return 'stopped-mastered';
  if (stoppedKind === 'review') return 'stopped-repeat';
  return 'stopped-progress';
}
