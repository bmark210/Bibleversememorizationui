'use client'

import { motion } from 'motion/react';

import { Button } from "@/app/components/ui/button";
import type { TrainingModeRating } from './types';

export type TrainingRatingStage = 'learning' | 'review';
export type TrainingRatingMode =
  | 'default'
  | 'first-letters'
  | 'full-recall'
  | 'voice-recall';

type TrainingRatingButtonsProps = {
  stage: TrainingRatingStage;
  mode?: TrainingRatingMode;
  onRate: (rating: TrainingModeRating) => void;
  maxRating?: 0 | 1 | 2;
};

type RatingButtonMeta = {
  rating: TrainingModeRating;
  label: string;
  className: string;
};

const BUTTON_STYLE_BY_RATING: Record<TrainingModeRating, string> = {
  0: 'rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300',
  1: 'rounded-xl border border-orange-500/40 bg-orange-500/10 p-3 text-orange-700 hover:bg-orange-500/15 dark:text-orange-300',
  2: 'rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300',
  3: 'rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300',
};

function getReviewButtons(maxRating: 0 | 1 | 2): RatingButtonMeta[] {
  if (maxRating === 0) {
    return [
      { rating: 0, label: 'Забыл', className: BUTTON_STYLE_BY_RATING[0] },
    ];
  }

  if (maxRating === 1) {
    return [
      { rating: 0, label: 'Забыл', className: BUTTON_STYLE_BY_RATING[0] },
      { rating: 1, label: 'С подсказкой', className: BUTTON_STYLE_BY_RATING[1] },
    ];
  }

  return [
    { rating: 0, label: 'Забыл', className: BUTTON_STYLE_BY_RATING[0] },
    { rating: 1, label: 'С подсказкой', className: BUTTON_STYLE_BY_RATING[1] },
    { rating: 2, label: 'Вспомнил', className: BUTTON_STYLE_BY_RATING[3] },
  ];
}

function getStageButtons(stage: TrainingRatingStage, maxRating: 0 | 1 | 2): RatingButtonMeta[] {
  if (stage === 'review') {
    return getReviewButtons(maxRating);
  }

  return [
    { rating: 1, label: 'Сложно', className: BUTTON_STYLE_BY_RATING[1] },
    { rating: 2, label: 'Хорошо', className: BUTTON_STYLE_BY_RATING[2] },
    { rating: 3, label: 'Легко', className: BUTTON_STYLE_BY_RATING[3] },
  ];
}

export function resolveTrainingRatingStage(status: string | null | undefined): TrainingRatingStage {
  const normalized = String(status ?? '').toUpperCase();
  return normalized === 'REVIEW' || normalized === 'MASTERED' ? 'review' : 'learning';
}

function gridClassName(count: number): string {
  if (count === 1) return 'grid grid-cols-1 gap-3';
  if (count === 2) return 'grid grid-cols-2 gap-3';
  return 'grid grid-cols-3 gap-3';
}

export function TrainingRatingButtons({
  stage,
  mode: _mode = 'default',
  onRate,
  maxRating = 2,
}: TrainingRatingButtonsProps) {
  const buttons = getStageButtons(stage, maxRating);
  const title =
    stage === 'review'
      ? 'Результат повторения'
      : 'Оценка запоминания';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <p className="text-sm text-muted-foreground text-center">{title}</p>

      <div className={gridClassName(buttons.length)}>
        {buttons.map((button) => (
          <Button
            key={`${stage}-${button.rating}`}
            onClick={() => onRate(button.rating)}
            className={button.className}
            size="lg"
          >
            {button.label}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
