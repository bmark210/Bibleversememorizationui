"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatVerseReference, getBibleBookInfo } from "@/app/types/bible";
import { fetchBibleChapter } from "@/api/services/bibleApi";
import { useTranslationStore } from "@/app/stores/translationStore";

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

export function useBibleChapterCatalog(params?: {
  initialBook?: number;
  initialChapter?: number;
  /** Явный перевод. Если не передан — берётся из глобального translationStore. */
  translation?: string | null;
}) {
  // Если перевод не задан явно — берём из глобального стора
  const storeTranslation = useTranslationStore((s) => s.translation);
  const translation = params?.translation ?? storeTranslation;

  const [bookId, setBookIdState] = useState<number>(params?.initialBook ?? 1);
  const [chapter, setChapterState] = useState<number>(params?.initialChapter ?? 1);
  const [verses, setVerses] = useState<BibleCatalogVerse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookInfo = useMemo(() => getBibleBookInfo(bookId), [bookId]);
  const chapterCount = bookInfo?.chapters ?? 1;
  const chapterTitle = bookInfo
    ? `${bookInfo.nameRu} ${chapter}`
    : `Глава ${chapter}`;

  useEffect(() => {
    setChapterState((current) => Math.min(Math.max(1, current), chapterCount));
  }, [chapterCount]);

  const setBookId = useCallback((nextBookId: number) => {
    const normalized = Number(nextBookId);
    if (!Number.isFinite(normalized) || normalized <= 0) return;
    setBookIdState(normalized);
    setChapterState(1);
  }, []);

  const setChapter = useCallback(
    (nextChapter: number) => {
      const normalized = Number(nextChapter);
      if (!Number.isFinite(normalized)) return;
      setChapterState(
        Math.min(Math.max(1, Math.round(normalized)), chapterCount),
      );
    },
    [chapterCount],
  );

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
      const data = await fetchBibleChapter({
        bookNumber: bookId,
        chapter,
        translation,
      });
      const result: BibleCatalogVerse[] = data.items.map((item, index) => ({
        pk: index + 1,
        translation,
        book: item.bookNumber,
        chapter: item.chapter,
        verse: item.verseNumber,
        text: item.text,
        externalVerseId: item.externalVerseId,
        reference: formatVerseReference(item.bookNumber, item.chapter, item.verseNumber),
      }));
      setVerses(result);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось загрузить главу";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [bookId, chapter, translation]);

  // Перезагружаем при смене книги, главы или перевода
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
    translation,
    setBookId,
    setChapter,
    goToPrevChapter,
    goToNextChapter,
    refresh,
  };
}
