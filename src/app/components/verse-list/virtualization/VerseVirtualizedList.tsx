import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Virtuoso, type ListRange } from 'react-virtuoso';
import { Verse } from '@/app/App';
import {
  SCROLL_ACTIVATION_DELTA_PX,
  type VerseListStatusFilter,
} from '../constants';
import type { AppendRevealRange } from '../hooks/useVersePagination';
import type { VerseListLoadRange } from '../types';

type DebugInfiniteScroll = (event: string, payload?: Record<string, unknown>) => void;
type WindowScrollerElement = HTMLElement | (Window & typeof globalThis);
type ScrollMode = 'window' | 'container';
type RangeLike = VerseListLoadRange;

type VerseVirtualizedListProps = {
  items: Array<Verse>;
  enableInfiniteLoader: boolean;
  hasMoreItems: boolean;
  isFetchingMore: boolean;
  showDelayedLoadMoreSkeleton: boolean;
  appendRevealRange: AppendRevealRange;
  onLoadMore: (range: VerseListLoadRange) => Promise<void> | void;
  renderRow: (verse: Verse) => React.ReactNode;
  getItemKey: (verse: Verse) => string;
  getItemLayoutSignature: (verse: Verse) => string;
  statusFilter: VerseListStatusFilter;
  totalCount: number;
  pageSize: number;
  prefetchRows: number;
  skeletonCount?: number;
  scrollActivationDeltaPx?: number;
  debugInfiniteScroll?: DebugInfiniteScroll;
};

const DEFAULT_INLINE_SKELETON_COUNT = 4;
const DEFAULT_ITEM_HEIGHT_ESTIMATE = 176;
const SCROLL_SEEK_ENTER_VELOCITY = 720;
const SCROLL_SEEK_EXIT_VELOCITY = 140;

