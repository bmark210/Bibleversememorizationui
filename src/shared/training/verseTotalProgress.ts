import {
  REPEAT_THRESHOLD_FOR_MASTERED,
  TOTAL_REPEATS_AND_STAGE_MASTERY_MAX,
  TRAINING_STAGE_MASTERY_MAX,
} from "@/shared/constants/training";

function normalizeUnit(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/**
 * Единая шкала «весь путь стиха»: сырой mastery (до выхода в review) + успешные повторы в review,
 * не больше {@link TOTAL_REPEATS_AND_STAGE_MASTERY_MAX} (7 + 7).
 * Совпадает с карточками списка и галереи.
 */
export function computeVerseTotalCompletedUnits(
  masteryLevel: unknown,
  repetitions: unknown
): number {
  const m = normalizeUnit(masteryLevel);
  const r = normalizeUnit(repetitions);
  return Math.min(m + r, TOTAL_REPEATS_AND_STAGE_MASTERY_MAX);
}

export function computeVerseTotalProgressPercent(
  masteryLevel: unknown,
  repetitions: unknown
): number {
  const total = computeVerseTotalCompletedUnits(masteryLevel, repetitions);
  return Math.round(
    (total / TOTAL_REPEATS_AND_STAGE_MASTERY_MAX) * 100
  );
}

/**
 * Разбиение оставшегося пути для UI: шаги изучения до mastery 7 + слоты повторов review.
 */
export function computeVerseProgressBreakdown(
  masteryLevel: unknown,
  repetitions: unknown
): {
  totalCompleted: number;
  totalRemaining: number;
  remainingLearnings: number;
  remainingRepeats: number;
  progressPercent: number;
} {
  const m = normalizeUnit(masteryLevel);
  const r = normalizeUnit(repetitions);
  const totalCompleted = computeVerseTotalCompletedUnits(m, r);
  const remainingLearnings =
    m < TRAINING_STAGE_MASTERY_MAX
      ? TRAINING_STAGE_MASTERY_MAX - m
      : 0;
  const remainingRepeats =
    m >= TRAINING_STAGE_MASTERY_MAX
      ? Math.max(
          0,
          REPEAT_THRESHOLD_FOR_MASTERED -
            Math.min(r, REPEAT_THRESHOLD_FOR_MASTERED)
        )
      : REPEAT_THRESHOLD_FOR_MASTERED;
  const totalRemaining = remainingLearnings + remainingRepeats;
  return {
    totalCompleted,
    totalRemaining,
    remainingLearnings,
    remainingRepeats,
    progressPercent: computeVerseTotalProgressPercent(m, r),
  };
}
