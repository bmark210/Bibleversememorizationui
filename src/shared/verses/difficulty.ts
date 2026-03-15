export type VerseDifficultyLevel = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

export const EASY_THRESHOLD = 95;
export const MEDIUM_THRESHOLD = 160;
export const HARD_THRESHOLD = 266;

export const VERSE_DIFFICULTY_LABELS_RU: Record<VerseDifficultyLevel, string> = {
  EASY: "Легкий",
  MEDIUM: "Средний",
  HARD: "Сложный",
  EXPERT: "Эксперт",
};

export const VERSE_DIFFICULTY_SHORT_LABELS_RU: Record<
  VerseDifficultyLevel,
  string
> = {
  EASY: "Легкий",
  MEDIUM: "Средний",
  HARD: "Сложный",
  EXPERT: "Эксперт",
};

const VERSE_DIFFICULTY_MULTIPLIERS: Record<VerseDifficultyLevel, number> = {
  EASY: 1,
  MEDIUM: 1.25,
  HARD: 1.5,
  EXPERT: 1.75,
};

function normalizeLettersInput(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

export function normalizeVerseDifficultyLetters(
  text: string | null | undefined
): number {
  if (typeof text !== "string" || text.trim().length === 0) {
    return 0;
  }

  const matches = text.match(/\p{L}/gu);
  return matches?.length ?? 0;
}

export function getDifficultyLevelByLetters(
  letters: number | null | undefined
): VerseDifficultyLevel {
  const normalized = normalizeLettersInput(letters);

  if (normalized <= EASY_THRESHOLD) return "EASY";
  if (normalized <= MEDIUM_THRESHOLD) return "MEDIUM";
  if (normalized <= HARD_THRESHOLD) return "HARD";
  return "EXPERT";
}

export function getDifficultyMultiplier(
  level: VerseDifficultyLevel | null | undefined
): number {
  if (!level) return VERSE_DIFFICULTY_MULTIPLIERS.EASY;
  return VERSE_DIFFICULTY_MULTIPLIERS[level] ?? VERSE_DIFFICULTY_MULTIPLIERS.EASY;
}

export function coerceVerseDifficultyLevel(
  value: unknown
): VerseDifficultyLevel {
  if (
    value === "EASY" ||
    value === "MEDIUM" ||
    value === "HARD" ||
    value === "EXPERT"
  ) {
    return value;
  }

  return "EASY";
}

export function getDifficultyLevelFromText(
  text: string | null | undefined
): VerseDifficultyLevel {
  return getDifficultyLevelByLetters(normalizeVerseDifficultyLetters(text));
}

// ─── Training error allowance by difficulty ───

const DIFFICULTY_MAX_MISTAKES: Record<VerseDifficultyLevel, number> = {
  EASY: 4,
  MEDIUM: 5,
  HARD: 7,
  EXPERT: 9,
};

const DIFFICULTY_RECALL_THRESHOLD: Record<VerseDifficultyLevel, number> = {
  EASY: 85,
  MEDIUM: 80,
  HARD: 75,
  EXPERT: 70,
};

/** Max wrong inputs before sequence reset (FirstLetters modes). */
export function getMaxMistakesForDifficulty(
  level: VerseDifficultyLevel | null | undefined
): number {
  if (!level) return DIFFICULTY_MAX_MISTAKES.EASY;
  return DIFFICULTY_MAX_MISTAKES[level] ?? DIFFICULTY_MAX_MISTAKES.EASY;
}

/** Similarity % threshold for FullRecall / VoiceRecall completion. */
export function getRecallThresholdForDifficulty(
  level: VerseDifficultyLevel | null | undefined
): number {
  if (!level) return DIFFICULTY_RECALL_THRESHOLD.EASY;
  return DIFFICULTY_RECALL_THRESHOLD[level] ?? DIFFICULTY_RECALL_THRESHOLD.EASY;
}
