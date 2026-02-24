'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { IndexRange } from 'react-virtualized';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { VerseGallery } from './VerseGallery';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { TRAINING_STAGE_MASTERY_MAX } from '@/shared/training/constants';
import {
  FILTER_VISUAL_THEME,
  LOAD_MORE_SKELETON_DELAY_MS,
  PREFETCH_ROWS,
  SCROLL_ACTIVATION_DELTA_PX,
  VERSE_LIST_PAGE_SIZE,
  VerseListStatusFilter,
} from './verse-list/constants';
import { haptic } from './verse-list/haptics';
import { ConfirmDeleteModal } from './verse-list/components/ConfirmDeleteModal';
import { SwipeableVerseCard } from './verse-list/components/SwipeableVerseCard';
import { useTelegramId } from './verse-list/hooks/useTelegramId';
import { useUserScrollGate } from './verse-list/hooks/useUserScrollGate';
import { useVerseActions } from './verse-list/hooks/useVerseActions';
import { useVersePagination } from './verse-list/hooks/useVersePagination';
import { VerseVirtualizedList } from './verse-list/virtualization/VerseVirtualizedList';

interface VerseListProps {
  onAddVerse: () => void;
  reopenGalleryVerseId?: string | null;
  reopenGalleryStatusFilter?: VerseListStatusFilter | null;
  onReopenGalleryHandled?: () => void;
}

