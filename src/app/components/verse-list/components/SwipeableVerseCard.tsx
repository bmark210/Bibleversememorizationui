import React from 'react';
import { Pause, Play, Plus, Repeat, Trash2, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import {
  FILTER_VISUAL_THEME,
  getStoppedVerseStageKind,
  getVerseCardLayoutSignature,
  getVerseStageVisual,
  STOPPED_REVIEW_MASTERY_THRESHOLD,
} from '../constants';
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
  const displayStatus = normalizeDisplayVerseStatus(verse.status);
  const isReviewCard = displayStatus === 'REVIEW';
  const isMasteredCard = displayStatus === 'MASTERED';
  const stoppedStageKind =
    displayStatus === VerseStatus.STOPPED ? getStoppedVerseStageKind(verse) : null;
  const isStoppedReviewCard = displayStatus === VerseStatus.STOPPED && stoppedStageKind === 'review';
  const isStoppedMasteredCard = displayStatus === VerseStatus.STOPPED && stoppedStageKind === 'mastered';
  const stageVisual = getVerseStageVisual(verse);
  const stageVisualTheme = FILTER_VISUAL_THEME[stageVisual.key];
  const layoutSignature = getVerseCardLayoutSignature(verse);
  const learningProgress = Math.min(
    Math.round((masteryLevel / STOPPED_REVIEW_MASTERY_THRESHOLD) * 100),
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
    if (displayStatus === VerseStatus.NEW) {
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

    if (displayStatus === VerseStatus.LEARNING || displayStatus === 'REVIEW' || displayStatus === 'MASTERED') {
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

  const statusMetaContent = isMasteredCard ? (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/12 px-2.5 py-1 text-amber-800 dark:text-amber-300">
        <Trophy className="h-3.5 w-3.5" />
        <span className="font-semibold">Выучен · {repetitionsCount}</span>
      </div>
    </div>
  ) : isReviewCard ? (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-violet-700 dark:text-violet-300">
        <Repeat className="h-3.5 w-3.5" />
        <span className="font-semibold">{repetitionsCount}</span>
      </div>
    </div>
  ) : displayStatus === VerseStatus.LEARNING ? (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{learningProgress}%</span>
      <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-300 ease-out"
          style={{ width: `${learningProgress}%` }}
        />
      </div>
    </div>
  ) : displayStatus === VerseStatus.STOPPED ? (
    isStoppedMasteredCard ? (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-rose-700 dark:text-rose-300">
          <Pause className="h-3.5 w-3.5" />
          <Trophy className="h-3.5 w-3.5" />
          <span className="font-semibold">Выучено · пауза · {repetitionsCount}</span>
        </div>
      </div>
    ) : isStoppedReviewCard ? (
      <div className="flex items-center gap-2 text-xs">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-rose-700 dark:text-rose-300">
          <Repeat className="h-3.5 w-3.5" />
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
  ) : null;

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
            <AnimatePresence initial={false}>
              {statusMetaContent ? (
                <motion.div
                  key={layoutSignature}
                  initial={{ height: 0, opacity: 0, y: -4 }}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-0.5">{statusMetaContent}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 shrink-0">{renderActions()}</div>
        </div>
      </div>
    </div>
  );
};
