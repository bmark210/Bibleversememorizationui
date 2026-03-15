import { VerseStatus } from "@/generated/prisma";
import { computeProgressDelta } from "@/modules/training/application/computeProgressDelta";
import type { UserVerseRecord } from "@/modules/verses/domain/Verse";
import type { TrainingModeRating } from "@/shared/training/modeEngine";
import type { TrainingAttemptPhase } from "@/modules/training/hints/types";

export interface TrainingAttemptOutcome {
  appliedRating: TrainingModeRating;
  patch: {
    masteryLevel: number;
    repetitions?: number;
    reviewLapseStreak: number;
    lastReviewedAt: Date;
    nextReviewAt: Date;
    lastTrainingModeId: number | null;
    status: VerseStatus;
  };
  reviewWasSuccessful: boolean;
  graduatesToReview: boolean;
  canUpdateRepetitions: boolean;
  stageMasteryLevel: number;
}

function clampRating(value: number): TrainingModeRating {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(3, Math.round(value))) as TrainingModeRating;
}

export function computeTrainingAttemptOutcome(params: {
  phase: TrainingAttemptPhase;
  modeId: number;
  ratingCap: TrainingModeRating;
  userVerse: Pick<
    UserVerseRecord,
    "status" | "masteryLevel" | "repetitions" | "reviewLapseStreak"
  >;
  requestedRating: TrainingModeRating;
  now: Date;
}): TrainingAttemptOutcome {
  const appliedRating = Math.min(
    clampRating(params.requestedRating),
    params.ratingCap
  ) as TrainingModeRating;

  const progressDelta = computeProgressDelta({
    phase: params.phase,
    rating: appliedRating,
    rawMasteryLevel: params.userVerse.masteryLevel,
    repetitions: params.userVerse.repetitions,
    reviewLapseStreak: params.userVerse.reviewLapseStreak,
    now: params.now,
    trainingModeId: params.modeId,
    isLearningVerse: params.userVerse.status === VerseStatus.LEARNING,
  });

  const nextStatus =
    params.userVerse.status === VerseStatus.STOPPED
      ? VerseStatus.STOPPED
      : progressDelta.rawMasteryLevel > 0
        ? VerseStatus.LEARNING
        : VerseStatus.MY;

  const basePatch = {
    masteryLevel: progressDelta.rawMasteryLevel,
    reviewLapseStreak: progressDelta.reviewLapseStreak,
    lastReviewedAt: params.now,
    nextReviewAt: progressDelta.nextReviewAt,
    lastTrainingModeId: progressDelta.graduatesToReview ? null : params.modeId,
    status: nextStatus,
  };

  return {
    appliedRating,
    patch: progressDelta.canUpdateRepetitions
      ? {
          ...basePatch,
          repetitions: progressDelta.repetitions,
        }
      : basePatch,
    reviewWasSuccessful: progressDelta.reviewWasSuccessful,
    graduatesToReview: progressDelta.graduatesToReview,
    canUpdateRepetitions: progressDelta.canUpdateRepetitions,
    stageMasteryLevel: progressDelta.stageMasteryLevel,
  };
}
