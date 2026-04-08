'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/app/components/ui/utils';
import { BIBLE_BOOKS, BibleBook } from '@/app/types/bible';

const CANONICAL_BOOKS = Object.values(BIBLE_BOOKS)
  .filter((b) => b.id <= BibleBook.Revelation)
  .sort((a, b) => a.id - b.id);

type ChapterBookPickerProps = {
  selectedBookId: number | null;
  onSelect: (bookId: number) => void;
};

export function ChapterBookPicker({
  selectedBookId,
  onSelect,
}: ChapterBookPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll selected book into view when it changes
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedBookId]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto border-b border-border/55 bg-bg-overlay px-3 py-2.5 sm:px-4"
      style={{ scrollbarWidth: 'none' }}
    >
      {CANONICAL_BOOKS.map((book) => {
        const isSelected = book.id === selectedBookId;
        return (
          <button
            key={book.id}
            ref={isSelected ? selectedRef : undefined}
            onClick={() => onSelect(book.id)}
            className={cn(
              'inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
              isSelected
                ? 'border-brand-primary/40 bg-brand-primary/15 text-brand-primary shadow-sm'
                : 'border-border/60 bg-bg-subtle text-muted-foreground hover:border-brand-primary/30 hover:text-foreground',
            )}
          >
            {book.nameRu}
          </button>
        );
      })}
    </div>
  );
}
