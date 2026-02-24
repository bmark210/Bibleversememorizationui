import React, { useCallback, useEffect, useRef } from 'react';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  InfiniteLoader,
  List as VirtualizedList,
  WindowScroller,
} from 'react-virtualized';
import {
  motion,
  useReducedMotion,
} from 'motion/react';
import type {
  IndexRange,
  InfiniteLoaderChildProps,
  ListRowProps,
  ListRowRenderer,
  WindowScrollerChildProps,
} from 'react-virtualized';
import { Verse } from '@/app/App';
import { Card } from '@/app/components/ui/card';
import type { VerseListStatusFilter } from '../constants';
import type { AppendRevealRange } from '../hooks/useVersePagination';

type DebugInfiniteScroll = (event: string, payload?: Record<string, unknown>) => void;

type VerseVirtualizedListProps = {
  items: Array<Verse>;
  enableInfiniteLoader: boolean;
  isFetchingMore: boolean;
  showDelayedLoadMoreSkeleton: boolean;
  appendRevealRange: AppendRevealRange;
  onLoadMore: (range: IndexRange) => Promise<void> | void;
  onRowsRendered?: (range: IndexRange, listLength: number) => void;
  renderRow: (verse: Verse) => React.ReactNode;
  customScrollParent: HTMLElement | null;
  statusFilter: VerseListStatusFilter;
  totalCount: number;
  pageSize: number;
  prefetchRows: number;
  hasUserScrollGate: boolean;
  debugInfiniteScroll?: DebugInfiniteScroll;
  padded?: boolean;
};

