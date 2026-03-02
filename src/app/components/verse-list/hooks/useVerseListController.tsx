import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import {
  FILTER_VISUAL_THEME,
  LOAD_MORE_SKELETON_DELAY_MS,
  PREFETCH_ROWS,
  VERSE_LIST_PAGE_SIZE,
  getVerseCardLayoutSignature,
  type VerseListStatusFilter,
} from '../constants';
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
} from '../types';
import type { VersePatchEvent } from '@/app/types/verseSync';

type UseVerseListControllerParams = {
  onAddVerse: () => void;
  reopenGalleryVerseId?: string | null;
  reopenGalleryStatusFilter?: VerseListStatusFilter | null;
  onReopenGalleryHandled?: () => void;
  verseListExternalSyncVersion?: number;
  onVerseMutationCommitted?: () => void;
};

export function useVerseListController({
  onAddVerse,
  reopenGalleryVerseId = null,
  reopenGalleryStatusFilter = null,
  onReopenGalleryHandled,
  verseListExternalSyncVersion,
  onVerseMutationCommitted,
}: UseVerseListControllerParams): VerseListController {
  const debugInfiniteScroll = useCallback<DebugInfiniteScroll>((event, payload) => {
    if (process.env.NODE_ENV === 'production') return;
    if (process.env.NEXT_PUBLIC_DEBUG_INFINITE_SCROLL !== '1') return;
    console.log('[VerseList][infinite]', event, payload ?? {});
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [testamentFilter] = useState<'catalog' | 'OT' | 'NT'>('catalog');
  const [masteryFilter] = useState<'catalog' | 'low' | 'medium' | 'high'>('catalog');
  const tagFilter = useTagFilter();
  const [statusFilter, setStatusFilter] = useState<VerseListStatusFilter>(reopenGalleryStatusFilter ?? 'catalog');
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

  const pagination = useVersePagination({
    telegramId,
    statusFilter,
    searchQuery: searchQueryForServer,
    tagSlugs: selectedTagSlugsForServer,
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
      if (filter === 'learning') {
        return status === VerseStatus.LEARNING;
      }
      if (filter === 'review') return isReviewVerse(verse);
      if (filter === 'mastered') return isMasteredVerse(verse);
      if (filter === 'stopped') return status === VerseStatus.STOPPED;
      if (filter === 'my') return status !== 'CATALOG';
      if (filter === 'catalog') return status === 'CATALOG';
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
    onVerseMutationCommitted,
  });

  useEffect(() => {
    if (!telegramId) {
      pagination.clearPaginationState();
      return;
    }
    void pagination.resetAndFetchFirstPage(telegramId, statusFilter);
  }, [telegramId, statusFilter, pagination.clearPaginationState, pagination.resetAndFetchFirstPage]);

  useEffect(() => {
    if (verseListExternalSyncVersion == null) return;
    if (lastHandledExternalSyncVersionRef.current === verseListExternalSyncVersion) return;
    lastHandledExternalSyncVersionRef.current = verseListExternalSyncVersion;
    if (!telegramId) return;
    if (!pagination.hasFetchedVersesOnce) return;
    void pagination.refetchCurrentListFromExternalSync();
  }, [
    telegramId,
    pagination.hasFetchedVersesOnce,
    pagination.refetchCurrentListFromExternalSync,
    verseListExternalSyncVersion,
  ]);

  useEffect(() => {
    if (!reopenGalleryStatusFilter) return;
    if (statusFilter === reopenGalleryStatusFilter) return;
    setStatusFilter(reopenGalleryStatusFilter);
  }, [reopenGalleryStatusFilter, statusFilter]);

  useEffect(() => {
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

  const filteredVerses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const useClientTextSearch = statusFilter === 'catalog';
    return pagination.verses.filter((v) => {
      const matchStatus = matchesListFilter(v, statusFilter);
      const matchSearch =
        !q ||
        !useClientTextSearch ||
        v.reference.toLowerCase().includes(q) ||
        v.text.toLowerCase().includes(q);
      const matchTestament = testamentFilter === 'catalog' || (v as any).testament === testamentFilter;
      const matchMastery =
        masteryFilter === 'catalog' ||
        (masteryFilter === 'low' && (v as any).masteryLevel < 40) ||
        (masteryFilter === 'medium' &&
          (v as any).masteryLevel >= 40 &&
          (v as any).masteryLevel < 75) ||
        (masteryFilter === 'high' && (v as any).masteryLevel >= 75);
      return matchStatus && matchSearch && matchTestament && matchMastery;
    });
  }, [pagination.verses, statusFilter, matchesListFilter, searchQuery, testamentFilter, masteryFilter]);

  const hasLocalClientSearchActive = statusFilter === 'catalog' && searchQuery.trim().length > 0;
  const hasLocalClientFiltersActive =
    hasLocalClientSearchActive ||
    testamentFilter !== 'catalog' ||
    masteryFilter !== 'catalog';

  const reviewVerses = useMemo(() => filteredVerses.filter((v) => isReviewVerse(v)), [filteredVerses, isReviewVerse]);
  const masteredVerses = useMemo(
    () => filteredVerses.filter((v) => isMasteredVerse(v)),
    [filteredVerses, isMasteredVerse]
  );
  const learningVerses = useMemo(
    () => filteredVerses.filter((v) => normalizeDisplayVerseStatus(v.status) === VerseStatus.LEARNING),
    [filteredVerses]
  );
  const stoppedVerses = useMemo(
    () => filteredVerses.filter((v) => v.status === VerseStatus.STOPPED),
    [filteredVerses]
  );


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
    pagination.isFetchingVerses && !pagination.hasFetchedVersesOnce && pagination.verses.length === 0;
  const isEmptyFiltered =
    pagination.hasFetchedVersesOnce && !pagination.isFetchingVerses && filteredVerses.length === 0;
  const currentFilterLabel =
    filterOptions.find((option) => option.key === statusFilter)?.label ?? 'Каталог';
  const currentFilterTheme = FILTER_VISUAL_THEME[statusFilter];
  const totalVisible = filteredVerses.length;

  const dueNowCount = useMemo(
    () =>
      learningVerses.filter((verse) => {
        if (!verse.nextReviewAt) return true;
        const date = new Date(verse.nextReviewAt);
        return Number.isNaN(date.getTime()) || date.getTime() <= Date.now();
      }).length,
    [learningVerses]
  );

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
        onOpen={() => openVerseInGallery(verse)}
        onAddToLearning={(v) => {
          const isCatalog = normalizeDisplayVerseStatus(v.status) === 'CATALOG';
          void actions.updateVerseStatus(v, isCatalog ? VerseStatus.MY : VerseStatus.LEARNING);
        }}
        onPauseLearning={(v) => void actions.updateVerseStatus(v, VerseStatus.STOPPED)}
        onResumeLearning={(v) => void actions.updateVerseStatus(v, VerseStatus.LEARNING)}
        onRequestDelete={actions.confirmDeleteVerse}
        isPending={actions.pendingVerseKeys.has(actions.getVerseKey(verse))}
      />
    ),
    [actions, openVerseInGallery]
  );

  const onLoadMoreRows = useCallback(
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

  const onRetryLoadMore = useCallback(async () => {
    await pagination.fetchNextPage({ source: 'manual' });
  }, [pagination.fetchNextPage]);

  const onAddVerseClick = useCallback(() => {
    haptic('medium');
    onAddVerse();
  }, [onAddVerse]);

  const onTabClick = useCallback((filter: VerseListStatusFilter, label: string) => {
    if (statusFilter === filter) return;
    haptic('light');
    console.log('onTabClick', filter, label, statusFilter);
    statusFilter === filter ? setStatusFilter('catalog') : setStatusFilter(filter);
    setAnnouncement(`Фильтр: ${label}`);
  }, [statusFilter]);

  const activeFilteredSection = useMemo<{ items: Verse[]; config: VerseListSectionConfig } | null>(() => {
    if (statusFilter === 'catalog') return null;
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
  }, [statusFilter, learningVerses, dueNowCount, reviewVerses, masteredVerses, stoppedVerses, filteredVerses]);

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
      filterOptions,
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
      onLoadMoreRows,
      debugInfiniteScroll,
    },
    header: {
      onAddVerseClick,
    },
    filterTabs: {
      onTabClick,
    },
    footerLoadState: {
      onRetryLoadMore,
    },
    modal: {
      deleteTargetVerse: actions.deleteTargetVerse,
      deleteSubmitting: actions.deleteSubmitting,
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
