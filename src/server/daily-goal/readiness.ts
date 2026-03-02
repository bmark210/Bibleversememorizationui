import { VerseStatus } from "@/generated/prisma";
import { REPEAT_THRESHOLD_FOR_MASTERED, TRAINING_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import type { DailyGoalReadinessResponse } from "@/app/features/daily-goal/types";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_KEY_FALLBACK_TIMEZONE = "UTC";

export type DailyGoalReadinessVerseInput = {
  status?: VerseStatus | null;
  masteryLevel?: number | null;
  repetitions?: number | null;
  nextReviewAt?: Date | string | null;
};

function normalizeProgress(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function normalizeBaseStatus(status: VerseStatus | null | undefined): VerseStatus {
  if (status === VerseStatus.LEARNING) return VerseStatus.LEARNING;
  if (status === VerseStatus.STOPPED) return VerseStatus.STOPPED;
  return VerseStatus.MY;
}

function computeDisplayStatus(
  baseStatusInput: VerseStatus | null | undefined,
  masteryLevelInput: number | null | undefined,
  repetitionsInput: number | null | undefined
): VerseStatus | "REVIEW" | "MASTERED" {
  const baseStatus = normalizeBaseStatus(baseStatusInput);
  const masteryLevel = normalizeProgress(masteryLevelInput);
  const repetitions = normalizeProgress(repetitionsInput);

  if (baseStatus === VerseStatus.MY) return VerseStatus.MY;
  if (baseStatus === VerseStatus.STOPPED) return VerseStatus.STOPPED;
  if (repetitions >= REPEAT_THRESHOLD_FOR_MASTERED) return "MASTERED";
  if (masteryLevel >= TRAINING_STAGE_MASTERY_MAX) return "REVIEW";
  return VerseStatus.LEARNING;
}

function isDueForReview(nextReviewAtInput: Date | string | null | undefined): boolean {
  if (!nextReviewAtInput) return true;
  const nextReviewAt =
    nextReviewAtInput instanceof Date ? nextReviewAtInput : new Date(String(nextReviewAtInput));
  if (Number.isNaN(nextReviewAt.getTime())) return true;
  return Date.now() >= nextReviewAt.getTime();
}

export function parseNonNegativeInt(
  value: string | string[] | undefined,
  key: string
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw ?? 0);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`${key} must be an integer between 0 and 100`);
  }
  return parsed;
}

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function parseTimezone(
  value: string | string[] | undefined,
  fallback = DAY_KEY_FALLBACK_TIMEZONE
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== "string") return fallback;
  return isValidTimezone(raw) ? raw : fallback;
}

export function parseDayKey(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== "string" || !DAY_KEY_RE.test(raw)) return null;
  const [y, m, d] = raw.split("-").map((part) => Number(part));
  const probe = new Date(Date.UTC(y, m - 1, d));
  const valid =
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() + 1 === m &&
    probe.getUTCDate() === d;
  return valid ? raw : null;
}

export function getDayKeyInTimezone(timezone: string, date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function countReadinessAvailability(verses: DailyGoalReadinessVerseInput[]) {
  let learning = 0;
  let review = 0;

  for (const verse of verses) {
    const displayStatus = computeDisplayStatus(verse.status, verse.masteryLevel, verse.repetitions);
    if (displayStatus === VerseStatus.LEARNING) {
      learning += 1;
      continue;
    }
    if (displayStatus === "REVIEW" && isDueForReview(verse.nextReviewAt)) {
      review += 1;
    }
  }

  return { learning, review };
}

export function buildDailyGoalReadiness(params: {
  verses: DailyGoalReadinessVerseInput[];
  requestedLearning: number;
  requestedReview: number;
}): DailyGoalReadinessResponse {
  const { verses, requestedLearning, requestedReview } = params;
  const available = countReadinessAvailability(verses);
  const hasAnyUserVerses = verses.length > 0;

  const reviewStageWillBeSkipped = requestedReview > 0 && available.review === 0;
  const learningEnabled = requestedLearning > 0;
  const reviewRequested = requestedReview > 0;
  const learningCanStart = !learningEnabled || available.learning > 0;

  const effective = {
    learning: Math.min(requestedLearning, available.learning),
    review: reviewStageWillBeSkipped ? 0 : Math.min(requestedReview, available.review),
  };

  const learningMissingCount = Math.max(0, requestedLearning - available.learning);
  const reviewMissingCount = reviewStageWillBeSkipped
    ? 0
    : Math.max(0, requestedReview - available.review);
  const effectiveTotal = effective.learning + effective.review;
  const hasAnyTargets = effectiveTotal > 0;

  const hasAllCardsForRequestedGoal =
    available.learning >= requestedLearning && available.review >= requestedReview;

  const canStartDailyGoal = hasAnyUserVerses && learningCanStart && hasAnyTargets;

  const mode: DailyGoalReadinessResponse["summary"]["mode"] = !hasAnyUserVerses
    ? "empty"
    : !learningCanStart && learningEnabled
      ? "blocked_no_learning"
      : !hasAnyTargets
        ? "empty"
      : reviewStageWillBeSkipped
        ? "ready_with_review_skip"
        : "ready";

  return {
    requested: {
      learning: requestedLearning,
      review: requestedReview,
    },
    available,
    effective,
    phases: {
      learning: {
        enabled: learningEnabled,
        canStart: learningCanStart,
        missingCount: learningMissingCount,
        status: !learningEnabled
          ? "disabled"
          : available.learning === 0
            ? "missing_required"
            : learningMissingCount > 0
              ? "insufficient"
              : "ready",
        userAction: learningEnabled && available.learning === 0 ? "create_or_move_to_learning" : "none",
        message:
          learningEnabled && available.learning === 0
            ? "Чтобы начать ежедневную цель, добавьте стих или переведите стих в режим изучения (LEARNING)."
            : null,
      },
      review: {
        enabled: reviewRequested && available.review > 0,
        skipped: reviewStageWillBeSkipped,
        missingCount: reviewMissingCount,
        status: !reviewRequested
          ? "disabled"
          : reviewStageWillBeSkipped
            ? "skipped"
            : reviewMissingCount > 0
              ? "insufficient"
              : "ready",
        userAction: "none",
        message: reviewStageWillBeSkipped
          ? "Этап повторения будет пропущен: сейчас нет карточек для повторения."
          : null,
      },
    },
    summary: {
      hasAnyUserVerses,
      canStartDailyGoal,
      reviewStageWillBeSkipped,
      hasAllCardsForRequestedGoal,
      mode,
    },
  };
}
