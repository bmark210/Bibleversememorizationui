/**
 * Incipit-track question builders:
 * - buildIncipitChoiceQuestion
 * - buildIncipitTapQuestion
 * - buildIncipitTypeQuestion
 */

import type {
  ChoiceQuestion,
  TapQuestion,
  TapQuestionOption,
  TrainingVerse,
  TypeQuestion,
} from "../../types";
import { normalizeIncipitText } from "../../services/validation";
import {
  CONFIG,
  shuffle,
  getIncipitPrefixTokens,
  matchesCompactPrefixInput,
} from "./builderUtils";

// ---------------------------------------------------------------------------
// incipit-choice
// ---------------------------------------------------------------------------

export function buildIncipitChoiceQuestion(
  verse: TrainingVerse,
  pool: TrainingVerse[],
  order: number,
): ChoiceQuestion | null {
  if (verse.incipitWords.length < 2) return null;
  const normalizedCorrect = normalizeIncipitText(verse.incipit);

  const distractors = shuffle(
    pool
      .map((item) => item.incipit)
      .filter((candidate) => candidate.trim().length > 0)
      .filter(
        (candidate) =>
          normalizeIncipitText(candidate) !== normalizedCorrect,
      ),
  );

  if (distractors.length < CONFIG.INCIPIT_OPTIONS_COUNT - 1) return null;

  return {
    id: `incipit-choice-${order}-${verse.externalVerseId}`,
    modeId: "incipit-choice",
    modeHint: "Выберите правильное начало стиха.",
    verse,
    prompt: verse.reference,
    answerLabel: verse.incipit,
    interaction: "choice",
    options: shuffle([
      verse.incipit,
      ...distractors.slice(0, CONFIG.INCIPIT_OPTIONS_COUNT - 1),
    ]),
    isCorrectOption: (value: string) =>
      normalizeIncipitText(value) === normalizedCorrect,
  };
}

// ---------------------------------------------------------------------------
// incipit-tap
// ---------------------------------------------------------------------------

export function buildIncipitTapQuestion(
  verse: TrainingVerse,
  pool: TrainingVerse[],
  order: number,
): TapQuestion | null {
  if (verse.incipitWords.length < 2) return null;

  const expectedNormalized = verse.incipitWords.map((word) =>
    normalizeIncipitText(word),
  );
  const expectedSet = new Set(expectedNormalized);

  const distractorCandidates = Array.from(
    new Map(
      pool
        .flatMap((item) => item.incipitWords)
        .filter((word) => word.trim().length > 0)
        .filter((word) => !expectedSet.has(normalizeIncipitText(word)))
        .map((word) => [normalizeIncipitText(word), word] as const),
    ).values(),
  );

  const distractors = shuffle(distractorCandidates).slice(
    0,
    CONFIG.INCIPIT_TAP_DISTRACTORS_COUNT,
  );

  const options: TapQuestionOption[] = shuffle([
    ...verse.incipitWords,
    ...distractors,
  ]).map((word, index) => ({
    id: `incipit-tap-${order}-${index}`,
    label: word,
    normalized: normalizeIncipitText(word),
  }));

  return {
    id: `incipit-tap-${order}-${verse.externalVerseId}`,
    modeId: "incipit-tap",
    modeHint: "Соберите начало стиха по словам.",
    verse,
    prompt: verse.reference,
    answerLabel: verse.incipit,
    interaction: "tap",
    options,
    expectedNormalized,
  };
}

// ---------------------------------------------------------------------------
// incipit-type
// ---------------------------------------------------------------------------

export function buildIncipitTypeQuestion(
  verse: TrainingVerse,
  order: number,
): TypeQuestion | null {
  if (verse.incipitWords.length < 2) return null;
  const prefixTokens = getIncipitPrefixTokens(verse);
  if (prefixTokens.length === 0) return null;
  const compactUppercasePrefix = prefixTokens.join("").toUpperCase();

  return {
    id: `incipit-type-${order}-${verse.externalVerseId}`,
    modeId: "incipit-type",
    modeHint: "Введите первые буквы начала стиха.",
    verse,
    prompt: verse.reference,
    answerLabel: verse.incipit,
    interaction: "type",
    placeholder: "ИТВБМ",
    maxAttempts: CONFIG.MAX_TYPING_ATTEMPTS,
    retryHint: undefined,
    isCorrectInput: (value: string) =>
      matchesCompactPrefixInput(value, prefixTokens),
  };
}
