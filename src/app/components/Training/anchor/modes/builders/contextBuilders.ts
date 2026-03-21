/**
 * Context-track question builders:
 * - buildContextIncipitTypeQuestion
 * - buildContextIncipitTapQuestion
 * - buildContextPrefixTypeQuestion
 */

import type {
  TapQuestion,
  TapQuestionOption,
  TrainingVerse,
  TypeQuestion,
} from "../../types";
import {
  matchesIncipitWithTolerance,
  normalizeIncipitText,
} from "../../services/validation";
import {
  CONFIG,
  shuffle,
  hasContextPrompt,
  buildContextPrompt,
  getContextTargetDescriptor,
  buildContextModeHint,
  getIncipitPrefixTokens,
  matchesCompactPrefixInput,
} from "./builderUtils";

// ---------------------------------------------------------------------------
// context-incipit-type
// ---------------------------------------------------------------------------

export function buildContextIncipitTypeQuestion(
  verse: TrainingVerse,
  order: number,
): TypeQuestion | null {
  if (!hasContextPrompt(verse)) return null;
  if (verse.incipitWords.length < 2) return null;

  const prompt = buildContextPrompt(verse);
  if (!prompt) return null;

  const initials = verse.incipitWords
    .map((word) => Array.from(normalizeIncipitText(word))[0] ?? "")
    .filter(Boolean)
    .join(" ");

  return {
    id: `context-incipit-type-${order}-${verse.externalVerseId}`,
    modeId: "context-incipit-type",
    modeHint: buildContextModeHint(verse, "incipit"),
    verse,
    prompt,
    answerLabel: verse.incipit,
    interaction: "type",
    placeholder: `Введите начало ${getContextTargetDescriptor(verse)}`,
    maxAttempts: CONFIG.MAX_TYPING_ATTEMPTS,
    retryHint: initials ? `Первые буквы: ${initials}` : undefined,
    isCorrectInput: (value: string) =>
      matchesIncipitWithTolerance(value, verse.incipit),
  };
}

// ---------------------------------------------------------------------------
// context-incipit-tap
// ---------------------------------------------------------------------------

export function buildContextIncipitTapQuestion(
  verse: TrainingVerse,
  pool: TrainingVerse[],
  order: number,
): TapQuestion | null {
  if (!hasContextPrompt(verse)) return null;
  if (verse.incipitWords.length < 2) return null;

  const prompt = buildContextPrompt(verse);
  if (!prompt) return null;

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
    id: `context-incipit-tap-${order}-${index}`,
    label: word,
    normalized: normalizeIncipitText(word),
  }));

  return {
    id: `context-incipit-tap-${order}-${verse.externalVerseId}`,
    modeId: "context-incipit-tap",
    modeHint: buildContextModeHint(verse, "tap"),
    verse,
    prompt,
    answerLabel: verse.incipit,
    interaction: "tap",
    options,
    expectedNormalized,
  };
}

// ---------------------------------------------------------------------------
// context-prefix-type
// ---------------------------------------------------------------------------

export function buildContextPrefixTypeQuestion(
  verse: TrainingVerse,
  order: number,
): TypeQuestion | null {
  if (!hasContextPrompt(verse)) return null;

  const prompt = buildContextPrompt(verse);
  if (!prompt) return null;

  const prefixTokens = getIncipitPrefixTokens(verse);
  if (prefixTokens.length === 0) return null;
  const compactUppercasePrefix = prefixTokens.join("").toUpperCase();

  return {
    id: `context-prefix-type-${order}-${verse.externalVerseId}`,
    modeId: "context-prefix-type",
    modeHint: buildContextModeHint(verse, "prefix"),
    verse,
    prompt,
    answerLabel: compactUppercasePrefix,
    interaction: "type",
    placeholder: "ИТВБМ",
    maxAttempts: CONFIG.MAX_TYPING_ATTEMPTS,
    retryHint: `Формат: ${compactUppercasePrefix}`,
    isCorrectInput: (value: string) =>
      matchesCompactPrefixInput(value, prefixTokens),
  };
}
