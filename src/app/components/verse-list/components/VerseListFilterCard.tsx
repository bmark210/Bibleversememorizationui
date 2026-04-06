'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  History,
  TrendingUp,
  X,
} from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/components/ui/utils';
import type { domain_Tag } from '@/api/models/domain_Tag';
import {
  DEFAULT_VERSE_LIST_SORT_BY,
  type VerseListSortBy,
} from '../constants';
import { parseStoredBoolean, VERSE_LIST_STORAGE_KEYS } from '../storage';
import type { VerseListBookOption } from '../bookOptions';
import type { VerseListSortOption } from '../types';

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

const TESTAMENT_GROUPS = [
  { key: 'old', label: 'Ветхий Завет' },
  { key: 'new', label: 'Новый Завет' },
] as const;

function SectionActionButton({
  expanded,
  onClick,
  controls,
}: {
  expanded: boolean;
  onClick: () => void;
  controls: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
    >
      <span>{expanded ? 'Свернуть' : 'Развернуть'}</span>
      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </button>
  );
}

function ExpandableSectionBody({
  expanded,
  controls,
  collapsedContent,
  expandedContent,
}: {
  expanded: boolean;
  controls: string;
  collapsedContent: React.ReactNode;
  expandedContent: React.ReactNode;
}) {
  return (
    <div
      key={expanded ? `${controls}-expanded` : `${controls}-collapsed`}
      id={controls}
      className="overflow-hidden"
    >
      {expanded ? expandedContent : collapsedContent}
    </div>
  );
}

export type VerseListFilterCardProps = {
  totalCount: number;
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
  allTags?: domain_Tag[];
  selectedTagSlugs?: Set<string>;
  hasActiveTags?: boolean;
  onTagClick?: (slug: string) => void;
  onClearTags?: () => void;
  presentation?: 'card' | 'drawer';
};

const ALL_BOOKS_LABEL = 'Все';

