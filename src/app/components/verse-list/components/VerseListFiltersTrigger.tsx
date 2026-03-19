'use client';

import { ChevronUp, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { DEFAULT_VERSE_LIST_SORT_BY } from '../constants';
import type { VerseListFilterCardProps } from './VerseListFilterCard';

type VerseListFiltersTriggerProps = Pick<
  VerseListFilterCardProps,
  | 'totalCount'
  | 'currentFilterLabel'
  | 'currentFilterTheme'
  | 'statusFilter'
  | 'defaultStatusFilter'
  | 'selectedBookId'
  | 'bookOptions'
  | 'sortBy'
  | 'searchQuery'
  | 'selectedTagSlugs'
  | 'hasActiveTags'
> & {
  open: boolean;
  onOpen: () => void;
  stickyTop?: number;
};

function getSortSummaryLabel(sortBy: VerseListFilterCardProps['sortBy']) {
  if (sortBy === 'bible') return 'Канон';
  if (sortBy === 'popularity') return 'Популярность';
  return 'Активность';
}

export function VerseListFiltersTrigger({
  onOpen,
  stickyTop = 0,
  totalCount,
  currentFilterLabel,
  currentFilterTheme,
  statusFilter,
  defaultStatusFilter,
  selectedBookId,
  bookOptions,
  sortBy,
  searchQuery = '',
  selectedTagSlugs,
  hasActiveTags,
}: VerseListFiltersTriggerProps) {
  const trimmedSearchQuery = searchQuery.trim();
  const selectedBook =
    selectedBookId == null
      ? null
      : bookOptions.find((option) => option.id === selectedBookId) ?? null;
  const activeFilterCount = [
    statusFilter !== defaultStatusFilter,
    selectedBookId !== null,
    sortBy !== DEFAULT_VERSE_LIST_SORT_BY,
    hasActiveTags,
    trimmedSearchQuery.length > 0,
  ].filter(Boolean).length;
  const summaryChips = [
    selectedBook?.shortLabel ?? selectedBook?.label ?? null,
    hasActiveTags ? `${selectedTagSlugs.size} тем` : null,
    sortBy !== DEFAULT_VERSE_LIST_SORT_BY ? getSortSummaryLabel(sortBy) : null,
    trimmedSearchQuery.length > 0 ? 'Поиск' : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div
      className="sticky z-30 shrink-0"
      style={{ top: `${stickyTop}px` }}
    >
      <div className="px-2 pt-2 pb-0 sm:px-6 lg:px-8">
        <button
          type="button"
          data-tour="verse-list-filters-trigger"
          aria-label="Открыть фильтры стихов"
          onClick={onOpen}
          className={cn(
            'w-full shrink-0 rounded-[24px] border border-border/70 bg-card/88 px-4 py-3 text-left backdrop-blur-2xl transition-[opacity,transform] duration-200',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/88">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" />
                <span>Фильтры</span>
                {activeFilterCount > 0 ? (
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {activeFilterCount} актив.
                  </span>
                ) : null}
              </div>

              <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-foreground/56">
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    currentFilterTheme.dotClassName,
                  )}
                />
                <span className="truncate">{currentFilterLabel}</span>
                <span aria-hidden="true">•</span>
                <span className="truncate">
                  {totalCount > 0 ? `${totalCount} в списке` : 'Пока пусто'}
                </span>
              </div>
            </div>

            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-foreground/65">
              <ChevronUp className="h-4 w-4" />
            </span>
          </div>

          {summaryChips.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {summaryChips.slice(0, 3).map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full border border-border/60 bg-background/45 px-2.5 py-1 text-[11px] text-foreground/68"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </button>
      </div>
    </div>
  );
}