function InlineLoadMoreSkeleton({
  count,
  pulse,
}: {
  count: number;
  pulse: boolean;
}) {
  if (count <= 0) return null;

  return (
    <div className="w-full pt-1" aria-hidden="true">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className="space-y-3 pointer-events-none"
      >
        {Array.from({ length: count }, (_, idx) => (
          <div
            key={`inline-load-skeleton-${idx}`}
            className={[
              'min-h-[164px] sm:min-h-[180px] rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-5',
              pulse ? 'animate-pulse' : '',
            ].join(' ')}
          >
            <div className="flex h-full flex-col justify-center space-y-3">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted/80" />
              <div className="h-3 w-3/4 rounded bg-muted/70" />
              <div className="h-3 w-5/6 rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function ScrollSeekItemPlaceholder({ height }: { height: number; index: number }) {
  const resolvedHeight = Number.isFinite(height) && height > 0 ? height : DEFAULT_ITEM_HEIGHT_ESTIMATE;
  return (
    <div className="pb-3" aria-hidden="true">
      <div
        className="rounded-2xl border border-border/60 bg-card/55 animate-pulse"
        style={{ minHeight: resolvedHeight }}
      />
    </div>
  );
}

export function VerseVirtualizedList({
  items,
  enableInfiniteLoader,
  hasMoreItems,
  isFetchingMore,
  showDelayedLoadMoreSkeleton,
  appendRevealRange,
  onLoadMore,
  renderRow,
  getItemKey,
  getItemLayoutSignature,
  statusFilter,
  totalCount,
  pageSize,
  prefetchRows,
  skeletonCount = DEFAULT_INLINE_SKELETON_COUNT,
  scrollActivationDeltaPx = SCROLL_ACTIVATION_DELTA_PX,
  debugInfiniteScroll,
}: VerseVirtualizedListProps) {
  const shouldReduceMotion = useReducedMotion();
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const [scrollElement, setScrollElement] = useState<WindowScrollerElement | undefined>(undefined);
  const [scrollMode, setScrollMode] = useState<ScrollMode>('window');

  const hasUserInteractedRef = useRef(false);
  const userScrollArmedRef = useRef(false);
  const scrollBaselineRef = useRef(0);
  const autoLoadTriggeredForItemsLengthRef = useRef<number | null>(null);
  const lastVisibleRangeRef = useRef<RangeLike | null>(null);
  const maybeTriggerAutoLoadMoreRef = useRef<(range: RangeLike) => void>(() => {});

  const debug = debugInfiniteScroll ?? (() => {});

  const getScrollParent = useCallback((node: HTMLElement | null): HTMLElement | null => {
    if (!node || typeof window === 'undefined') return null;
    let current = node.parentElement;
    let fallback: HTMLElement | null = null;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      const canScroll = overflowY === 'auto' || overflowY === 'scroll';
      if (canScroll) {
        if (!fallback) fallback = current;
        if (current.scrollHeight > current.clientHeight + 1) {
          return current;
        }
      }
      current = current.parentElement;
    }
    return fallback;
  }, []);

  const resolveScrollElement = useCallback(() => {
    if (typeof window === 'undefined') return;
    const parent = getScrollParent(scrollAnchorRef.current);
    setScrollElement(parent ?? (window as Window & typeof globalThis));
    setScrollMode(parent ? 'container' : 'window');
  }, [getScrollParent]);

  const getCurrentScrollTop = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    if (scrollElement && scrollElement !== (window as Window & typeof globalThis)) {
      return (scrollElement as HTMLElement).scrollTop;
    }
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }, [scrollElement]);

  const maybeTriggerAutoLoadMore = useCallback(
    (range: RangeLike) => {
      if (!enableInfiniteLoader) return;
      if (!hasMoreItems) return;
      if (isFetchingMore) return;
      if (!hasUserInteractedRef.current) return;
      if (items.length === 0) return;

      const lastRealIndex = items.length - 1;
      const triggerIndex = Math.max(0, lastRealIndex - Math.max(0, prefetchRows));
      if (range.stopIndex < triggerIndex) return;

      if (autoLoadTriggeredForItemsLengthRef.current === items.length) {
        debug('virtuoso-autoLoad-skip:already-triggered', {
          itemsLength: items.length,
          range,
          triggerIndex,
        });
        return;
      }

      autoLoadTriggeredForItemsLengthRef.current = items.length;
      const nextRange: VerseListLoadRange = {
        startIndex: items.length,
        stopIndex: Math.max(items.length, items.length + Math.max(pageSize, 1) - 1),
      };

      debug('virtuoso-autoLoad-trigger', {
        visibleRange: range,
        requestRange: nextRange,
        itemsLength: items.length,
        totalCount,
        prefetchRows,
      });

      void onLoadMore(nextRange);
    },
    [
      debug,
      enableInfiniteLoader,
      hasMoreItems,
      isFetchingMore,
      items.length,
      onLoadMore,
      pageSize,
      prefetchRows,
      totalCount,
    ]
  );

  maybeTriggerAutoLoadMoreRef.current = maybeTriggerAutoLoadMore;

  const openInteractionGate = useCallback(
    (event: string, payload?: Record<string, unknown>) => {
      if (hasUserInteractedRef.current) return;
      hasUserInteractedRef.current = true;
      debug(event, payload);

      const lastRange = lastVisibleRangeRef.current;
      if (lastRange) {
        maybeTriggerAutoLoadMoreRef.current(lastRange);
      }
    },
    [debug]
  );

  useEffect(() => {
    resolveScrollElement();
  }, [resolveScrollElement, statusFilter, items.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onViewportChange = () => resolveScrollElement();
    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener('orientationchange', onViewportChange);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
    };
  }, [resolveScrollElement]);

  useEffect(() => {
    hasUserInteractedRef.current = false;
    userScrollArmedRef.current = false;
    scrollBaselineRef.current = 0;
    autoLoadTriggeredForItemsLengthRef.current = null;
    lastVisibleRangeRef.current = null;
  }, [statusFilter]);

  useEffect(() => {
    if (items.length !== 0) return;
    hasUserInteractedRef.current = false;
    userScrollArmedRef.current = false;
    scrollBaselineRef.current = 0;
    autoLoadTriggeredForItemsLengthRef.current = null;
    lastVisibleRangeRef.current = null;
  }, [items.length]);

  useEffect(() => {
    autoLoadTriggeredForItemsLengthRef.current = null;
  }, [items.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const target = (scrollElement ?? (window as Window & typeof globalThis)) as Window | HTMLElement;
    scrollBaselineRef.current = getCurrentScrollTop();
    userScrollArmedRef.current = true;

    const onScroll = () => {
      if (hasUserInteractedRef.current) return;
      const currentTop = getCurrentScrollTop();
      if (!userScrollArmedRef.current) {
        scrollBaselineRef.current = currentTop;
        userScrollArmedRef.current = true;
      }
      const delta = Math.abs(currentTop - scrollBaselineRef.current);
      if (delta > scrollActivationDeltaPx) {
        openInteractionGate('virtuoso-user-scroll-armed', {
          delta,
          threshold: scrollActivationDeltaPx,
          mode: scrollMode,
        });
      }
    };

    const onWheel = () => {
      openInteractionGate('virtuoso-user-scroll-armed:wheel', { mode: scrollMode });
    };

    const onTouchMove = () => {
      openInteractionGate('virtuoso-user-scroll-armed:touchmove', { mode: scrollMode });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const scrollKeys = new Set(['ArrowDown', 'PageDown', 'End', ' ', 'Spacebar']);
      if (!scrollKeys.has(event.key)) return;
      openInteractionGate('virtuoso-user-scroll-armed:keydown', { key: event.key, mode: scrollMode });
    };

    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      document.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    getCurrentScrollTop,
    openInteractionGate,
    scrollActivationDeltaPx,
    scrollElement,
    scrollMode,
  ]);

  const handleRangeChanged = useCallback(
    (range: ListRange) => {
      const visibleRange: RangeLike = {
        startIndex: range.startIndex,
        stopIndex: range.endIndex,
      };
      lastVisibleRangeRef.current = visibleRange;

      debug('virtuoso-rangeChanged', {
        range: visibleRange,
        listLength: items.length,
        totalCount,
        prefetchRows,
        nearEnd:
          items.length > 0 &&
          visibleRange.stopIndex >= Math.max(0, items.length - 1 - Math.max(0, prefetchRows)),
      });

      maybeTriggerAutoLoadMore(visibleRange);
    },
    [debug, items.length, maybeTriggerAutoLoadMore, prefetchRows, totalCount]
  );

  const handleEndReached = useCallback(
    (index: number) => {
      const range: RangeLike = {
        startIndex: Math.max(0, index - Math.max(0, prefetchRows)),
        stopIndex: index,
      };
      lastVisibleRangeRef.current = range;

      debug('virtuoso-endReached', {
        index,
        range,
        itemsLength: items.length,
        totalCount,
        isFetchingMore,
        hasMoreItems,
        hasUserInteracted: hasUserInteractedRef.current,
      });

      maybeTriggerAutoLoadMore(range);
    },
    [debug, hasMoreItems, isFetchingMore, items.length, maybeTriggerAutoLoadMore, prefetchRows, totalCount]
  );

  const inlineLoadSkeletonCount =
    enableInfiniteLoader && hasMoreItems && isFetchingMore && showDelayedLoadMoreSkeleton
      ? Math.max(1, Math.min(skeletonCount, pageSize))
      : 0;
  const shouldEnableScrollSeek = items.length > Math.max(80, pageSize * 3);

  const FooterComponent = useMemo(() => {
    const Footer = () => (
      <InlineLoadMoreSkeleton
        count={inlineLoadSkeletonCount}
        pulse={showDelayedLoadMoreSkeleton}
      />
    );
    Footer.displayName = 'VerseListVirtuosoFooter';
    return Footer;
  }, [inlineLoadSkeletonCount, showDelayedLoadMoreSkeleton]);

  const virtuosoComponents = useMemo(
    () => ({
      Footer: FooterComponent,
      ScrollSeekPlaceholder: ScrollSeekItemPlaceholder,
    }),
    [FooterComponent]
  );

  const customScrollParent =
    scrollElement && scrollElement !== (typeof window !== 'undefined' ? (window as Window & typeof globalThis) : undefined)
      ? (scrollElement as HTMLElement)
      : undefined;

  const scrollProps =
    scrollMode === 'window' || !customScrollParent
      ? ({ useWindowScroll: true } as const)
      : ({ customScrollParent } as const);

  if (items.length === 0) return null;

  return (
    <div ref={scrollAnchorRef} className="w-full">
      <Virtuoso<Verse>
        key={`verse-virtuoso-${scrollMode}-${statusFilter}`}
        data={items}
        className="w-full"
        components={virtuosoComponents}
        computeItemKey={(_, verse) => getItemKey(verse)}
        defaultItemHeight={DEFAULT_ITEM_HEIGHT_ESTIMATE}
        endReached={handleEndReached}
        rangeChanged={handleRangeChanged}
        scrollSeekConfiguration={
          shouldEnableScrollSeek
            ? {
                enter: (velocity: number) => Math.abs(velocity) > SCROLL_SEEK_ENTER_VELOCITY,
                exit: (velocity: number) => Math.abs(velocity) < SCROLL_SEEK_EXIT_VELOCITY,
              }
            : undefined
        }
        increaseViewportBy={{
          top: 0,
          bottom: Math.max(180, Math.max(0, prefetchRows) * 120),
        }}
        minOverscanItemCount={{
          top: 1,
          bottom: Math.max(2, Math.max(0, prefetchRows)),
        }}
        itemContent={(index, verse) => {
          const layoutSignature = getItemLayoutSignature(verse);
          const itemKey = getItemKey(verse);
          const shouldAnimateAppend =
            !shouldReduceMotion &&
            !!appendRevealRange &&
            index >= appendRevealRange.start &&
            index <= appendRevealRange.end;

          const content = (
            <div data-layout-signature={layoutSignature}>
              {renderRow(verse)}
            </div>
          );

          return (
            <div className="pb-3">
              {shouldAnimateAppend ? (
                <motion.div
                  key={`${itemKey}:${layoutSignature}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {content}
                </motion.div>
              ) : (
                content
              )}
            </div>
          );
        }}
        {...scrollProps}
      />
    </div>
  );
}
