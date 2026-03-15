import { TrainingModeId } from "@/shared/training/modeEngine";
import {
  coerceVerseDifficultyLevel,
  getMaxMistakesForDifficulty,
  getRecallThresholdForDifficulty,
  type VerseDifficultyLevel,
} from "@/shared/verses/difficulty";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * How many times the user can request "next word" hint per attempt,
 * based on verse difficulty. Harder verses allow more uses.
 */
const NEXT_WORD_MAX_USES_BY_DIFFICULTY: Record<VerseDifficultyLevel, number> = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
  EXPERT: 4,
};

const SHOW_VERSE_DURATION_SECONDS_BY_DIFFICULTY: Record<VerseDifficultyLevel, number> = {
  EASY: 3,
  MEDIUM: 5,
  HARD: 8,
  EXPERT: 12,
};

const WORD_MODE_ERROR_OFFSET_BY_DIFFICULTY: Record<
  VerseDifficultyLevel,
  number
> = {
  EASY: -1,
  MEDIUM: 0,
  HARD: 1,
  EXPERT: 2,
};

const HINTED_REVEAL_RATIO_BY_MODE: Record<
  TrainingModeId.ClickWordsHinted | TrainingModeId.FirstLettersWithWordHints,
  Record<VerseDifficultyLevel, number>
> = {
  [TrainingModeId.ClickWordsHinted]: {
    EASY: 0.45,
    MEDIUM: 0.4,
    HARD: 0.35,
    EXPERT: 0.3,
  },
  [TrainingModeId.FirstLettersWithWordHints]: {
    EASY: 0.5,
    MEDIUM: 0.45,
    HARD: 0.4,
    EXPERT: 0.35,
  },
};

function resolveDifficultyLevel(
  difficultyLevel: VerseDifficultyLevel | null | undefined
): VerseDifficultyLevel {
  return coerceVerseDifficultyLevel(difficultyLevel);
}

export function getNextWordMaxUses(
  difficultyLevel: VerseDifficultyLevel | null | undefined
): number {
  const level = resolveDifficultyLevel(difficultyLevel);
  return NEXT_WORD_MAX_USES_BY_DIFFICULTY[level];
}

export function getShowVerseDurationSeconds(
  difficultyLevel: VerseDifficultyLevel | null | undefined
): number {
  const level = resolveDifficultyLevel(difficultyLevel);
  return SHOW_VERSE_DURATION_SECONDS_BY_DIFFICULTY[level];
}

export function getExerciseMaxMistakes(params: {
  modeId: TrainingModeId;
  difficultyLevel: VerseDifficultyLevel | null | undefined;
  totalUnits: number;
}): number {
  const level = resolveDifficultyLevel(params.difficultyLevel);

  if (
    params.modeId === TrainingModeId.ClickWordsHinted ||
    params.modeId === TrainingModeId.ClickWordsNoHints
  ) {
    const totalUnits = Math.max(1, Math.round(params.totalUnits));
    const base = Math.max(5, Math.floor(totalUnits * 0.3));
    return Math.max(4, base + WORD_MODE_ERROR_OFFSET_BY_DIFFICULTY[level]);
  }

  return getMaxMistakesForDifficulty(level);
}

export function getHintedRevealCount(params: {
  modeId: TrainingModeId.ClickWordsHinted | TrainingModeId.FirstLettersWithWordHints;
  difficultyLevel: VerseDifficultyLevel | null | undefined;
  totalWords: number;
}): number {
  const totalWords = Math.max(0, Math.round(params.totalWords));
  if (totalWords <= 1) return 0;

  const level = resolveDifficultyLevel(params.difficultyLevel);
  const ratio = HINTED_REVEAL_RATIO_BY_MODE[params.modeId][level];
  const minReveal = totalWords >= 6 ? 2 : 1;
  const maxReveal = totalWords >= 6 ? totalWords - 2 : totalWords - 1;

  return clamp(Math.round(totalWords * ratio), minReveal, maxReveal);
}

export function getExerciseRecallThreshold(
  difficultyLevel: VerseDifficultyLevel | null | undefined
): number {
  return getRecallThresholdForDifficulty(difficultyLevel);
}

export function getAssistSuggestionThresholdMs(params: {
  phase: "learning" | "review";
  modeId: TrainingModeId | null | undefined;
}): number {
  if (params.phase === "review") {
    return 25_000;
  }

  if (
    params.modeId === TrainingModeId.FirstLettersTyping ||
    params.modeId === TrainingModeId.FullRecall ||
    params.modeId === TrainingModeId.VoiceRecall
  ) {
    return 20_000;
  }

  return 12_000;
}

export function getAssistSuggestionMistakeThreshold(params: {
  phase: "learning" | "review";
}): number {
  return params.phase === "review" ? 1 : 2;
}
