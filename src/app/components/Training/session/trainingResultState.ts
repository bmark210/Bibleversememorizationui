import { VerseStatus } from "@/shared/domain/verseStatus";
import {
  TRAINING_MODE_PROGRESS_ORDER,
  TrainingModeId,
  isLearnEasyRatingAllowed,
} from "@/shared/training/modeEngine";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import type { HintRatingPolicy } from "@/modules/training/hints/types";
import type { TrainingProgressPopupPayload } from "@/app/components/Training/trainingProgressFeedback";
import { getTrainingModeShortLabel } from "@/app/components/training-session/modes/trainingModeMeta";
import type { TrainingExerciseResolution } from "@/app/components/training-session/modes/exerciseResult";

export type TrainingResultTone = "positive" | "negative" | "neutral";
export type TrainingResultFooterMode =
  | "rating-with-retry"
  | "retry-only"
  | "continue-only";

export type TrainingResultKind =
  | "exercise-success"
  | "exercise-failure"
  | "exercise-revealed"
  | "mode-regressed"
  | "mode-advanced"
  | "review-waiting"
  | "mastered";

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
  targetModeLabel: string | null;
  nextReviewAt: Date | null;
  progressPopup: TrainingProgressPopupPayload | null;
  ratingStage: TrainingResultRatingStage | null;
  ratingPolicy: HintRatingPolicy | null;
  currentTrainingModeId: TrainingModeId | null;
  allowEasySkip: boolean;
};

export type TrainingCommittedResultState = TrainingResultState & {
  verseKey: string;
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
  if (previousModeId == null || nextModeId == null || previousModeId === nextModeId) {
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
      targetModeLabel: null,
      nextReviewAt: null,
      progressPopup: null,
      ratingStage,
      ratingPolicy: params.ratingPolicy ?? null,
      currentTrainingModeId,
      allowEasySkip: false,
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
      targetModeLabel: null,
      nextReviewAt: null,
      progressPopup: null,
      ratingStage,
      ratingPolicy: params.ratingPolicy ?? null,
      currentTrainingModeId,
      allowEasySkip:
        ratingStage === "learning" &&
        isLearnEasyRatingAllowed(currentTrainingModeId),
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
    targetModeLabel: null,
    nextReviewAt: null,
    progressPopup: null,
    ratingStage,
    ratingPolicy: params.ratingPolicy ?? null,
    currentTrainingModeId,
    allowEasySkip:
      ratingStage === "learning" &&
      isLearnEasyRatingAllowed(currentTrainingModeId),
  };
}

export function buildCommittedTrainingResultState(params: {
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
}): TrainingCommittedResultState | null {
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

  if (nextStatus === "MASTERED") {
    return {
      verseKey,
      kind: "mastered",
      tone: "positive",
      footerMode: "continue-only",
      title: "Стих выучен",
      statusLabel: "Выучено",
      description:
        "Этот стих завершил текущий цикл тренировки и после продолжения исчезнет из активной очереди.",
      reference,
      verseText: null,
      matchPercent: null,
      targetModeLabel: null,
      nextReviewAt,
      progressPopup,
      ratingStage: null,
      ratingPolicy: null,
      currentTrainingModeId: nextModeId,
      allowEasySkip: false,
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
    const targetModeLabel = nextModeId ? getTrainingModeShortLabel(nextModeId) : null;
    return {
      verseKey,
      kind: transitionKind,
      tone: transitionKind === "mode-regressed" ? "negative" : "positive",
      footerMode: "continue-only",
      title:
        transitionKind === "mode-regressed"
          ? "Возврат к предыдущему режиму"
          : "Переход к следующему режиму",
      statusLabel: transitionKind === "mode-regressed" ? "Возврат" : "Новый режим",
      description:
        transitionKind === "mode-regressed"
          ? targetModeLabel
            ? `Следующая попытка начнётся с режима «${targetModeLabel}».`
            : "Следующая попытка начнётся с предыдущего режима."
          : targetModeLabel
            ? `Следующее упражнение откроется в режиме «${targetModeLabel}».`
            : "Следующее упражнение откроется в следующем режиме.",
      reference,
      verseText: null,
      matchPercent: null,
      targetModeLabel,
      nextReviewAt: null,
      progressPopup,
      ratingStage: null,
      ratingPolicy: null,
      currentTrainingModeId: nextModeId,
      allowEasySkip: false,
    };
  }

  const movedToReview =
    previousStatus !== "REVIEW" && previousStatus !== "MASTERED" && nextStatus === "REVIEW";
  const isWaitingReview =
    nextStatus === "REVIEW" && hasFutureReviewWindow(nextReviewAt, nowMs);

  if (movedToReview || isWaitingReview) {
    return {
      verseKey,
      kind: "review-waiting",
      tone: reviewWasSuccessful || movedToReview ? "positive" : "neutral",
      footerMode: "continue-only",
      title: movedToReview
        ? "Стих перешёл в повторение"
        : reviewWasSuccessful
          ? "Повторение засчитано"
          : "Следующая попытка позже",
      statusLabel: "Повторение",
      description: movedToReview
        ? "Этап изучения завершён. Теперь стих ждёт следующего окна повторения."
        : reviewWasSuccessful
          ? "Повторение завершено успешно. Карточка временно уйдёт в ожидание."
          : "Прогресс сохранён, но перед новой попыткой нужен небольшой интервал ожидания.",
      reference,
      verseText: null,
      matchPercent: null,
      targetModeLabel: null,
      nextReviewAt,
      progressPopup,
      ratingStage: null,
      ratingPolicy: null,
      currentTrainingModeId: nextModeId,
      allowEasySkip: false,
    };
  }

  return null;
}
