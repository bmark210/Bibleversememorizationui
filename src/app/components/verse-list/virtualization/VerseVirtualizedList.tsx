import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Virtuoso, type ListRange } from 'react-virtuoso';
import { Verse } from '@/app/App';
import type { VerseListStatusFilter } from '../constants';
import type { AppendRevealRange } from '../hooks/useVersePagination';
import type { VerseListLoadRange } from '../types';

type DebugInfiniteScroll = (event: string, payload?: Record<string, unknown>) => void;
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
  debugInfiniteScroll,
}: VerseVirtualizedListProps) {
  const shouldReduceMotion = useReducedMotion();
  const autoLoadTriggeredForItemsLengthRef = useRef<number | null>(null);
  const lastVisibleRangeRef = useRef<RangeLike | null>(null);
  const debug = debugInfiniteScroll ?? (() => {});

  const maybeTriggerAutoLoadMore = useCallback(
    (range: RangeLike, source: 'range' | 'end') => {
      if (!enableInfiniteLoader) return;
      if (!hasMoreItems) return;
      if (isFetchingMore) return;
      if (items.length === 0) return;

      const normalizedPrefetchRows = Math.max(0, prefetchRows);
      const lastRealIndex = items.length - 1;
      const triggerIndex = Math.max(0, lastRealIndex - normalizedPrefetchRows);
      if (range.stopIndex < triggerIndex) return;

      if (autoLoadTriggeredForItemsLengthRef.current === items.length) {
        debug('virtuoso-autoLoad-skip:already-triggered', {
          source,
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
        source,
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

  useEffect(() => {
    autoLoadTriggeredForItemsLengthRef.current = null;
    lastVisibleRangeRef.current = null;
  }, [statusFilter]);

  useEffect(() => {
    if (items.length !== 0) return;
    autoLoadTriggeredForItemsLengthRef.current = null;
    lastVisibleRangeRef.current = null;
  }, [items.length]);

  useEffect(() => {
    autoLoadTriggeredForItemsLengthRef.current = null;
    const lastRange = lastVisibleRangeRef.current;
    if (lastRange) {
      maybeTriggerAutoLoadMore(lastRange, 'range');
    }
  }, [items.length, maybeTriggerAutoLoadMore]);

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

      maybeTriggerAutoLoadMore(visibleRange, 'range');
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
      });

      maybeTriggerAutoLoadMore(range, 'end');
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

  if (items.length === 0) return null;

  return (
    <div className="h-full w-full">
      <Virtuoso<Verse>
        key={`verse-virtuoso-${statusFilter}`}
        data={items}
        className="h-full w-full"
        style={{ height: '100%' }}
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
            <div style={{ marginTop: index === 0 ? '1rem' : '0' }} data-layout-signature={layoutSignature} className="h-full">
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
      />
    </div>
  );
}
