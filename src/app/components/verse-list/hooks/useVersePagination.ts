import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchUserVersesPage } from '@/api/services/userVersesPagination';
import { Verse } from '@/app/App';
import type { VerseListStatusFilter } from '../constants';

export type FetchNextPageSource = 'auto' | 'manual' | 'reopen' | 'gallery';
export type AppendRevealRange = { start: number; end: number } | null;

type DebugInfiniteScroll = (event: string, payload?: Record<string, unknown>) => void;

type UseVersePaginationParams = {
  telegramId?: string;
  statusFilter: VerseListStatusFilter;
  pageSize: number;
  loadMoreSkeletonDelayMs: number;
  hasUserScrolledRef: React.MutableRefObject<boolean>;
  debugInfiniteScroll?: DebugInfiniteScroll;
};

export function useVersePagination({
  telegramId,
  statusFilter,
  pageSize,
  loadMoreSkeletonDelayMs,
  hasUserScrolledRef,
}: UseVersePaginationParams) {
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [isFetchingVerses, setIsFetchingVerses] = useState(false);
  const [isFetchingMoreVerses, setIsFetchingMoreVerses] = useState(false);
  const [hasFetchedVersesOnce, setHasFetchedVersesOnce] = useState(false);
  const [hasMoreVerses, setHasMoreVerses] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [showDelayedLoadMoreSkeleton, setShowDelayedLoadMoreSkeleton] = useState(false);
  const [appendRevealRange, setAppendRevealRange] = useState<AppendRevealRange>(null);

  const requestVersionRef = useRef(0);
  const versesRef = useRef<Array<Verse>>([]);
  const nextOffsetRef = useRef(0);
  const totalCountRef = useRef(0);
  const fetchMoreLockRef = useRef(false);
  const inFlightCursorRef = useRef<string | null>(null);
  const inFlightStartOffsetsRef = useRef<Set<number>>(new Set());
  const completedStartOffsetsRef = useRef<Set<number>>(new Set());
  const lastFailedCursorRef = useRef<string | null>(null);
  const hasMoreVersesRef = useRef(false);
  const loadMoreErrorRef = useRef<string | null>(null);
  const suspendAutoLoadRef = useRef(false);

  useEffect(() => {
    versesRef.current = verses;
  }, [verses]);

  useEffect(() => {
    hasMoreVersesRef.current = hasMoreVerses;
  }, [hasMoreVerses]);

  useEffect(() => {
    loadMoreErrorRef.current = loadMoreError;
  }, [loadMoreError]);

  useEffect(() => {
    totalCountRef.current = totalCount;
  }, [totalCount]);

  useEffect(() => {
    if (!isFetchingMoreVerses) {
      setShowDelayedLoadMoreSkeleton(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowDelayedLoadMoreSkeleton(true);
    }, loadMoreSkeletonDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isFetchingMoreVerses, loadMoreSkeletonDelayMs]);

  useEffect(() => {
    if (!appendRevealRange) return;
    const timeoutId = window.setTimeout(() => {
      setAppendRevealRange(null);
    }, 420);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [appendRevealRange]);

  const getVerseKey = useCallback((verse: Pick<Verse, 'id' | 'externalVerseId'>) => {
    return String(verse.externalVerseId ?? verse.id);
  }, []);

  const mergeUniqueVerses = useCallback(
    (prev: Array<Verse>, incoming: Array<Verse>) => {
      if (incoming.length === 0) return prev;
      const seen = new Set(prev.map((v) => getVerseKey(v)));
      const appended: Array<Verse> = [];
      for (const verse of incoming) {
        const key = getVerseKey(verse);
        if (seen.has(key)) continue;
        seen.add(key);
        appended.push(verse);
      }
      return appended.length > 0 ? [...prev, ...appended] : prev;
    },
    [getVerseKey]
  );

  const requestVersesPage = useCallback(
    async (id: string, filter: VerseListStatusFilter, startWith?: number | null) => {
      const page = await fetchUserVersesPage({
        telegramId: id,
        orderBy: 'createdAt',
        order: 'desc',
        filter,
        limit: pageSize,
        startWith: startWith ?? undefined,
      });

      return {
        ...page,
        items: page.items as Array<Verse>,
      };
    },
    [pageSize]
  );

  const clearPaginationState = useCallback(() => {
    requestVersionRef.current += 1;
    versesRef.current = [];
    nextOffsetRef.current = 0;
    totalCountRef.current = 0;
    fetchMoreLockRef.current = false;
    inFlightCursorRef.current = null;
    inFlightStartOffsetsRef.current.clear();
    completedStartOffsetsRef.current.clear();
    lastFailedCursorRef.current = null;
    suspendAutoLoadRef.current = false;

    setVerses([]);
    setIsFetchingVerses(false);
    setIsFetchingMoreVerses(false);
    setHasFetchedVersesOnce(false);
    setHasMoreVerses(false);
    setTotalCount(0);
    setLoadMoreError(null);
    setShowDelayedLoadMoreSkeleton(false);
    setAppendRevealRange(null);
  }, []);

  const resetAndFetchFirstPage = useCallback(
    async (id: string, filter: VerseListStatusFilter) => {
      const requestVersion = ++requestVersionRef.current;
      versesRef.current = [];
      nextOffsetRef.current = 0;
      totalCountRef.current = 0;
      fetchMoreLockRef.current = false;
      inFlightCursorRef.current = null;
      inFlightStartOffsetsRef.current.clear();
      completedStartOffsetsRef.current.clear();
      lastFailedCursorRef.current = null;
      suspendAutoLoadRef.current = false;

      setIsFetchingVerses(true);
      setHasFetchedVersesOnce(false);
      setIsFetchingMoreVerses(false);
      setLoadMoreError(null);
      setShowDelayedLoadMoreSkeleton(false);
      setAppendRevealRange(null);
      setHasMoreVerses(false);
      setTotalCount(0);
      setVerses([]);

      try {
        const page = await requestVersesPage(id, filter, null);
        if (requestVersionRef.current !== requestVersion) return;
        versesRef.current = page.items;
        nextOffsetRef.current = page.items.length;
        totalCountRef.current = page.totalCount;
        setVerses(page.items);
        setHasMoreVerses(page.items.length < page.totalCount);
        setTotalCount(page.totalCount);
      } catch (err) {
        if (requestVersionRef.current !== requestVersion) return;
        console.error('Не удалось получить стихи:', err);
        versesRef.current = [];
        nextOffsetRef.current = 0;
        totalCountRef.current = 0;
        setVerses([]);
        setHasMoreVerses(false);
        setTotalCount(0);
      } finally {
        if (requestVersionRef.current !== requestVersion) return;
        setIsFetchingVerses(false);
        setHasFetchedVersesOnce(true);
      }
    },
    [requestVersesPage]
  );

  const fetchNextPage = useCallback(
    async (options?: { source?: FetchNextPageSource }) => {
      const source = options?.source ?? 'auto';
      if (!telegramId) return false;
      if (source === 'auto' && suspendAutoLoadRef.current) return false;
      if (source === 'auto' && !hasUserScrolledRef.current) return false;
      if (source === 'auto' && loadMoreErrorRef.current) return false;
      if (isFetchingVerses || isFetchingMoreVerses || fetchMoreLockRef.current) return false;
      if (!hasMoreVersesRef.current) return false;

      const requestVersion = requestVersionRef.current;
      const loadedServerItemsCount = versesRef.current.length;
      const knownTotalCount = totalCountRef.current;
      if (knownTotalCount > 0 && loadedServerItemsCount >= knownTotalCount) {
        setHasMoreVerses(false);
        return false;
      }

      // We own offset computation locally: next page starts from the count of rows
      // already merged into the server-backed array.
      const startWith = loadedServerItemsCount;
      const requestKey = `${telegramId}:${statusFilter}:${startWith}`;

      if (source === 'auto' && lastFailedCursorRef.current === requestKey) return false;
      if (inFlightCursorRef.current === requestKey) return false;
      if (inFlightStartOffsetsRef.current.has(startWith)) return false;
      if (completedStartOffsetsRef.current.has(startWith)) return false;

      fetchMoreLockRef.current = true;
      inFlightCursorRef.current = requestKey;
      inFlightStartOffsetsRef.current.add(startWith);
      setIsFetchingMoreVerses(true);
      if (source !== 'auto') {
        setLoadMoreError(null);
        lastFailedCursorRef.current = null;
      }

      try {
        const page = await requestVersesPage(telegramId, statusFilter, startWith);
        if (requestVersionRef.current !== requestVersion) return false;

        const prevVerses = versesRef.current;
        const mergedVerses = mergeUniqueVerses(prevVerses, page.items);
        const didAppend = mergedVerses.length > prevVerses.length;
        versesRef.current = mergedVerses;

        const nextTotalCount = page.totalCount;
        totalCountRef.current = nextTotalCount;
        const computedHasMore = mergedVerses.length < nextTotalCount;
        const stalledPagination = computedHasMore && (page.items.length === 0 || !didAppend);

        if (stalledPagination) {
          console.warn('Остановлена пагинация: повтор страницы или курсора', {
            startWith,
            pageItems: page.items.length,
            didAppend,
          });
          setHasMoreVerses(false);
          nextOffsetRef.current = mergedVerses.length;
          lastFailedCursorRef.current = null;
        } else {
          setHasMoreVerses(computedHasMore);
          nextOffsetRef.current = mergedVerses.length;
          lastFailedCursorRef.current = null;
        }

        setVerses(mergedVerses);
        if (didAppend) {
          setAppendRevealRange({
            start: prevVerses.length,
            end: mergedVerses.length - 1,
          });
        }
        completedStartOffsetsRef.current.add(startWith);
        setTotalCount(nextTotalCount);
        return didAppend;
      } catch (err) {
        if (requestVersionRef.current !== requestVersion) return false;
        console.error('Не удалось подгрузить ещё стихи:', err);
        lastFailedCursorRef.current = requestKey;
        setLoadMoreError('Не удалось загрузить ещё стихи');
        return false;
      } finally {
        fetchMoreLockRef.current = false;
        inFlightStartOffsetsRef.current.delete(startWith);
        if (inFlightCursorRef.current === requestKey) {
          inFlightCursorRef.current = null;
        }
        if (requestVersionRef.current !== requestVersion) return false;
        setIsFetchingMoreVerses(false);
      }
    },
    [
      telegramId,
      statusFilter,
      hasUserScrolledRef,
      isFetchingVerses,
      isFetchingMoreVerses,
      requestVersesPage,
      mergeUniqueVerses,
    ]
  );

  const ensureVerseLoadedForReopen = useCallback(
    async (targetVerseId: string) => {
      if (!targetVerseId) return false;
      if (!telegramId) return false;

      const hasTarget = () =>
        versesRef.current.some(
          (v) => String(v.id) === String(targetVerseId) || v.externalVerseId === targetVerseId
        );

      if (hasTarget()) return true;

      suspendAutoLoadRef.current = true;
      try {
        let safety = 0;
        while (safety < 100) {
          if (hasTarget()) return true;
          if (!hasMoreVersesRef.current) return false;
          if (loadMoreErrorRef.current) return false;
          const didLoad = await fetchNextPage({ source: 'reopen' });
          if (!didLoad && !hasMoreVersesRef.current) return false;
          if (!didLoad && loadMoreErrorRef.current) return false;
          if (!didLoad) return hasTarget();
          safety += 1;
        }
        return hasTarget();
      } finally {
        suspendAutoLoadRef.current = false;
      }
    },
    [fetchNextPage, telegramId]
  );

  return {
    verses,
    setVerses,
    isFetchingVerses,
    isFetchingMoreVerses,
    hasFetchedVersesOnce,
    hasMoreVerses,
    setHasMoreVerses,
    totalCount,
    setTotalCount,
    loadMoreError,
    setLoadMoreError,
    showDelayedLoadMoreSkeleton,
    appendRevealRange,
    setAppendRevealRange,
    resetAndFetchFirstPage,
    fetchNextPage,
    ensureVerseLoadedForReopen,
    clearPaginationState,

    versesRef,
    nextOffsetRef,
    totalCountRef,
    hasMoreVersesRef,
    loadMoreErrorRef,
    suspendAutoLoadRef,
  };
}

