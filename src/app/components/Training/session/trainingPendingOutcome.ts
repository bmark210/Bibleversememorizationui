import type { DisplayVerseStatus } from "@/app/types/verseStatus";

export type TrainingPendingOutcomeKind = "review-waiting" | "mastered";

export type TrainingPendingOutcome = {
  kind: TrainingPendingOutcomeKind;
  verseKey: string;
  reference: string;
  status: DisplayVerseStatus;
  nextReviewAt: Date | null;
  previousStatus: DisplayVerseStatus;
  reviewWasSuccessful: boolean;
};

const FALLBACK_AVAILABILITY_LABEL = "Следующее повторение откроется позже.";

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function hasFutureReviewWindow(nextReviewAt: Date | null, nowMs: number) {
  return isValidDate(nextReviewAt) && nextReviewAt.getTime() > nowMs;
}

export function buildTrainingPendingOutcome(params: {
  verseKey: string;
  reference: string;
  previousStatus: DisplayVerseStatus;
  nextStatus: DisplayVerseStatus;
  nextReviewAt: Date | null;
  wasReviewExercise: boolean;
  reviewWasSuccessful: boolean;
  nowMs?: number;
}): TrainingPendingOutcome | null {
  const {
    verseKey,
    reference,
    previousStatus,
    nextStatus,
    nextReviewAt,
    wasReviewExercise,
    reviewWasSuccessful,
    nowMs = Date.now(),
  } = params;

  if (nextStatus === "MASTERED") {
    return {
      kind: "mastered",
      verseKey,
      reference,
      status: nextStatus,
      nextReviewAt,
      previousStatus,
      reviewWasSuccessful,
    };
  }

  const movedToReview = previousStatus !== "REVIEW" && nextStatus === "REVIEW";
  const isWaitingReview =
    nextStatus === "REVIEW" && hasFutureReviewWindow(nextReviewAt, nowMs);

  if (movedToReview || (wasReviewExercise && isWaitingReview)) {
    return {
      kind: "review-waiting",
      verseKey,
      reference,
      status: nextStatus,
      nextReviewAt,
      previousStatus,
      reviewWasSuccessful,
    };
  }

  return null;
}

export function formatTrainingOutcomeAvailability(
  nextReviewAt: Date | null,
  options?: { timeZone?: string }
) {
  if (!isValidDate(nextReviewAt)) {
    return FALLBACK_AVAILABILITY_LABEL;
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
    return FALLBACK_AVAILABILITY_LABEL;
  }

  return `${day} ${month} в ${hour}:${minute}`;
}

