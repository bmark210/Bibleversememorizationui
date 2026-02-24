import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  SCROLL_ACTIVATION_DELTA_PX,
  type VerseListStatusFilter,
} from '../constants';
import type { AppendRevealRange } from '../hooks/useVersePagination';

type DebugInfiniteScroll = (event: string, payload?: Record<string, unknown>) => void;
type WindowScrollerElement = Element | (Window & typeof globalThis);

type VerseVirtualizedListProps = {
  items: Array<Verse>;
  enableInfiniteLoader: boolean;
  isFetchingMore: boolean;
  showDelayedLoadMoreSkeleton: boolean;
  appendRevealRange: AppendRevealRange;
  onLoadMore: (range: IndexRange) => Promise<void> | void;
  renderRow: (verse: Verse) => React.ReactNode;
  getItemKey: (verse: Verse) => string;
  getItemLayoutSignature: (verse: Verse) => string;
  statusFilter: VerseListStatusFilter;
  totalCount: number;
  pageSize: number;
  prefetchRows: number;
  scrollActivationDeltaPx?: number;
  debugInfiniteScroll?: DebugInfiniteScroll;
};

type MeasuredVerseRowProps = {
  index: number;
  rowKey: string;
  layoutSignature: string;
  registerChild: (element?: Element | null) => void;
  measure: () => void;
  renderRow: (verse: Verse) => React.ReactNode;
  verse: Verse;
  shouldAnimateAppend: boolean;
  onLayoutSignatureObserved: (
    rowKey: string,
    layoutSignature: string,
    index: number,
    measure: () => void
  ) => void;
  onRowHeightObserved: (
    rowKey: string,
    index: number,
    height: number,
    measure: () => void
  ) => void;
};

