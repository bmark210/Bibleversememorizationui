import React from 'react';
import { Card } from '@/app/components/ui/card';

type VerseListSkeletonCardsProps = {
  count: number;
};

export function VerseListSkeletonCards({ count }: VerseListSkeletonCardsProps) {
  return (
    <>
      {Array.from({ length: count }, (_, idx) => (
        <Card
          key={`verse-list-skeleton-${idx}`}
          className="p-4 sm:p-5 border-border/70 rounded-3xl animate-pulse gap-3"
        >
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted/80" />
          <div className="h-3 w-3/4 rounded bg-muted/70" />
        </Card>
      ))}
    </>
  );
}

