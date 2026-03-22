import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Verse } from '@/app/App';
import type { domain_Tag } from '@/api/models/domain_Tag';
import type { DirectLaunchVerse } from '@/app/components/Training/types';
import { VerseStatus } from '@/shared/domain/verseStatus';
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import {
  DEFAULT_VERSE_LIST_STATUS_FILTER,
  DEFAULT_VERSE_LIST_SORT_BY,
  FILTER_VISUAL_THEME,
  LOAD_MORE_SKELETON_DELAY_MS,
  PREFETCH_ROWS,
  VERSE_LIST_PAGE_SIZE,
  getVerseCardLayoutSignature,
  type VerseListSortBy,
  type VerseListStatusFilter,
} from '../constants';
import {
  parseStoredBookId,
  parseStoredSortBy,
  parseStoredStatusFilter,
  VERSE_LIST_STORAGE_KEYS,
} from '../storage';
import { fetchUserVersesPage } from '@/api/services/userVersesPagination';
import { haptic } from '../haptics';
import { SwipeableVerseCard } from '../components/SwipeableVerseCard';
import { useTelegramId } from './useTelegramId';
import { useVerseActions } from './useVerseActions';
import { useVersePagination } from './useVersePagination';
import { useTagFilter } from './useTagFilter';
import type {
  DebugInfiniteScroll,
  VerseListController,
  VerseListFilterOption,
  VerseListLoadRange,
  VerseListSectionConfig,
  VerseListSortOption,
} from '../types';
import type { VersePatchEvent } from '@/app/types/verseSync';
import { parseExternalVerseId } from '@/shared/bible/externalVerseId';
import { VERSE_LIST_BOOK_OPTIONS } from '../bookOptions';

type UseVerseListControllerParams = {
  disabled?: boolean;
  initialTags?: domain_Tag[];
  hasFriends?: boolean;
  isFocusMode?: boolean;
  onAddVerse: () => void;
  onOpenVerseOwners?: (verse: Verse) => void;
  onOpenVerseTags?: (verse: Verse) => void;
  onOpenVerseProgress?: (verse: Verse) => void;
  onNavigateToTraining?: (launch: DirectLaunchVerse) => void;
  isAnchorEligible?: boolean;
  reopenGalleryVerseId?: string | null;
  reopenGalleryStatusFilter?: VerseListStatusFilter | null;
  onReopenGalleryHandled?: () => void;
  verseListExternalSyncVersion?: number;
  onVerseMutationCommitted?: () => void;
};

function getDefaultStatusFilter(hasOwnVerses: boolean): VerseListStatusFilter {
  return hasOwnVerses ? DEFAULT_VERSE_LIST_STATUS_FILTER : 'catalog';
}

function readInitialStoredStatusFilter(
  canUseFriendsFilter: boolean
): VerseListStatusFilter | null {
  if (typeof window === 'undefined') return null;

  const stored =
    parseStoredStatusFilter(
      window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.statusFilter)
    ) ?? null;

  return stored === 'friends' && !canUseFriendsFilter ? null : stored;
}

function getTrainingLaunchMode(
  status: ReturnType<typeof normalizeDisplayVerseStatus>
) {
  if (status === 'MASTERED') return 'anchor' as const;
  if (status === 'REVIEW') return 'review' as const;
  if (status === VerseStatus.LEARNING) return 'learning' as const;
  return null;
}

