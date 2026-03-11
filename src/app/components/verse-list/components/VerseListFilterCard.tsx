'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  History,
  Pencil,
  TrendingUp,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Card } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/components/ui/utils';
import type { Tag } from '@/api/models/Tag';
import {
  DEFAULT_VERSE_LIST_SORT_BY,
  DEFAULT_VERSE_LIST_STATUS_FILTER,
  FILTER_VISUAL_THEME,
  type FilterVisualTheme,
  type VerseListSortBy,
  type VerseListStatusFilter,
} from '../constants';
import { parseStoredBoolean, VERSE_LIST_STORAGE_KEYS } from '../storage';
import type { VerseListBookOption } from '../bookOptions';
import type { VerseListFilterOption, VerseListSortOption } from '../types';

function ScrollRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <div
        className="flex gap-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
    </div>
  );
}

const PANEL_TRANSITION = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export type VerseListFilterCardProps = {
  totalVisible: number;
  totalCount: number;
  currentFilterLabel: string;
  currentFilterTheme: FilterVisualTheme;
  statusFilter: VerseListStatusFilter;
  filterOptions: VerseListFilterOption[];
  hasFriends?: boolean;
  onTabClick: (filter: VerseListStatusFilter, label: string) => void;
  selectedBookId: number | null;
  bookOptions: VerseListBookOption[];
  onBookChange: (bookId: number | null, label: string) => void;
  sortBy: VerseListSortBy;
  sortOptions: VerseListSortOption[];
  onSortChange: (sortBy: VerseListSortBy, label: string) => void;
  onResetFilters?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isLoadingTags?: boolean;
  allTags?: Tag[];
  selectedTagSlugs?: Set<string>;
  hasActiveTags?: boolean;
  onTagClick?: (slug: string) => void;
  onClearTags?: () => void;
  onCreateTagDialogOpen?: () => void;
  onDeleteTag?: (id: string, slug: string) => Promise<void>;
  presentation?: 'card' | 'drawer';
};

const ROOT_TABS = [
  { key: 'catalog', label: 'Общий' },
  { key: 'friends', label: 'Друзья' },
  { key: 'my', label: 'Мои стихи' },
] as const;

const ALL_BOOKS_LABEL = 'Все';

