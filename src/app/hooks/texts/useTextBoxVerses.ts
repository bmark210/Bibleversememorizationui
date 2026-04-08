"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchTextBoxVerses } from "@/api/services/textBoxes";
import type { TextBoxVersesResponse } from "@/app/types/textBox";

export function useTextBoxVerses(
  telegramId: string | null,
  boxId: string | null,
  translation?: string,
) {
  const [data, setData] = useState<TextBoxVersesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!telegramId || !boxId) {
      setData(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextData = await fetchTextBoxVerses(telegramId, boxId, translation);
      setData(nextData);
      return nextData;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось загрузить стихи коробки";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [boxId, telegramId, translation]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  return {
    data,
    verses: data?.items ?? [],
    box: data?.box ?? null,
    isLoading,
    error,
    refresh,
  };
}
