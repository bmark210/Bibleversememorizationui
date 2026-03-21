/**
 * Shared utilities used by all question builders.
 */

import { parseExternalVerseId } from "@/shared/bible/externalVerseId";
import { levenshteinDistance, similarityRatio } from "@/shared/utils/levenshtein";

import type { TrainingVerse } from "../../types";
import {
  normalizeIncipitText,
  parseReferenceChapterAndVerseStart,
} from "../../services/validation";

// ---------------------------------------------------------------------------
// Config constants
// ---------------------------------------------------------------------------

export const CONFIG = {
  REFERENCE_OPTIONS_COUNT: 4,
  BOOK_OPTIONS_COUNT: 4,
  INCIPIT_OPTIONS_COUNT: 4,
  INCIPIT_TAP_DISTRACTORS_COUNT: 2,
  MAX_TYPING_ATTEMPTS: 2,
  TYPE_INPUT_SIMILARITY_THRESHOLD: 0.8,
  TYPE_PREFIX_READY_RATIO: 0.8,
} as const;

export const MAX_TYPING_ATTEMPTS = CONFIG.MAX_TYPING_ATTEMPTS;

// ---------------------------------------------------------------------------
// Random / shuffle helpers
// ---------------------------------------------------------------------------

function randomFloat(): number {
  if (typeof window !== "undefined") {
    const maybeCrypto = window.crypto;
    if (maybeCrypto?.getRandomValues) {
      const values = new Uint32Array(1);
      maybeCrypto.getRandomValues(values);
      return (values[0] ?? 0) / 4294967296;
    }
  }
  return Math.random();
}

export function randomInt(max: number): number {
  if (max <= 0) return 0;
  return Math.floor(randomFloat() * max);
}

function swapArrayItems<T>(arr: T[], i: number, j: number): void {
  const tmp = arr[i];
  arr[i] = arr[j]!;
  arr[j] = tmp!;
}

