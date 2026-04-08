"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type BibleBook, formatVerseReference, getBibleBookInfo } from "@/app/types/bible";
import { getHelloaoChapter, normalizeHelloaoTranslation } from "@/shared/bible/helloao";

export type BibleCatalogVerse = {
  pk: number;
  translation: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
  externalVerseId: string;
  reference: string;
};

function toBibleCatalogVerse(item: Awaited<ReturnType<typeof getHelloaoChapter>>[number]): BibleCatalogVerse {
  return {
    ...item,
    externalVerseId: `${item.book}-${item.chapter}-${item.verse}`,
    reference: formatVerseReference(item.book, item.chapter, item.verse),
  };
}

export function useBibleChapterCatalog(params?: {
  initialBook?: number;
  initialChapter?: number;
  translation?: string | null;
}) {
  const [bookId, setBookIdState] = useState<number>(params?.initialBook ?? 1);
  const [chapter, setChapterState] = useState<number>(params?.initialChapter ?? 1);
  const [verses, setVerses] = useState<BibleCatalogVerse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translation = useMemo(
    () => normalizeHelloaoTranslation(params?.translation),
    [params?.translation],
  );
  const bookInfo = useMemo(() => getBibleBookInfo(bookId), [bookId]);
  const chapterCount = bookInfo?.chapters ?? 1;
  const chapterTitle = bookInfo ? `${bookInfo.nameRu} ${chapter}` : `Глава ${chapter}`;

  useEffect(() => {
    setChapterState((current) => Math.min(Math.max(1, current), chapterCount));
  }, [chapterCount]);

  const setBookId = useCallback((nextBookId: number) => {
    const normalized = Number(nextBookId);
    if (!Number.isFinite(normalized) || normalized <= 0) return;
    setBookIdState(normalized);
    setChapterState(1);
  }, []);

  const setChapter = useCallback((nextChapter: number) => {
    const normalized = Number(nextChapter);
    if (!Number.isFinite(normalized)) return;
    setChapterState(Math.min(Math.max(1, Math.round(normalized)), chapterCount));
  }, [chapterCount]);

  const goToPrevChapter = useCallback(() => {
    setChapterState((current) => Math.max(1, current - 1));
  }, []);

  const goToNextChapter = useCallback(() => {
    setChapterState((current) => Math.min(chapterCount, current + 1));
  }, [chapterCount]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const chapterVerses = await getHelloaoChapter({
        translation,
        book: bookId as BibleBook,
        chapter,
      });
      setVerses(chapterVerses.map(toBibleCatalogVerse));
      return chapterVerses;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось загрузить главу";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [bookId, chapter, translation]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  return {
    bookId,
    chapter,
    chapterCount,
    chapterTitle,
    bookInfo,
    verses,
    isLoading,
    error,
    setBookId,
    setChapter,
    goToPrevChapter,
    goToNextChapter,
    refresh,
  };
}
