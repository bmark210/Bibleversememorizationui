'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { getBibleBookNameRu } from '@/app/types/bible';
import { ChapterBookPicker } from './ChapterBookPicker';
import { ChapterList } from './ChapterList';

type ChapterTarget = { bookId: number; chapterNo: number };

type ChaptersViewProps = {
  telegramId: string;
  onTrainChapter: (target: ChapterTarget) => void;
};

const STORAGE_KEY_BOOK = 'chapters.selectedBookId';
const STORAGE_KEY_SUBMODE = 'chapters.subMode';

function readStoredInt(key: string): number | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(key);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readStoredSubMode(key: string): 'all' | 'my' {
  if (typeof window === 'undefined') return 'all';
  const v = window.localStorage.getItem(key);
  return v === 'my' ? 'my' : 'all';
}

export function ChaptersView({ telegramId, onTrainChapter }: ChaptersViewProps) {
  const [selectedBookId, setSelectedBookId] = useState<number | null>(
    () => readStoredInt(STORAGE_KEY_BOOK),
  );
  const [subMode, setSubMode] = useState<'all' | 'my'>(
    () => readStoredSubMode(STORAGE_KEY_SUBMODE),
  );

  const handleBookSelect = useCallback((bookId: number) => {
    setSelectedBookId(bookId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_BOOK, String(bookId));
    }
  }, []);

  const handleSubModeChange = useCallback((mode: 'all' | 'my') => {
    setSubMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_SUBMODE, mode);
    }
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Book picker */}
      <ChapterBookPicker
        selectedBookId={selectedBookId}
        onSelect={handleBookSelect}
      />

      {/* Sub-mode toggle */}
      <div className="shrink-0 border-b border-border/55 bg-background/95 px-3 py-2 backdrop-blur-xl sm:px-4">
        <Tabs
          value={subMode}
          onValueChange={(v) => handleSubModeChange(v as 'all' | 'my')}
        >
          <TabsList className="h-9 w-full grid-cols-2 rounded-xl bg-bg-subtle p-1">
            <TabsTrigger
              value="all"
              className="h-7 rounded-lg text-[12px] font-medium data-[state=active]:bg-background data-[state=active]:text-brand-primary data-[state=active]:shadow-sm"
            >
              Все главы
            </TabsTrigger>
            <TabsTrigger
              value="my"
              className="h-7 rounded-lg text-[12px] font-medium data-[state=active]:bg-background data-[state=active]:text-brand-primary data-[state=active]:shadow-sm"
            >
              Мои главы
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Chapter list */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-3">
        {selectedBookId == null ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Выберите книгу Библии выше
            </p>
          </div>
        ) : (
          <ChapterList
            key={`${selectedBookId}-${subMode}`}
            bookId={selectedBookId}
            subMode={subMode}
            telegramId={telegramId}
            onTrainChapter={onTrainChapter}
          />
        )}
      </div>
    </div>
  );
}