export function useVerseListController({
  disabled = false,
  initialTags = [],
  hasFriends = false,
  isFocusMode = false,
  onAddVerse,
  onOpenVerseOwners,
  onOpenVerseTags,
  onOpenVerseProgress,
  onNavigateToTraining,
  isAnchorEligible = false,
  reopenGalleryVerseId = null,
  reopenGalleryStatusFilter = null,
  onReopenGalleryHandled,
  verseListExternalSyncVersion,
  onVerseMutationCommitted,
}: UseVerseListControllerParams): VerseListController {
  const debugInfiniteScroll = useCallback<DebugInfiniteScroll>(() => {}, []);
  const canUseFriendsFilter = hasFriends;
  const hasOwnVersesRequestIdRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState(() => {
    if (disabled) return '';
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.searchQuery) ?? '';
  });
  const tagFilter = useTagFilter({
    disabled,
    initialTags,
  });
  const [initialStoredStatusFilter] = useState<VerseListStatusFilter | null>(() => {
    if (reopenGalleryStatusFilter) return null;
    return readInitialStoredStatusFilter(canUseFriendsFilter);
  });
  const [statusFilter, setStatusFilter] = useState<VerseListStatusFilter>(() => {
    if (disabled) return 'catalog';
    if (reopenGalleryStatusFilter) return reopenGalleryStatusFilter;
    return initialStoredStatusFilter ?? 'catalog';
  });
  const [hasOwnVerses, setHasOwnVerses] = useState<boolean | null>(() =>
    disabled ? false : null
  );
  const [previousHasOwnVerses, setPreviousHasOwnVerses] = useState<boolean | null>(() =>
    disabled ? false : null
  );
  const [sortBy, setSortBy] = useState<VerseListSortBy>(() => {
    if (disabled) return DEFAULT_VERSE_LIST_SORT_BY;
    if (typeof window === 'undefined') return DEFAULT_VERSE_LIST_SORT_BY;
    return (
      parseStoredSortBy(window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.sortBy)) ??
      DEFAULT_VERSE_LIST_SORT_BY
    );
  });
  const [selectedBookId, setSelectedBookId] = useState<number | null>(() => {
    if (disabled) return null;
    if (typeof window === 'undefined') return null;
    return parseStoredBookId(
      window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.selectedBookId)
    );
  });
  const selectedTagSlugsForServer = useMemo(
    () => Array.from(tagFilter.selectedTagSlugs).sort(),
    [tagFilter.selectedTagSlugs]
  );
  const searchQueryForServer = statusFilter === 'catalog' ? '' : searchQuery;
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const lastHandledExternalSyncVersionRef = useRef<number | null>(
    typeof verseListExternalSyncVersion === 'number' ? verseListExternalSyncVersion : null
  );

  const { telegramId } = useTelegramId();
  const defaultStatusFilter = disabled
    ? 'catalog'
    : getDefaultStatusFilter(Boolean(hasOwnVerses));
  const hasStoredInitialStatusFilter = initialStoredStatusFilter !== null;
  const shouldAutoSwitchToMy =
    !disabled &&
    hasOwnVerses === true &&
    !reopenGalleryStatusFilter &&
    statusFilter === 'catalog' &&
    (
      previousHasOwnVerses === false ||
      (previousHasOwnVerses === null && !hasStoredInitialStatusFilter)
    );
  const shouldAutoSwitchToCatalog =
    !disabled &&
    hasOwnVerses === false &&
    !reopenGalleryStatusFilter &&
    statusFilter !== 'catalog' &&
    statusFilter !== 'friends';
  const shouldDelayListFetch = !disabled &&
    Boolean(telegramId) &&
    (hasOwnVerses === null || shouldAutoSwitchToMy || shouldAutoSwitchToCatalog);

  const refreshHasOwnVerses = useCallback(
    async (telegramIdOverride?: string | null) => {
      if (disabled) {
        setHasOwnVerses(false);
        setPreviousHasOwnVerses(false);
        return false;
      }
      const resolvedTelegramId = telegramIdOverride?.trim() || telegramId?.trim() || '';
      if (!resolvedTelegramId) {
        setHasOwnVerses(null);
        setPreviousHasOwnVerses(null);
        return null;
      }

      const requestId = ++hasOwnVersesRequestIdRef.current;

      try {
        const page = await fetchUserVersesPage({
          telegramId: resolvedTelegramId,
          filter: 'my',
          orderBy: 'updatedAt',
          order: 'desc',
          limit: 1,
        });

        if (hasOwnVersesRequestIdRef.current !== requestId) return null;
        const total =
          page.totalCount ?? page.total ?? (page.items?.length ?? 0);
        const nextHasOwnVerses = total > 0;
        setHasOwnVerses(nextHasOwnVerses);
        return nextHasOwnVerses;
      } catch (error) {
        if (hasOwnVersesRequestIdRef.current !== requestId) return null;
        console.error('Не удалось определить наличие пользовательских стихов:', error);
        const fallbackHasOwnVerses =
          statusFilter !== 'catalog' && statusFilter !== 'friends';
        setHasOwnVerses(fallbackHasOwnVerses);
        return fallbackHasOwnVerses;
      }
    },
    [disabled, statusFilter, telegramId]
  );

  const pagination = useVersePagination({
    telegramId,
    disabled,
    statusFilter,
    searchQuery: searchQueryForServer,
    bookId: selectedBookId,
    tagSlugs: selectedTagSlugsForServer,
    sortBy,
    pageSize: VERSE_LIST_PAGE_SIZE,
    loadMoreSkeletonDelayMs: LOAD_MORE_SKELETON_DELAY_MS,
  });

  const isReviewVerse = useCallback((verse: Pick<Verse, 'status'>) => {
    const status = normalizeDisplayVerseStatus(verse.status);
    return status === 'REVIEW';
  }, []);

  const isMasteredVerse = useCallback((verse: Pick<Verse, 'status'>) => {
    const status = normalizeDisplayVerseStatus(verse.status);
    return status === 'MASTERED';
  }, []);

  const matchesListFilter = useCallback(
    (verse: Pick<Verse, 'status' | 'masteryLevel'>, filter: VerseListStatusFilter) => {
      const status = normalizeDisplayVerseStatus(verse.status);
      if (filter === 'catalog') return true;
      if (filter === 'friends') return true;
      if (filter === 'learning') {
        return status === VerseStatus.LEARNING;
      }
      if (filter === 'review') return isReviewVerse(verse);
      if (filter === 'mastered') return isMasteredVerse(verse);
      if (filter === 'stopped') return status === VerseStatus.STOPPED;
      if (filter === 'my') return status !== 'CATALOG';
      return true;
    },
    [isMasteredVerse, isReviewVerse]
  );

  const actions = useVerseActions({
    telegramId,
    statusFilter,
    matchesListFilter,
    resetAndFetchFirstPage: pagination.resetAndFetchFirstPage,
    setVerses: pagination.setVerses,
    setTotalCount: pagination.setTotalCount,
    setGalleryIndex,
    setAnnouncement,
    applyVersePatch: pagination.applyVersePatch,
    onVerseMutationCommitted: () => {
      void refreshHasOwnVerses();
      onVerseMutationCommitted?.();
    },
  });

  useEffect(() => {
    if (disabled) {
      setHasOwnVerses(false);
      setPreviousHasOwnVerses(false);
      setStatusFilter('catalog');
      setSearchQuery('');
      setSortBy(DEFAULT_VERSE_LIST_SORT_BY);
      setSelectedBookId(null);
      tagFilter.clearTags();
      pagination.clearPaginationState();
      return;
    }
    if (!telegramId) {
      pagination.clearPaginationState();
      setHasOwnVerses(null);
      setPreviousHasOwnVerses(null);
      return;
    }
    void refreshHasOwnVerses(telegramId);
  }, [
    disabled,
    pagination.clearPaginationState,
    refreshHasOwnVerses,
    tagFilter.clearTags,
    telegramId,
  ]);

  useEffect(() => {
    if (disabled) return;
    if (hasOwnVerses == null) return;

    if (shouldAutoSwitchToCatalog) {
      setStatusFilter('catalog');
    } else if (shouldAutoSwitchToMy) {
      setStatusFilter(DEFAULT_VERSE_LIST_STATUS_FILTER);
    }

    setPreviousHasOwnVerses(hasOwnVerses);
  }, [disabled, hasOwnVerses, shouldAutoSwitchToCatalog, shouldAutoSwitchToMy]);

  useEffect(() => {
    if (disabled) return;
    if (!telegramId || shouldDelayListFetch) return;
    void pagination.resetAndFetchFirstPage(telegramId, statusFilter);
  }, [
    disabled,
    telegramId,
    statusFilter,
    shouldDelayListFetch,
    pagination.resetAndFetchFirstPage,
  ]);

  useEffect(() => {
    if (disabled) return;
    if (verseListExternalSyncVersion == null) return;
    if (lastHandledExternalSyncVersionRef.current === verseListExternalSyncVersion) return;
    lastHandledExternalSyncVersionRef.current = verseListExternalSyncVersion;
    if (!telegramId) return;
    if (!pagination.hasFetchedVersesOnce) return;
    void refreshHasOwnVerses(telegramId);
    void pagination.refetchCurrentListFromExternalSync();
  }, [
    disabled,
    refreshHasOwnVerses,
    telegramId,
    pagination.hasFetchedVersesOnce,
    pagination.refetchCurrentListFromExternalSync,
    verseListExternalSyncVersion,
  ]);

  useEffect(() => {
    if (disabled) return;
    if (!reopenGalleryStatusFilter) return;
    if (reopenGalleryVerseId) return;

    const resolvedReturnFilter =
      reopenGalleryStatusFilter === 'friends' && !canUseFriendsFilter
        ? defaultStatusFilter
        : reopenGalleryStatusFilter;

    if (statusFilter !== resolvedReturnFilter) return;
    onReopenGalleryHandled?.();
  }, [
    disabled,
    canUseFriendsFilter,
    defaultStatusFilter,
    onReopenGalleryHandled,
    reopenGalleryStatusFilter,
    reopenGalleryVerseId,
    statusFilter,
  ]);

  useEffect(() => {
    if (disabled) return;
    if (!reopenGalleryStatusFilter) return;
    if (reopenGalleryStatusFilter === 'friends' && !canUseFriendsFilter) {
      setStatusFilter(defaultStatusFilter);
      return;
    }
    if (statusFilter === reopenGalleryStatusFilter) return;
    setStatusFilter(reopenGalleryStatusFilter);
  }, [canUseFriendsFilter, defaultStatusFilter, disabled, reopenGalleryStatusFilter, statusFilter]);

  useEffect(() => {
    if (disabled) return;
    if (canUseFriendsFilter) return;
    if (statusFilter !== 'friends') return;
    setStatusFilter(defaultStatusFilter);
  }, [canUseFriendsFilter, defaultStatusFilter, disabled, statusFilter]);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VERSE_LIST_STORAGE_KEYS.statusFilter, statusFilter);
  }, [disabled, statusFilter]);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VERSE_LIST_STORAGE_KEYS.sortBy, sortBy);
  }, [disabled, sortBy]);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;
    if (selectedBookId == null) {
      window.localStorage.removeItem(VERSE_LIST_STORAGE_KEYS.selectedBookId);
      return;
    }
    window.localStorage.setItem(
      VERSE_LIST_STORAGE_KEYS.selectedBookId,
      String(selectedBookId)
    );
  }, [disabled, selectedBookId]);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VERSE_LIST_STORAGE_KEYS.searchQuery, searchQuery);
  }, [disabled, searchQuery]);

  useEffect(() => {
    if (disabled) return;
    if (!reopenGalleryVerseId) return;
    if (reopenGalleryStatusFilter && statusFilter !== reopenGalleryStatusFilter) return;
    if (!pagination.hasFetchedVersesOnce) return;
    if (pagination.isFetchingVerses) return;

    const index = pagination.verses.findIndex(
      (v) => String(v.id) === String(reopenGalleryVerseId) || v.externalVerseId === reopenGalleryVerseId
    );

    if (index === -1) {
      if (pagination.hasMoreVerses && !pagination.isFetchingMoreVerses) {
        void pagination.ensureVerseLoadedForReopen(String(reopenGalleryVerseId));
        return;
      }
      onReopenGalleryHandled?.();
      return;
    }

    if (typeof window === 'undefined') {
      setGalleryIndex(index);
      onReopenGalleryHandled?.();
      return;
    }

    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setGalleryIndex(index);
        onReopenGalleryHandled?.();
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [
    disabled,
    reopenGalleryVerseId,
    reopenGalleryStatusFilter,
    statusFilter,
    pagination.verses,
    pagination.isFetchingVerses,
    pagination.isFetchingMoreVerses,
    pagination.hasMoreVerses,
    pagination.hasFetchedVersesOnce,
    pagination.ensureVerseLoadedForReopen,
    onReopenGalleryHandled,
  ]);

  // Single-pass filtering + classification: O(n) instead of O(5n).
  const { filteredVerses, reviewVerses, masteredVerses, learningVerses, stoppedVerses } = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const useClientTextSearch = statusFilter === 'catalog';
    const filtered: Verse[] = [];
    const review: Verse[] = [];
    const mastered: Verse[] = [];
    const learning: Verse[] = [];
    const stopped: Verse[] = [];

    for (const verse of pagination.verses) {
      const matchesStatus = matchesListFilter(verse, statusFilter);
      const verseBookId = parseExternalVerseId(verse.externalVerseId)?.book ?? null;
      const matchesBook = selectedBookId == null || verseBookId === selectedBookId;
      const matchesSearch =
        !normalizedQuery ||
        !useClientTextSearch ||
        verse.reference.toLowerCase().includes(normalizedQuery) ||
        verse.text.toLowerCase().includes(normalizedQuery);

      if (!(matchesStatus && matchesBook && matchesSearch)) continue;
      filtered.push(verse);

      const displayStatus = normalizeDisplayVerseStatus(verse.status);
      if (displayStatus === 'REVIEW') review.push(verse);
      else if (displayStatus === 'MASTERED') mastered.push(verse);
      else if (displayStatus === VerseStatus.LEARNING) learning.push(verse);
      else if (displayStatus === VerseStatus.STOPPED) stopped.push(verse);
    }

    return {
      filteredVerses: filtered,
      reviewVerses: review,
      masteredVerses: mastered,
      learningVerses: learning,
      stoppedVerses: stopped,
    };
  }, [pagination.verses, selectedBookId, statusFilter, matchesListFilter, searchQuery]);

  const hasLocalClientSearchActive = statusFilter === 'catalog' && searchQuery.trim().length > 0;
  const hasLocalClientFiltersActive = hasLocalClientSearchActive;


  const filterOptions = useMemo<VerseListFilterOption[]>(
    () => [
      // { key: 'catalog', label: 'Каталог' },
      // { key: 'my', label: 'Мои' },
      { key: 'learning', label: 'Изучаю' },
      { key: 'review', label: 'Повторяю' },
      { key: 'mastered', label: 'Выучены' },
      { key: 'stopped', label: 'На паузе' },
    ],
    []
  );

  const shouldReduceMotion = Boolean(useReducedMotion());
  const isListLoading =
    (!disabled && shouldDelayListFetch && !pagination.hasFetchedVersesOnce) ||
    pagination.isFetchingVerses && !pagination.hasFetchedVersesOnce && pagination.verses.length === 0;
  const isEmptyFiltered =
    !disabled &&
    pagination.hasFetchedVersesOnce &&
    !pagination.isFetchingVerses &&
    filteredVerses.length === 0;
  const currentFilterLabel =
    statusFilter === 'catalog'
      ? 'Каталог'
      : statusFilter === 'friends'
        ? 'Друзья'
        : statusFilter === 'my'
        ? 'Мои стихи'
        : filterOptions.find((option) => option.key === statusFilter)?.label ?? 'Мои стихи';
  const currentFilterTheme = FILTER_VISUAL_THEME[statusFilter];
  const totalVisible = filteredVerses.length;
  const bookOptions = VERSE_LIST_BOOK_OPTIONS;

  const getRevealProps = useCallback(
    (delay = 0) => {
      if (shouldReduceMotion) return {};
      return {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24, ease: 'easeOut', delay },
      } as const;
    },
    [shouldReduceMotion]
  );

  const openVerseInGallery = useCallback(
    (verse: Verse) => {
      const index = pagination.verses.findIndex((v) => actions.isSameVerse(v, verse));
      if (index === -1) return;
      haptic('light');
      setGalleryIndex(index);
    },
    [pagination.verses, actions]
  );

  const renderVerseRow = useCallback(
    (verse: Verse) => (
      <SwipeableVerseCard
        verse={verse}
        isFocusMode={isFocusMode}
        onOpen={() => openVerseInGallery(verse)}
        onOpenProgress={onOpenVerseProgress}
        onOpenOwners={onOpenVerseOwners}
        onOpenTags={onOpenVerseTags}
        onStartTraining={(v) => {
          const preferredMode = getTrainingLaunchMode(normalizeDisplayVerseStatus(v.status));
          if (!preferredMode || !onNavigateToTraining) return;
          onNavigateToTraining({
            verse: v,
            preferredMode,
            returnTarget: {
              kind: 'verse-list',
              statusFilter,
            },
          });
        }}
        onAddToLearning={(v) => {
          const isCatalog = normalizeDisplayVerseStatus(v.status) === 'CATALOG';
          void actions.updateVerseStatus(v, isCatalog ? VerseStatus.MY : VerseStatus.LEARNING);
        }}
        onPauseLearning={(v) => void actions.updateVerseStatus(v, VerseStatus.STOPPED)}
        onResumeLearning={(v) => void actions.updateVerseStatus(v, VerseStatus.LEARNING)}
        isPending={actions.pendingVerseKeys.has(actions.getVerseKey(verse))}
        isAnchorEligible={isAnchorEligible}
      />
    ),
    [
      actions,
      isAnchorEligible,
      isFocusMode,
      onNavigateToTraining,
      onOpenVerseOwners,
      onOpenVerseProgress,
      onOpenVerseTags,
      openVerseInGallery,
      statusFilter,
    ]
  );

  const handleLoadMoreRows = useCallback(
    async (range: VerseListLoadRange) => {
      if (hasLocalClientFiltersActive) {
        debugInfiniteScroll('virtualized-loadMoreRows-skip:local-filters', { range });
        return;
      }
      debugInfiniteScroll('virtualized-loadMoreRows', {
        range,
        hasMoreVerses: pagination.hasMoreVerses,
        isFetchingMoreVerses: pagination.isFetchingMoreVerses,
      });
      await pagination.fetchNextPage({ source: 'auto' });
    },
    [
      hasLocalClientFiltersActive,
      debugInfiniteScroll,
      pagination.hasMoreVerses,
      pagination.isFetchingMoreVerses,
      pagination.fetchNextPage,
    ]
  );

  const handleRetryLoadMore = useCallback(async () => {
    await pagination.fetchNextPage({ source: 'manual' });
  }, [pagination.fetchNextPage]);

  const handleAddVerseClick = useCallback(() => {
    haptic('medium');
    onAddVerse();
  }, [onAddVerse]);

  const handleTabClick = useCallback((nextFilter: VerseListStatusFilter, label: string) => {
    if (nextFilter === 'friends' && !canUseFriendsFilter) return;
    if (statusFilter === nextFilter) return;
    haptic('light');
    setStatusFilter(nextFilter);
    setAnnouncement(`Фильтр: ${label}`);
  }, [canUseFriendsFilter, statusFilter]);

  const handleBookChange = useCallback((nextBookId: number | null, label: string) => {
    if (selectedBookId === nextBookId) return;
    haptic('light');
    setSelectedBookId(nextBookId);
    setAnnouncement(`Книга: ${label}`);
  }, [selectedBookId]);

  const isMyScopeFilter = statusFilter !== 'catalog' && statusFilter !== 'friends';
  const sortOptions = useMemo<VerseListSortOption[]>(
    () => [
      { key: 'bible', label: 'Канон' },
      { key: 'updatedAt', label: 'Активность' },
      { key: 'popularity', label: 'Прогресс' },
    ],
    [isMyScopeFilter]
  );

  const handleSortChange = useCallback((nextSortBy: VerseListSortBy, label: string) => {
    if (sortBy === nextSortBy) return;
    haptic('light');
    setSortBy(nextSortBy);
    setAnnouncement(`Сортировка: ${label}`);
  }, [sortBy]);

  const handleResetFilters = useCallback(() => {
    const hasChanges =
      statusFilter !== defaultStatusFilter ||
      selectedBookId !== null ||
      sortBy !== DEFAULT_VERSE_LIST_SORT_BY ||
      searchQuery.trim().length > 0 ||
      tagFilter.hasActiveTags;
    if (!hasChanges) return;
    haptic('light');
    setStatusFilter(defaultStatusFilter);
    setSelectedBookId(null);
    setSortBy(DEFAULT_VERSE_LIST_SORT_BY);
    setSearchQuery('');
    tagFilter.clearTags();
    setAnnouncement('Фильтры сброшены');
  }, [
    defaultStatusFilter,
    searchQuery,
    selectedBookId,
    sortBy,
    statusFilter,
    tagFilter.clearTags,
    tagFilter.hasActiveTags,
  ]);

  const activeFilteredSection = useMemo<{ items: Verse[]; config: VerseListSectionConfig } | null>(() => {
    if (statusFilter === 'catalog') return {
      items: filteredVerses,
      config: {
        headingId: 'my-verses-heading',
        title: 'Каталог',
        subtitle: 'Глобальный каталог стихов',
        dotClassName: 'bg-gray-400',
        borderClassName: 'bg-gradient-to-b from-gray-500/5 to-background',
        tintClassName: 'bg-gray-500/5',
      },
    };
    if (statusFilter === 'friends') {
      return {
        items: filteredVerses,
        config: {
          headingId: 'friends-verses-heading',
          title: 'Стихи друзей',
          subtitle: 'Что изучают и повторяют ваши друзья',
          dotClassName: 'bg-cyan-500',
          borderClassName: 'bg-gradient-to-b from-cyan-500/8 to-background',
          tintClassName: 'bg-cyan-500/8',
        },
      };
    }
    if (statusFilter === 'learning') {
      return {
        items: learningVerses,
        config: {
          headingId: 'learning-verses-heading',
          title: 'Изучение',
          subtitle: 'Стихи, которые вы изучаете',
          dotClassName: 'bg-emerald-500',
          borderClassName: 'bg-gradient-to-b from-emerald-500/5 to-background',
          tintClassName: 'bg-emerald-500/5',
        },
      };
    }
    if (statusFilter === 'review') {
      return {
        items: reviewVerses,
        config: {
          headingId: 'review-verses-heading',
          title: 'Повторение',
          subtitle: 'Ваши стихи для повторения',
          dotClassName: 'bg-violet-500',
          borderClassName: 'bg-gradient-to-b from-violet-500/5 to-background',
          tintClassName: 'bg-violet-500/5',
        },
      };
    }
    if (statusFilter === 'mastered') {
      return {
        items: masteredVerses,
        config: {
          headingId: 'mastered-verses-heading',
          title: 'Выученные',
          subtitle: 'Ваши выученные стихи',
          dotClassName: 'bg-amber-500',
          borderClassName: 'bg-gradient-to-b from-amber-500/8 to-background',
          tintClassName: 'bg-amber-500/8',
        },
      };
    }
    if (statusFilter === 'stopped') {
      return {
        items: stoppedVerses,
        config: {
          headingId: 'stopped-verses-heading',
          title: 'На паузе',
          subtitle: 'Ваши стихи на паузе',
          dotClassName: 'bg-rose-500',
          borderClassName: 'bg-gradient-to-b from-rose-500/5 to-background',
          tintClassName: 'bg-rose-500/5',
        },
      };
    }
    return {
      items: filteredVerses,
      config: {
        headingId: 'my-verses-heading',
        title: 'Мои стихи',
        subtitle: 'Стихи, добавленные в мой список',
        dotClassName: 'bg-sky-500',
        borderClassName: 'bg-gradient-to-b from-sky-500/5 to-background',
        tintClassName: 'bg-sky-500/5',
      },
    };
  }, [statusFilter, learningVerses, reviewVerses, masteredVerses, stoppedVerses, filteredVerses]);

  const listItems = statusFilter === 'catalog'
    ? hasLocalClientFiltersActive
      ? filteredVerses
      : pagination.verses
    : [];
  const sectionItems = activeFilteredSection?.items ?? [];

  return {
    ui: {
      announcement,
      isListLoading,
      shouldReduceMotion,
      totalVisible,
      currentFilterLabel,
      currentFilterTheme,
      isEmptyFiltered,
    },
    filters: {
      statusFilter,
      defaultStatusFilter,
      filterOptions,
      selectedBookId,
      bookOptions,
      sortBy,
      sortOptions,
    },
    search: {
      searchQuery,
      setSearchQuery,
    },
    tagFilter: {
      allTags: tagFilter.allTags,
      selectedTagSlugs: tagFilter.selectedTagSlugs,
      hasActiveTags: tagFilter.hasActiveTags,
      isLoadingTags: tagFilter.isLoadingTags,
      onTagClick: tagFilter.toggleTag,
      onClearTags: tagFilter.clearTags,
      createTag: tagFilter.createTag,
      deleteTag: tagFilter.deleteTag,
    },
    pagination: {
      verses: pagination.verses,
      totalCount: pagination.totalCount,
      hasMoreVerses: pagination.hasMoreVerses,
      isFetchingVerses: pagination.isFetchingVerses,
      isFetchingMoreVerses: pagination.isFetchingMoreVerses,
      loadMoreError: pagination.loadMoreError,
      showDelayedInitialFetchSkeleton: pagination.showDelayedInitialFetchSkeleton,
      showDelayedLoadMoreSkeleton: pagination.showDelayedLoadMoreSkeleton,
      appendRevealRange: pagination.appendRevealRange,
    },
    list: {
      listItems,
      sectionConfig: activeFilteredSection?.config ?? null,
      sectionItems,
      enableInfiniteLoader: !hasLocalClientFiltersActive,
      pageSize: VERSE_LIST_PAGE_SIZE,
      prefetchRows: PREFETCH_ROWS,
      renderVerseRow,
      getItemKey: actions.getVerseKey,
      getItemLayoutSignature: getVerseCardLayoutSignature,
      onLoadMoreRows: handleLoadMoreRows,
      debugInfiniteScroll,
    },
    header: {
      onAddVerseClick: handleAddVerseClick,
    },
    filterTabs: {
      onTabClick: handleTabClick,
      onBookChange: handleBookChange,
      onSortChange: handleSortChange,
      onResetFilters: handleResetFilters,
    },
    footerLoadState: {
      onRetryLoadMore: handleRetryLoadMore,
    },
    modal: {
      deleteTargetVerse: actions.deleteTargetVerse,
      isDeleteSubmitting: actions.isDeleteSubmitting,
      setDeleteTargetVerse: actions.setDeleteTargetVerse,
      onConfirmDelete: actions.handleConfirmDeleteVerse,
    },
    gallery: {
      galleryIndex,
      onClose: () => setGalleryIndex(null),
      onStatusChange: actions.handleStatusChange,
      onVersePatched: (event: VersePatchEvent) => actions.applyVersePatchedFromGallery(event),
      onDelete: actions.handleDeleteVerse,
      onRequestMorePreviewVerses: () => pagination.fetchNextPage({ source: 'gallery' }),
    },
    view: {
      getRevealProps,
    },
  };
}
