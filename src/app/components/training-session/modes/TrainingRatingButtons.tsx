'use client'

import { motion } from 'motion/react';

import { Button } from "@/app/components/ui/button";
import type { TrainingModeRating } from './types';
import type { HintRatingPolicy } from '@/modules/training/hints/types';
import {
  TrainingModeId,
  isLearnEasyRatingAllowed,
} from '@/shared/training/modeEngine';

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
  /** When false, hides the easiest option (rating 3) and adds "Забыл" for final training modes */
  allowEasySkip?: boolean;
  /** When true, hides rating 0 ("Забыл") in this row — e.g. learning uses the session toolbar; hint flows may use "Сдаюсь" */
  excludeForget?: boolean;
  /** Late-stage review (reps 4–6): only show "Хорошо" */
  lateStageReview?: boolean;
  /** Current training mode; gates «Легко» (rating 3) to early progress steps only */
  currentTrainingModeId?: TrainingModeId | null;
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

/** Review never uses rating 0 («Забыл») — use session actions if needed. */
function getReviewButtons(maxRating: TrainingModeRating): RatingButtonMeta[] {
  if (maxRating === 0) {
    return [
      { rating: 2, label: 'Хорошо', className: BUTTON_STYLE_BY_RATING[3] },
    ];
  }

  if (maxRating === 1) {
    return [{ rating: 1, label: 'С подсказкой', className: BUTTON_STYLE_BY_RATING[1] }];
  }

  return [
    { rating: 1, label: 'С подсказкой', className: BUTTON_STYLE_BY_RATING[1] },
    { rating: 2, label: 'Хорошо', className: BUTTON_STYLE_BY_RATING[3] },
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
      label: 'Хорошо',
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
    return null;
  }

  if (rating === 1) {
    return { rating: 1, label: 'С подсказкой', className: BUTTON_STYLE_BY_RATING[1] };
  }

  if (rating === 2) {
    return { rating: 2, label: 'Хорошо', className: BUTTON_STYLE_BY_RATING[3] };
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
    { rating: 2, label: 'Хорошо', className: BUTTON_STYLE_BY_RATING[2] },
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
  const ratings =
    params.stage === 'review'
      ? params.allowedRatings.filter((r) => r !== 0)
      : params.allowedRatings;
  return ratings
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

/** Toolbar «Забыл» for modes &gt; 1; rating row shows «Забыл» only in ClickChunks (mode 1). */
export function resolveTrainingRatingExcludeForget(opts: {
  isLateStageReview: boolean;
  ratingStage: TrainingRatingStage;
  trainingModeId: TrainingModeId;
  surrendered: boolean;
}): boolean {
  if (opts.isLateStageReview) return true;
  if (opts.ratingStage === 'learning') return opts.trainingModeId !== TrainingModeId.ClickChunks;
  return !opts.surrendered;
}

function gridClassName(count: number): string {
  if (count === 1) return 'grid grid-cols-1 gap-3';
  if (count === 2) return 'grid grid-cols-2 gap-3';
  return 'grid grid-cols-3 gap-3';
}

function applyRatingVisibilityRules(params: {
  stage: TrainingRatingStage;
  buttons: RatingButtonMeta[];
  currentTrainingModeId: TrainingModeId | null | undefined;
}): RatingButtonMeta[] {
  const { stage, currentTrainingModeId } = params;
  let { buttons } = params;
  if (stage === 'review') {
    buttons = buttons.filter((b) => b.rating !== 0);
  }
  if (stage === 'learning') {
    if (!isLearnEasyRatingAllowed(currentTrainingModeId)) {
      buttons = buttons.filter((b) => b.rating !== 3);
    }
  }
  return buttons;
}

export function resolveTrainingRatingButtonsConfig(params: {
  stage: TrainingRatingStage;
  maxRating?: TrainingModeRating;
  allowedRatings?: readonly TrainingModeRating[];
  ratingPolicy?: HintRatingPolicy;
  allowEasySkip?: boolean;
  excludeForget?: boolean;
  lateStageReview?: boolean;
  currentTrainingModeId?: TrainingModeId | null;
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
    lateStageReview = false,
    currentTrainingModeId,
  } = params;

  // Late-stage review: only "Хорошо" button
  if (lateStageReview && stage === 'review') {
    return {
      title: 'Результат повторения',
      buttons: [
        { rating: 2, label: 'Хорошо', className: BUTTON_STYLE_BY_RATING[3] },
      ],
    };
  }

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

  buttons = applyRatingVisibilityRules({
    stage,
    buttons,
    currentTrainingModeId,
  });

  if (buttons.length === 0) {
    let fallbackRatings =
      policyAllowedRatings ??
      (effectiveMaxRating === 0
        ? stage === 'review'
          ? [2]
          : [0]
        : effectiveMaxRating === 1
          ? stage === 'review'
            ? [1]
            : [0, 1]
          : effectiveMaxRating === 2
            ? stage === 'review'
              ? [1, 2]
              : [0, 1, 2]
            : [0, 1, 2, 3]);
    if (stage === 'review') {
      const nz = fallbackRatings.filter((r) => r !== 0);
      fallbackRatings = nz.length > 0 ? nz : [2];
    }
    buttons = buildButtonsFromAllowedRatings({
      stage,
      allowEasySkip,
      allowedRatings: fallbackRatings,
    });
    buttons = applyRatingVisibilityRules({
      stage,
      buttons,
      currentTrainingModeId,
    });
  }

  if (buttons.length === 0 && stage !== 'review') {
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
  lateStageReview = false,
  currentTrainingModeId,
  disabled = false,
}: TrainingRatingButtonsProps) {
  const { buttons, title } = resolveTrainingRatingButtonsConfig({
    stage,
    maxRating,
    allowedRatings,
    ratingPolicy,
    allowEasySkip,
    excludeForget,
    lateStageReview,
    currentTrainingModeId,
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