function MeasuredVerseRow({
  index,
  rowKey,
  layoutSignature,
  registerChild,
  measure,
  renderRow,
  verse,
  shouldAnimateAppend,
  onLayoutSignatureObserved,
  onRowHeightObserved,
}: MeasuredVerseRowProps) {
  const measuredNodeRef = useRef<HTMLDivElement | null>(null);

  const setMeasuredNodeRef = useCallback<React.RefCallback<HTMLDivElement>>(
    (node) => {
      measuredNodeRef.current = node;
      registerChild(node);
    },
    [registerChild]
  );

  useEffect(() => {
    onLayoutSignatureObserved(rowKey, layoutSignature, index, measure);
  }, [index, layoutSignature, measure, onLayoutSignatureObserved, rowKey]);

  useEffect(() => {
    const node = measuredNodeRef.current;
    if (!node) return;

    const reportHeight = () => {
      const height = Math.round(node.getBoundingClientRect().height);
      onRowHeightObserved(rowKey, index, height, measure);
    };

    reportHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      reportHeight();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [index, measure, onRowHeightObserved, rowKey]);

  return (
    <div ref={setMeasuredNodeRef}>
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
  );
}

export function VerseVirtualizedList({
  items,
  enableInfiniteLoader,
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
  scrollActivationDeltaPx = SCROLL_ACTIVATION_DELTA_PX,
  debugInfiniteScroll,
}: VerseVirtualizedListProps) {
  const shouldReduceMotion = useReducedMotion();
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<VirtualizedList | null>(null);
  const infiniteLoaderRef = useRef<InfiniteLoader | null>(null);
  const rowLayoutSignatureByKeyRef = useRef<Map<string, string>>(new Map());
  const rowObservedHeightByKeyRef = useRef<Map<string, number>>(new Map());
  const pendingRemeasureRowsRef = useRef<Set<number>>(new Set());
  const rowRemeasureRafRef = useRef<number | null>(null);
  const rowHeightCacheRef = useRef(
    new CellMeasurerCache({
      defaultHeight: 160,
      fixedWidth: true,
      minHeight: 96,
    })
  );
  const [scrollElement, setScrollElement] = useState<WindowScrollerElement | undefined>(undefined);
  const [scrollMode, setScrollMode] = useState<'window' | 'container'>('window');
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const hasUserInteractedRef = useRef(false);
  const userScrollArmedRef = useRef(false);
  const scrollBaselineRef = useRef(0);

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

  const openInteractionGate = useCallback(
    (event: string, payload?: Record<string, unknown>) => {
      if (hasUserInteractedRef.current) return;
      hasUserInteractedRef.current = true;
      setHasUserInteracted(true);
      debug(event, payload);
    },
    [debug]
  );

  const scheduleRowRemeasure = useCallback((index: number) => {
    if (typeof window === 'undefined') return;
    pendingRemeasureRowsRef.current.add(index);
    if (rowRemeasureRafRef.current !== null) return;

    rowRemeasureRafRef.current = window.requestAnimationFrame(() => {
      rowRemeasureRafRef.current = null;
      if (pendingRemeasureRowsRef.current.size === 0) return;
      const minChangedIndex = Math.min(...pendingRemeasureRowsRef.current);
      pendingRemeasureRowsRef.current.clear();
      listRef.current?.recomputeRowHeights(minChangedIndex);
      listRef.current?.forceUpdateGrid();
    });
  }, []);

  const invalidateRowMeasurement = useCallback(
    (index: number, measure: () => void) => {
      if (index < 0) return;
      rowHeightCacheRef.current.clear(index, 0);
      measure();
      scheduleRowRemeasure(index);
    },
    [scheduleRowRemeasure]
  );

  const handleRowLayoutSignatureObserved = useCallback(
    (rowKey: string, layoutSignature: string, index: number, measure: () => void) => {
      const previousSignature = rowLayoutSignatureByKeyRef.current.get(rowKey);
      if (previousSignature === layoutSignature) return;
      rowLayoutSignatureByKeyRef.current.set(rowKey, layoutSignature);
      if (previousSignature !== undefined) {
        // Row content geometry changed (e.g. NEW -> LEARNING), so cached row height is stale.
        invalidateRowMeasurement(index, measure);
      }
    },
    [invalidateRowMeasurement]
  );

  const handleRowHeightObserved = useCallback(
    (rowKey: string, index: number, height: number, measure: () => void) => {
      const previousHeight = rowObservedHeightByKeyRef.current.get(rowKey);
      if (previousHeight !== undefined && Math.abs(previousHeight - height) <= 1) return;
      rowObservedHeightByKeyRef.current.set(rowKey, height);
      invalidateRowMeasurement(index, measure);
    },
    [invalidateRowMeasurement]
  );

  useEffect(() => {
    rowHeightCacheRef.current.clearAll();
    listRef.current?.recomputeRowHeights();
    listRef.current?.forceUpdateGrid();
    infiniteLoaderRef.current?.resetLoadMoreRowsCache(false);
    rowLayoutSignatureByKeyRef.current.clear();
    rowObservedHeightByKeyRef.current.clear();
    pendingRemeasureRowsRef.current.clear();
  }, [statusFilter, scrollMode]);

  useEffect(() => {
    const aliveKeys = new Set(items.map((item) => getItemKey(item)));
    for (const key of rowLayoutSignatureByKeyRef.current.keys()) {
      if (!aliveKeys.has(key)) rowLayoutSignatureByKeyRef.current.delete(key);
    }
    for (const key of rowObservedHeightByKeyRef.current.keys()) {
      if (!aliveKeys.has(key)) rowObservedHeightByKeyRef.current.delete(key);
    }
  }, [getItemKey, items]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && rowRemeasureRafRef.current !== null) {
        window.cancelAnimationFrame(rowRemeasureRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasUserInteracted) return;
    if (typeof window === 'undefined') return;
    const raf = window.requestAnimationFrame(() => {
      infiniteLoaderRef.current?.resetLoadMoreRowsCache(true);
      listRef.current?.forceUpdateGrid();
    });
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [hasUserInteracted]);

  useEffect(() => {
    resolveScrollElement();
  }, [resolveScrollElement, statusFilter, items.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onViewportChange = () => {
      resolveScrollElement();
    };
    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener('orientationchange', onViewportChange);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
    };
  }, [resolveScrollElement]);

  useEffect(() => {
    hasUserInteractedRef.current = false;
    setHasUserInteracted(false);
    userScrollArmedRef.current = false;
    scrollBaselineRef.current = 0;
  }, [statusFilter]);

  useEffect(() => {
    if (items.length !== 0) return;
    hasUserInteractedRef.current = false;
    setHasUserInteracted(false);
    userScrollArmedRef.current = false;
    scrollBaselineRef.current = 0;
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
        openInteractionGate('user-scroll-armed', {
          delta,
          threshold: scrollActivationDeltaPx,
          mode: scrollMode,
        });
      }
    };

    const onWheel = () => {
      openInteractionGate('user-scroll-armed:wheel', { mode: scrollMode });
    };

    const onTouchMove = () => {
      openInteractionGate('user-scroll-armed:touchmove', { mode: scrollMode });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const scrollKeys = new Set(['ArrowDown', 'PageDown', 'End', ' ', 'Spacebar']);
      if (!scrollKeys.has(event.key)) return;
      openInteractionGate('user-scroll-armed:keydown', { key: event.key, mode: scrollMode });
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

  const handleVirtualizedRowsRendered = useCallback(
    (range: IndexRange, listLength: number) => {
      debug('virtualized-rowsRendered', {
        range,
        listLength,
        prefetchRows,
        nearEnd: listLength > 0 && range.stopIndex >= Math.max(0, listLength - 1 - prefetchRows),
      });
    },
    [debug, prefetchRows]
  );

  const handleVirtualizedLoadMoreRows = useCallback(
    async (range: IndexRange) => {
      if (!enableInfiniteLoader) return;
      if (!hasUserInteractedRef.current) {
        debug('virtualized-loadMoreRows-skip:no-user-interaction', {
          range,
          totalCount,
          loadedItems: items.length,
        });
        return;
      }
      debug('virtualized-loadMoreRows', {
        range,
        totalCount,
        loadedItems: items.length,
        enableInfiniteLoader,
        isFetchingMore,
        hasUserInteracted: hasUserInteractedRef.current,
      });
      await onLoadMore(range);
    },
    [debug, enableInfiniteLoader, isFetchingMore, items.length, onLoadMore, totalCount]
  );

  if (items.length === 0) return null;

  const scrollModeKey = scrollMode;
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

    const rowKey = getItemKey(verse);
    const layoutSignature = getItemLayoutSignature(verse);

    return (
      <div key={key} style={style}>
        <CellMeasurer cache={cache} columnIndex={0} rowIndex={index} parent={parent}>
          {({ registerChild, measure }) => (
            <MeasuredVerseRow
              index={index}
              rowKey={rowKey}
              layoutSignature={layoutSignature}
              registerChild={registerChild}
              measure={measure}
              renderRow={renderRow}
              verse={verse}
              shouldAnimateAppend={shouldAnimateAppend}
              onLayoutSignatureObserved={handleRowLayoutSignatureObserved}
              onRowHeightObserved={handleRowHeightObserved}
            />
          )}
        </CellMeasurer>
      </div>
    );
  };

  const windowScrollerScrollElement: WindowScrollerElement | undefined =
    scrollElement ??
    (typeof window !== 'undefined'
      ? (window as Window & typeof globalThis)
      : undefined);

  return (
    <div ref={scrollAnchorRef} className="w-full">
      <WindowScroller
        key={`window-scroller-${scrollModeKey}-${statusFilter}`}
        scrollElement={windowScrollerScrollElement}
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
