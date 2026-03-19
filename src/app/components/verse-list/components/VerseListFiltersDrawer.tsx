'use client';
import {
  Drawer,
  DrawerContent,
  // DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import {
  DEFAULT_VERSE_LIST_SORT_BY,
} from '../constants';
import {
  VerseListFilterCard,
  type VerseListFilterCardProps,
} from './VerseListFilterCard';

type VerseListFiltersDrawerProps = VerseListFilterCardProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VerseListFiltersDrawer({
  open,
  onOpenChange,
  totalVisible,
  totalCount,
  currentFilterLabel,
  currentFilterTheme,
  statusFilter,
  defaultStatusFilter,
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
  const trimmedSearchQuery = searchQuery.trim();
  const hasFiltersApplied =
    statusFilter !== defaultStatusFilter ||
    selectedBookId !== null ||
    sortBy !== DEFAULT_VERSE_LIST_SORT_BY ||
    hasActiveTags ||
    trimmedSearchQuery.length > 0;
  const filterCardProps: VerseListFilterCardProps = {
    totalVisible,
    totalCount,
    currentFilterLabel,
    currentFilterTheme,
    statusFilter,
    defaultStatusFilter,
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
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent
        data-tour="verse-list-filters-drawer"
        className="rounded-t-[32px] border-border/70 bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl backdrop-blur-xl sm:px-6"
        style={{ maxHeight: '90svh' }}
      >
        <DrawerHeader className="px-0 pb-0 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle className="text-xl tracking-tight text-primary">
                Фильтры стихов
              </DrawerTitle>
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
  );
}
