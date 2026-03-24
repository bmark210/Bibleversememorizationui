'use client';
import { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  // DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import { Button } from '@/app/components/ui/button';
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

function areSetsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

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
  hasActiveTags: _hasActiveTags = false,
  onTagClick,
  onClearTags,
  onCreateTagDialogOpen,
  onDeleteTag,
}: VerseListFiltersDrawerProps) {
  const [draftStatusFilter, setDraftStatusFilter] = useState(statusFilter);
  const [draftSelectedBookId, setDraftSelectedBookId] = useState(selectedBookId);
  const [draftSortBy, setDraftSortBy] = useState(sortBy);
  const [draftSearchQuery, setDraftSearchQuery] = useState(searchQuery);
  const [draftSelectedTagSlugs, setDraftSelectedTagSlugs] = useState<Set<string>>(
    () => new Set(selectedTagSlugs),
  );

  useEffect(() => {
    if (!open) return;
    setDraftStatusFilter(statusFilter);
    setDraftSelectedBookId(selectedBookId);
    setDraftSortBy(sortBy);
    setDraftSearchQuery(searchQuery);
    setDraftSelectedTagSlugs(new Set(selectedTagSlugs));
  }, [open, searchQuery, selectedBookId, selectedTagSlugs, sortBy, statusFilter]);

  const resetDraftFilters = () => {
    setDraftStatusFilter(defaultStatusFilter);
    setDraftSelectedBookId(null);
    setDraftSortBy(DEFAULT_VERSE_LIST_SORT_BY);
    setDraftSearchQuery('');
    setDraftSelectedTagSlugs(new Set());
  };

  const handleDrawerOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDraftStatusFilter(statusFilter);
      setDraftSelectedBookId(selectedBookId);
      setDraftSortBy(sortBy);
      setDraftSearchQuery(searchQuery);
      setDraftSelectedTagSlugs(new Set(selectedTagSlugs));
    }
    onOpenChange(nextOpen);
  };

  const draftTrimmedSearchQuery = draftSearchQuery.trim();
  const hasFiltersApplied =
    draftStatusFilter !== defaultStatusFilter ||
    draftSelectedBookId !== null ||
    draftSortBy !== DEFAULT_VERSE_LIST_SORT_BY ||
    draftSelectedTagSlugs.size > 0 ||
    draftTrimmedSearchQuery.length > 0;
  const hasDraftChanges =
    draftStatusFilter !== statusFilter ||
    draftSelectedBookId !== selectedBookId ||
    draftSortBy !== sortBy ||
    draftSearchQuery !== searchQuery ||
    !areSetsEqual(draftSelectedTagSlugs, selectedTagSlugs);

  const handleApply = () => {
    const isResetState =
      draftStatusFilter === defaultStatusFilter &&
      draftSelectedBookId === null &&
      draftSortBy === DEFAULT_VERSE_LIST_SORT_BY &&
      draftTrimmedSearchQuery.length === 0 &&
      draftSelectedTagSlugs.size === 0;

    if (isResetState && onResetFilters) {
      onResetFilters();
      onOpenChange(false);
      return;
    }

    if (draftStatusFilter !== statusFilter) {
      const nextFilterLabel =
        filterOptions.find((option) => option.key === draftStatusFilter)?.label ??
        currentFilterLabel;
      onTabClick(draftStatusFilter, nextFilterLabel);
    }

    if (draftSelectedBookId !== selectedBookId) {
      const nextBookLabel =
        draftSelectedBookId == null
          ? 'Все'
          : bookOptions.find((option) => option.id === draftSelectedBookId)?.label ?? 'Все';
      onBookChange(draftSelectedBookId, nextBookLabel);
    }

    if (draftSortBy !== sortBy) {
      const nextSortLabel =
        sortOptions.find((option) => option.key === draftSortBy)?.label ?? '';
      onSortChange(draftSortBy, nextSortLabel);
    }

    if (draftSearchQuery !== searchQuery) {
      onSearchChange?.(draftSearchQuery);
    }

    if (!areSetsEqual(draftSelectedTagSlugs, selectedTagSlugs)) {
      if (selectedTagSlugs.size > 0) {
        onClearTags?.();
      }
      Array.from(draftSelectedTagSlugs)
        .sort()
        .forEach((slug) => onTagClick?.(slug));
    }

    onOpenChange(false);
  };

  const filterCardProps: VerseListFilterCardProps = {
    totalVisible,
    totalCount,
    currentFilterLabel,
    currentFilterTheme,
    statusFilter: draftStatusFilter,
    defaultStatusFilter,
    filterOptions,
    hasFriends,
    onTabClick: (filter) => {
      setDraftStatusFilter(filter);
    },
    selectedBookId: draftSelectedBookId,
    bookOptions,
    onBookChange: (bookId) => {
      setDraftSelectedBookId(bookId);
    },
    sortBy: draftSortBy,
    sortOptions,
    onSortChange: (nextSortBy) => {
      setDraftSortBy(nextSortBy);
    },
    onResetFilters: resetDraftFilters,
    searchQuery: draftSearchQuery,
    onSearchChange: (nextQuery) => {
      setDraftSearchQuery(nextQuery);
    },
    allTags,
    isLoadingTags,
    selectedTagSlugs: draftSelectedTagSlugs,
    hasActiveTags: draftSelectedTagSlugs.size > 0,
    onTagClick: (slug) => {
      setDraftSelectedTagSlugs((prev) => {
        const next = new Set(prev);
        if (next.has(slug)) {
          next.delete(slug);
        } else {
          next.add(slug);
        }
        return next;
      });
    },
    onClearTags: () => {
      setDraftSelectedTagSlugs(new Set());
    },
    onCreateTagDialogOpen,
    onDeleteTag,
    presentation: 'drawer',
  };

  return (
    <Drawer open={open} onOpenChange={handleDrawerOpenChange} direction="bottom">
      <DrawerContent
        data-tour="verse-list-filters-drawer"
        className="rounded-t-[32px] border-border/70 bg-card/95 px-4 shadow-2xl backdrop-blur-xl sm:px-6"
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
                onClick={resetDraftFilters}
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

        <DrawerFooter className="px-0 pb-0 pt-4">
          <div className="flex items-center gap-3 border-t border-border/50 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-2xl bg-background/80 text-primary"
              onClick={() => handleDrawerOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-2xl bg-primary/80 text-primary-foreground"
              onClick={handleApply}
              disabled={!hasDraftChanges}
            >
              Применить
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