export function shuffle<T>(source: T[]): T[] {
  const next = [...source];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    swapArrayItems(next, index, swapIndex);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Context-related helpers
// ---------------------------------------------------------------------------

type ContextTargetRelation = {
  direction: "forward" | "backward";
  distance: number;
};

function getPluralForm(
  value: number,
  one: string,
  few: string,
  many: string,
): string {
  const absValue = Math.abs(value) % 100;
  const lastDigit = absValue % 10;

  if (absValue > 10 && absValue < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
}

function formatVerseGap(count: number): string {
  if (count === 1) return "один стих";
  if (count === 2) return "два стиха";
  if (count === 3) return "три стиха";
  if (count === 4) return "четыре стиха";
  return `${count} ${getPluralForm(count, "стих", "стиха", "стихов")}`;
}

function resolveContextTargetRelation(
  verse: TrainingVerse,
): ContextTargetRelation | null {
  const targetReference = parseExternalVerseId(verse.externalVerseId);
  const promptReference = parseReferenceChapterAndVerseStart(
    verse.contextPromptReference,
  );

  if (
    !targetReference ||
    !promptReference ||
    targetReference.chapter !== promptReference.chapter
  ) {
    return null;
  }

  const distance = Math.abs(
    targetReference.verseStart - promptReference.verseStart,
  );
  if (distance <= 0) return null;

  return {
    direction:
      targetReference.verseStart > promptReference.verseStart
        ? "forward"
        : "backward",
    distance,
  };
}

export function hasContextPrompt(verse: TrainingVerse): boolean {
  return verse.contextPromptText.trim().length > 0;
}

export function buildContextPrompt(verse: TrainingVerse): string {
  const promptText = verse.contextPromptText.trim();
  if (!promptText) return "";
  return promptText;
}

export function getContextTargetDescriptor(verse: TrainingVerse): string {
  const relation = resolveContextTargetRelation(verse);
  if (!relation) return "нужного стиха";

  if (relation.direction === "forward") {
    if (relation.distance === 1) return "следующего стиха";
    return `стиха, который идёт через ${formatVerseGap(
      relation.distance - 1,
    )} после подсказки`;
  }

  if (relation.distance === 1) return "предыдущего стиха";
  return `стиха, который находится через ${formatVerseGap(
    relation.distance - 1,
  )} до подсказки`;
}

export function buildContextModeHint(
  verse: TrainingVerse,
  mode: "incipit" | "tap" | "prefix",
): string {
  const descriptor = getContextTargetDescriptor(verse);

  if (mode === "tap") {
    return `Соберите начало ${descriptor}.`;
  }

  if (mode === "prefix") {
    return `Введите первые буквы начала ${descriptor}.`;
  }

  return `Введите начало ${descriptor}.`;
}

// ---------------------------------------------------------------------------
// Incipit / prefix evaluation helpers
// ---------------------------------------------------------------------------

export type TypeInputEvaluation = {
  isCorrect: boolean;
  acceptedWithTolerance: boolean;
};

export function getIncipitPrefixTokens(verse: TrainingVerse): string[] {
  return verse.incipitWords
    .map((word) => normalizeIncipitText(word))
    .filter(Boolean)
    .map((word) => Array.from(word)[0] ?? "")
    .filter(Boolean);
}

function getExpectedWordPrefixMatch(
  input: string,
  expected: string,
): boolean {
  const expectedTokens = expected.split(" ").filter(Boolean);
  const inputTokens = input.split(" ").filter(Boolean);
  if (
    expectedTokens.length === 0 ||
    inputTokens.length < expectedTokens.length
  ) {
    return false;
  }
  return expectedTokens.every(
    (token, index) => inputTokens[index] === token,
  );
}

export function evaluateIncipitInput(
  input: string,
  expected: string,
): TypeInputEvaluation {
  const normalizedInput = normalizeIncipitText(input);
  const normalizedExpected = normalizeIncipitText(expected);
  if (!normalizedInput || !normalizedExpected) {
    return { isCorrect: false, acceptedWithTolerance: false };
  }
  if (normalizedInput === normalizedExpected) {
    return { isCorrect: true, acceptedWithTolerance: false };
  }

  if (getExpectedWordPrefixMatch(normalizedInput, normalizedExpected)) {
    return { isCorrect: true, acceptedWithTolerance: true };
  }

  const distance = levenshteinDistance(normalizedInput, normalizedExpected);
  const maxAllowedDistance = normalizedExpected.length >= 24 ? 2 : 1;
  if (distance <= maxAllowedDistance) {
    return { isCorrect: true, acceptedWithTolerance: true };
  }

  const sim = similarityRatio(normalizedInput, normalizedExpected);
  if (sim >= CONFIG.TYPE_INPUT_SIMILARITY_THRESHOLD) {
    return { isCorrect: true, acceptedWithTolerance: true };
  }

  return { isCorrect: false, acceptedWithTolerance: false };
}

export function evaluateCompactPrefixInput(
  input: string,
  expectedTokens: string[],
): TypeInputEvaluation {
  if (expectedTokens.length === 0) {
    return { isCorrect: false, acceptedWithTolerance: false };
  }

  const normalizedInput = normalizeIncipitText(input);
  if (!normalizedInput) {
    return { isCorrect: false, acceptedWithTolerance: false };
  }

  const joinedExpected = expectedTokens.join("");
  const joinedInput = normalizedInput.replace(/\s+/g, "");

  if (!joinedInput || !joinedExpected) {
    return { isCorrect: false, acceptedWithTolerance: false };
  }

  if (joinedInput === joinedExpected) {
    return { isCorrect: true, acceptedWithTolerance: false };
  }

  if (joinedInput.startsWith(joinedExpected)) {
    return { isCorrect: true, acceptedWithTolerance: true };
  }

  const sim = similarityRatio(joinedInput, joinedExpected);
  if (sim >= CONFIG.TYPE_INPUT_SIMILARITY_THRESHOLD) {
    return { isCorrect: true, acceptedWithTolerance: true };
  }

  return { isCorrect: false, acceptedWithTolerance: false };
}

export function matchesCompactPrefixInput(
  input: string,
  expectedTokens: string[],
): boolean {
  return evaluateCompactPrefixInput(input, expectedTokens).isCorrect;
}
