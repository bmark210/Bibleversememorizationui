"use client";

import React from "react";
import type { Verse } from "@/app/App";

type VerseStaticListProps = {
  items: Array<Verse>;
  renderRow: (verse: Verse) => React.ReactNode;
  getItemKey: (verse: Verse) => string;
  getItemLayoutSignature: (verse: Verse) => string;
};

export function VerseStaticList({
  items,
  renderRow,
  getItemKey,
  getItemLayoutSignature,
}: VerseStaticListProps) {
  if (items.length === 0) return null;

  return (
    <div
      data-tour="verse-list-virtualized"
      className="h-full w-full overflow-y-auto overscroll-contain"
    >
      <div className="space-y-3 pt-4">
        {items.map((verse, index) => (
          <div
            key={getItemKey(verse)}
            className="pb-0"
            data-tour="verse-list-row"
            data-tour-index={index}
            data-tour-verse-id={verse.externalVerseId}
          >
            <div data-layout-signature={getItemLayoutSignature(verse)} className="h-full">
              {renderRow(verse)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
