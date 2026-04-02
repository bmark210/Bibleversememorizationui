'use client';

import { ChevronUp, Eye, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { DEFAULT_VERSE_LIST_SORT_BY } from '../constants';
import type { VerseListFilterCardProps } from './VerseListFilterCard';

type VerseListFiltersTriggerProps = Pick<
  VerseListFilterCardProps,
  | 'totalCount'
  | 'selectedBookId'
  | 'sortBy'
  | 'searchQuery'
  | 'hasActiveTags'
> & {
  open: boolean;
  onOpen: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  className?: string;
};

export function VerseListFiltersTrigger({
  onOpen,
  open,
  isFocusMode,
  onToggleFocusMode,
  className,
  totalCount,
  selectedBookId,
  sortBy,
  searchQuery = '',
  hasActiveTags,
}: VerseListFiltersTriggerProps) {
  const trimmedSearchQuery = searchQuery.trim();
  const activeFilterCount = [
    selectedBookId !== null,
    sortBy !== DEFAULT_VERSE_LIST_SORT_BY,
    hasActiveTags,
    trimmedSearchQuery.length > 0,
  ].filter(Boolean).length;

  return (
    <div
      className={cn(
        'flex w-full items-stretch gap-0 rounded-[24px] border border-border/70 bg-card/88 p-2 backdrop-blur-2xl transition-[opacity,transform] duration-200',
        className,
      )}
    >
      <button
        type="button"
        data-tour="verse-list-filters-trigger"
        aria-label="Открыть параметры каталога"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start justify-between gap-3 rounded-[20px] px-2 py-1 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground/88">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" />
            <span>Настроить каталог</span>
            {activeFilterCount > 0 ? (
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {activeFilterCount} актив.
              </span>
            ) : null}
          </span>

          <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-foreground/56">
            <span className="truncate">
              {activeFilterCount > 0
                ? 'Есть активные параметры каталога'
                : 'Поиск, книга, темы и сортировка'}
            </span>
            <span aria-hidden="true">•</span>
            <span className="truncate">
              {totalCount > 0 ? `${totalCount} найдено` : 'Нет совпадений'}
            </span>
          </span>
        </span>

        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-foreground/65 transition-transform duration-200',
            open && 'rotate-180',
          )}
        >
          <ChevronUp className="h-4 w-4" />
        </span>
      </button>

      <button
        type="button"
        aria-pressed={isFocusMode}
        aria-label={
          isFocusMode ? 'Выключить режим чтения' : 'Включить режим чтения'
        }
        title={isFocusMode ? 'Выключить режим чтения' : 'Включить режим чтения'}
        onClick={onToggleFocusMode}
      >
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block text-[11px] font-medium leading-none">
            Чтение
          </span>
          <span
            className={cn(
              'mt-1 block text-[10px] leading-none text-foreground/50',
              isFocusMode && 'text-primary/75',
            )}
          >
            {isFocusMode ? 'Вкл' : 'Выкл'}
          </span>
        </span>
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/60',
            isFocusMode && 'border-primary/20 bg-primary/12',
          )}
        >
          <Eye className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