export function VerseList({
  onAddVerse,
  reopenGalleryVerseId = null,
  reopenGalleryStatusFilter = null,
  onReopenGalleryHandled,
}: VerseListProps) {
  const debugInfiniteScroll = useCallback((event: string, payload?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'production') return;
    if (process.env.NEXT_PUBLIC_DEBUG_INFINITE_SCROLL !== '1') return;
    console.log('[VerseList][infinite]', event, payload ?? {});
  }, []);

  const [searchQuery] = useState('');
  const [testamentFilter] = useState<'all' | 'OT' | 'NT'>('all');
  const [masteryFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [statusFilter, setStatusFilter] = useState<VerseListStatusFilter>(reopenGalleryStatusFilter ?? 'all');
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [customScrollParent, setCustomScrollParent] = useState<HTMLElement | null>(null);

  const listScrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const { telegramId } = useTelegramId();

  const getScrollParent = useCallback((node: HTMLElement | null): HTMLElement | null => {
    if (!node || typeof window === 'undefined') return null;
    let current = node.parentElement;
    let fallback: HTMLElement | null = null;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      const canScrollContainer = overflowY === 'auto' || overflowY === 'scroll';
      if (canScrollContainer) {
        if (!fallback) fallback = current;
        if (current.scrollHeight > current.clientHeight + 1) {
          return current;
        }
      }
      current = current.parentElement;
    }
    return fallback;
  }, []);

  const resolveScrollParent = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return getScrollParent(listScrollAnchorRef.current);
  }, [getScrollParent]);

  const getCurrentScrollTop = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    if (customScrollParent) return customScrollParent.scrollTop;
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }, [customScrollParent]);

  const scrollGate = useUserScrollGate({
    enabled: true,
    customScrollParent,
    getCurrentScrollTop,
    scrollActivationDeltaPx: SCROLL_ACTIVATION_DELTA_PX,
    prefetchRows: PREFETCH_ROWS,
    debugInfiniteScroll,
  });

  const pagination = useVersePagination({
    telegramId,
    statusFilter,
    pageSize: VERSE_LIST_PAGE_SIZE,
    loadMoreSkeletonDelayMs: LOAD_MORE_SKELETON_DELAY_MS,
    hasUserScrolledRef: scrollGate.hasUserScrolledRef,
    debugInfiniteScroll,
  });

  const isReviewVerse = useCallback((verse: Pick<Verse, 'status' | 'masteryLevel'>) => {
    return verse.status === VerseStatus.LEARNING && Number(verse.masteryLevel ?? 0) > TRAINING_STAGE_MASTERY_MAX;
  }, []);

  const matchesListFilter = useCallback((verse: Pick<Verse, 'status' | 'masteryLevel'>, filter: VerseListStatusFilter) => {
    if (filter === 'all') return true;
    if (filter === 'learning') {
      return verse.status === VerseStatus.LEARNING && Number(verse.masteryLevel ?? 0) <= TRAINING_STAGE_MASTERY_MAX;
    }
    if (filter === 'review') return isReviewVerse(verse);
    if (filter === 'stopped') return verse.status === VerseStatus.STOPPED;
    return verse.status === VerseStatus.NEW;
  }, [isReviewVerse]);

  const actions = useVerseActions({
    telegramId,
    statusFilter,
    matchesListFilter,
    resetAndFetchFirstPage: pagination.resetAndFetchFirstPage,
    setVerses: pagination.setVerses,
    setTotalCount: pagination.setTotalCount,
    setGalleryIndex,
    setAnnouncement,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextParent = resolveScrollParent();
    setCustomScrollParent((prev) => (prev === nextParent ? prev : nextParent));
  }, [resolveScrollParent, pagination.hasFetchedVersesOnce, statusFilter, pagination.verses.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onViewportChange = () => {
      const nextParent = resolveScrollParent();
      setCustomScrollParent((prev) => (prev === nextParent ? prev : nextParent));
    };

    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener('orientationchange', onViewportChange);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
    };
  }, [resolveScrollParent]);

  useEffect(() => {
    if (!telegramId) {
      scrollGate.resetUserScrollGate();
      pagination.clearPaginationState();
      return;
    }
    scrollGate.resetUserScrollGate();
    void pagination.resetAndFetchFirstPage(telegramId, statusFilter);
  }, [
    telegramId,
    statusFilter,
    pagination.clearPaginationState,
    pagination.resetAndFetchFirstPage,
    scrollGate.resetUserScrollGate,
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
    return pagination.verses.filter((v) => {
      const matchStatus = matchesListFilter(v, statusFilter);
      const matchSearch = !q || v.reference.toLowerCase().includes(q) || v.text.toLowerCase().includes(q);
      const matchTestament = testamentFilter === 'all' || (v as any).testament === testamentFilter;
      const matchMastery =
        masteryFilter === 'all' ||
        (masteryFilter === 'low' && (v as any).masteryLevel < 40) ||
        (masteryFilter === 'medium' && (v as any).masteryLevel >= 40 && (v as any).masteryLevel < 75) ||
        (masteryFilter === 'high' && (v as any).masteryLevel >= 75);
      return matchStatus && matchSearch && matchTestament && matchMastery;
    });
  }, [pagination.verses, statusFilter, matchesListFilter, searchQuery, testamentFilter, masteryFilter]);

  const hasLocalClientFiltersActive =
    searchQuery.trim().length > 0 ||
    testamentFilter !== 'all' ||
    masteryFilter !== 'all';

  const reviewVerses = filteredVerses.filter((v) => isReviewVerse(v));
  const learningVerses = filteredVerses.filter(
    (v) => v.status === VerseStatus.LEARNING && !isReviewVerse(v)
  );
  const stoppedVerses = filteredVerses.filter((v) => v.status === VerseStatus.STOPPED);
  const newVerses = filteredVerses.filter((v) => v.status === VerseStatus.NEW);

  const filterOptions: Array<{ key: VerseListStatusFilter; label: string }> = [
    { key: 'all', label: 'Все' },
    { key: 'learning', label: 'Изучаю' },
    { key: 'review', label: 'Повторяю' },
    { key: 'stopped', label: 'На паузе' },
    { key: 'new', label: 'Новые' },
  ];

  const isListLoading = pagination.isFetchingVerses && !pagination.hasFetchedVersesOnce && pagination.verses.length === 0;
  const currentFilterLabel = filterOptions.find((option) => option.key === statusFilter)?.label ?? 'Все';
  const currentFilterTheme = FILTER_VISUAL_THEME[statusFilter];
  const totalVisible = filteredVerses.length;
  const shouldReduceMotion = useReducedMotion();
  const dueNowCount = learningVerses.filter((verse) => {
    if (!verse.nextReviewAt) return true;
    const date = new Date(verse.nextReviewAt);
    return Number.isNaN(date.getTime()) || date.getTime() <= Date.now();
  }).length;

  const getRevealProps = (delay = 0) => {
    if (shouldReduceMotion) {
      return {};
    }

    return {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.24, ease: 'easeOut', delay },
    } as const;
  };

  const renderVerseSkeletonCards = (count: number) =>
    Array.from({ length: count }, (_, idx) => (
      <Card key={`skeleton-${idx}`} className="p-4 sm:p-5 border-border/70 rounded-3xl animate-pulse gap-3">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted/80" />
        <div className="h-3 w-3/4 rounded bg-muted/70" />
      </Card>
    ));

  const openVerseInGallery = useCallback((verse: Verse) => {
    const index = pagination.verses.findIndex((v) => actions.isSameVerse(v, verse));
    if (index === -1) return;
    haptic('light');
    setGalleryIndex(index);
  }, [pagination.verses, actions]);

  const renderVerseRow = useCallback((verse: Verse) => {
    return (
      <SwipeableVerseCard
        verse={verse}
        onOpen={() => openVerseInGallery(verse)}
        onAddToLearning={(v) => void actions.updateVerseStatus(v, VerseStatus.LEARNING)}
        onPauseLearning={(v) => void actions.updateVerseStatus(v, VerseStatus.STOPPED)}
        onResumeLearning={(v) => void actions.updateVerseStatus(v, VerseStatus.LEARNING)}
        onRequestDelete={actions.confirmDeleteVerse}
        isPending={actions.pendingVerseKeys.has(actions.getVerseKey(verse))}
      />
    );
  }, [actions, openVerseInGallery]);

  const handleVirtualizedRowsRendered = useCallback((range: IndexRange, listLength: number) => {
    scrollGate.armGateByVirtualizedRange(range, listLength);
  }, [scrollGate]);

  const handleVirtualizedLoadMoreRows = useCallback(async (range: IndexRange) => {
    if (hasLocalClientFiltersActive) {
      debugInfiniteScroll('virtualized-loadMoreRows-skip:local-filters', { range });
      return;
    }
    debugInfiniteScroll('virtualized-loadMoreRows', {
      range,
      hasUserScrolled: scrollGate.hasUserScrolledRef.current,
      nextOffset: Math.max(pagination.nextOffsetRef.current, pagination.versesRef.current.length),
      hasMoreVerses: pagination.hasMoreVerses,
      isFetchingMoreVerses: pagination.isFetchingMoreVerses,
    });
    await pagination.fetchNextPage({ source: 'auto' });
  }, [
    hasLocalClientFiltersActive,
    debugInfiniteScroll,
    scrollGate.hasUserScrolledRef,
    pagination.nextOffsetRef,
    pagination.versesRef,
    pagination.hasMoreVerses,
    pagination.isFetchingMoreVerses,
    pagination.fetchNextPage,
  ]);

  const renderVirtualizedVerseSection = (
    items: Array<Verse>,
    config: {
      headingId: string;
      title: string;
      subtitle: string;
      dotClassName: string;
      borderClassName: string;
      tintClassName: string;
    }
  ) => {
    if (items.length === 0) return null;

    return (
      <motion.section
        key={config.headingId}
        className="space-y-3"
        aria-labelledby={config.headingId}
        {...getRevealProps(0.06)}
      >
        <Card className={`gap-0 overflow-hidden border-border/70 rounded-3xl ${config.borderClassName}`}>
          <div className={`border-b border-border/70 p-4 sm:p-5 ${config.tintClassName}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`h-2.5 w-2.5 rounded-full ${config.dotClassName}`} />
                  <span id={config.headingId} className="font-medium">{config.title}</span>
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                    {items.length} шт.
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{config.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <VerseVirtualizedList
              items={hasLocalClientFiltersActive ? items : pagination.verses}
              enableInfiniteLoader={!hasLocalClientFiltersActive}
              isFetchingMore={pagination.isFetchingMoreVerses}
              showDelayedLoadMoreSkeleton={pagination.showDelayedLoadMoreSkeleton}
              appendRevealRange={pagination.appendRevealRange}
              onLoadMore={handleVirtualizedLoadMoreRows}
              onRowsRendered={handleVirtualizedRowsRendered}
              renderRow={renderVerseRow}
              customScrollParent={customScrollParent}
              statusFilter={statusFilter}
              totalCount={pagination.totalCount}
              pageSize={VERSE_LIST_PAGE_SIZE}
              prefetchRows={PREFETCH_ROWS}
              hasUserScrollGate={scrollGate.hasUserScrollGate}
              debugInfiniteScroll={debugInfiniteScroll}
              padded
            />
          </div>
        </Card>
      </motion.section>
    );
  };

  const activeFilteredSection = useMemo(() => {
    if (statusFilter === 'all') return null;
    if (statusFilter === 'learning') {
      return {
        items: learningVerses,
        config: {
          headingId: 'learning-verses-heading',
          title: 'Изучение',
          subtitle: dueNowCount > 0 ? `${dueNowCount} стих(а) ждут повторения` : 'Активные стихи в изучении',
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
          subtitle: `Стихи в статусе LEARNING с уровнем mastery > ${TRAINING_STAGE_MASTERY_MAX}`,
          dotClassName: 'bg-violet-500',
          borderClassName: 'bg-gradient-to-b from-violet-500/5 to-background',
          tintClassName: 'bg-violet-500/5',
        },
      };
    }
    if (statusFilter === 'stopped') {
      return {
        items: stoppedVerses,
        config: {
          headingId: 'stopped-verses-heading',
          title: 'На паузе',
          subtitle: 'Можно возобновить в один тап с карточки',
          dotClassName: 'bg-rose-500',
          borderClassName: 'bg-gradient-to-b from-rose-500/5 to-background',
          tintClassName: 'bg-rose-500/5',
        },
      };
    }
    return {
      items: newVerses,
      config: {
        headingId: 'new-verses-heading',
        title: 'Новые',
        subtitle: 'Добавленные стихи, которые ещё не переведены в изучение',
        dotClassName: 'bg-sky-500',
        borderClassName: 'bg-gradient-to-b from-sky-500/5 to-background',
        tintClassName: 'bg-sky-500/5',
      },
    };
  }, [statusFilter, learningVerses, dueNowCount, reviewVerses, stoppedVerses, newVerses]);

  return (
    <motion.div
      className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto"
      {...(shouldReduceMotion
        ? {}
        : {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.2, ease: 'easeOut' as const },
          })}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <motion.div
        className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        {...getRevealProps(0.02)}
      >
        <div>
          <h1 className="mb-1">Cтихи</h1>
          <p className="text-sm text-muted-foreground">
            Кликните на карточку, чтобы перейти в галерею и начать изучение.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => {
              haptic('medium');
              onAddVerse();
            }}
            className="shrink-0 w-full sm:w-auto rounded-3xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить стих
          </Button>
        </div>
      </motion.div>

      <motion.div className="mb-6" {...getRevealProps(0.04)}>
        <Card className="border-border/70 rounded-3xl p-4 sm:p-5 gap-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-sm font-medium">Фильтр по статусу</div>
              <p className="text-xs text-muted-foreground mt-1">
                Загружено {totalVisible} из {pagination.totalCount} {pagination.totalCount === 1 ? 'стиха' : pagination.totalCount < 5 ? 'стихов' : 'стихов'}.
              </p>
            </div>
            <Badge
              variant="outline"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${currentFilterTheme.currentBadgeClassName}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${currentFilterTheme.dotClassName}`} />
              Текущий: {currentFilterLabel}
            </Badge>
          </div>

          <div role="tablist" aria-label="Фильтр по статусу стихов" className="flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const isActive = statusFilter === option.key;
              const optionTheme = FILTER_VISUAL_THEME[option.key];

              return (
                <Button
                  key={option.key}
                  role="tab"
                  aria-selected={isActive}
                  size="sm"
                  variant="ghost"
                  className={`
                      rounded-full border px-3.5 backdrop-blur-sm transition-colors
                      inline-flex items-center gap-2
                      ${isActive
                        ? optionTheme.activeTabClassName
                        : 'border-border/60 bg-background/45 text-foreground/85 hover:bg-muted/50 hover:text-foreground'}
                    `}
                  onClick={() => {
                    if (isActive) return;
                    haptic('light');
                    setStatusFilter(option.key);
                    setAnnouncement(`Фильтр: ${option.label}`);
                  }}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? optionTheme.dotClassName : 'bg-muted-foreground/35'
                    }`}
                  />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </Card>
      </motion.div>

      <div ref={listScrollAnchorRef} className="h-px w-full" aria-hidden="true" />

      {isListLoading ? (
        <motion.div className="space-y-4" {...getRevealProps(0.05)}>
          {renderVerseSkeletonCards(3)}
        </motion.div>
      ) : filteredVerses.length === 0 ? (
        <motion.div {...getRevealProps(0.05)}>
          <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-background to-primary/5 p-8 text-center gap-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/80">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold">Список пока пуст</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Добавьте первый стих, и он появится здесь. Дальше сможете открыть его в галерее и начать тренировку.
              </p>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  haptic('medium');
                  onAddVerse();
                }}
                className="rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить первый стих
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : statusFilter === 'all' ? (
        <motion.div className="space-y-3" {...getRevealProps(0.06)}>
          <VerseVirtualizedList
            items={hasLocalClientFiltersActive ? filteredVerses : pagination.verses}
            enableInfiniteLoader={!hasLocalClientFiltersActive}
            isFetchingMore={pagination.isFetchingMoreVerses}
            showDelayedLoadMoreSkeleton={pagination.showDelayedLoadMoreSkeleton}
            appendRevealRange={pagination.appendRevealRange}
            onLoadMore={handleVirtualizedLoadMoreRows}
            onRowsRendered={handleVirtualizedRowsRendered}
            renderRow={renderVerseRow}
            customScrollParent={customScrollParent}
            statusFilter={statusFilter}
            totalCount={pagination.totalCount}
            pageSize={VERSE_LIST_PAGE_SIZE}
            prefetchRows={PREFETCH_ROWS}
            hasUserScrollGate={scrollGate.hasUserScrollGate}
            debugInfiniteScroll={debugInfiniteScroll}
          />
        </motion.div>
      ) : (
        activeFilteredSection
          ? renderVirtualizedVerseSection(activeFilteredSection.items, activeFilteredSection.config)
          : null
      )}

      {!isListLoading && (pagination.verses.length > 0 || pagination.hasMoreVerses || pagination.isFetchingMoreVerses || pagination.loadMoreError) && (
        <motion.div className="space-y-3" {...getRevealProps(0.08)}>
          <div className="flex justify-center">
            {pagination.isFetchingMoreVerses ? (
              <div className="w-full max-w-3xl space-y-3">
                <motion.div
                  initial={false}
                  animate={
                    pagination.showDelayedLoadMoreSkeleton
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: 4 }
                  }
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="pointer-events-none"
                  aria-hidden={!pagination.showDelayedLoadMoreSkeleton}
                >
                  {renderVerseSkeletonCards(1)}
                </motion.div>
              </div>
            ) : pagination.loadMoreError ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  void pagination.fetchNextPage({ source: 'manual' });
                }}
              >
                Повторить загрузку
              </Button>
            ) : !pagination.hasMoreVerses && pagination.verses.length > 0 ? (
              <Badge variant="outline" className="rounded-full px-3 py-1 text-muted-foreground">
                Все стихи загружены
              </Badge>
            ) : null}
          </div>
        </motion.div>
      )}

      <ConfirmDeleteModal
        verse={actions.deleteTargetVerse}
        open={actions.deleteTargetVerse !== null}
        onOpenChange={(open) => {
          if (!open && !actions.deleteSubmitting) actions.setDeleteTargetVerse(null);
        }}
        onConfirm={actions.handleConfirmDeleteVerse}
        isSubmitting={actions.deleteSubmitting}
      />

      {galleryIndex !== null && pagination.verses[galleryIndex] && typeof document !== 'undefined' &&
        createPortal(
          <VerseGallery
            verses={pagination.verses}
            initialIndex={galleryIndex}
            onClose={() => setGalleryIndex(null)}
            onStatusChange={actions.handleStatusChange}
            onDelete={actions.handleDeleteVerse}
            previewTotalCount={pagination.totalCount}
            previewHasMore={pagination.hasMoreVerses}
            previewIsLoadingMore={pagination.isFetchingMoreVerses}
            onRequestMorePreviewVerses={() => pagination.fetchNextPage({ source: 'gallery' })}
          />,
          document.body
        )}
    </motion.div>
  );
}
