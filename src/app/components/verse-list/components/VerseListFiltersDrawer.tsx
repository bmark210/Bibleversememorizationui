'use client';
import { ChevronUp, SlidersHorizontal } from 'lucide-react';
import { useTelegramSafeArea } from '@/app/hooks/useTelegramSafeArea';
import { cn } from '@/app/components/ui/utils';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import {
  DEFAULT_VERSE_LIST_SORT_BY,
  DEFAULT_VERSE_LIST_STATUS_FILTER,
} from '../constants';
import {
  VerseListFilterCard,
  type VerseListFilterCardProps,
} from './VerseListFilterCard';

type VerseListFiltersDrawerProps = VerseListFilterCardProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MOBILE_NAV_OFFSET_PX = 82;
const MOBILE_DOCK_GAP_PX = 12;
// const MOBILE_TRIGGER_SPACER_PX = 96;

function getSortSummaryLabel(sortBy: VerseListFilterCardProps['sortBy']) {
  if (sortBy === 'bible') return 'Канон';
  if (sortBy === 'popularity') return 'Популярность';
  return 'Активность';
}

export function VerseListFiltersDrawer({
  open,
  onOpenChange,
  totalVisible,
  totalCount,
  currentFilterLabel,
  currentFilterTheme,
  statusFilter,
  filterOptions,
  hasFriends = false,
  onTabClick,
  selectedBookId,
  bookOptions,
  onBookChange,
  sortBy,
  sortOptions,
  onSortChange,
  onResetFilters,
  searchQuery = '',
  onSearchChange,
  allTags = [],
  isLoadingTags = false,
  selectedTagSlugs = new Set(),
  hasActiveTags = false,
  onTagClick,
  onClearTags,
  onCreateTagDialogOpen,
  onDeleteTag,
}: VerseListFiltersDrawerProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const trimmedSearchQuery = searchQuery.trim();
  const selectedBook =
    selectedBookId == null
      ? null
      : bookOptions.find((option) => option.id === selectedBookId) ?? null;
  const hasFiltersApplied =
    statusFilter !== DEFAULT_VERSE_LIST_STATUS_FILTER ||
    selectedBookId !== null ||
    sortBy !== DEFAULT_VERSE_LIST_SORT_BY ||
    hasActiveTags ||
    trimmedSearchQuery.length > 0;
  const activeFilterCount = [
    statusFilter !== DEFAULT_VERSE_LIST_STATUS_FILTER,
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
  const triggerBottom = contentSafeAreaInset.bottom + MOBILE_NAV_OFFSET_PX + MOBILE_DOCK_GAP_PX;

  const filterCardProps: VerseListFilterCardProps = {
    totalVisible,
    totalCount,
    currentFilterLabel,
    currentFilterTheme,
    statusFilter,
    filterOptions,
    hasFriends,
    onTabClick,
    selectedBookId,
    bookOptions,
    onBookChange,
    sortBy,
    sortOptions,
    onSortChange,
    onResetFilters,
    searchQuery,
    onSearchChange,
    allTags,
    isLoadingTags,
    selectedTagSlugs,
    hasActiveTags,
    onTagClick,
    onClearTags,
    onCreateTagDialogOpen,
    onDeleteTag,
    presentation: 'drawer',
  };

  return (
    <>
      <button
        type="button"
        aria-label="Открыть фильтры стихов"
        onClick={() => onOpenChange(true)}
        className={cn(
          'shrink-0 rounded-[24px] border border-border/70 bg-card/88 px-4 py-3 text-left backdrop-blur-2xl transition-[opacity,transform] duration-200 md:hidden',
          open && 'pointer-events-none translate-y-2 opacity-0',
        )}
        style={{ bottom: `${triggerBottom}px` }}
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

      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent
          className="rounded-t-[32px] border-border/70 bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl backdrop-blur-xl sm:px-6"
          style={{ maxHeight: '90svh' }}
        >
          <DrawerHeader className="px-0 pb-0 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DrawerTitle className="text-xl tracking-tight text-primary">
                  Фильтры стихов
                </DrawerTitle>
                <DrawerDescription className="mt-1 text-sm text-foreground/56">
                  Настройте список и вернитесь к карточкам без потери места на экране.
                </DrawerDescription>
              </div>

              {hasFiltersApplied && onResetFilters ? (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="shrink-0 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
                >
                  Сбросить
                </button>
              ) : null}
            </div>
          </DrawerHeader>

          <div className="mt-4 min-h-0 overflow-y-auto overscroll-contain pb-1">
            <VerseListFilterCard {...filterCardProps} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
