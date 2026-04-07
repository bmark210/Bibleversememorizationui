'use client'

import { Button } from "@/app/components/ui/button";
import type { TrainingModeRating } from './types';
import type { HintRatingPolicy } from '@/modules/training/hints/types';

export type TrainingRatingStage = 'learning' | 'review';

type TrainingRatingButtonsProps = {
  stage: TrainingRatingStage;
  onRate: (rating: TrainingModeRating) => void;
  onRetryCurrentExercise?: () => void;
  ratingPolicy?: HintRatingPolicy;
  footerMode?: 'default' | 'retry-only' | 'result-actions';
  disabled?: boolean;
};

export type ResolvedTrainingRatingButton = { kind: 'rate'; rating: TrainingModeRating; label: string; className: string };

const FORGET_BUTTON_CLASS =
  'rounded-[1.15rem] border border-destructive/25 bg-destructive/10 p-3 text-destructive shadow-[var(--shadow-soft)] hover:bg-destructive/15';
const HARD_BUTTON_CLASS =
  'rounded-[1.15rem] border border-status-paused/25 bg-status-paused-soft p-3 text-status-paused shadow-[var(--shadow-soft)] hover:bg-status-paused-soft';
const CONTINUE_BUTTON_CLASS =
  'rounded-[1.15rem] border border-status-mastered/25 bg-status-mastered-soft p-3 text-status-mastered shadow-[var(--shadow-soft)] hover:bg-status-mastered-soft';
const RETRY_BUTTON_CLASS =
  'rounded-[1.15rem] border border-status-paused/25 bg-status-paused-soft p-3 text-status-paused shadow-[var(--shadow-soft)] hover:bg-status-paused-soft';

export function resolveTrainingRatingStage(status: string | null | undefined): TrainingRatingStage {
  const normalized = String(status ?? '').toUpperCase();
  return normalized === 'REVIEW' || normalized === 'MASTERED' ? 'review' : 'learning';
}

function resolveRatingButtons(params: {
  stage: TrainingRatingStage;
  allowedRatings?: readonly TrainingModeRating[];
}): ResolvedTrainingRatingButton[] {
  const { stage, allowedRatings } = params;

  // Default allowed ratings per stage
  const defaultRatings: TrainingModeRating[] =
    stage === 'review' ? [0, 1] : [-1, 0, 1];

  const effective = allowedRatings && allowedRatings.length > 0
    ? [...allowedRatings].sort((a, b) => a - b) as TrainingModeRating[]
    : defaultRatings;

  const labelFor = (r: TrainingModeRating): string => {
    if (r === -1) return 'Забыл';
    if (r === 0) return 'Сложно';
    return 'Далее';
  };

  const classFor = (r: TrainingModeRating): string => {
    if (r === -1) return FORGET_BUTTON_CLASS;
    if (r === 0) return HARD_BUTTON_CLASS;
    return CONTINUE_BUTTON_CLASS;
  };

  return effective.map((r) => ({
    kind: 'rate' as const,
    rating: r,
    label: labelFor(r),
    className: classFor(r),
  }));
}

function gridClassName(count: number): string {
  if (count <= 1) return 'grid grid-cols-1 gap-3';
  if (count === 2) return 'grid grid-cols-2 gap-3';
  return 'grid grid-cols-3 gap-3';
}

export function TrainingRatingButtons({
  stage,
  onRate,
  onRetryCurrentExercise,
  ratingPolicy,
  footerMode = 'default',
  disabled = false,
}: TrainingRatingButtonsProps) {
  if (footerMode === 'retry-only') {
    return (
      <div className="grid grid-cols-1 gap-3">
        <Button
          onClick={() => onRetryCurrentExercise?.()}
          className={RETRY_BUTTON_CLASS}
          size="lg"
          disabled={disabled}
        >
          Повторить ещё раз
        </Button>
      </div>
    );
  }

  if (footerMode === 'result-actions') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => onRetryCurrentExercise?.()}
          className={RETRY_BUTTON_CLASS}
          size="lg"
          disabled={disabled}
        >
          Повторить
        </Button>
        <Button
          onClick={() => onRate(1)}
          className={CONTINUE_BUTTON_CLASS}
          size="lg"
          disabled={disabled}
        >
          Далее
        </Button>
      </div>
    );
  }

  const buttons = resolveRatingButtons({
    stage,
    allowedRatings: ratingPolicy?.allowedRatings,
  });

  return (
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
  );
}
