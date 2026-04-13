"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPublicTextBoxDetail } from "@/api/services/textBoxes";
import type { PublicTextBoxDetailResponse } from "@/app/types/textBox";

export function usePublicTextBoxVerses(
  boxId: string | null,
  telegramId?: string | null,
  translation?: string,
) {
  const [data, setData] = useState<PublicTextBoxDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!boxId) {
      setData(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextData = await fetchPublicTextBoxDetail(
        boxId,
        telegramId ?? undefined,
        translation,
      );
      setData(nextData);
      return nextData;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Не удалось загрузить публичную коробку";
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
    box: data?.box ?? null,
    verses: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error,
    refresh,
  };
}
