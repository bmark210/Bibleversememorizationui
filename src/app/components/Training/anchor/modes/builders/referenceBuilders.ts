/**
 * Reference-track question builders:
 * - buildReferenceChoiceQuestion
 * - buildBookChoiceQuestion
 * - buildReferenceTypeQuestion
 */

import type {
  ChoiceQuestion,
  TrainingVerse,
  TypeQuestion,
} from "../../types";
import {
  matchesReferenceWithTolerance,
  normalizeBookName,
} from "../../services/validation";
import { CONFIG, shuffle } from "./builderUtils";

// ---------------------------------------------------------------------------
// reference-choice
// ---------------------------------------------------------------------------

export function buildReferenceChoiceQuestion(
  verse: TrainingVerse,
  pool: TrainingVerse[],
  order: number,
): ChoiceQuestion | null {
  const normalizedCorrect = normalizeBookName(verse.reference);

  const distractors = shuffle(
    pool
      .map((item) => item.reference)
      .filter((candidate) => candidate.trim().length > 0)
      .filter(
        (candidate) => normalizeBookName(candidate) !== normalizedCorrect,
      ),
  );

  if (distractors.length < CONFIG.REFERENCE_OPTIONS_COUNT - 1) return null;

  return {
    id: `reference-choice-${order}-${verse.externalVerseId}`,
    modeId: "reference-choice",
    modeHint: "Выберите правильную ссылку",
    verse,
    prompt: verse.text,
    answerLabel: verse.reference,
    interaction: "choice",
    options: shuffle([
      verse.reference,
      ...distractors.slice(0, CONFIG.REFERENCE_OPTIONS_COUNT - 1),
    ]),
    isCorrectOption: (value: string) =>
      matchesReferenceWithTolerance(value, verse.reference),
  };
}

// ---------------------------------------------------------------------------
// book-choice
// ---------------------------------------------------------------------------

export function buildBookChoiceQuestion(
  verse: TrainingVerse,
  pool: TrainingVerse[],
  order: number,
): ChoiceQuestion | null {
  const normalizedCorrect = normalizeBookName(verse.bookName);

  const distractors = shuffle(
    pool
      .map((item) => item.bookName)
      .filter((candidate) => candidate.trim().length > 0)
      .filter(
        (candidate) => normalizeBookName(candidate) !== normalizedCorrect,
      ),
  );

  if (distractors.length < CONFIG.BOOK_OPTIONS_COUNT - 1) return null;

  return {
    id: `book-choice-${order}-${verse.externalVerseId}`,
    modeId: "book-choice",
    modeHint: "Выберите правильную книгу",
    verse,
    prompt: verse.text,
    answerLabel: verse.bookName,
    interaction: "choice",
    options: shuffle([
      verse.bookName,
      ...distractors.slice(0, CONFIG.BOOK_OPTIONS_COUNT - 1),
    ]),
    isCorrectOption: (value: string) =>
      normalizeBookName(value) === normalizedCorrect,
  };
}

// ---------------------------------------------------------------------------
// reference-type
// ---------------------------------------------------------------------------

export function buildReferenceTypeQuestion(
  verse: TrainingVerse,
  order: number,
): TypeQuestion {
  return {
    id: `reference-type-${order}-${verse.externalVerseId}`,
    modeId: "reference-type",
    modeHint: "Введите ссылку вручную",
    verse,
    prompt: verse.text,
    answerLabel: verse.reference,
    interaction: "type",
    placeholder: "Иоанна 3:16",
    maxAttempts: CONFIG.MAX_TYPING_ATTEMPTS,
    retryHint: `${verse.bookName} ${verse.chapterVerse}`.trim(),
    isCorrectInput: (value: string) =>
      matchesReferenceWithTolerance(value, verse.reference),
  };
}
