import React from 'react';
import { motion } from 'motion/react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { VerseListSkeletonCards } from './VerseListSkeletonCards';

type VerseListLoadMoreFooterProps = {
  visible: boolean;
  isFetchingMore: boolean;
  showDelayedLoadMoreSkeleton: boolean;
  loadMoreError: string | null;
  hasMoreVerses: boolean;
  versesLength: number;
  onRetryLoadMore: () => void;
};

export function VerseListLoadMoreFooter({
  visible,
  isFetchingMore,
  showDelayedLoadMoreSkeleton,
  loadMoreError,
  hasMoreVerses,
  versesLength,
  onRetryLoadMore,
}: VerseListLoadMoreFooterProps) {
  if (!visible) return null;

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        {isFetchingMore ? (
          <div className="w-full max-w-3xl space-y-3">
            <motion.div
              initial={false}
              animate={showDelayedLoadMoreSkeleton ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-none"
              aria-hidden={!showDelayedLoadMoreSkeleton}
            >
              <VerseListSkeletonCards count={1} />
            </motion.div>
          </div>
        ) : loadMoreError ? (
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={onRetryLoadMore}>
            Повторить загрузку
          </Button>
        ) : !hasMoreVerses && versesLength > 0 ? (
          <Badge variant="outline" className="rounded-full px-3 py-1 text-muted-foreground">
            Все стихи загружены
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

