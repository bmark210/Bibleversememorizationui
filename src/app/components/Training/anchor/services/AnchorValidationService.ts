/**
 * AnchorValidationService
 * Отделённая логика валидации ответов на вопросы
 */

import { levenshteinDistance } from "@/shared/utils/levenshtein";

const CYRILLIC_NORMALIZATION_PATTERN = /ё/g;
const SPECIAL_CHARS_PATTERN = /[^\p{L}\p{N}]+/gu;
const WHITESPACE_PATTERN = /\s+/g;
const NBSP_REPLACEMENT = " ";

export type ReferenceParseResult = {
  bookName: string;
  chapterVerse: string;
} | null;

export type IncipitEvaluation = {
  isCorrect: boolean;
  acceptedWithTolerance: boolean;
};

/**
 * Нормализует название книги для сравнения
 */
export function normalizeBookName(value: string): string {
  return value
    .toLowerCase()
    .replace(CYRILLIC_NORMALIZATION_PATTERN, "е")
    .replace(SPECIAL_CHARS_PATTERN, "");
}

/**
 * Смягчает название книги (удаляет префиксы)
 */
export function softenBookName(value: string): string {
  return value.replace(/^ко/u, "").replace(/^к/u, "").replace(/^от/u, "");
}

/**
 * Нормализует текст инципита
 */
export function normalizeIncipitText(value: string): string {
  return value
    .toLowerCase()
    .replace(CYRILLIC_NORMALIZATION_PATTERN, "е")
    .replace(SPECIAL_CHARS_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim();
}

/**
 * Извлекает токены слов из текста
 */
export function extractWordTokens(value: string): string[] {
  const matches = value.match(/[\p{L}\p{N}]+(?:[''-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.map((token) => token.trim()).filter(Boolean) : [];
}

/**
 * Парсит ссылку на стих (Иоанна 3:16)
 */
export function parseReferenceParts(reference: string): ReferenceParseResult {
  const normalized = reference.replace(/\u00A0/g, NBSP_REPLACEMENT).trim();
  const match = normalized.match(
    /^(.*?)(\d+)\s*:\s*(\d+(?:\s*-\s*\d+)?)$/u
  );
  if (!match) return null;

  const bookName = match[1]?.trim() ?? "";
  const chapter = match[2]?.trim() ?? "";
  const verse = (match[3] ?? "").replace(/\s*-\s*/g, "-").trim();

  if (!bookName || !chapter || !verse) return null;

  return {
    bookName,
    chapterVerse: `${chapter}:${verse}`,
  };
}

/**
 * Нормализует ссылку для сравнения
 */
export function normalizeReferenceForComparison(reference: string): string {
  const parsed = parseReferenceParts(reference);
  if (parsed) {
    return `${normalizeBookName(parsed.bookName)}:${parsed.chapterVerse.replace(
      /\s+/g,
      ""
    )}`;
  }

  return reference
    .toLowerCase()
    .replace(CYRILLIC_NORMALIZATION_PATTERN, "е")
    .replace(/[^\p{L}\p{N}:-]+/gu, "")
    .replace(/\s+/g, "");
}

/**
 * Проверяет соответствие ссылки с допуском на ошибки
 */
export function matchesReferenceWithTolerance(
  input: string,
  expected: string,
  maxAllowedDistance: number = 1
): boolean {
  const parsedInput = parseReferenceParts(input);
  const parsedExpected = parseReferenceParts(expected);

  if (!parsedInput || !parsedExpected) {
    return (
      normalizeReferenceForComparison(input) ===
      normalizeReferenceForComparison(expected)
    );
  }

  const inputChapterVerse = parsedInput.chapterVerse
    .replace(/\s+/g, "")
    .replace(/[—–]/g, "-");
  const expectedChapterVerse = parsedExpected.chapterVerse
    .replace(/\s+/g, "")
    .replace(/[—–]/g, "-");

  if (inputChapterVerse !== expectedChapterVerse) return false;

  const inputBook = normalizeBookName(parsedInput.bookName);
  const expectedBook = normalizeBookName(parsedExpected.bookName);
  if (inputBook === expectedBook) return true;

  const inputSoft = softenBookName(inputBook);
  const expectedSoft = softenBookName(expectedBook);
  if (inputSoft === expectedSoft) return true;
  if (!inputSoft || !expectedSoft) return false;

  const distance = levenshteinDistance(inputSoft, expectedSoft);
  const max = Math.max(inputSoft.length, expectedSoft.length);
  const allowed = max >= 10 ? 2 : maxAllowedDistance;

  return distance <= allowed;
}

/**
 * Проверяет соответствие инципита с допуском
 */
export function matchesIncipitWithTolerance(
  input: string,
  expected: string
): boolean {
  return normalizeIncipitText(input) === normalizeIncipitText(expected);
}

/**
 * Парсит главу и стих из ссылки
 */
export function parseReferenceChapterAndVerseStart(reference: string): {
  chapter: number;
  verseStart: number;
} | null {
  const normalized = reference.replace(/\u00A0/g, NBSP_REPLACEMENT).trim();
  const match = normalized.match(
    /^(.*?)(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/u
  );
  if (!match) return null;

  const chapter = Number(match[2]);
  const verseStart = Number(match[3]);

  return Number.isFinite(chapter) && Number.isFinite(verseStart)
    ? { chapter, verseStart }
    : null;
}
