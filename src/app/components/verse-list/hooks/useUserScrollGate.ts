import { useCallback, useEffect, useRef, useState } from 'react';
import type { IndexRange } from 'react-virtualized';

type DebugInfiniteScroll = (event: string, payload?: Record<string, unknown>) => void;

type UseUserScrollGateParams = {
  enabled: boolean;
  customScrollParent: HTMLElement | null;
  getCurrentScrollTop: () => number;
  scrollActivationDeltaPx: number;
  prefetchRows: number;
  debugInfiniteScroll: DebugInfiniteScroll;
};

export function useUserScrollGate({
  enabled,
  customScrollParent,
  getCurrentScrollTop,
  scrollActivationDeltaPx,
  prefetchRows,
  debugInfiniteScroll,
}: UseUserScrollGateParams) {
  const [hasUserScrollGate, setHasUserScrollGate] = useState(false);

  const hasUserScrolledRef = useRef(false);
  const userScrollArmedRef = useRef(false);
  const scrollBaselineRef = useRef(0);
  const scrollInteractionTickRef = useRef(0);

  const lastVisibleRangeRef = useRef<IndexRange | null>(null);
  const lastRangeStartIndexRef = useRef<number | null>(null);

  const openGate = useCallback(
    (event: string, payload?: Record<string, unknown>) => {
      if (hasUserScrolledRef.current) return;
      hasUserScrolledRef.current = true;
      setHasUserScrollGate(true);
      debugInfiniteScroll(event, payload);
    },
    [debugInfiniteScroll]
  );

  const resetUserScrollGate = useCallback(() => {
    hasUserScrolledRef.current = false;
    userScrollArmedRef.current = false;
    scrollBaselineRef.current = 0;
    scrollInteractionTickRef.current = 0;
    lastVisibleRangeRef.current = null;
    lastRangeStartIndexRef.current = null;
    setHasUserScrollGate(false);
  }, []);

  const markUserScrollInteraction = useCallback(
    (source: string, payload?: Record<string, unknown>) => {
      scrollInteractionTickRef.current += 1;
      if (hasUserScrolledRef.current) {
        debugInfiniteScroll('scroll-interaction', {
          source,
          tick: scrollInteractionTickRef.current,
          ...payload,
        });
        return;
      }

      hasUserScrolledRef.current = true;
      setHasUserScrollGate(true);
      debugInfiniteScroll('user-scroll-armed:fallback', {
        source,
        tick: scrollInteractionTickRef.current,
        ...payload,
      });
    },
    [debugInfiniteScroll]
  );

  const armGateByVirtualizedRange = useCallback(
    (range: IndexRange, listLength: number) => {
      const prevRange = lastVisibleRangeRef.current;
      lastVisibleRangeRef.current = range;
      const prevStartIndex = lastRangeStartIndexRef.current;
      const startIndexChanged = prevStartIndex !== null && prevStartIndex !== range.startIndex;
      lastRangeStartIndexRef.current = range.startIndex;

      if (startIndexChanged) {
        scrollInteractionTickRef.current += 1;
        if (!hasUserScrolledRef.current && range.startIndex > 0) {
          hasUserScrolledRef.current = true;
          setHasUserScrollGate(true);
          debugInfiniteScroll('user-scroll-armed:virtualized-range', {
            range,
            prevRange,
            listLength,
          });
        }
      }

      debugInfiniteScroll('virtualized-rowsRendered', {
        range,
        listLength,
        prevRange,
        startIndexChanged,
        prefetchRows,
        nearEnd: listLength > 0 && range.stopIndex >= Math.max(0, listLength - 1 - prefetchRows),
      });
    },
    [debugInfiniteScroll, prefetchRows]
  );

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    const scrollTarget = (customScrollParent ?? window) as Window | HTMLElement;
    scrollBaselineRef.current = getCurrentScrollTop();
    userScrollArmedRef.current = true;

    const onScroll = () => {
      scrollInteractionTickRef.current += 1;
      const currentTop = getCurrentScrollTop();
      if (!userScrollArmedRef.current) {
        scrollBaselineRef.current = currentTop;
        userScrollArmedRef.current = true;
      }
      if (!hasUserScrolledRef.current && currentTop - scrollBaselineRef.current > scrollActivationDeltaPx) {
        openGate('user-scroll-armed', {
          delta: currentTop - scrollBaselineRef.current,
          threshold: scrollActivationDeltaPx,
          customScrollParent: Boolean(customScrollParent),
        });
      }
    };

    const onWheel = () => {
      markUserScrollInteraction('wheel', { customScrollParent: Boolean(customScrollParent) });
    };

    const onTouchMove = () => {
      markUserScrollInteraction('touchmove', { customScrollParent: Boolean(customScrollParent) });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const scrollKeys = new Set(['ArrowDown', 'PageDown', 'End', ' ', 'Spacebar']);
      if (!scrollKeys.has(event.key)) return;
      markUserScrollInteraction('keydown', {
        key: event.key,
        customScrollParent: Boolean(customScrollParent),
      });
    };

    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('wheel', onWheel);
      document.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    enabled,
    customScrollParent,
    getCurrentScrollTop,
    scrollActivationDeltaPx,
    markUserScrollInteraction,
    openGate,
  ]);

  return {
    hasUserScrollGate,
    hasUserScrolledRef,
    scrollInteractionTickRef,
    markUserScrollInteraction,
    armGateByVirtualizedRange,
    resetUserScrollGate,
    openGate,
  };
}

