"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createTextBox,
  deleteTextBox,
  fetchTextBoxes,
  updateTextBox,
} from "@/api/services/textBoxes";
import type { TextBoxSummary } from "@/app/types/textBox";

export function useTextBoxes(telegramId: string | null, translation?: string) {
  const [boxes, setBoxes] = useState<TextBoxSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!telegramId) {
      setBoxes([]);
      setError(null);
      return [] as TextBoxSummary[];
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextBoxes = await fetchTextBoxes(telegramId, translation);
      setBoxes(nextBoxes);
      return nextBoxes;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось загрузить коробки";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [telegramId, translation]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const create = useCallback(async (title: string) => {
    if (!telegramId) throw new Error("telegramId required");
    const created = await createTextBox(telegramId, title, translation);
    await refresh();
    return created;
  }, [refresh, telegramId, translation]);

  const rename = useCallback(async (boxId: string, title: string) => {
    if (!telegramId) throw new Error("telegramId required");
    const updated = await updateTextBox(telegramId, boxId, title, translation);
    await refresh();
    return updated;
  }, [refresh, telegramId, translation]);

  const remove = useCallback(async (boxId: string) => {
    if (!telegramId) throw new Error("telegramId required");
    await deleteTextBox(telegramId, boxId);
    await refresh();
  }, [refresh, telegramId]);

  return {
    boxes,
    isLoading,
    error,
    refresh,
    create,
    rename,
    remove,
  };
}
