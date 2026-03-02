import type {
  DailyGoalPhase,
  DailyGoalReadinessResponse,
  DailyGoalResumeMode,
  DailyGoalServerStateV2,
  DailyGoalUiState,
} from "./types";

type ProjectionInput = {
  state?: DailyGoalServerStateV2 | null;
  readiness?: DailyGoalReadinessResponse | null;
};

function toNonNegativeInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function toUniqueSet(list: string[] | undefined): Set<string> {
  return new Set((list ?? []).filter(Boolean));
}

function normalizeResumeMode(value: unknown): DailyGoalResumeMode | null {
  if (value === "learning" || value === "review") return value;
  return null;
}

function createEmptyUiState(): DailyGoalUiState {
  return {
    phase: "empty",
    nextTargetKind: null,
    progressCounts: { newDone: 0, newTotal: 0, reviewDone: 0, reviewTotal: 0 },
    isActive: false,
    isCompleted: false,
    isEmpty: true,
    hasShortages: false,
    preferredResumeMode: null,
    effectiveResumeMode: null,
    canStartDailyGoal: false,
    reviewStageWillBeSkipped: false,
    learningStageBlocked: false,
    phaseStates: {
      learning: {
        enabled: false,
        skipped: false,
        completed: false,
        currentPhase: false,
        preferred: false,
        total: 0,
        done: 0,
      },
      review: {
        enabled: false,
        skipped: false,
        completed: false,
        currentPhase: false,
        preferred: false,
        total: 0,
        done: 0,
      },
    },
  };
}

export function computeDailyGoalUiState(input: ProjectionInput): DailyGoalUiState {
  const { state, readiness } = input;
  if (!state && !readiness) {
    return createEmptyUiState();
  }

  const requestedLearning = toNonNegativeInt(
    readiness?.requested.learning ?? state?.plan.requestedCounts.new ?? 0
  );
  const requestedReview = toNonNegativeInt(
    readiness?.requested.review ?? state?.plan.requestedCounts.review ?? 0
  );
  const availableLearning = toNonNegativeInt(
    readiness?.available.learning ?? requestedLearning
  );
  const availableReview = toNonNegativeInt(
    readiness?.available.review ?? requestedReview
  );

  const reviewStageWillBeSkipped =
    Boolean(readiness?.summary.reviewStageWillBeSkipped) ||
    (requestedReview > 0 && availableReview === 0);
  const learningStageBlocked =
    readiness?.summary.mode === "blocked_no_learning" ||
    (requestedLearning > 0 && availableLearning === 0);

  const newTotal = toNonNegativeInt(
    readiness?.effective.learning ?? Math.min(requestedLearning, availableLearning)
  );
  const reviewTotal = toNonNegativeInt(
    readiness?.effective.review ??
      (reviewStageWillBeSkipped ? 0 : Math.min(requestedReview, availableReview))
  );

  const completedNew = toUniqueSet(state?.progress.completedVerseIds.new);
  const completedReview = toUniqueSet(state?.progress.completedVerseIds.review);
  const skippedNew = toUniqueSet(state?.progress.skippedVerseIds.new);
  const skippedReview = toUniqueSet(state?.progress.skippedVerseIds.review);

  const newDone = Math.min(newTotal, new Set([...completedNew, ...skippedNew]).size);
  const reviewDone = Math.min(
    reviewTotal,
    new Set([...completedReview, ...skippedReview]).size
  );

  const learningEnabled = requestedLearning > 0;
  const reviewEnabled = requestedReview > 0 && !reviewStageWillBeSkipped && reviewTotal > 0;
  const learningCompleted =
    !learningEnabled ? true : newTotal > 0 ? newDone >= newTotal : false;
  const reviewCompleted = !reviewEnabled ? true : reviewDone >= reviewTotal;

  const isEmpty = newTotal + reviewTotal === 0;

  let phase: DailyGoalPhase = "empty";
  if (!isEmpty) {
    if (!learningCompleted) {
      phase = "learning";
    } else if (!reviewCompleted) {
      phase = "review";
    } else {
      phase = "completed";
    }
  }

  const preferredResumeMode = normalizeResumeMode(state?.progress.preferredResumeMode);
  const firstUnfinishedMode: DailyGoalResumeMode | null =
    learningEnabled && !learningCompleted && !learningStageBlocked && newTotal > 0
      ? "learning"
      : reviewEnabled && !reviewCompleted
        ? "review"
        : null;

  const preferredResumeModeIsValid =
    preferredResumeMode != null &&
    ((preferredResumeMode === "learning" &&
      learningEnabled &&
      !learningCompleted &&
      !learningStageBlocked &&
      newTotal > 0) ||
      (preferredResumeMode === "review" && reviewEnabled && !reviewCompleted));

  const effectiveResumeMode = preferredResumeModeIsValid
    ? preferredResumeMode
    : firstUnfinishedMode;

  const hasShortages = readiness
    ? readiness.phases.learning.missingCount > 0 || readiness.phases.review.missingCount > 0
    : requestedLearning > availableLearning || requestedReview > availableReview;

  const canStartDailyGoal =
    readiness?.summary.canStartDailyGoal ?? (!learningStageBlocked && !isEmpty);

  const nextTargetKind =
    phase === "learning" ? "my" : phase === "review" ? "review" : null;

  return {
    phase,
    nextTargetKind,
    progressCounts: {
      newDone,
      newTotal,
      reviewDone,
      reviewTotal,
    },
    isActive:
      Boolean(state?.progress.startedAt) &&
      phase !== "empty" &&
      phase !== "completed",
    isCompleted: phase === "completed",
    isEmpty,
    hasShortages,
    preferredResumeMode,
    effectiveResumeMode,
    canStartDailyGoal,
    reviewStageWillBeSkipped,
    learningStageBlocked,
    phaseStates: {
      learning: {
        enabled: learningEnabled,
        skipped: false,
        completed: learningCompleted,
        currentPhase: phase === "learning",
        preferred: effectiveResumeMode === "learning",
        total: newTotal,
        done: newDone,
      },
      review: {
        enabled: reviewEnabled,
        skipped: reviewStageWillBeSkipped,
        completed: reviewStageWillBeSkipped || reviewCompleted,
        currentPhase: phase === "review",
        preferred: effectiveResumeMode === "review",
        total: reviewTotal,
        done: reviewDone,
      },
    },
  };
}

export function computeDailyGoalPhase(params: {
  state: DailyGoalServerStateV2;
  readiness: DailyGoalReadinessResponse;
}): DailyGoalPhase {
  return computeDailyGoalUiState({
    state: params.state,
    readiness: params.readiness,
  }).phase;
}
