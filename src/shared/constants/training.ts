export const MASTERY_MAX = 7;
export const MASTERY_MIN = 0;
export const REVIEW_REPETITIONS_MAX = 3;
export const REVIEW_INTERVALS_DAYS = [1, 3, 5] as const;
export const REVIEW_FAIL_RETRY_MINUTES = 10;
export const TRAINING_SCORE_BY_RATING = { 0: 35, 1: 60, 2: 84, 3: 96 } as const;
export const SPACED_REPETITION_MS_BY_STAGE = {
  0: 10 * 60 * 1000,
  1: 60 * 60 * 1000,
  2: 6 * 60 * 60 * 1000,
  3: 24 * 60 * 60 * 1000,
  4: 3 * 24 * 60 * 60 * 1000,
  5: 3 * 24 * 60 * 60 * 1000,
  6: 3 * 24 * 60 * 60 * 1000,
  7: 3 * 24 * 60 * 60 * 1000,
} as const;
export const REFERENCE_BIAS_THRESHOLD = 8;
export const REFERENCE_POOL_SIZE = 12;
export const RECALL_SIMILARITY_THRESHOLD = 0.8;
export const RATING_MASTERY_DELTAS = { 0: -1, 1: 0, 2: 1, 3: 2 } as const;
export const TRAINING_MODE_RESET_ERRORS = 5;
export const TRAINING_MODE_ID_MIN = 1;
export const TRAINING_MODE_ID_MAX = 8;
export const SKILL_SCORE_MIN = 0;
export const SKILL_SCORE_MAX = 100;
export const SKILL_SCORE_DEFAULT = 0;
export const REFERENCE_TRAINER_OUTCOME_DELTAS = {
  correct_first: 5,
  correct_retry: 2,
  wrong: -4,
} as const;

/**
 * Adaptive score delta multiplier based on current score level.
 * At high scores, correct answers give less; wrong answers penalize more.
 * At low scores, correct answers give more; wrong answers penalize less.
 * Returns a multiplier [0.4 .. 1.6] applied to the base delta.
 */
export function getAdaptiveScoreMultiplier(
  currentScore: number,
  isPositive: boolean,
): number {
  const t = Math.max(0, Math.min(100, currentScore)) / 100;

  if (isPositive) {
    // High score → smaller gains (0.4x at 100), low score → bigger gains (1.6x at 0)
    return 1.6 - 1.2 * t;
  }
  // High score → bigger penalty (1.6x at 100), low score → smaller penalty (0.4x at 0)
  return 0.4 + 1.2 * t;
}

export const TRAINING_STAGE_MASTERY_MAX = MASTERY_MAX;
export const REVIEW_REPETITION_INTERVAL_DAYS = REVIEW_INTERVALS_DAYS;
export const REPEAT_THRESHOLD_FOR_MASTERED = REVIEW_REPETITIONS_MAX;
export const TOTAL_REPEATS_AND_STAGE_MASTERY_MAX =
  REVIEW_REPETITIONS_MAX + MASTERY_MAX;
export const REVIEW_FAILED_RETRY_MINUTES = REVIEW_FAIL_RETRY_MINUTES;
export const REFERENCE_TRAINER_POOL_SIZE = REFERENCE_POOL_SIZE;
