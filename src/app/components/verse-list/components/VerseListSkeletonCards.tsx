import React from 'react';
import { cn } from '@/app/components/ui/utils';
import { FILTER_VISUAL_THEME } from '../constants';

type VerseListSkeletonCardsProps = {
  count: number;
};

/** Та же нейтральная подложка, что у карточки в фильтре «Все» (catalog). */
const neutralCardSurface = FILTER_VISUAL_THEME.catalog.cardClassName;

export function VerseListSkeletonCards({ count }: VerseListSkeletonCardsProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, idx) => (
        <div
          key={`verse-list-skeleton-${idx}`}
          className={cn(
            'first:mt-4 last:mb-4 flex min-h-[164px] flex-col justify-center gap-3 rounded-3xl border border-border/70 p-4 shadow-sm sm:min-h-[180px] sm:p-5',
            neutralCardSurface,
          )}
        >
          <div className="h-4 w-28 animate-pulse rounded-md bg-foreground/[0.08] dark:bg-foreground/[0.12]" />
          <div className="h-3 w-full animate-pulse rounded-md bg-foreground/[0.07] dark:bg-foreground/[0.1]" />
          <div className="h-3 w-3/4 animate-pulse rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.09]" />
          <div className="h-3 w-5/6 animate-pulse rounded-md bg-foreground/[0.05] dark:bg-foreground/[0.08]" />
        </div>
      ))}
    </div>
  );
}