export function VerseVirtualizedList({
  items,
  enableInfiniteLoader,
  isFetchingMore,
  showDelayedLoadMoreSkeleton,
  appendRevealRange,
  onLoadMore,
  onRowsRendered,
  renderRow,
  customScrollParent,
  statusFilter,
  totalCount,
  pageSize,
  prefetchRows,
  hasUserScrollGate,
  debugInfiniteScroll,
  padded = false,
}: VerseVirtualizedListProps) {
  const shouldReduceMotion = useReducedMotion();
  const listRef = useRef<VirtualizedList | null>(null);
  const infiniteLoaderRef = useRef<InfiniteLoader | null>(null);
  const rowHeightCacheRef = useRef(
    new CellMeasurerCache({
      defaultHeight: 160,
      fixedWidth: true,
      minHeight: 96,
    })
  );

  const debug = debugInfiniteScroll ?? (() => {});

  useEffect(() => {
    rowHeightCacheRef.current.clearAll();
    listRef.current?.recomputeRowHeights();
    listRef.current?.forceUpdateGrid();
    infiniteLoaderRef.current?.resetLoadMoreRowsCache(false);
  }, [statusFilter, customScrollParent]);

  useEffect(() => {
    if (!hasUserScrollGate) return;
    if (typeof window === 'undefined') return;
    const raf = window.requestAnimationFrame(() => {
      infiniteLoaderRef.current?.resetLoadMoreRowsCache(true);
      listRef.current?.forceUpdateGrid();
    });
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [hasUserScrollGate]);

  const handleVirtualizedRowsRendered = useCallback(
    (range: IndexRange, listLength: number) => {
      debug('virtualized-rowsRendered', {
        range,
        listLength,
        prefetchRows,
        nearEnd: listLength > 0 && range.stopIndex >= Math.max(0, listLength - 1 - prefetchRows),
      });
      onRowsRendered?.(range, listLength);
    },
    [debug, onRowsRendered, prefetchRows]
  );

  const handleVirtualizedLoadMoreRows = useCallback(
    async (range: IndexRange) => {
      debug('virtualized-loadMoreRows', {
        range,
        totalCount,
        loadedItems: items.length,
        enableInfiniteLoader,
        isFetchingMore,
      });
      await onLoadMore(range);
    },
    [debug, enableInfiniteLoader, isFetchingMore, items.length, onLoadMore, totalCount]
  );

  if (items.length === 0) return null;

  const scrollModeKey = customScrollParent ? 'container' : 'window';
  const serverRowCount = Math.max(totalCount, items.length);
  const rowCount = enableInfiniteLoader ? serverRowCount : items.length;
  const cache = rowHeightCacheRef.current;

  const isRowLoaded = ({ index }: { index: number }) => {
    if (!enableInfiniteLoader) return true;
    return index < items.length;
  };

  const rowRenderer: ListRowRenderer = ({ index, key, parent, style }: ListRowProps) => {
    const verse = items[index];
    if (!verse) {
      const showInlineLoadSkeleton =
        isFetchingMore && showDelayedLoadMoreSkeleton && index === items.length;

      return (
        <div
          key={key}
          style={{ ...style, boxSizing: 'border-box', paddingBottom: 12 }}
          aria-hidden="true"
        >
          <div className="h-full">
            {showInlineLoadSkeleton ? (
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="h-full rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-5 animate-pulse"
              >
                <div className="space-y-3">
                  <div className="h-4 w-28 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted/80" />
                  <div className="h-3 w-3/4 rounded bg-muted/70" />
                </div>
              </motion.div>
            ) : (
              <div className="h-full rounded-3xl opacity-0 pointer-events-none select-none" />
            )}
          </div>
        </div>
      );
    }

    const shouldAnimateAppend =
      !shouldReduceMotion &&
      !!appendRevealRange &&
      index >= appendRevealRange.start &&
      index <= appendRevealRange.end;

    return (
      <CellMeasurer key={key} cache={cache} columnIndex={0} rowIndex={index} parent={parent}>
        {({ registerChild }) => (
          <div ref={registerChild} style={style}>
            <div className="pb-3">
              {shouldAnimateAppend ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {renderRow(verse)}
                </motion.div>
              ) : (
                renderRow(verse)
              )}
            </div>
          </div>
        )}
      </CellMeasurer>
    );
  };

  return (
    <div className={padded ? 'w-full' : 'w-full'}>
      <WindowScroller
        key={`window-scroller-${scrollModeKey}-${statusFilter}`}
        scrollElement={customScrollParent ?? (typeof window !== 'undefined' ? window : undefined)}
      >
        {({ height, scrollTop, isScrolling, onChildScroll, registerChild }: WindowScrollerChildProps) => (
          <div ref={registerChild} className="w-full">
            <AutoSizer disableHeight>
              {({ width }) => (
                <InfiniteLoader
                  ref={infiniteLoaderRef}
                  isRowLoaded={isRowLoaded}
                  loadMoreRows={handleVirtualizedLoadMoreRows}
                  rowCount={rowCount}
                  threshold={enableInfiniteLoader ? prefetchRows : 0}
                  minimumBatchSize={pageSize}
                >
                  {({ onRowsRendered, registerChild: registerInfiniteChild }: InfiniteLoaderChildProps) => (
                    <VirtualizedList
                      ref={(ref) => {
                        listRef.current = ref;
                        registerInfiniteChild(ref);
                      }}
                      autoHeight
                      width={Math.max(0, width)}
                      height={Math.max(1, height)}
                      rowCount={rowCount}
                      rowHeight={({ index }) => {
                        if (index >= items.length) return 160;
                        return cache.rowHeight({ index });
                      }}
                      deferredMeasurementCache={cache}
                      estimatedRowSize={160}
                      overscanRowCount={Math.max(4, prefetchRows + 2)}
                      rowRenderer={rowRenderer}
                      onScroll={onChildScroll}
                      scrollTop={scrollTop}
                      isScrolling={isScrolling}
                      onRowsRendered={(info) => {
                        onRowsRendered(info);
                        handleVirtualizedRowsRendered(
                          { startIndex: info.startIndex, stopIndex: info.stopIndex },
                          items.length
                        );
                      }}
                      noRowsRenderer={() => <></>}
                    />
                  )}
                </InfiniteLoader>
              )}
            </AutoSizer>
          </div>
        )}
      </WindowScroller>
    </div>
  );
}

