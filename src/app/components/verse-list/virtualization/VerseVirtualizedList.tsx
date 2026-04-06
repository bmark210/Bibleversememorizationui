import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Virtuoso, type ListRange } from 'react-virtuoso';
import { Verse } from "@/app/domain/verse";
import type { VerseListStatusFilter } from '../constants';
import type { VerseListLoadRange } from '../types';

type DebugInfiniteScroll = (event: string, payload?: Record<string, unknown>) => void;
type RangeLike = VerseListLoadRange;
type AutoLoadSource = 'range' | 'end' | 'scroll';
const NOOP_DEBUG_INFINITE_SCROLL: DebugInfiniteScroll = () => {};

type VerseVirtualizedListProps = {
  items: Array<Verse>;
  enableInfiniteLoader: boolean;
  preferInternalScroll?: boolean;
  topInset?: number;
  bottomInset?: number;
  hasMoreItems: boolean;
  isFetchingMore: boolean;
  showDelayedLoadMoreSkeleton: boolean;
  onLoadMore: (range: VerseListLoadRange) => Promise<void> | void;
  renderRow: (verse: Verse) => React.ReactNode;
  getItemKey: (verse: Verse) => string;
  getItemLayoutSignature: (verse: Verse) => string;
  statusFilter: VerseListStatusFilter;
  totalCount: number;
  pageSize: number;
  prefetchRows: number;
  skeletonCount?: number;
  footerNode?: React.ReactNode;
  headerNode?: React.ReactNode;
  debugInfiniteScroll?: DebugInfiniteScroll;
  /**
   * Optional per-item height estimator (powered by @chenglou/pretext).
   * When provided, ScrollSeek placeholders use pretext-computed heights
   * instead of the global DEFAULT_ITEM_HEIGHT_ESTIMATE.
   */
  getItemHeightEstimate?: (verse: Verse) => number;
};

const DEFAULT_INLINE_SKELETON_COUNT = 4;
const DEFAULT_ITEM_HEIGHT_ESTIMATE = 176;
const SCROLL_SEEK_ENTER_VELOCITY = 720;
const SCROLL_SEEK_EXIT_VELOCITY = 140;
const EXTERNAL_SCROLL_ACTIVATION_PX = 8;
const MIN_CACHE_ITEMS_PER_SIDE = 4;
const MAX_CACHE_ITEMS_PER_SIDE = 12;
const EXTRA_BOTTOM_CACHE_ITEMS = 2;
const MIN_CACHE_TOP_PX = DEFAULT_ITEM_HEIGHT_ESTIMATE * 3;
const MIN_CACHE_BOTTOM_PX = DEFAULT_ITEM_HEIGHT_ESTIMATE * 4;

function isScrollableOverflow(value: string) {
  return value === 'auto' || value === 'scroll' || value === 'overlay';
}

