'use client';

import React from 'react';
import { BookOpen, GraduationCap, Plus, RefreshCw, Play } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { Button } from '@/app/components/ui/button';
import type { ChapterProgressItem } from '@/app/types/chapter';

type ChapterCardProps = {
  chapterNo: number;
  totalVerses: number;
  progressItem: ChapterProgressItem | null;
  onAdd: () => void;
  onTrain: () => void;
};

export function ChapterCard({
  chapterNo,
  totalVerses,
  progressItem,
  onAdd,
  onTrain,
}: ChapterCardProps) {
  const userCount = progressItem?.userVerseCount ?? 0;
  const progressPercent =
    totalVerses > 0 ? Math.round((userCount / totalVerses) * 100) : 0;

  const learningCount = progressItem?.learningCount ?? 0;
  const reviewCount = progressItem?.reviewCount ?? 0;
  const masteredCount = progressItem?.masteredCount ?? 0;
  const queueCount = progressItem?.queueCount ?? 0;

  const hasUserVerses = userCount > 0;
  const isFullyAdded = totalVerses > 0 && userCount >= totalVerses;

  return (
    <div className="mx-3 mb-3 overflow-hidden rounded-[1.5rem] border border-border/70 bg-bg-elevated shadow-sm sm:mx-4">
      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10">
              <BookOpen className="h-4 w-4 text-brand-primary" />
            </div>
            <div>
              <span className="text-[15px] font-semibold text-foreground">
                Глава {chapterNo}
              </span>
              {totalVerses > 0 && (
                <span className="ml-2 text-[12px] text-muted-foreground">
                  {totalVerses} ст.
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-1.5">
            {!isFullyAdded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAdd}
                className="h-8 gap-1.5 rounded-xl px-3 text-xs font-medium text-brand-primary hover:bg-brand-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                {hasUserVerses ? 'Дополнить' : 'Добавить'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onTrain}
              disabled={!hasUserVerses}
              className={cn(
                'h-8 gap-1.5 rounded-xl px-3 text-xs font-medium',
                hasUserVerses
                  ? 'text-status-learning hover:bg-status-learning/10'
                  : 'text-muted-foreground/40',
              )}
            >
              <Play className="h-3.5 w-3.5" />
              Учить
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {hasUserVerses && totalVerses > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {userCount} / {totalVerses} стихов
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {progressPercent}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
              <div
                className="h-full rounded-full bg-brand-primary/70 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Status pills */}
        {hasUserVerses && (
          <div className="flex flex-wrap gap-1.5">
            {learningCount > 0 && (
              <StatusPill
                count={learningCount}
                label="учу"
                colorClass="bg-status-learning/15 text-status-learning"
              />
            )}
            {reviewCount > 0 && (
              <StatusPill
                count={reviewCount}
                label="повтор"
                colorClass="bg-status-review/15 text-status-review"
              />
            )}
            {masteredCount > 0 && (
              <StatusPill
                count={masteredCount}
                label="освоено"
                colorClass="bg-status-mastered/15 text-status-mastered"
                icon={<GraduationCap className="h-3 w-3" />}
              />
            )}
            {queueCount > 0 && (
              <StatusPill
                count={queueCount}
                label="в очереди"
                colorClass="bg-foreground/[0.07] text-muted-foreground"
                icon={<RefreshCw className="h-3 w-3" />}
              />
            )}
          </div>
        )}

        {/* Empty state */}
        {!hasUserVerses && totalVerses > 0 && (
          <p className="text-[12px] text-muted-foreground/60">
            Нет добавленных стихов
          </p>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  count,
  label,
  colorClass,
  icon,
}: {
  count: number;
  label: string;
  colorClass: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        colorClass,
      )}
    >
      {icon}
      {count} {label}
    </span>
  );
}
