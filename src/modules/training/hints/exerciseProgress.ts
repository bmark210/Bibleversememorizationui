import type {
  ExerciseProgressKind,
  ExerciseProgressSnapshot,
} from "./types";

function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function createExerciseProgressSnapshot(params: {
  kind: ExerciseProgressKind;
  expectedWordIndex: number | null;
  completedUnits: number;
  totalUnits: number;
  isCompleted: boolean;
}): ExerciseProgressSnapshot {
  const totalUnits = clampNonNegativeInt(params.totalUnits);
  const completedUnits = Math.min(
    clampNonNegativeInt(params.completedUnits),
    totalUnits
  );
  const expectedWordIndex =
    params.expectedWordIndex == null
      ? null
      : clampNonNegativeInt(params.expectedWordIndex);

  return {
    kind: params.kind,
    expectedWordIndex,
    completedUnits,
    totalUnits,
    isCompleted: Boolean(params.isCompleted),
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