function findNearestScrollParent(element: HTMLElement | null) {
  let current = element?.parentElement ?? null;

  while (current) {
    const styles = window.getComputedStyle(current);
    if (
      isScrollableOverflow(styles.overflowY) ||
      isScrollableOverflow(styles.overflow)
    ) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

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
      <div className="space-y-3 pointer-events-none">
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
      </div>
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

/**
 * Creates a ScrollSeek placeholder that uses pretext-computed per-item
 * height estimates instead of the global constant.
 * Called once per render when `getItemHeightEstimate` is provided.
 */
function makeSmartScrollSeekPlaceholder(
  items: Array<Verse>,
  getItemHeightEstimate: (verse: Verse) => number,
) {
  return function SmartScrollSeekPlaceholder({
    height,
    index,
  }: {
    height: number;
    index: number;
  }) {
    const verse = items[index];
    const resolvedHeight = verse
      ? getItemHeightEstimate(verse)
      : Number.isFinite(height) && height > 0
        ? height
        : DEFAULT_ITEM_HEIGHT_ESTIMATE;

    return (
      <div className="pb-3" aria-hidden="true">
        <div
          className="rounded-2xl border border-border/60 bg-card/55 animate-pulse"
          style={{ minHeight: resolvedHeight }}
        />
      </div>
    );
  };
}

export function VerseVirtualizedList({
  items,
  enableInfiniteLoader,
  preferInternalScroll = false,
  topInset = 0,
  bottomInset = 0,
  hasMoreItems,
  isFetchingMore,
  showDelayedLoadMoreSkeleton,
  onLoadMore,
  renderRow,
  getItemKey,
  getItemLayoutSignature,
  statusFilter,
  totalCount,
  pageSize,
  prefetchRows,
  skeletonCount = DEFAULT_INLINE_SKELETON_COUNT,
  footerNode,
  headerNode,
  debugInfiniteScroll,
  getItemHeightEstimate,
}: VerseVirtualizedListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoLoadTriggeredForItemsLengthRef = useRef<number | null>(null);
  const lastVisibleRangeRef = useRef<RangeLike | null>(null);
  const [customScrollParent, setCustomScrollParent] = useState<HTMLElement | null>(
    null
  );
  const debug = debugInfiniteScroll ?? NOOP_DEBUG_INFINITE_SCROLL;
  const usesExternalScrollParent = !preferInternalScroll && customScrollParent !== null;
  const normalizedTopInset = Math.max(0, Math.floor(topInset));
  const normalizedBottomInset = Math.max(0, Math.floor(bottomInset));
  const normalizedPrefetchRows = Math.max(0, prefetchRows);
  const cachedRowsPerSide = Math.min(
    MAX_CACHE_ITEMS_PER_SIDE,
    Math.max(MIN_CACHE_ITEMS_PER_SIDE, normalizedPrefetchRows + 2),
  );
  const cachedBottomRows = Math.min(
    MAX_CACHE_ITEMS_PER_SIDE + EXTRA_BOTTOM_CACHE_ITEMS,
    cachedRowsPerSide + EXTRA_BOTTOM_CACHE_ITEMS,
  );
  const overscanTopPx = Math.max(
    MIN_CACHE_TOP_PX,
    cachedRowsPerSide * DEFAULT_ITEM_HEIGHT_ESTIMATE,
  );
  const overscanBottomPx = Math.max(
    MIN_CACHE_BOTTOM_PX,
    cachedBottomRows * DEFAULT_ITEM_HEIGHT_ESTIMATE,
  );
  const overscanPx = Math.max(overscanTopPx, overscanBottomPx);
  const viewportCache = useMemo(
    () => ({
      top: overscanTopPx,
      bottom: overscanBottomPx,
    }),
    [overscanBottomPx, overscanTopPx],
  );
  const overscanItemWindow = useMemo(
    () => ({
      top: cachedRowsPerSide,
      bottom: cachedBottomRows,
    }),
    [cachedBottomRows, cachedRowsPerSide],
  );

  useLayoutEffect(() => {
    if (preferInternalScroll) {
      setCustomScrollParent(null);
      return;
    }

    const resolveScrollParent = () => {
      setCustomScrollParent(findNearestScrollParent(containerRef.current));
    };

    resolveScrollParent();
    window.addEventListener('resize', resolveScrollParent);
    return () => {
      window.removeEventListener('resize', resolveScrollParent);
    };
  }, [preferInternalScroll]);

  const maybeTriggerAutoLoadMore = useCallback(
    (range: RangeLike, source: AutoLoadSource) => {
      if (!enableInfiniteLoader) return;
      if (!hasMoreItems) return;
      if (isFetchingMore) return;
      if (items.length === 0) return;

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
      normalizedPrefetchRows,
      totalCount,
    ]
  );

  useEffect(() => {
    if (!usesExternalScrollParent || !customScrollParent) return;

    const handleExternalScroll = () => {
      if (customScrollParent.scrollTop <= EXTERNAL_SCROLL_ACTIVATION_PX) return;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const scrollParentRect = customScrollParent.getBoundingClientRect();
      const distanceToBottom = containerRect.bottom - scrollParentRect.bottom;
      const bottomThresholdPx = overscanBottomPx;

      debug('virtuoso-externalScroll', {
        scrollTop: customScrollParent.scrollTop,
        distanceToBottom,
        bottomThresholdPx,
        itemsLength: items.length,
        totalCount,
      });

      if (distanceToBottom > bottomThresholdPx) return;

      maybeTriggerAutoLoadMore(
        {
          startIndex: Math.max(0, items.length - Math.max(1, prefetchRows) - 1),
          stopIndex: Math.max(0, items.length - 1),
        },
        'scroll',
      );
    };

    customScrollParent.addEventListener('scroll', handleExternalScroll, {
      passive: true,
    });
    return () => {
      customScrollParent.removeEventListener('scroll', handleExternalScroll);
    };
  }, [
    customScrollParent,
    debug,
    items.length,
    maybeTriggerAutoLoadMore,
    normalizedPrefetchRows,
    overscanBottomPx,
    totalCount,
    usesExternalScrollParent,
  ]);

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
    if (usesExternalScrollParent) return;
    autoLoadTriggeredForItemsLengthRef.current = null;
    const lastRange = lastVisibleRangeRef.current;
    if (lastRange) {
      maybeTriggerAutoLoadMore(lastRange, 'range');
    }
  }, [items.length, maybeTriggerAutoLoadMore, usesExternalScrollParent]);

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
        prefetchRows: normalizedPrefetchRows,
        nearEnd:
          items.length > 0 &&
          visibleRange.stopIndex >= Math.max(0, items.length - 1 - normalizedPrefetchRows),
      });

      if (usesExternalScrollParent) return;
      maybeTriggerAutoLoadMore(visibleRange, 'range');
    },
    [
      debug,
      items.length,
      maybeTriggerAutoLoadMore,
      normalizedPrefetchRows,
      totalCount,
      usesExternalScrollParent,
    ]
  );

  const handleEndReached = useCallback(
    (index: number) => {
      const range: RangeLike = {
        startIndex: Math.max(0, index - normalizedPrefetchRows),
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

      if (usesExternalScrollParent) return;
      maybeTriggerAutoLoadMore(range, 'end');
    },
    [
      debug,
      hasMoreItems,
      isFetchingMore,
      items.length,
      maybeTriggerAutoLoadMore,
      normalizedPrefetchRows,
      totalCount,
      usesExternalScrollParent,
    ]
  );

  const inlineLoadSkeletonCount =
    enableInfiniteLoader && hasMoreItems && isFetchingMore && showDelayedLoadMoreSkeleton
      ? Math.max(1, Math.min(skeletonCount, pageSize))
      : 0;
  const shouldEnableScrollSeek = items.length > Math.max(80, pageSize * 3);

  const FooterComponent = useMemo(() => {
    const VerseListVirtuosoFooter = () => {
      const footerPaddingBottom =
        normalizedBottomInset > 0
          ? `calc(var(--app-bottom-nav-clearance, 0px) + ${normalizedBottomInset}px + 0.75rem)`
          : 'calc(var(--app-bottom-nav-clearance, 0px) + 0.75rem)';

      return (
        <div style={{ paddingBottom: footerPaddingBottom }}>
          {footerNode}
          <div aria-hidden="true">
            <InlineLoadMoreSkeleton
              count={inlineLoadSkeletonCount}
              pulse={showDelayedLoadMoreSkeleton}
            />
          </div>
        </div>
      );
    };
    return VerseListVirtuosoFooter;
  }, [footerNode, inlineLoadSkeletonCount, normalizedBottomInset, showDelayedLoadMoreSkeleton]);

  const HeaderComponent = useMemo(() => {
    const VerseListVirtuosoHeader = () => (
      <>
        {normalizedTopInset > 0 && (
          <div aria-hidden="true" style={{ height: normalizedTopInset }} />
        )}
        {headerNode}
      </>
    );
    return VerseListVirtuosoHeader;
  }, [normalizedTopInset, headerNode]);

  // When a pretext-based estimator is available, build a per-item-aware
  // placeholder component; otherwise fall back to the global constant.
  const SmartPlaceholder = useMemo(
    () =>
      getItemHeightEstimate
        ? makeSmartScrollSeekPlaceholder(items, getItemHeightEstimate)
        : ScrollSeekItemPlaceholder,
    [getItemHeightEstimate, items],
  );

  const virtuosoComponents = useMemo(
    () => ({
      Header: HeaderComponent,
      Footer: FooterComponent,
      ScrollSeekPlaceholder: SmartPlaceholder,
    }),
    [FooterComponent, HeaderComponent, SmartPlaceholder]
  );

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={usesExternalScrollParent ? 'w-full' : 'h-full w-full'}
    >
      <Virtuoso<Verse>
        key={`verse-virtuoso-${statusFilter}`}
        data={items}
        data-tour="verse-list-virtualized"
        className={usesExternalScrollParent ? 'w-full' : 'h-full w-full'}
        style={usesExternalScrollParent ? undefined : { height: '100%' }}
        customScrollParent={
          preferInternalScroll ? undefined : (customScrollParent ?? undefined)
        }
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
        increaseViewportBy={viewportCache}
        overscan={overscanPx}
        minOverscanItemCount={overscanItemWindow}
        itemContent={(index, verse) => {
          const layoutSignature = getItemLayoutSignature(verse);
          const content = (
            <div data-layout-signature={layoutSignature} className="h-full">
              {renderRow(verse)}
            </div>
          );

          return (
            <div
              className="px-3 pb-3 sm:px-4"
              data-tour="verse-list-row"
              data-tour-index={index}
              data-tour-verse-id={verse.externalVerseId}
            >
              {content}
            </div>
          );
        }}
      />
    </div>
  );
}
