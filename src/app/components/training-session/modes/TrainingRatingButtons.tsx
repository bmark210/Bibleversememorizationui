'use client'

import { motion } from 'motion/react';

import { Button } from "@/app/components/ui/button";
import type { TrainingModeRating } from './types';
import type { HintRatingPolicy } from '@/modules/training/hints/types';

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
  maxRating?: TrainingModeRating;
  allowedRatings?: readonly TrainingModeRating[];
  ratingPolicy?: HintRatingPolicy;
  /** When false, hides "Легко" (skip) and adds "Забыл" (go back) for final training modes */
  allowEasySkip?: boolean;
  /** When true, removes "Забыл" (rating 0) from buttons — used when hint is active and "Сдаюсь" replaces it */
  excludeForget?: boolean;
  disabled?: boolean;
};

type RatingButtonMeta = {
  rating: TrainingModeRating;
  label: string;
  className: string;
};

export type ResolvedTrainingRatingButton = RatingButtonMeta;

const BUTTON_STYLE_BY_RATING: Record<TrainingModeRating, string> = {
  0: 'rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300',
  1: 'rounded-xl border border-orange-500/40 bg-orange-500/10 p-3 text-orange-700 hover:bg-orange-500/15 dark:text-orange-300',
  2: 'rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300',
  3: 'rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300',
};

function getReviewButtons(maxRating: TrainingModeRating): RatingButtonMeta[] {
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

function getLearningButtonMeta(
  rating: TrainingModeRating,
  allowEasySkip: boolean
): RatingButtonMeta | null {
  if (rating === 0) {
    return { rating: 0, label: 'Забыл', className: BUTTON_STYLE_BY_RATING[0] };
  }

  if (rating === 1) {
    return { rating: 1, label: 'Сложно', className: BUTTON_STYLE_BY_RATING[1] };
  }

  if (rating === 2) {
    return {
      rating: 2,
      label: allowEasySkip ? 'Хорошо' : 'Далее',
      className: BUTTON_STYLE_BY_RATING[2],
    };
  }

  if (rating === 3 && allowEasySkip) {
    return { rating: 3, label: 'Легко', className: BUTTON_STYLE_BY_RATING[3] };
  }

  return null;
}

function getReviewButtonMeta(rating: TrainingModeRating): RatingButtonMeta | null {
  if (rating === 0) {
    return { rating: 0, label: 'Забыл', className: BUTTON_STYLE_BY_RATING[0] };
  }

  if (rating === 1) {
    return { rating: 1, label: 'С подсказкой', className: BUTTON_STYLE_BY_RATING[1] };
  }

  if (rating === 2) {
    return { rating: 2, label: 'Вспомнил', className: BUTTON_STYLE_BY_RATING[3] };
  }

  return null;
}

function getLearningButtonsNoSkip(maxRating: TrainingModeRating): RatingButtonMeta[] {
  if (maxRating === 0) {
    return [
      { rating: 0, label: 'Забыл', className: BUTTON_STYLE_BY_RATING[0] },
    ];
  }

  if (maxRating <= 1) {
    return [
      { rating: 0, label: 'Забыл', className: BUTTON_STYLE_BY_RATING[0] },
      { rating: 1, label: 'Сложно', className: BUTTON_STYLE_BY_RATING[1] },
    ];
  }

  return [
    { rating: 0, label: 'Забыл', className: BUTTON_STYLE_BY_RATING[0] },
    { rating: 1, label: 'Сложно', className: BUTTON_STYLE_BY_RATING[1] },
    { rating: 2, label: 'Далее', className: BUTTON_STYLE_BY_RATING[2] },
  ];
}

function getBaseStageButtons(stage: TrainingRatingStage, maxRating: TrainingModeRating, allowEasySkip: boolean): RatingButtonMeta[] {
  let buttons: RatingButtonMeta[];

  if (stage === 'review') {
    buttons = getReviewButtons(maxRating);
  } else if (!allowEasySkip) {
    buttons = getLearningButtonsNoSkip(maxRating);
  } else {
    buttons = [
      { rating: 1, label: 'Сложно', className: BUTTON_STYLE_BY_RATING[1] },
      { rating: 2, label: 'Хорошо', className: BUTTON_STYLE_BY_RATING[2] },
      { rating: 3, label: 'Легко', className: BUTTON_STYLE_BY_RATING[3] },
    ];
  }

  return buttons;
}

function resolveButtonMeta(params: {
  stage: TrainingRatingStage;
  rating: TrainingModeRating;
  allowEasySkip: boolean;
}): RatingButtonMeta | null {
  if (params.stage === 'review') {
    return getReviewButtonMeta(params.rating);
  }

  return getLearningButtonMeta(params.rating, params.allowEasySkip);
}

function buildButtonsFromAllowedRatings(params: {
  stage: TrainingRatingStage;
  allowEasySkip: boolean;
  allowedRatings: readonly TrainingModeRating[];
}): RatingButtonMeta[] {
  return params.allowedRatings
    .map((rating) =>
      resolveButtonMeta({
        stage: params.stage,
        rating,
        allowEasySkip: params.allowEasySkip,
      })
    )
    .filter((button): button is RatingButtonMeta => button !== null);
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

export function resolveTrainingRatingButtonsConfig(params: {
  stage: TrainingRatingStage;
  maxRating?: TrainingModeRating;
  allowedRatings?: readonly TrainingModeRating[];
  ratingPolicy?: HintRatingPolicy;
  allowEasySkip?: boolean;
  excludeForget?: boolean;
}): {
  title: string;
  buttons: ResolvedTrainingRatingButton[];
} {
  const {
    stage,
    maxRating = 3,
    allowedRatings,
    ratingPolicy,
    allowEasySkip = true,
    excludeForget = false,
  } = params;

  const effectiveMaxRating = ratingPolicy?.maxRating ?? maxRating;
  const policyAllowedRatings =
    ratingPolicy?.allowedRatings ?? allowedRatings ?? null;
  let buttons = getBaseStageButtons(stage, effectiveMaxRating, allowEasySkip);

  if (excludeForget) {
    buttons = buttons.filter((button) => button.rating !== 0);
  }

  if (policyAllowedRatings) {
    buttons = buttons.filter((button) =>
      policyAllowedRatings.includes(button.rating)
    );
  }

  if (buttons.length === 0) {
    buttons = buildButtonsFromAllowedRatings({
      stage,
      allowEasySkip,
      allowedRatings:
        policyAllowedRatings ??
        (effectiveMaxRating === 0
          ? [0]
          : effectiveMaxRating === 1
            ? [0, 1]
            : effectiveMaxRating === 2
              ? [0, 1, 2]
              : [0, 1, 2, 3]),
    });
  }

  if (buttons.length === 0) {
    const forgotButton = resolveButtonMeta({
      stage,
      rating: 0,
      allowEasySkip: false,
    });
    buttons = forgotButton ? [forgotButton] : [];
  }

  return {
    title: stage === 'review' ? 'Результат повторения' : 'Оценка запоминания',
    buttons,
  };
}

export function TrainingRatingButtons({
  stage,
  mode: _mode = 'default',
  onRate,
  maxRating = 3,
  allowedRatings,
  ratingPolicy,
  allowEasySkip = true,
  excludeForget = false,
  disabled = false,
}: TrainingRatingButtonsProps) {
  const { buttons, title } = resolveTrainingRatingButtonsConfig({
    stage,
    maxRating,
    allowedRatings,
    ratingPolicy,
    allowEasySkip,
    excludeForget,
  });

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
            disabled={disabled}
          >
            {button.label}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
