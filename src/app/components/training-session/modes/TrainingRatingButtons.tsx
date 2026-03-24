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
  onRetryCurrentExercise?: () => void;
  maxRating?: TrainingModeRating;
  allowedRatings?: readonly TrainingModeRating[];
  ratingPolicy?: HintRatingPolicy;
  allowEasySkip?: boolean;
  excludeForget?: boolean;
  lateStageReview?: boolean;
  disabled?: boolean;
};

type RetryButtonMeta = {
  kind: 'retry';
  label: string;
  className: string;
};

type ContinueButtonMeta = {
  kind: 'continue';
  rating: TrainingModeRating;
  label: string;
  className: string;
};

export type ResolvedTrainingRatingButton =
  | RetryButtonMeta
  | ContinueButtonMeta;

const RETRY_BUTTON_CLASS =
  'rounded-xl border border-orange-500/40 bg-orange-500/10 p-3 text-orange-700 hover:bg-orange-500/15 dark:text-orange-300';
const CONTINUE_BUTTON_CLASS =
  'rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300';

function resolveAllowedContinueRatings(params: {
  stage: TrainingRatingStage;
  maxRating?: TrainingModeRating;
  allowedRatings?: readonly TrainingModeRating[];
  ratingPolicy?: HintRatingPolicy;
}): TrainingModeRating[] {
  const effectiveMaxRating = Math.min(params.ratingPolicy?.maxRating ?? params.maxRating ?? 3, 2);
  const policyAllowedRatings = params.ratingPolicy?.allowedRatings ?? params.allowedRatings ?? null;
  const ratingCeiling = params.stage === 'review' ? 2 : 2;

  if (policyAllowedRatings && policyAllowedRatings.length > 0) {
    const filtered = policyAllowedRatings.filter(
      (rating): rating is TrainingModeRating =>
        rating !== 0 && rating <= effectiveMaxRating && rating <= ratingCeiling
    );
    if (filtered.length > 0) {
      return [...filtered].sort((left, right) => right - left);
    }
  }

  if (effectiveMaxRating <= 1) {
    return [1];
  }

  return [2, 1];
}

function resolveContinueRating(params: {
  stage: TrainingRatingStage;
  maxRating?: TrainingModeRating;
  allowedRatings?: readonly TrainingModeRating[];
  ratingPolicy?: HintRatingPolicy;
}): TrainingModeRating {
  return resolveAllowedContinueRatings(params)[0] ?? 1;
}

export function resolveTrainingRatingStage(status: string | null | undefined): TrainingRatingStage {
  const normalized = String(status ?? '').toUpperCase();
  return normalized === 'REVIEW' || normalized === 'MASTERED' ? 'review' : 'learning';
}

export function resolveTrainingRatingButtonsConfig(params: {
  stage: TrainingRatingStage;
  maxRating?: TrainingModeRating;
  allowedRatings?: readonly TrainingModeRating[];
  ratingPolicy?: HintRatingPolicy;
  allowEasySkip?: boolean;
  excludeForget?: boolean;
  lateStageReview?: boolean;
}): {
  title: string | null;
  buttons: ResolvedTrainingRatingButton[];
} {
  const continueRating = resolveContinueRating({
    stage: params.stage,
    maxRating: params.maxRating,
    allowedRatings: params.allowedRatings,
    ratingPolicy: params.ratingPolicy,
  });

  return {
    title: null,
    buttons: [
      {
        kind: 'retry',
        label: 'Повторить ещё раз',
        className: RETRY_BUTTON_CLASS,
      },
      {
        kind: 'continue',
        rating: continueRating,
        label: 'Далее',
        className: CONTINUE_BUTTON_CLASS,
      },
    ],
  };
}

function gridClassName(count: number): string {
  if (count <= 1) return 'grid grid-cols-1 gap-3';
  if (count === 2) return 'grid grid-cols-2 gap-3';
  return 'grid grid-cols-3 gap-3';
}

export function TrainingRatingButtons({
  stage,
  mode: _mode = 'default',
  onRate,
  onRetryCurrentExercise,
  maxRating = 3,
  allowedRatings,
  ratingPolicy,
  allowEasySkip: _allowEasySkip = true,
  excludeForget: _excludeForget = false,
  lateStageReview: _lateStageReview = false,
  disabled = false,
}: TrainingRatingButtonsProps) {
  const { buttons, title } = resolveTrainingRatingButtonsConfig({
    stage,
    maxRating,
    allowedRatings,
    ratingPolicy,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {title ? (
        <p className="text-sm text-muted-foreground text-center">{title}</p>
      ) : null}

      <div className={gridClassName(buttons.length)}>
        {buttons.map((button) => {
          if (button.kind === 'retry') {
            return (
              <Button
                key={`${stage}-retry`}
                onClick={() => onRetryCurrentExercise?.()}
                className={button.className}
                size="lg"
                disabled={disabled}
              >
                {button.label}
              </Button>
            );
          }

          return (
            <Button
              key={`${stage}-${button.rating}`}
              onClick={() => onRate(button.rating)}
              className={button.className}
              size="lg"
              disabled={disabled}
            >
              {button.label}
            </Button>
          );
        })}
      </div>
    </motion.div>
  );
}
