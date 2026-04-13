"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchFriendTextBoxes } from "@/api/services/textBoxes";
import type { PublicTextBoxSummary } from "@/app/types/textBox";

const DEFAULT_LIMIT = 24;

export function useFriendTextBoxes(
  telegramId: string | null,
  translation?: string,
  limit = DEFAULT_LIMIT,
) {
  const [items, setItems] = useState<PublicTextBoxSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!telegramId) {
      setItems([]);
      setTotal(0);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const page = await fetchFriendTextBoxes({
        telegramId,
        translation,
        limit,
        offset: 0,
      });
      setItems(page.items ?? []);
      setTotal(page.total ?? 0);
      return page;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось загрузить коробки друзей";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [limit, telegramId, translation]);

  const loadMore = useCallback(async () => {
    if (!telegramId || isLoading || isLoadingMore || items.length >= total) {
      return null;
    }

    setIsLoadingMore(true);
    setError(null);
    try {
      const page = await fetchFriendTextBoxes({
        telegramId,
        translation,
        limit,
        offset: items.length,
      });
      setItems((prev) => [...prev, ...(page.items ?? [])]);
      setTotal(page.total ?? 0);
      return page;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось загрузить коробки друзей";
      setError(message);
      throw err;
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, items.length, limit, telegramId, total, translation]);

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
