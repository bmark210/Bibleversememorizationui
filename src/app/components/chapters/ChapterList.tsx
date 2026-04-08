'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { BIBLE_BOOKS } from '@/app/types/bible';
import type { ChapterProgressItem } from '@/app/types/chapter';
import {
  fetchChapterProgress,
  fetchCatalogChapterCounts,
} from '@/api/services/chapterService';
import { ChapterCard } from './ChapterCard';
import { AddChapterDrawer } from './AddChapterDrawer';

type ChapterTarget = { bookId: number; chapterNo: number };

type ChapterListProps = {
  bookId: number;
  subMode: 'all' | 'my';
  telegramId: string;
  onTrainChapter: (target: ChapterTarget) => void;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; progressMap: Map<number, ChapterProgressItem>; catalogMap: Map<number, number> }
  | { status: 'error' };

export function ChapterList({
  bookId,
  subMode,
  telegramId,
  onTrainChapter,
}: ChapterListProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [addTarget, setAddTarget] = useState<ChapterTarget | null>(null);

  const bookInfo = BIBLE_BOOKS[bookId];

  const load = useCallback(async () => {
    setLoadState({ status: 'loading' });
    try {
      const [progress, catalogCounts] = await Promise.all([
        fetchChapterProgress(telegramId, bookId),
        fetchCatalogChapterCounts(bookId),
      ]);

      const progressMap = new Map<number, ChapterProgressItem>();
      for (const item of progress.items) {
        progressMap.set(item.chapterNo, item);
      }

      const catalogMap = new Map<number, number>();
      for (const [k, v] of Object.entries(catalogCounts)) {
        catalogMap.set(Number(k), v);
      }

      setLoadState({ status: 'loaded', progressMap, catalogMap });
    } catch {
      setLoadState({ status: 'error' });
    }
  }, [bookId, telegramId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!bookInfo) return null;

  if (loadState.status === 'loading') {
    return (
      <div className="space-y-0">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="mx-3 mb-3 sm:mx-4">
            <div className="h-[100px] animate-pulse rounded-[1.5rem] bg-foreground/[0.06]" />
          </div>
        ))}
      </div>
    );
  }

  if (loadState.status === 'error') {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Не удалось загрузить данные. Попробуйте позже.
      </div>
    );
  }

  const { progressMap, catalogMap } = loadState;
  const chapterNos = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1);

  const visibleChapters =
    subMode === 'my'
      ? chapterNos.filter((n) => (progressMap.get(n)?.userVerseCount ?? 0) > 0)
      : chapterNos;

  if (visibleChapters.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        {subMode === 'my'
          ? 'Нет изучаемых глав. Добавьте стихи из любой главы.'
          : 'Нет доступных глав.'}
      </div>
    );
  }

  return (
    <>
      <div
        className="overflow-y-auto"
        style={{
          paddingBottom: 'calc(var(--app-bottom-nav-clearance, 0px) + 0.75rem)',
        }}
      >
        {visibleChapters.map((chapterNo) => {
          const progressItem = progressMap.get(chapterNo) ?? null;
          const totalVerses = catalogMap.get(chapterNo) ?? 0;

          return (
            <ChapterCard
              key={chapterNo}
              chapterNo={chapterNo}
              totalVerses={totalVerses}
              progressItem={progressItem}
              onAdd={() => setAddTarget({ bookId, chapterNo })}
              onTrain={() => onTrainChapter({ bookId, chapterNo })}
            />
          );
        })}
      </div>

      {addTarget && (
        <AddChapterDrawer
          bookId={addTarget.bookId}
          chapterNo={addTarget.chapterNo}
          telegramId={telegramId}
          open={true}
          onClose={() => setAddTarget(null)}
          onDone={() => {
            setAddTarget(null);
            load();
          }}
        />
      )}
    </>
  );
}
