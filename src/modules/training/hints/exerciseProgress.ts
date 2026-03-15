import type {
  ExerciseUnitType,
  ExerciseProgressKind,
  ExerciseProgressSnapshot,
} from "./types";

function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function createExerciseProgressSnapshot(params: {
  kind: ExerciseProgressKind;
  unitType?: ExerciseUnitType;
  expectedIndex?: number | null;
  expectedWordIndex?: number | null;
  completedCount?: number;
  completedUnits?: number;
  totalCount?: number;
  totalUnits?: number;
  mistakeCount?: number;
  accuracy?: number | null;
  stallMs?: number;
  isCompleted: boolean;
}): ExerciseProgressSnapshot {
  const totalUnits = clampNonNegativeInt(
    params.totalCount ?? params.totalUnits ?? 0
  );
  const completedUnits = Math.min(
    clampNonNegativeInt(params.completedCount ?? params.completedUnits ?? 0),
    totalUnits
  );
  const expectedWordIndex =
    (params.expectedIndex ?? params.expectedWordIndex) == null
      ? null
      : clampNonNegativeInt(params.expectedIndex ?? params.expectedWordIndex ?? 0);

  return {
    kind: params.kind,
    unitType: params.unitType ?? "word",
    expectedIndex: expectedWordIndex,
    completedCount: completedUnits,
    totalCount: totalUnits,
    mistakeCount: clampNonNegativeInt(params.mistakeCount ?? 0),
    accuracy:
      typeof params.accuracy === "number" && Number.isFinite(params.accuracy)
        ? Math.max(0, Math.min(1, params.accuracy))
        : null,
    stallMs: clampNonNegativeInt(params.stallMs ?? 0),
    isCompleted: Boolean(params.isCompleted),
    expectedWordIndex,
    completedUnits,
    totalUnits,
  };
}

function sanitizeProgressFreeText(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/[ \t]+/g, " ");
}

export function getCompletedWordCountFromFreeText(value: string): number {
  const sanitized = sanitizeProgressFreeText(value);
  const hasTrailingWhitespace = /\s$/u.test(sanitized);
  const words = sanitized.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return 0;
  if (hasTrailingWhitespace) return words.length;
  return Math.max(0, words.length - 1);
}
