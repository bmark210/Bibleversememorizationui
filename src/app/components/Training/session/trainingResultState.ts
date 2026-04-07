import { VerseStatus } from "@/shared/domain/verseStatus";
import {
  TRAINING_MODE_PROGRESS_ORDER,
  TrainingModeId,
} from "@/shared/training/modeEngine";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import type { HintRatingPolicy } from "@/modules/training/hints/types";
import type { TrainingProgressPopupPayload } from "@/app/components/Training/trainingProgressFeedback";
import type { TrainingExerciseResolution } from "@/app/components/training-session/modes/exerciseResult";

export type TrainingResultTone = "positive" | "negative" | "neutral";
export type TrainingResultFooterMode = "rating-with-retry" | "retry-only";
export type TrainingResultKind =
  | "exercise-success"
  | "exercise-failure"
  | "exercise-revealed";
export type TrainingResultRatingStage = "learning" | "review";

export type TrainingResultState = {
  kind: TrainingResultKind;
  tone: TrainingResultTone;
  footerMode: TrainingResultFooterMode;
  title: string;
  statusLabel: string;
  description: string;
  reference: string;
  verseText: string | null;
  matchPercent: number | null;
  ratingStage: TrainingResultRatingStage;
  ratingPolicy: HintRatingPolicy | null;
  currentTrainingModeId: TrainingModeId | null;
};

export type TrainingCommitToastKind =
  | "progress-updated"
  | "mode-regressed"
  | "mode-advanced"
  | "review-waiting"
  | "mastered";

export type TrainingCommitToastPayload = {
  id: string;
  kind: TrainingCommitToastKind;
  tone: TrainingResultTone;
  title: string;
  reference: string;
  meta: string | null;
  xpLabel: string | null;
};

function resolveRatingStage(
  status: DisplayVerseStatus
): TrainingResultRatingStage {
  return status === "REVIEW" || status === "MASTERED" ? "review" : "learning";
}

function resolveTransitionKind(params: {
  previousModeId: TrainingModeId | null;
  nextModeId: TrainingModeId | null;
}): "mode-regressed" | "mode-advanced" | null {
  const { previousModeId, nextModeId } = params;
  if (
    previousModeId == null ||
    nextModeId == null ||
    previousModeId === nextModeId
  ) {
    return null;
  }

  const previousIndex = TRAINING_MODE_PROGRESS_ORDER.indexOf(previousModeId);
  const nextIndex = TRAINING_MODE_PROGRESS_ORDER.indexOf(nextModeId);

  if (previousIndex >= 0 && nextIndex >= 0) {
    return nextIndex < previousIndex ? "mode-regressed" : "mode-advanced";
  }

  return nextModeId < previousModeId ? "mode-regressed" : "mode-advanced";
}

function hasFutureReviewWindow(nextReviewAt: Date | null, nowMs: number): boolean {
  return nextReviewAt instanceof Date && Number.isFinite(nextReviewAt.getTime())
    ? nextReviewAt.getTime() > nowMs
    : false;
}

function formatXpDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} XP`;
}

function resolveTrainingToastTitle(params: {
  xpLabel: string | null;
  fallback: string;
}): string {
  return params.xpLabel ?? params.fallback;
}

export function formatTrainingResultAvailability(
  nextReviewAt: Date | null,
  options?: { timeZone?: string }
): string | null {
  if (!(nextReviewAt instanceof Date) || !Number.isFinite(nextReviewAt.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options?.timeZone,
  });

  const parts = formatter.formatToParts(nextReviewAt);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const day = getPart("day").trim();
  const month = getPart("month").replace(".", "").trim();
  const hour = getPart("hour").trim();
  const minute = getPart("minute").trim();

  if (!day || !month || !hour || !minute) {
    return null;
  }

  return `${day} ${month} в ${hour}:${minute}`;
}

export function buildExerciseResultState(params: {
  result: TrainingExerciseResolution;
  reference: string;
  verseText: string;
  status: DisplayVerseStatus;
  trainingModeId: TrainingModeId | null;
  ratingPolicy?: HintRatingPolicy | null;
}): TrainingResultState {
  const ratingStage = resolveRatingStage(params.status);
  const currentTrainingModeId = params.trainingModeId;

  if (params.result.kind === "failure") {
    return {
      kind: "exercise-failure",
      tone: "negative",
      footerMode: "retry-only",
      title: "Не получилось",
      statusLabel: "Провал",
      description: params.result.message,
      reference: params.reference,
      verseText: params.verseText,
      matchPercent: params.result.matchPercent ?? null,
      ratingStage,
      ratingPolicy: params.ratingPolicy ?? null,
      currentTrainingModeId,
    };
  }

  if (params.result.kind === "revealed") {
    return {
      kind: "exercise-revealed",
      tone: "neutral",
      footerMode: "rating-with-retry",
      title: "Ответ открыт",
      statusLabel: "С подсказкой",
      description: params.result.message,
      reference: params.reference,
      verseText: params.verseText,
      matchPercent: params.result.matchPercent ?? null,
      ratingStage,
      ratingPolicy: params.ratingPolicy ?? null,
      currentTrainingModeId,
    };
  }

  return {
    kind: "exercise-success",
    tone: "positive",
    footerMode: "rating-with-retry",
    title: "Упражнение выполнено",
    statusLabel: "Успех",
    description: params.result.message,
    reference: params.reference,
    verseText: null,
    matchPercent: params.result.matchPercent ?? null,
    ratingStage,
    ratingPolicy: params.ratingPolicy ?? null,
    currentTrainingModeId,
  };
}

export function buildTrainingCommitToastPayload(params: {
  verseKey: string;
  reference: string;
  previousStatus: DisplayVerseStatus;
  nextStatus: DisplayVerseStatus;
  previousModeId: TrainingModeId | null;
  nextModeId: TrainingModeId | null;
  nextReviewAt: Date | null;
  reviewWasSuccessful: boolean;
  progressPopup: TrainingProgressPopupPayload | null;
  nowMs?: number;
}): TrainingCommitToastPayload | null {
  const {
    verseKey,
    reference,
    previousStatus,
    nextStatus,
    previousModeId,
    nextModeId,
    nextReviewAt,
    reviewWasSuccessful,
    progressPopup,
    nowMs = Date.now(),
  } = params;
  const xpLabel =
    progressPopup && progressPopup.xpDelta !== 0
      ? formatXpDelta(progressPopup.xpDelta)
      : null;

  if (nextStatus === "MASTERED") {
    return {
      id: `training-commit:${verseKey}:mastered`,
      kind: "mastered",
      tone: "positive",
      title: resolveTrainingToastTitle({
        xpLabel,
        fallback: "Стих выучен",
      }),
      reference,
      meta: null,
      xpLabel,
    };
  }

  const transitionKind = resolveTransitionKind({
    previousModeId,
    nextModeId,
  });

  if (
    previousStatus === VerseStatus.LEARNING &&
    nextStatus === VerseStatus.LEARNING &&
    transitionKind
  ) {
    return {
      id: `training-commit:${verseKey}:${transitionKind}`,
      kind: transitionKind,
      tone: transitionKind === "mode-regressed" ? "negative" : "positive",
      title: resolveTrainingToastTitle({
        xpLabel,
        fallback: "Прогресс обновлён",
      }),
      reference,
      meta: null,
      xpLabel,
    };
  }

  const movedToReview =
    previousStatus !== "REVIEW" &&
    previousStatus !== "MASTERED" &&
    nextStatus === "REVIEW";
  const isWaitingReview =
    nextStatus === "REVIEW" && hasFutureReviewWindow(nextReviewAt, nowMs);

  if (movedToReview || isWaitingReview) {
    const availabilityText = formatTrainingResultAvailability(nextReviewAt);
    return {
      id: `training-commit:${verseKey}:review-waiting`,
      kind: "review-waiting",
      tone: reviewWasSuccessful || movedToReview ? "positive" : "neutral",
      title: resolveTrainingToastTitle({
        xpLabel,
        fallback: movedToReview
          ? "Переход в повторение"
          : "Следующее повторение назначено",
      }),
      reference,
      meta: xpLabel
        ? null
        : movedToReview
          ? availabilityText
            ? `До ${availabilityText}`
            : "Ожидает следующего окна"
          : availabilityText
            ? `До ${availabilityText}`
            : "Повтор временно отложен",
      xpLabel,
    };
  }

  if (!progressPopup) {
    return null;
  }

  return {
    id: `training-commit:${verseKey}:progress`,
    kind: "progress-updated",
    tone: progressPopup.tone,
    title: resolveTrainingToastTitle({
      xpLabel,
      fallback: "Прогресс обновлён",
    }),
    reference,
    meta: null,
    xpLabel,
  };
}
