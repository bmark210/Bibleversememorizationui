import {
  MASTERY_MAX,
  MASTERY_MIN,
  RATING_MASTERY_DELTAS,
  REVIEW_FAIL_RETRY_MINUTES,
  REVIEW_INTERVALS_DAYS,
  REVIEW_REPETITIONS_MAX,
  SPACED_REPETITION_MS_BY_STAGE,
  TRAINING_SCORE_BY_RATING,
} from "@/shared/constants/training";
import { clamp } from "@/shared/utils/clamp";
import { TrainingModeId } from "@/modules/training/domain/TrainingMode";
import type { RatingValue } from "@/modules/training/domain/VerseProgress";

const REVIEW_SUCCESS_RATING_MIN = 2;

function getScoreMultiplier(score: number): number {
  if (score >= 92) return 1.25;
  if (score >= 80) return 1;
  if (score >= 65) return 0.75;
  return 0.5;
}

function getStageRepetitionDelayMs(stageMasteryLevel: number): number {
  const normalizedStage = clamp(
    Math.round(stageMasteryLevel),
    MASTERY_MIN,
    MASTERY_MAX
  );
  const stageKey = normalizedStage as keyof typeof SPACED_REPETITION_MS_BY_STAGE;

  return (
    SPACED_REPETITION_MS_BY_STAGE[stageKey] ??
    SPACED_REPETITION_MS_BY_STAGE[MASTERY_MIN]
  );
}

function applyMasteryDelta(params: {
  rawMasteryLevel: number;
  masteryDelta: number;
  isLearningVerse: boolean;
}): { rawMasteryLevel: number; graduatesToReview: boolean } {
  const { rawMasteryLevel, masteryDelta, isLearningVerse } = params;
  const nextRawMasteryLevel = Math.round(rawMasteryLevel + masteryDelta);

  if (isLearningVerse) {
    const clampedMasteryLevel = clamp(
      nextRawMasteryLevel,
      1,
      MASTERY_MAX
    );

    return {
      rawMasteryLevel: clampedMasteryLevel,
      graduatesToReview: clampedMasteryLevel >= MASTERY_MAX,
    };
  }

  return {
    rawMasteryLevel: Math.max(MASTERY_MIN, nextRawMasteryLevel),
    graduatesToReview: false,
  };
}

export function computeLearningDelta(rating: RatingValue): number {
  return RATING_MASTERY_DELTAS[rating];
}

export function computeLearningNextReviewAt(
  stageMasteryLevel: number,
  rating: RatingValue,
  now: Date
): Date {
  const score = TRAINING_SCORE_BY_RATING[rating];
  const delayMs = Math.round(
    getStageRepetitionDelayMs(stageMasteryLevel) * getScoreMultiplier(score)
  );

  return new Date(now.getTime() + delayMs);
}

export function computeReviewNextReviewAt(
  successfulRepetitions: number,
  now: Date
): Date | null {
  if (successfulRepetitions >= REVIEW_REPETITIONS_MAX) {
    return null;
  }

  const intervalIndex = clamp(
    Math.round(successfulRepetitions),
    0,
    REVIEW_INTERVALS_DAYS.length - 1
  );
  const intervalDays =
    REVIEW_INTERVALS_DAYS[intervalIndex] ?? REVIEW_INTERVALS_DAYS[0];

  return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
}

export function computeReviewResult(
  rating: RatingValue,
  currentRepetitions: number,
  now: Date
): {
  repetitions: number;
  nextReviewAt: Date | null;
  reviewWasSuccessful: boolean;
} {
  const repetitions = Math.max(0, Math.round(currentRepetitions));

  if (rating >= REVIEW_SUCCESS_RATING_MIN) {
    const nextRepetitions = repetitions + 1;

    return {
      repetitions: nextRepetitions,
      nextReviewAt: computeReviewNextReviewAt(nextRepetitions, now),
      reviewWasSuccessful: true,
    };
  }

  return {
    repetitions,
    nextReviewAt: new Date(
      now.getTime() + REVIEW_FAIL_RETRY_MINUTES * 60 * 1000
    ),
    reviewWasSuccessful: false,
  };
}

export function computeProgressDelta(params: {
  phase: "learning" | "review";
  rating: RatingValue;
  rawMasteryLevel: number;
  repetitions: number;
  now: Date;
  trainingModeId: TrainingModeId | null;
  isLearningVerse: boolean;
}): {
  rawMasteryLevel: number;
  stageMasteryLevel: number;
  repetitions: number;
  nextReviewAt: Date | null;
  graduatesToReview: boolean;
  reviewWasSuccessful: boolean;
  canUpdateRepetitions: boolean;
} {
  const {
    phase,
    rating,
    rawMasteryLevel,
    repetitions,
    now,
    trainingModeId,
    isLearningVerse,
  } = params;

  if (phase === "review") {
    const reviewResult = computeReviewResult(rating, repetitions, now);

    return {
      rawMasteryLevel,
      stageMasteryLevel: clamp(
        Math.round(rawMasteryLevel),
        MASTERY_MIN,
        MASTERY_MAX
      ),
      repetitions: reviewResult.repetitions,
      nextReviewAt: reviewResult.nextReviewAt,
      graduatesToReview: false,
      reviewWasSuccessful: reviewResult.reviewWasSuccessful,
      canUpdateRepetitions: true,
    };
  }

  const masteryDelta = computeLearningDelta(rating);
  const masteryResult = applyMasteryDelta({
    rawMasteryLevel,
    masteryDelta,
    isLearningVerse,
  });

  let nextRawMasteryLevel = masteryResult.rawMasteryLevel;
  let graduatesToReview = masteryResult.graduatesToReview;

  if (graduatesToReview && trainingModeId !== TrainingModeId.FullRecall) {
    nextRawMasteryLevel = MASTERY_MAX - 1;
    graduatesToReview = false;
  }

  const stageMasteryLevel = clamp(
    Math.round(nextRawMasteryLevel),
    MASTERY_MIN,
    MASTERY_MAX
  );

  return {
    rawMasteryLevel: nextRawMasteryLevel,
    stageMasteryLevel,
    repetitions,
    nextReviewAt: graduatesToReview
      ? computeReviewNextReviewAt(0, now)
      : computeLearningNextReviewAt(stageMasteryLevel, rating, now),
    graduatesToReview,
    reviewWasSuccessful: false,
    canUpdateRepetitions: false,
  };
}
