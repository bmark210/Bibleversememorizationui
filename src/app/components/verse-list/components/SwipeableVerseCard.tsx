import React from 'react';
import { Pause, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { TRAINING_STAGE_MASTERY_MAX } from '@/shared/training/constants';
import { FILTER_VISUAL_THEME, getVerseStageVisual } from '../constants';
import { haptic } from '../haptics';

export type SwipeCardProps = {
  verse: Verse;
  onOpen: () => void;
  onAddToLearning: (verse: Verse) => void;
  onPauseLearning: (verse: Verse) => void;
  onResumeLearning: (verse: Verse) => void;
  onRequestDelete: (verse: Verse) => void;
  isPending?: boolean;
};

export const SwipeableVerseCard = ({
  verse,
  onOpen,
  onAddToLearning,
  onPauseLearning,
  onResumeLearning,
  onRequestDelete,
  isPending = false,
}: SwipeCardProps) => {
  const masteryLevel = Number(verse.masteryLevel ?? 0);
  const isReviewCard =
    verse.status === VerseStatus.LEARNING && masteryLevel > TRAINING_STAGE_MASTERY_MAX;
  const stageVisual = getVerseStageVisual(verse.status, masteryLevel);
  const stageVisualTheme = FILTER_VISUAL_THEME[stageVisual.key];
  const learningProgress = Math.min(
    Math.round((masteryLevel / TRAINING_STAGE_MASTERY_MAX) * 100),
    100
  );
  const repetitionsCount = Math.max(0, Number(verse.repetitions ?? 0));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.currentTarget !== e.target) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      haptic('light');
      onOpen();
    }
  };

  const stopCardOpen = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const renderActions = () => {
    if (verse.status === VerseStatus.NEW) {
      return (
        <>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Добавить в изучение"
            aria-label="Добавить стих в изучение"
            disabled={isPending}
            className="rounded-lg"
            onClick={(e) => {
              stopCardOpen(e);
              onAddToLearning(verse);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Удалить стих"
            aria-label="Удалить стих"
            disabled={isPending}
            className="rounded-lg text-destructive hover:text-destructive backdrop-blur-xl"
            onClick={(e) => {
              stopCardOpen(e);
              onRequestDelete(verse);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      );
    }

    if (verse.status === VerseStatus.LEARNING) {
      return (
        <>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Поставить на паузу"
            aria-label="Поставить стих на паузу"
            disabled={isPending}
            className="rounded-lg"
            onClick={(e) => {
              stopCardOpen(e);
              onPauseLearning(verse);
            }}
          >
            <Pause className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Удалить стих"
            aria-label="Удалить стих"
            disabled={isPending}
            className="rounded-lg text-destructive hover:text-destructive"
            onClick={(e) => {
              stopCardOpen(e);
              onRequestDelete(verse);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          type="button"
          size="icon"
          variant="outline"
          title="Возобновить изучение"
          aria-label="Возобновить изучение стиха"
          disabled={isPending}
          className="rounded-lg"
          onClick={(e) => {
            stopCardOpen(e);
            onResumeLearning(verse);
          }}
        >
          <Play className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          title="Удалить стих"
          aria-label="Удалить стих"
          disabled={isPending}
          className="rounded-lg text-destructive hover:text-destructive"
          onClick={(e) => {
            stopCardOpen(e);
            onRequestDelete(verse);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </>
    );
  };

  return (
    <div className="relative isolate">
      <div
        role="button"
        tabIndex={0}
        aria-label={`${verse.reference} — нажмите чтобы открыть`}
        onClick={() => {
          haptic('light');
          onOpen();
        }}
        onKeyDown={handleKeyDown}
        className={`
          relative z-10 rounded-2xl p-4 shadow-sm
          border ${stageVisualTheme.cardClassName}
          active:shadow-md transition-shadow cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold">{verse.reference}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${stageVisualTheme.statusBadgeClassName}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${stageVisualTheme.dotClassName}`} />
                {stageVisual.label}
              </Badge>
            <Badge variant="secondary" className="text-[11px]">
                SYNOD
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{verse.text}</p>
            {isReviewCard ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-violet-700 dark:text-violet-300">
                  <Repeat className="h-3.5 w-3.5" />
                  {/* <span className="font-medium"></span> */}
                  <span className="font-semibold">{repetitionsCount}</span>
                </div>
              </div>
            ) : verse.status === VerseStatus.LEARNING ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{learningProgress}%</span>
                <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-[width] duration-300 ease-out"
                    style={{ width: `${learningProgress}%` }}
                  />
                </div>
              </div>
            ) : verse.status === VerseStatus.STOPPED ? (
              masteryLevel > TRAINING_STAGE_MASTERY_MAX ? (
                <div className="flex items-center gap-2 text-xs">
                  <div className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-rose-700 dark:text-rose-300">
                    {repetitionsCount} повт.
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{learningProgress}%</span>
                  <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-[width] duration-300 ease-out"
                      style={{ width: `${learningProgress}%` }}
                    />
                  </div>
                </div>
              )
            ) : verse.status === VerseStatus.NEW ? null : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{repetitionsCount} повт.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">{renderActions()}</div>
        </div>
      </div>
    </div>
  );
};