function VerseListFilterSections({
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
  allTags = [],
  isLoadingTags = false,
  selectedTagSlugs = new Set(),
  hasActiveTags = false,
  onTagClick,
  onClearTags,
  onCreateTagDialogOpen,
}: Omit<VerseListFilterCardProps, 'presentation'>) {
  const deletingTagId = null;
  const activeRootTab: (typeof ROOT_TABS)[number]['key'] =
    statusFilter === 'catalog'
      ? 'catalog'
      : statusFilter === 'friends'
        ? 'friends'
        : 'my';
  const visibleRootTabs = hasFriends
    ? ROOT_TABS
    : ROOT_TABS.filter((tab) => tab.key !== 'friends');
  const isMyMode = activeRootTab === 'my';
  const selectedBook =
    selectedBookId == null
      ? null
      : bookOptions.find((option) => option.id === selectedBookId) ?? null;

  return (
    <div className="overflow-hidden pb-2">
      <div className="mt-2 px-3">
        <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/65">
          Основной фильтр:{' '}
          {activeRootTab === 'my'
            ? 'Мои стихи'
            : activeRootTab === 'friends'
              ? 'Друзья'
              : 'Общий'}
        </div>
        <div
          role="tablist"
          aria-label="Основной фильтр списка стихов"
          className="grid gap-1 rounded-2xl border border-border/35 bg-primary/5 p-1"
          style={{
            gridTemplateColumns: `repeat(${visibleRootTabs.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleRootTabs.map(({ key, label }) => {
            const isActive = activeRootTab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() =>
                  onTabClick(
                    key === 'my' ? 'my' : key,
                    key === 'my' ? 'Мои стихи' : label,
                  )
                }
                className={cn(
                  'flex min-h-8 items-center justify-center gap-1.5 rounded-xl px-3 py-1 text-sm font-medium transition-colors',
                  isActive
                    ? 'border border-primary/30 bg-primary/12 text-primary'
                    : 'text-muted-foreground',
                )}
              >
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 px-3">
        <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/65">
              Книга: {selectedBook?.label ?? ALL_BOOKS_LABEL}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/35 bg-primary/5 p-1">
          <ScrollRow className="py-0.5">
            <button
              type="button"
              onClick={() => onBookChange(null, ALL_BOOKS_LABEL)}
              className={cn(
                'first:ml-1 last:mr-1 inline-flex min-h-8 shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
                selectedBookId == null
                  ? 'border-primary/30 bg-primary/12 text-primary'
                  : 'border-border/55 bg-background/25 text-muted-foreground hover:bg-background/60',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  selectedBookId == null
                    ? 'bg-primary/70'
                    : 'bg-muted-foreground/35',
                )}
              />
              Все
            </button>
            {bookOptions.map((option) => {
              const isActive = selectedBookId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  title={option.label}
                  onClick={() => onBookChange(option.id, option.label)}
                  className={cn(
                    'first:ml-1 last:mr-1 inline-flex min-h-8 shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
                    isActive
                      ? 'border-primary/30 bg-primary/12 text-primary'
                      : 'border-border/55 bg-background/25 text-foreground/75 hover:bg-background/60',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      option.testament === 'old'
                        ? isActive
                          ? 'bg-amber-500'
                          : 'bg-amber-400/55'
                        : isActive
                          ? 'bg-sky-500'
                          : 'bg-sky-400/55',
                    )}
                  />
                  <span>{option.shortLabel}</span>
                </button>
              );
            })}
          </ScrollRow>
        </div>
      </div>

      {isMyMode ? (
        <div className="mt-3 px-3">
          <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/65">
            Доп фильтр
          </div>
          <div className="rounded-2xl border border-border/35 bg-primary/5 p-1">
            <div role="tablist" aria-label="Подфильтр моих стихов">
              <ScrollRow>
                {filterOptions.map((option) => {
                  const isActive = statusFilter === option.key;
                  const optionTheme = FILTER_VISUAL_THEME[option.key];
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() =>
                        isActive
                          ? onTabClick('my', 'Мои стихи')
                          : onTabClick(option.key, option.label)
                      }
                      className={cn(
                        'first:ml-1 last:mr-1 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] font-medium text-foreground/75 transition-colors',
                        isActive
                          ? optionTheme.activeTabClassName
                          : 'text-muted-foreground hover:bg-background/60',
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          isActive
                            ? optionTheme.dotClassName
                            : 'bg-muted-foreground/35',
                        )}
                      />
                      {option.label}
                    </button>
                  );
                })}
              </ScrollRow>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 px-3">
        <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/65">
          Сортировка:{' '}
          {sortBy === 'bible'
            ? 'По канону библии'
            : sortBy === 'popularity'
              ? 'По популярности'
              : 'По активности'}
        </div>
        <div className="rounded-xl border border-border/35 bg-primary/5 p-1.5">
          <div
            role="radiogroup"
            aria-label="Сортировка стихов"
            className="grid grid-cols-3 gap-1"
          >
            {sortOptions.map((option) => {
              const isActive = sortBy === option.key;
              const Icon =
                option.key === 'bible'
                  ? BookOpen
                  : option.key === 'popularity'
                    ? TrendingUp
                    : History;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => onSortChange(option.key, option.label)}
                  className={cn(
                    'inline-flex min-h-5 items-center justify-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium transition-colors',
                    isActive
                      ? 'border border-primary/30 bg-primary/12 text-primary'
                      : 'border border-transparent text-muted-foreground hover:bg-background/65',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="my-1 overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-border/35 px-5 pb-2 pt-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            {hasActiveTags ? `Темы: ${selectedTagSlugs.size}` : 'Все темы'}
          </span>
          <div className="flex items-center gap-3">
            {hasActiveTags ? (
              <button
                type="button"
                onClick={onClearTags}
                className="text-[11px] text-muted-foreground transition-colors"
              >
                Сбросить
              </button>
            ) : null}
            {onCreateTagDialogOpen ? (
              <button
                type="button"
                onClick={onCreateTagDialogOpen}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" />
                <span className="hidden sm:inline">Редактировать</span>
              </button>
            ) : null}
          </div>
        </div>

        {isLoadingTags ? (
          <div className="my-2.5 flex gap-2 px-3.5">
            {[56, 72, 48, 64].map((w) => (
              <Skeleton
                key={w}
                className="h-6 shrink-0 rounded-full"
                style={{ width: w }}
              />
            ))}
          </div>
        ) : allTags.length > 0 ? (
          <div className="py-2">
            <ScrollRow>
              {allTags.map((tag, index) => {
                const slug = tag.slug ?? '';
                const isActive = selectedTagSlugs.has(slug);
                const isDeleting = deletingTagId === tag.id;
                const canToggle = Boolean(slug) && !isDeleting;
                const tagKey = tag.id ?? (slug || `tag-${index}`);

                return (
                  <motion.div
                    key={tagKey}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: Math.min(index * 0.045, 0.32),
                      duration: 0.18,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="group/tag relative first:ml-3 last:mr-3 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!slug) return;
                        onTagClick?.(slug);
                      }}
                      disabled={!canToggle}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-primary/40 bg-primary/12 text-primary'
                          : 'border-border/60 bg-background/10 text-foreground/75 hover:bg-muted/60',
                        !canToggle && 'pointer-events-none opacity-40',
                      )}
                    >
                      <span
                        className={cn(
                          'text-[10px]',
                          isActive
                            ? 'text-primary/55'
                            : 'text-muted-foreground/45',
                        )}
                      >
                        #
                      </span>
                      {tag.title}
                    </button>
                  </motion.div>
                );
              })}
            </ScrollRow>
          </div>
        ) : (
          <p className="px-3.5 py-2.5 text-xs italic text-muted-foreground/50 sm:px-4">
            Нет тегов - создайте первый
          </p>
        )}
      </div>
    </div>
  );
}

export function VerseListFilterCard({
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
  presentation = 'card',
}: VerseListFilterCardProps) {
  const isDrawerPresentation = presentation === 'drawer';
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (isDrawerPresentation || typeof window === 'undefined') return false;
    return (
      parseStoredBoolean(
        window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.filtersCollapsed),
      ) ?? false
    );
  });

  useEffect(() => {
    if (isDrawerPresentation || typeof window === 'undefined') return;
    window.localStorage.setItem(
      VERSE_LIST_STORAGE_KEYS.filtersCollapsed,
      isCollapsed ? '1' : '0',
    );
  }, [isCollapsed, isDrawerPresentation]);

  const trimmedSearchQuery = searchQuery.trim();
  const hasFiltersApplied =
    statusFilter !== DEFAULT_VERSE_LIST_STATUS_FILTER ||
    selectedBookId !== null ||
    sortBy !== DEFAULT_VERSE_LIST_SORT_BY ||
    hasActiveTags ||
    trimmedSearchQuery.length > 0;

  const sharedProps = {
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
  };

  if (isDrawerPresentation) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-border/45 bg-card/45">
        <VerseListFilterSections {...sharedProps} />
      </div>
    );
  }

  return (
    <div className="mb-3">
      <Card className="gap-0 rounded-3xl border border-border/35 bg-card/50">
        <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-3">
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-2 text-[13px] text-muted-foreground"
          >
            <span className="font-medium uppercase">Фильтры</span>
          </button>

          <div className="flex items-center gap-1">
            {hasFiltersApplied ? (
              <button
                type="button"
                onClick={onResetFilters}
                disabled={!hasFiltersApplied}
                className={cn(
                  'rounded-lg px-2 py-1 text-[11px] font-medium transition-colors',
                  hasFiltersApplied
                    ? 'bg-destructive/60 text-background dark:text-foreground/75'
                    : 'text-muted-foreground hover:bg-background/60',
                )}
              >
                Сбросить
              </button>
            ) : null}
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-background/60"
            >
              {isCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!isCollapsed ? (
            <motion.div
              key="filters-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={PANEL_TRANSITION}
              className="overflow-hidden"
            >
              <VerseListFilterSections {...sharedProps} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Card>
    </div>
  );
}
