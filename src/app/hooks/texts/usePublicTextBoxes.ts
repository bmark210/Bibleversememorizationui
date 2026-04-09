"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPublicTextBoxes } from "@/api/services/textBoxes";
import type { PublicTextBoxSummary } from "@/app/types/textBox";

const DEFAULT_LIMIT = 24;

export function usePublicTextBoxes(
  translation?: string,
  limit = DEFAULT_LIMIT,
) {
  const [items, setItems] = useState<PublicTextBoxSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await fetchPublicTextBoxes({
        translation,
        limit,
        offset: 0,
      });
      setItems(page.items ?? []);
      setTotal(page.total ?? 0);
      return page;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Не удалось загрузить публичные коробки";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [limit, translation]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || items.length >= total) {
      return null;
    }

    setIsLoadingMore(true);
    setError(null);
    try {
      const page = await fetchPublicTextBoxes({
        translation,
        limit,
        offset: items.length,
      });
      setItems((prev) => [...prev, ...(page.items ?? [])]);
      setTotal(page.total ?? 0);
      return page;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Не удалось загрузить публичные коробки";
      setError(message);
      throw err;
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, items.length, limit, total, translation]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  return {
    items,
    total,
    isLoading,
    isLoadingMore,
    hasMore: items.length < total,
    error,
    refresh,
    loadMore,
  };
}