function VerseListFilterSections({
  totalCount: _totalCount,
  selectedBookId,
  bookOptions,
  onBookChange,
  sortBy,
  sortOptions,
  onSortChange,
  searchQuery = '',
  onSearchChange,
  allTags = [],
  isLoadingTags = false,
  selectedTagSlugs = new Set(),
  hasActiveTags = false,
  onTagClick,
  onClearTags,
  presentation: _presentation = 'card',
}: VerseListFilterCardProps) {
  const deletingTagId = null;
  const [areBooksExpanded, setAreBooksExpanded] = useState(false);
  const [areTagsExpanded, setAreTagsExpanded] = useState(false);
  const booksPanelId = React.useId();
  const tagsPanelId = React.useId();
  const trimmedSearchQuery = searchQuery.trim();
  const selectedBook =
    selectedBookId == null
      ? null
      : bookOptions.find((option) => option.id === selectedBookId) ?? null;
  const bookGroups = TESTAMENT_GROUPS.map((group) => ({
    ...group,
    options: bookOptions.filter((option) => option.testament === group.key),
  }));

  const renderBookButton = (
    option: VerseListBookOption,
    layout: 'row' | 'grid',
  ) => {
    const isActive = selectedBookId === option.id;

    return (
      <button
        key={option.id}
        type="button"
        title={option.label}
        onClick={() => onBookChange(option.id, option.label)}
        className={cn(
          layout === 'row'
            ? 'first:ml-1 last:mr-1 inline-flex min-h-8 shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors'
            : 'inline-flex min-h-9 items-center justify-center rounded-xl border px-1.5 py-2 text-[10px] font-medium leading-none transition-colors',
          isActive
            ? 'border-brand-primary/25 bg-brand-primary/10 text-brand-primary shadow-[var(--shadow-soft)]'
            : 'border-border-subtle bg-bg-elevated text-text-secondary hover:border-brand-primary/15 hover:bg-bg-surface hover:text-text-primary',
        )}
      >
        {layout === 'row' ? (
          <>
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                option.testament === 'old'
                  ? isActive
                    ? 'bg-status-mastered'
                    : 'bg-status-mastered/55'
                  : isActive
                    ? 'bg-status-review'
                    : 'bg-status-review/55',
              )}
            />
            <span>{option.shortLabel}</span>
          </>
        ) : (
          <span className="truncate">{option.shortLabel}</span>
        )}
      </button>
    );
  };

  const renderTagButton = (tag: domain_Tag, index: number, layout: 'row' | 'wrap') => {
    const slug = tag.slug ?? '';
    const isActive = selectedTagSlugs.has(slug);
    const isDeleting = deletingTagId === tag.id;
    const canToggle = Boolean(slug) && !isDeleting;
    const tagKey = tag.id ?? (slug || `tag-${index}`);

    return (
      <div
        key={tagKey}
        className={cn(
          'group/tag',
          layout === 'row' ? 'relative first:ml-3 last:mr-3 shrink-0' : 'relative',
        )}
      >
        <button
          type="button"
          onClick={() => {
            if (!slug) return;
            onTagClick?.(slug);
          }}
          disabled={!canToggle}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
            isActive
              ? 'border-brand-primary/25 bg-brand-primary/10 text-brand-primary shadow-[var(--shadow-soft)]'
              : 'border-border-subtle bg-bg-elevated text-text-secondary hover:border-brand-primary/15 hover:bg-bg-surface hover:text-text-primary',
            !canToggle && 'pointer-events-none opacity-40',
          )}
        >
          <span
            className={cn(
              'text-[10px]',
              isActive ? 'text-brand-primary/55' : 'text-text-muted',
            )}
          >
            #
          </span>
          {tag.title}
        </button>
      </div>
    );
  };

  return (
    <div className="overflow-hidden pb-2">
      {onSearchChange ? (
        <div data-tour="verse-list-filters-search" className="mt-3 px-3">
          <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              Поиск
            </span>
            {trimmedSearchQuery.length > 0 ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-[11px] text-state-error transition-colors hover:text-state-error/80"
              >
                Сбросить
              </button>
            ) : null}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Найти в каталоге"
              className="pr-11 pl-10"
            />
            {trimmedSearchQuery.length > 0 ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
                aria-label="Очистить поиск"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div data-tour="verse-list-filters-book" className="mt-3 px-3">
        <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              Книга: {selectedBook?.label ?? ALL_BOOKS_LABEL}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedBookId !== null ? (
              <button
                type="button"
                onClick={() => onBookChange(null, ALL_BOOKS_LABEL)}
                className="text-[11px] text-state-error transition-colors hover:text-state-error/80"
              >
                Сбросить
              </button>
            ) : null}
            <SectionActionButton
              expanded={areBooksExpanded}
              controls={booksPanelId}
              onClick={() => setAreBooksExpanded((prev) => !prev)}
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-subtle p-1">
          <ExpandableSectionBody
            expanded={areBooksExpanded}
            controls={booksPanelId}
            collapsedContent={
              <ScrollRow className="py-0.5">
                <button
                  type="button"
                  onClick={() => onBookChange(null, ALL_BOOKS_LABEL)}
                  className={cn(
                    'first:ml-1 last:mr-1 inline-flex min-h-8 shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
                    selectedBookId == null
                      ? 'border-brand-primary/25 bg-brand-primary/10 text-brand-primary shadow-[var(--shadow-soft)]'
                      : 'border-border-subtle bg-bg-elevated text-text-muted hover:border-brand-primary/15 hover:bg-bg-surface hover:text-text-secondary',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      selectedBookId == null
                        ? 'bg-brand-primary/70'
                        : 'bg-text-muted/45',
                    )}
                  />
                  Все
                </button>
                {bookOptions.map((option) => renderBookButton(option, 'row'))}
              </ScrollRow>
            }
            expandedContent={
              <div className="space-y-3 px-2 py-2.5">
                {bookGroups.map((group) => (
                  <div key={group.key} className="space-y-2">
                    <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      {group.label}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                      {group.options.map((option) => renderBookButton(option, 'grid'))}
                    </div>
                  </div>
                ))}
              </div>
            }
          />
        </div>
      </div>

      <div data-tour="verse-list-filters-tags" className="mt-3 px-3">
        <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            {hasActiveTags
              ? `Темы: ${selectedTagSlugs.size}`
              : `Темы: все${allTags.length > 0 ? ` • ${allTags.length}` : ''}`}
          </span>
          <div className="flex items-center gap-2">
            {hasActiveTags ? (
              <button
                type="button"
                onClick={onClearTags}
                className="text-[11px] text-state-error transition-colors hover:text-state-error/80"
              >
                Сбросить
              </button>
            ) : null}
            {allTags.length > 0 ? (
              <SectionActionButton
                expanded={areTagsExpanded}
                controls={tagsPanelId}
                onClick={() => setAreTagsExpanded((prev) => !prev)}
              />
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-subtle">
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
            <ExpandableSectionBody
              expanded={areTagsExpanded}
              controls={tagsPanelId}
              collapsedContent={
                <div className="py-1">
                  <ScrollRow>
                    {allTags.map((tag, index) => renderTagButton(tag, index, 'row'))}
                  </ScrollRow>
                </div>
              }
              expandedContent={
                <div className="flex flex-wrap gap-2 px-3 py-3">
                  {allTags.map((tag, index) => renderTagButton(tag, index, 'wrap'))}
                </div>
              }
            />
          ) : (
            <p className="px-3.5 py-2.5 text-xs italic text-text-muted sm:px-4">
              Теги пока не созданы
            </p>
          )}
        </div>
      </div>

      <div data-tour="verse-list-filters-sort" className="mt-3 px-3">
        <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
          Сортировка:{' '}
          {sortBy === 'bible'
            ? 'По канону библии'
            : sortBy === 'popularity'
              ? 'По популярности'
              : 'По активности'}
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-subtle p-1.5">
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
                      ? 'border border-brand-primary/20 bg-bg-elevated text-brand-primary shadow-[var(--shadow-soft)]'
                      : 'border border-transparent text-text-muted hover:bg-bg-elevated hover:text-text-secondary',
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
    </div>
  );
}

export function VerseListFilterCard({
  totalCount: _totalCount,
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
    selectedBookId !== null ||
    sortBy !== DEFAULT_VERSE_LIST_SORT_BY ||
    hasActiveTags ||
    trimmedSearchQuery.length > 0;

  const sharedProps = {
    totalCount: _totalCount,
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
    presentation,
  };

  if (isDrawerPresentation) {
    return (
      <div
        data-tour="verse-list-filters-panel"
        className="overflow-hidden rounded-[28px] border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]"
      >
        <VerseListFilterSections {...sharedProps} />
      </div>
    );
  }

  return (
    <div data-tour="verse-list-filters-panel" className="mb-3">
      <Card className="gap-0 rounded-3xl border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-3">
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-2 text-[13px] text-text-muted"
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
                    ? 'bg-status-paused-soft text-status-paused'
                    : 'text-text-muted hover:bg-bg-surface hover:text-text-secondary',
                )}
              >
                Сбросить
              </button>
            ) : null}
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-bg-surface hover:text-text-secondary"
            >
              {isCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {!isCollapsed ? (
          <div className="overflow-hidden">
            <VerseListFilterSections {...sharedProps} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
