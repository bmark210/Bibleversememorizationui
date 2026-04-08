"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCatalogVersesPage } from "@/api/services/catalogVersesPagination";
import { mapUserVerseToAppVerse, type Verse } from "@/app/domain/verse";

type UseCatalogTextsParams = {
  telegramId: string | null;
  search?: string;
  bookId?: number | null;
  pageSize?: number;
};

type RequestState = {
  verses: Verse[];
  totalCount: number;
  hasMore: boolean;
};

function dedupeVersesByExternalId(verses: Verse[]) {
  const seen = new Set<string>();
  return verses.filter((verse) => {
    if (!verse.externalVerseId || seen.has(verse.externalVerseId)) {
      return false;
    }
    seen.add(verse.externalVerseId);
    return true;
  });
}

export function useCatalogTexts({
  telegramId,
  search = "",
  bookId = null,
  pageSize = 28,
}: UseCatalogTextsParams) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const loadedCountRef = useRef(0);
  const versesRef = useRef<Verse[]>([]);
  const totalCountRef = useRef(0);

  useEffect(() => {
    versesRef.current = verses;
    totalCountRef.current = totalCount;
  }, [totalCount, verses]);

  const runRequest = useCallback(
    async (startWith: number, append: boolean): Promise<RequestState> => {
      if (!telegramId) {
        const emptyState = { verses: [], totalCount: 0, hasMore: false };
        setVerses([]);
        setTotalCount(0);
        setError(null);
        return emptyState;
      }

      const requestId = ++requestIdRef.current;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const page = await fetchCatalogVersesPage({
          telegramId,
          bookId: typeof bookId === "number" ? bookId : undefined,
          search: search.trim() || undefined,
          limit: pageSize,
          startWith,
        });

        if (requestId !== requestIdRef.current) {
          return {
            verses: append ? versesRef.current : [],
            totalCount: totalCountRef.current,
            hasMore: loadedCountRef.current < totalCountRef.current,
          };
        }

        const nextChunk = (page.items ?? []).map((item) =>
          mapUserVerseToAppVerse(item as Parameters<typeof mapUserVerseToAppVerse>[0]),
        );
        const nextVerses = append
          ? dedupeVersesByExternalId([...versesRef.current, ...nextChunk])
          : nextChunk;
        const nextTotalCount = page.totalCount ?? nextVerses.length;
        loadedCountRef.current = nextVerses.length;
        setVerses(nextVerses);
        setTotalCount(nextTotalCount);

        return {
          verses: nextVerses,
          totalCount: nextTotalCount,
          hasMore: nextVerses.length < nextTotalCount,
        };
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить каталог");
        }
        throw err;
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [bookId, pageSize, search, telegramId],
  );

  const refresh = useCallback(async () => runRequest(0, false), [runRequest]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore) return null;
    if (loadedCountRef.current >= totalCount && totalCount !== 0) return null;
    return runRequest(loadedCountRef.current, true);
  }, [isLoading, isLoadingMore, runRequest, totalCount]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  return {
    verses,
    totalCount,
    hasMore: verses.length < totalCount,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
  };
}
