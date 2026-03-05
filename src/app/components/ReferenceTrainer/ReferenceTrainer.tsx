"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, RefreshCcw, Shuffle, XCircle } from "lucide-react";
import type { UserVerse } from "@/api/models/UserVerse";
import {
  fetchReferenceTrainerVerses,
  submitReferenceTrainerSession,
  type ReferenceTrainerSessionOutcome,
  type ReferenceTrainerSessionTrack,
  type ReferenceTrainerSessionUpdate,
} from "@/api/services/referenceTrainer";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Input } from "@/app/components/ui/input";
import { toast } from "@/app/lib/toast";

type ReferenceTrainerProps = {
  telegramId: string | null;
};

type SessionTrack = "reference" | "incipit" | "context" | "mixed";
type SkillTrack = "reference" | "incipit" | "context";

type TrainerModeId =
  | "reference-choice"
  | "book-choice"
  | "reference-type"
  | "incipit-choice"
  | "incipit-tap"
  | "incipit-type"
  | "context-incipit-type"
  | "context-incipit-tap"
  | "context-prefix-type";

type ReferenceVerse = {
  externalVerseId: string;
  text: string;
  reference: string;
  status: DisplayVerseStatus;
  bookName: string;
  chapterVerse: string;
  incipit: string;
  incipitWords: string[];
  referenceScore: number;
  incipitScore: number;
  contextScore: number;
  contextPromptText: string;
  contextPromptReference: string;
};

type TrainerQuestionBase = {
  id: string;
  modeId: TrainerModeId;
  track: SkillTrack;
  modeLabel: string;
  modeHint: string;
  verse: ReferenceVerse;
  prompt: string;
  answerLabel: string;
};

type ChoiceQuestion = TrainerQuestionBase & {
  interaction: "choice";
  options: string[];
  isCorrectOption: (value: string) => boolean;
};

type TypeQuestion = TrainerQuestionBase & {
  interaction: "type";
  placeholder: string;
  maxAttempts: number;
  retryHint?: string;
  isCorrectInput: (value: string) => boolean;
};

type TapQuestionOption = {
  id: string;
  label: string;
  normalized: string;
};

type TapQuestion = TrainerQuestionBase & {
  interaction: "tap";
  options: TapQuestionOption[];
  expectedNormalized: string[];
};

type TrainerQuestion = ChoiceQuestion | TypeQuestion | TapQuestion;

type QuestionResult = {
  track: SkillTrack;
  modeId: TrainerModeId;
  isCorrect: boolean;
};

type ModeStrategy = {
  id: TrainerModeId;
  track: SkillTrack;
  label: string;
  hint: string;
  weight: number;
  canBuild: (verse: ReferenceVerse, pool: ReferenceVerse[]) => boolean;
  buildQuestion: (
    verse: ReferenceVerse,
    pool: ReferenceVerse[],
    order: number
  ) => TrainerQuestion | null;
};

const TRACK_STORAGE_KEY = "bible-memory.reference-trainer.track.v1";
const REFERENCE_OPTIONS_COUNT = 4;
const BOOK_OPTIONS_COUNT = 4;
const INCIPIT_OPTIONS_COUNT = 4;
const INCIPIT_TAP_DISTRACTORS_COUNT = 2;
const SESSION_TARGET_VERSES = 12;
const MAX_TYPING_ATTEMPTS = 2;
const REFERENCE_TRAINER_POOL_LIMIT = 12;
const MIXED_TRACK_WEIGHT_MIN = 5;
const MIXED_TRACK_WEIGHT_BASE = 110;
const TYPE_INPUT_SIMILARITY_THRESHOLD = 0.8;
const TYPE_INPUT_READY_RATIO = 0.8;
const TYPE_PREFIX_READY_RATIO = 0.8;

const TRACK_META: Record<SessionTrack, { label: string; shortLabel: string }> = {
  reference: { label: "Ссылки", shortLabel: "Ссылки" },
  incipit: { label: "Начало стиха", shortLabel: "Начало" },
  context: { label: "Контекст", shortLabel: "Контекст" },
  mixed: { label: "Смешанный", shortLabel: "Микс" },
};

function randomFloat() {
  if (typeof window !== "undefined") {
    const maybeCrypto = window.crypto;
    if (maybeCrypto?.getRandomValues) {
      const values = new Uint32Array(1);
      maybeCrypto.getRandomValues(values);
      return values[0] / 4294967296;
    }
  }
  return Math.random();
}

function randomInt(max: number) {
  if (max <= 0) return 0;
  return Math.floor(randomFloat() * max);
}

function clampSkillScore(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function shuffle<T>(source: T[]) {
  const next = [...source];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function normalizeBookName(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function softenBookName(value: string) {
  return value.replace(/^ко/u, "").replace(/^к/u, "").replace(/^от/u, "");
}

function normalizeIncipitText(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractWordTokens(value: string): string[] {
  const matches = value.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
  return matches ? matches.map((token) => token.trim()).filter(Boolean) : [];
}

function levenshteinDistance(left: string, right: string) {
  const source = Array.from(left);
  const target = Array.from(right);

  if (source.length === 0) return target.length;
  if (target.length === 0) return source.length;

  let prev = Array.from({ length: target.length + 1 }, (_, index) => index);

  for (let i = 1; i <= source.length; i += 1) {
    const curr: number[] = [i];
    for (let j = 1; j <= target.length; j += 1) {
      const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + substitutionCost
      );
    }
    prev = curr;
  }

  return prev[target.length] ?? 0;
}

function parseReferenceParts(reference: string): {
  bookName: string;
  chapterVerse: string;
} | null {
  const normalized = reference.replace(/\u00A0/g, " ").trim();
  const match = normalized.match(/^(.*?)(\d+)\s*:\s*(\d+(?:\s*-\s*\d+)?)$/u);
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

function normalizeReferenceForComparison(reference: string) {
  const parsed = parseReferenceParts(reference);
  if (parsed) {
    return `${normalizeBookName(parsed.bookName)}:${parsed.chapterVerse.replace(/\s+/g, "")}`;
  }

  return reference
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}:-]+/gu, "")
    .replace(/\s+/g, "");
}

function matchesReferenceWithTolerance(input: string, expected: string) {
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
  const maxLength = Math.max(inputSoft.length, expectedSoft.length);
  const maxAllowedDistance = maxLength >= 10 ? 2 : 1;

  return distance <= maxAllowedDistance;
}

function matchesIncipitWithTolerance(input: string, expected: string) {
  const evaluation = evaluateIncipitInput(input, expected);
  return evaluation.isCorrect;
}

type TypeInputEvaluation = {
  isCorrect: boolean;
  acceptedWithTolerance: boolean;
};

type TypeInputReadiness = {
  canSubmit: boolean;
  remainingChars: number;
};

function getSimilarityRatio(left: string, right: string): number {
  const leftLength = Array.from(left).length;
  const rightLength = Array.from(right).length;
  const maxLength = Math.max(leftLength, rightLength);
  if (maxLength === 0) return 1;
  const distance = levenshteinDistance(left, right);
  return Math.max(0, 1 - distance / maxLength);
}

function getExpectedWordPrefixMatch(input: string, expected: string): boolean {
  const expectedTokens = expected.split(" ").filter(Boolean);
  const inputTokens = input.split(" ").filter(Boolean);
  if (expectedTokens.length === 0 || inputTokens.length < expectedTokens.length) {
    return false;
  }
  return expectedTokens.every((token, index) => inputTokens[index] === token);
}

function evaluateIncipitInput(input: string, expected: string): TypeInputEvaluation {
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

  const similarity = getSimilarityRatio(normalizedInput, normalizedExpected);
  if (similarity >= TYPE_INPUT_SIMILARITY_THRESHOLD) {
    return { isCorrect: true, acceptedWithTolerance: true };
  }

  return { isCorrect: false, acceptedWithTolerance: false };
}

function hasContextPrompt(verse: ReferenceVerse): boolean {
  return verse.contextPromptText.trim().length > 0;
}

function buildContextPrompt(verse: ReferenceVerse): string {
  const promptText = verse.contextPromptText.trim();
  const promptReference = verse.contextPromptReference.trim();
  if (!promptText) return "";
  if (!promptReference) return promptText;
  // return `${promptReference}\n${promptText}`;
  return `${promptText}`;
}

function getContextPrefixTokens(verse: ReferenceVerse): string[] {
  return verse.incipitWords
    .map((word) => normalizeIncipitText(word))
    .filter(Boolean)
    .map((word) => Array.from(word)[0] ?? "")
    .filter(Boolean);
}

function matchesContextPrefixInput(input: string, expectedTokens: string[]): boolean {
  return evaluateContextPrefixInput(input, expectedTokens).isCorrect;
}

function evaluateContextPrefixInput(
  input: string,
  expectedTokens: string[]
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

  const similarity = getSimilarityRatio(joinedInput, joinedExpected);
  if (similarity >= TYPE_INPUT_SIMILARITY_THRESHOLD) {
    return { isCorrect: true, acceptedWithTolerance: true };
  }

  return { isCorrect: false, acceptedWithTolerance: false };
}

function getTypeInputReadiness(
  question: TypeQuestion | null,
  input: string
): TypeInputReadiness {
  const raw = input.trim();
  if (!question || raw.length === 0) {
    return { canSubmit: false, remainingChars: 0 };
  }

  if (question.modeId === "reference-type") {
    return { canSubmit: true, remainingChars: 0 };
  }

  if (question.modeId === "context-prefix-type") {
    const expected = getContextPrefixTokens(question.verse).join("");
    const normalizedInput = normalizeIncipitText(raw).replace(/\s+/g, "");
    const expectedLength = Array.from(expected).length;
    if (expectedLength === 0) return { canSubmit: true, remainingChars: 0 };

    const minLength = Math.max(
      1,
      Math.ceil(expectedLength * TYPE_PREFIX_READY_RATIO)
    );
    const inputLength = Array.from(normalizedInput).length;
    const remainingChars = Math.max(0, minLength - inputLength);
    return { canSubmit: remainingChars === 0, remainingChars };
  }

  const expected = normalizeIncipitText(question.verse.incipit);
  const normalizedInput = normalizeIncipitText(raw);
  const expectedLength = Array.from(expected).length;
  if (expectedLength === 0) return { canSubmit: true, remainingChars: 0 };

  const minLength = Math.max(1, Math.ceil(expectedLength * TYPE_INPUT_READY_RATIO));
  const inputLength = Array.from(normalizedInput).length;
  const remainingChars = Math.max(0, minLength - inputLength);
  return { canSubmit: remainingChars === 0, remainingChars };
}

function evaluateTypeInput(
  question: TypeQuestion,
  input: string
): TypeInputEvaluation {
  if (question.modeId === "incipit-type" || question.modeId === "context-incipit-type") {
    return evaluateIncipitInput(input, question.verse.incipit);
  }

  if (question.modeId === "context-prefix-type") {
    return evaluateContextPrefixInput(input, getContextPrefixTokens(question.verse));
  }

  return {
    isCorrect: question.isCorrectInput(input),
    acceptedWithTolerance: false,
  };
}

function readStoredTrack(): SessionTrack {
  if (typeof window === "undefined") return "mixed";
  try {
    const value = window.localStorage.getItem(TRACK_STORAGE_KEY);
    if (
      value === "reference" ||
      value === "incipit" ||
      value === "context" ||
      value === "mixed"
    ) {
      return value;
    }
  } catch {
    // ignore storage errors
  }
  return "mixed";
}

function writeStoredTrack(track: SessionTrack) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRACK_STORAGE_KEY, track);
  } catch {
    // ignore storage errors
  }
}

function mapUserVerseToReferenceVerse(verse: UserVerse): ReferenceVerse | null {
  const text = String(verse.text ?? "").trim();
  const reference = String(verse.reference ?? verse.externalVerseId ?? "").trim();
  if (!text || !reference) return null;

  const parsedReference = parseReferenceParts(reference);
  const words = extractWordTokens(text);
  const incipitLength =
    words.length >= 4 ? 4 : words.length >= 3 ? 3 : words.length;
  const incipitWords = words.slice(0, incipitLength);
  const rawVerse = verse as Record<string, unknown>;
  const contextPromptText = String(rawVerse.contextPromptText ?? "").trim();
  const contextPromptReference = String(rawVerse.contextPromptReference ?? "").trim();

  return {
    externalVerseId: verse.externalVerseId,
    text,
    reference,
    status: normalizeDisplayVerseStatus(verse.status),
    bookName: parsedReference?.bookName ?? "",
    chapterVerse: parsedReference?.chapterVerse ?? "",
    incipit: incipitWords.join(" "),
    incipitWords,
    referenceScore: clampSkillScore(rawVerse.referenceScore as number | undefined),
    incipitScore: clampSkillScore(rawVerse.incipitScore as number | undefined),
    contextScore: clampSkillScore(rawVerse.contextScore as number | undefined),
    contextPromptText,
    contextPromptReference,
  };
}

function getRevealedVerseText(question: TrainerQuestion | null): string {
  if (!question) return "";
  const reference = question.verse.reference.trim();
  const text = question.verse.text.trim();
  if (reference && text) return `${reference}\n${text}`;
  if (text) return text;
  if (reference) return reference;
  return question.answerLabel;
}

function buildReferenceChoiceQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number
): ChoiceQuestion | null {
  const normalizedCorrect = normalizeReferenceForComparison(verse.reference);
  const distractors = shuffle(
    pool
      .map((item) => item.reference)
      .filter(
        (candidate) =>
          normalizeReferenceForComparison(candidate) !== normalizedCorrect
      )
  );

  if (distractors.length < REFERENCE_OPTIONS_COUNT - 1) return null;

  const options = shuffle([
    verse.reference,
    ...distractors.slice(0, REFERENCE_OPTIONS_COUNT - 1),
  ]);

  return {
    id: `reference-choice-${order}-${verse.externalVerseId}`,
    modeId: "reference-choice",
    track: "reference",
    modeLabel: "Выбор ссылки",
    modeHint: "Выберите правильную ссылку.",
    verse,
    prompt: verse.text,
    answerLabel: verse.reference,
    interaction: "choice",
    options,
    isCorrectOption: (value: string) =>
      normalizeReferenceForComparison(value) === normalizedCorrect,
  };
}

function buildBookChoiceQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number
): ChoiceQuestion | null {
  if (!verse.bookName) return null;

  const uniqueBooks = Array.from(
    new Map(
      pool
        .map((item) => item.bookName)
        .filter(Boolean)
        .map((book) => [normalizeBookName(book), book])
    ).values()
  );

  const distractorBooks = shuffle(
    uniqueBooks.filter(
      (book) => normalizeBookName(book) !== normalizeBookName(verse.bookName)
    )
  );
  if (distractorBooks.length < BOOK_OPTIONS_COUNT - 1) return null;

  const normalizedCorrect = normalizeBookName(verse.bookName);

  return {
    id: `book-choice-${order}-${verse.externalVerseId}`,
    modeId: "book-choice",
    track: "reference",
    modeLabel: "Выбор книги",
    modeHint: "Выберите правильную книгу.",
    verse,
    prompt: verse.text,
    answerLabel: verse.bookName,
    interaction: "choice",
    options: shuffle([
      verse.bookName,
      ...distractorBooks.slice(0, BOOK_OPTIONS_COUNT - 1),
    ]),
    isCorrectOption: (value: string) =>
      normalizeBookName(value) === normalizedCorrect,
  };
}

function buildReferenceTypeQuestion(
  verse: ReferenceVerse,
  order: number
): TypeQuestion {
  return {
    id: `reference-type-${order}-${verse.externalVerseId}`,
    modeId: "reference-type",
    track: "reference",
    modeLabel: "Ввод ссылки",
    modeHint: "Введите ссылку вручную.",
    verse,
    prompt: verse.text,
    answerLabel: verse.reference,
    interaction: "type",
    placeholder: "Например: Иоанна 3:16",
    maxAttempts: MAX_TYPING_ATTEMPTS,
    retryHint: `${verse.bookName} ${verse.chapterVerse}`.trim(),
    isCorrectInput: (value: string) =>
      matchesReferenceWithTolerance(value, verse.reference),
  };
}

function buildIncipitChoiceQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number
): ChoiceQuestion | null {
  if (verse.incipitWords.length < 2) return null;
  const normalizedCorrect = normalizeIncipitText(verse.incipit);

  const distractors = shuffle(
    pool
      .map((item) => item.incipit)
      .filter((candidate) => candidate.trim().length > 0)
      .filter(
        (candidate) => normalizeIncipitText(candidate) !== normalizedCorrect
      )
  );

  if (distractors.length < INCIPIT_OPTIONS_COUNT - 1) return null;

  return {
    id: `incipit-choice-${order}-${verse.externalVerseId}`,
    modeId: "incipit-choice",
    track: "incipit",
    modeLabel: "Выбор начала",
    modeHint: "Выберите правильное начало стиха.",
    verse,
    prompt: verse.reference,
    answerLabel: verse.incipit,
    interaction: "choice",
    options: shuffle([
      verse.incipit,
      ...distractors.slice(0, INCIPIT_OPTIONS_COUNT - 1),
    ]),
    isCorrectOption: (value: string) =>
      normalizeIncipitText(value) === normalizedCorrect,
  };
}

function buildIncipitTapQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number
): TapQuestion | null {
  if (verse.incipitWords.length < 2) return null;

  const expectedNormalized = verse.incipitWords.map((word) =>
    normalizeIncipitText(word)
  );
  const expectedSet = new Set(expectedNormalized);
  const distractorCandidates = Array.from(
    new Map(
      pool
        .flatMap((item) => item.incipitWords)
        .filter((word) => word.trim().length > 0)
        .filter((word) => !expectedSet.has(normalizeIncipitText(word)))
        .map((word) => [normalizeIncipitText(word), word])
    ).values()
  );

  const distractors = shuffle(distractorCandidates).slice(
    0,
    INCIPIT_TAP_DISTRACTORS_COUNT
  );

  const options = shuffle([...verse.incipitWords, ...distractors]).map(
    (word, index) => ({
      id: `incipit-tap-${order}-${index}`,
      label: word,
      normalized: normalizeIncipitText(word),
    })
  );

  return {
    id: `incipit-tap-${order}-${verse.externalVerseId}`,
    modeId: "incipit-tap",
    track: "incipit",
    modeLabel: "Сборка слов",
    modeHint: "Соберите начало стиха по словам.",
    verse,
    prompt: verse.reference,
    answerLabel: verse.incipit,
    interaction: "tap",
    options,
    expectedNormalized,
  };
}

function buildIncipitTypeQuestion(
  verse: ReferenceVerse,
  order: number
): TypeQuestion | null {
  if (verse.incipitWords.length < 2) return null;
  const initials = verse.incipitWords
    .map((word) => Array.from(normalizeIncipitText(word))[0] ?? "")
    .filter(Boolean)
    .join(" ");

  return {
    id: `incipit-type-${order}-${verse.externalVerseId}`,
    modeId: "incipit-type",
    track: "incipit",
    modeLabel: "Ввод начала",
    modeHint: "Введите первые слова стиха.",
    verse,
    prompt: verse.reference,
    answerLabel: verse.incipit,
    interaction: "type",
    placeholder: "Напишите начало стиха",
    maxAttempts: MAX_TYPING_ATTEMPTS,
    retryHint: initials ? `Первые буквы: ${initials}` : undefined,
    isCorrectInput: (value: string) =>
      matchesIncipitWithTolerance(value, verse.incipit),
  };
}

function buildContextIncipitTypeQuestion(
  verse: ReferenceVerse,
  order: number
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
    track: "context",
    modeLabel: "Отгадай стих по контексту",
    modeHint: "О каком стихе идет речь? Введите начало стиха по контексту.",
    verse,
    prompt,
    answerLabel: verse.incipit,
    interaction: "type",
    placeholder: "Введите начало стиха",
    maxAttempts: MAX_TYPING_ATTEMPTS,
    retryHint: initials ? `Первые буквы: ${initials}` : undefined,
    isCorrectInput: (value: string) =>
      matchesIncipitWithTolerance(value, verse.incipit),
  };
}

function buildContextIncipitTapQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number
): TapQuestion | null {
  if (!hasContextPrompt(verse)) return null;
  if (verse.incipitWords.length < 2) return null;

  const prompt = buildContextPrompt(verse);
  if (!prompt) return null;

  const expectedNormalized = verse.incipitWords.map((word) =>
    normalizeIncipitText(word)
  );
  const expectedSet = new Set(expectedNormalized);
  const distractorCandidates = Array.from(
    new Map(
      pool
        .flatMap((item) => item.incipitWords)
        .filter((word) => word.trim().length > 0)
        .filter((word) => !expectedSet.has(normalizeIncipitText(word)))
        .map((word) => [normalizeIncipitText(word), word])
    ).values()
  );

  const distractors = shuffle(distractorCandidates).slice(
    0,
    INCIPIT_TAP_DISTRACTORS_COUNT
  );

  const options = shuffle([...verse.incipitWords, ...distractors]).map(
    (word, index) => ({
      id: `context-incipit-tap-${order}-${index}`,
      label: word,
      normalized: normalizeIncipitText(word),
    })
  );

  return {
    id: `context-incipit-tap-${order}-${verse.externalVerseId}`,
    modeId: "context-incipit-tap",
    track: "context",
    modeLabel: "Контекст: сборка слов",
    modeHint: "О каком стихе идет речь? Соберите начало стиха по контексту.",
    verse,
    prompt,
    answerLabel: verse.incipit,
    interaction: "tap",
    options,
    expectedNormalized,
  };
}

function buildContextPrefixTypeQuestion(
  verse: ReferenceVerse,
  order: number
): TypeQuestion | null {
  if (!hasContextPrompt(verse)) return null;

  const prompt = buildContextPrompt(verse);
  if (!prompt) return null;

  const prefixTokens = getContextPrefixTokens(verse);
  if (prefixTokens.length === 0) return null;
  const uppercasePrefix = prefixTokens.join(" ").toUpperCase();

  return {
    id: `context-prefix-type-${order}-${verse.externalVerseId}`,
    modeId: "context-prefix-type",
    track: "context",
    modeLabel: "Контекст: первые буквы",
    modeHint: "О каком стихе идет речь? Введите первые буквы начала стиха.",
    verse,
    prompt,
    answerLabel: uppercasePrefix,
    interaction: "type",
    placeholder: "Например: ИТВБМ...",
    maxAttempts: MAX_TYPING_ATTEMPTS,
    retryHint: `Формат: ${uppercasePrefix}`,
    isCorrectInput: (value: string) =>
      matchesContextPrefixInput(value, prefixTokens),
  };
}

const MODE_STRATEGIES: ReadonlyArray<ModeStrategy> = [
  {
    id: "reference-choice",
    track: "reference",
    label: "Выбор ссылки",
    hint: "Выберите правильную ссылку.",
    weight: 2,
    canBuild: (verse, pool) => buildReferenceChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) => buildReferenceChoiceQuestion(verse, pool, order),
  },
  {
    id: "book-choice",
    track: "reference",
    label: "Выбор книги",
    hint: "Выберите правильную книгу.",
    weight: 1,
    canBuild: (verse, pool) => buildBookChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) => buildBookChoiceQuestion(verse, pool, order),
  },
  {
    id: "reference-type",
    track: "reference",
    label: "Ввод ссылки",
    hint: "Введите ссылку вручную.",
    weight: 2,
    canBuild: () => true,
    buildQuestion: (verse, _pool, order) => buildReferenceTypeQuestion(verse, order),
  },
  {
    id: "incipit-choice",
    track: "incipit",
    label: "Выбор начала",
    hint: "Выберите правильное начало стиха.",
    weight: 2,
    canBuild: (verse, pool) => buildIncipitChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) => buildIncipitChoiceQuestion(verse, pool, order),
  },
  {
    id: "incipit-tap",
    track: "incipit",
    label: "Сборка слов",
    hint: "Соберите начало стиха по словам.",
    weight: 1,
    canBuild: (verse, pool) => buildIncipitTapQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) => buildIncipitTapQuestion(verse, pool, order),
  },
  {
    id: "incipit-type",
    track: "incipit",
    label: "Ввод начала",
    hint: "Введите первые слова стиха.",
    weight: 2,
    canBuild: (verse, _pool) => buildIncipitTypeQuestion(verse, -1) !== null,
    buildQuestion: (verse, _pool, order) => buildIncipitTypeQuestion(verse, order),
  },
  {
    id: "context-incipit-type",
    track: "context",
    label: "Контекст: ввод начала",
    hint: "О каком стихе идет речь? Введите начало стиха по контексту.",
    weight: 2,
    canBuild: (verse, _pool) => buildContextIncipitTypeQuestion(verse, -1) !== null,
    buildQuestion: (verse, _pool, order) => buildContextIncipitTypeQuestion(verse, order),
  },
  {
    id: "context-incipit-tap",
    track: "context",
    label: "Контекст: сборка слов",
    hint: "О каком стихе идет речь? Соберите начало стиха по контексту.",
    weight: 1,
    canBuild: (verse, pool) => buildContextIncipitTapQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) => buildContextIncipitTapQuestion(verse, pool, order),
  },
  {
    id: "context-prefix-type",
    track: "context",
    label: "Контекст: первые буквы",
    hint: "О каком стихе идет речь? Введите первые буквы начала стиха.",
    weight: 1,
    canBuild: (verse, _pool) => buildContextPrefixTypeQuestion(verse, -1) !== null,
    buildQuestion: (verse, _pool, order) => buildContextPrefixTypeQuestion(verse, order),
  },
];

function pickWeightedStrategy(strategies: ReadonlyArray<ModeStrategy>) {
  const totalWeight = strategies.reduce(
    (sum, strategy) => sum + Math.max(1, strategy.weight),
    0
  );
  let cursor = randomFloat() * totalWeight;
  for (const strategy of strategies) {
    cursor -= Math.max(1, strategy.weight);
    if (cursor <= 0) return strategy;
  }
  return strategies[strategies.length - 1] ?? null;
}

function resolveMixedTrack(verse: ReferenceVerse): SkillTrack {
  const weightedTracks: Array<{ track: SkillTrack; weight: number }> = [
    {
      track: "reference",
      weight: Math.max(MIXED_TRACK_WEIGHT_MIN, MIXED_TRACK_WEIGHT_BASE - verse.referenceScore),
    },
    {
      track: "incipit",
      weight: Math.max(MIXED_TRACK_WEIGHT_MIN, MIXED_TRACK_WEIGHT_BASE - verse.incipitScore),
    },
    {
      track: "context",
      weight: Math.max(MIXED_TRACK_WEIGHT_MIN, MIXED_TRACK_WEIGHT_BASE - verse.contextScore),
    },
  ];

  const totalWeight = weightedTracks.reduce((sum, item) => sum + item.weight, 0);
  let cursor = randomFloat() * totalWeight;

  for (const item of weightedTracks) {
    cursor -= item.weight;
    if (cursor <= 0) return item.track;
  }

  return weightedTracks[weightedTracks.length - 1]?.track ?? "reference";
}

function buildQuestionForTrack(params: {
  track: SkillTrack;
  verse: ReferenceVerse;
  pool: ReferenceVerse[];
  order: number;
  previousModeId: TrainerModeId | null;
}): TrainerQuestion | null {
  const { track, verse, pool, order, previousModeId } = params;
  const allStrategies = MODE_STRATEGIES.filter(
    (strategy) => strategy.track === track && strategy.canBuild(verse, pool)
  );
  if (allStrategies.length === 0) return null;

  const candidateStrategies =
    previousModeId &&
    allStrategies.some((strategy) => strategy.id !== previousModeId)
      ? allStrategies.filter((strategy) => strategy.id !== previousModeId)
      : allStrategies;

  const remaining = [...candidateStrategies];
  while (remaining.length > 0) {
    const picked = pickWeightedStrategy(remaining);
    if (!picked) break;
    const question = picked.buildQuestion(verse, pool, order);
    if (question) return question;
    const pickedIndex = remaining.findIndex((strategy) => strategy.id === picked.id);
    if (pickedIndex >= 0) remaining.splice(pickedIndex, 1);
  }

  return null;
}

function buildRandomSessionQuestions(
  pool: ReferenceVerse[],
  sessionTrack: SessionTrack
): TrainerQuestion[] {
  if (pool.length === 0) return [];

  const uniquePool = Array.from(
    new Map(pool.map((verse) => [verse.externalVerseId, verse] as const)).values()
  );
  const verseOrder = shuffle(uniquePool);
  const targetQuestionCount = Math.min(SESSION_TARGET_VERSES, verseOrder.length);

  const questions: TrainerQuestion[] = [];
  let previousModeId: TrainerModeId | null = null;

  for (const verse of verseOrder) {
    if (questions.length >= targetQuestionCount) break;

    const order = questions.length;
    let question: TrainerQuestion | null = null;

    if (sessionTrack === "mixed") {
      const preferredTrack = resolveMixedTrack(verse);
      question = buildQuestionForTrack({
        track: preferredTrack,
        verse,
        pool: uniquePool,
        order,
        previousModeId,
      });

      if (!question) {
        const fallbackTracks = shuffle(
          (["reference", "incipit", "context"] as const).filter(
            (track) => track !== preferredTrack
          )
        );

        for (const fallbackTrack of fallbackTracks) {
          question = buildQuestionForTrack({
            track: fallbackTrack,
            verse,
            pool: uniquePool,
            order,
            previousModeId,
          });
          if (question) break;
        }
      }
    } else {
      question = buildQuestionForTrack({
        track: sessionTrack,
        verse,
        pool: uniquePool,
        order,
        previousModeId,
      });
    }

    if (!question) continue;

    questions.push(question);
    previousModeId = question.modeId;
  }

  return questions;
}

function getResultCaption(percent: number) {
  if (percent >= 90) return "Отличная точность. Якоря закрепляются уверенно.";
  if (percent >= 70) return "Хороший результат. Ещё одна сессия усилит запоминание.";
  return "Нужна дополнительная практика. Попробуйте новый микс режимов.";
}

function getChoiceStateClass(params: {
  isAnswered: boolean;
  optionIsCorrect: boolean;
  optionIsSelected: boolean;
}) {
  if (!params.isAnswered) {
    return "border-border/70 bg-background text-foreground/80 hover:bg-muted/45";
  }
  if (params.optionIsCorrect) {
    return "border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (params.optionIsSelected) {
    return "border-destructive/45 bg-destructive/10 text-destructive";
  }
  return "border-border/70 bg-background text-foreground/80";
}

function mergeUpdatedSkillScores(
  pool: ReferenceVerse[],
  updated: Array<{
    externalVerseId: string;
    referenceScore: number;
    incipitScore: number;
    contextScore: number;
  }>
) {
  const map = new Map(
    updated.map((item) => [item.externalVerseId, item] as const)
  );
  return pool.map((verse) => {
    const next = map.get(verse.externalVerseId);
    if (!next) return verse;
    return {
      ...verse,
      referenceScore: clampSkillScore(next.referenceScore),
      incipitScore: clampSkillScore(next.incipitScore),
      contextScore: clampSkillScore(next.contextScore),
    };
  });
}

export function ReferenceTrainer({ telegramId }: ReferenceTrainerProps) {
  const { viewportHeight } = useTelegramSafeArea();
  const initializedTelegramIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const savedSessionKeyRef = useRef<string | null>(null);

  const [selectedTrack, setSelectedTrack] = useState<SessionTrack>(() =>
    readStoredTrack()
  );
  const [sessionTrack, setSessionTrack] = useState<SessionTrack>(() =>
    readStoredTrack()
  );
  const [visualViewportHeight, setVisualViewportHeight] = useState(0);
  const [versePool, setVersePool] = useState<ReferenceVerse[]>([]);
  const [questions, setQuestions] = useState<TrainerQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [sessionUpdates, setSessionUpdates] = useState<
    ReferenceTrainerSessionUpdate[]
  >([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typingAttempts, setTypingAttempts] = useState(0);
  const [tapSequence, setTapSequence] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [lastAnswerUsedTolerance, setLastAnswerUsedTolerance] = useState(false);
  const [lastAnswerForgotten, setLastAnswerForgotten] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    writeStoredTrack(selectedTrack);
  }, [selectedTrack]);

  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const answeredCount = results.length;
  const correctCount = useMemo(
    () => results.filter((result) => result.isCorrect).length,
    [results]
  );
  const sessionComplete = questions.length > 0 && answeredCount >= questions.length;
  const progressValue =
    questions.length > 0
      ? Math.round(
          (Math.min(answeredCount, questions.length) / questions.length) * 100
        )
      : 0;
  const resultPercent =
    questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const referenceStats = useMemo(() => {
    const trackResults = results.filter((item) => item.track === "reference");
    const total = trackResults.length;
    const correct = trackResults.filter((item) => item.isCorrect).length;
    return { total, correct };
  }, [results]);

  const incipitStats = useMemo(() => {
    const trackResults = results.filter((item) => item.track === "incipit");
    const total = trackResults.length;
    const correct = trackResults.filter((item) => item.isCorrect).length;
    return { total, correct };
  }, [results]);

  const contextStats = useMemo(() => {
    const trackResults = results.filter((item) => item.track === "context");
    const total = trackResults.length;
    const correct = trackResults.filter((item) => item.isCorrect).length;
    return { total, correct };
  }, [results]);

  const frameHeight = useMemo(() => {
    if (viewportHeight <= 0) return undefined;
    const availableHeight =
      isKeyboardVisible && visualViewportHeight > 0
        ? visualViewportHeight
        : viewportHeight;
    const reservedSpace = isKeyboardVisible ? 120 : 200;
    return Math.max(240, availableHeight - reservedSpace);
  }, [isKeyboardVisible, viewportHeight, visualViewportHeight]);

  const resetAnswerState = useCallback(() => {
    setSelectedOption(null);
    setTypedAnswer("");
    setTypingAttempts(0);
    setTapSequence([]);
    setIsAnswered(false);
    setLastAnswerCorrect(null);
    setLastAnswerUsedTolerance(false);
    setLastAnswerForgotten(false);
  }, []);

  const startSessionFromPool = useCallback(
    (pool: ReferenceVerse[], nextTrack?: SessionTrack) => {
      const effectiveTrack = nextTrack ?? selectedTrack;
      const nextQuestions = buildRandomSessionQuestions(pool, effectiveTrack);
      setQuestions(nextQuestions);
      setCurrentQuestionIndex(0);
      setResults([]);
      setSessionUpdates([]);
      setSessionTrack(effectiveTrack);
      savedSessionKeyRef.current = null;
      resetAnswerState();
    },
    [resetAnswerState, selectedTrack]
  );

  const loadVersePool = useCallback(
    async (telegramIdValue: string, options?: { silent?: boolean }) => {
      const isSilent = options?.silent === true;
      setErrorMessage(null);
      if (isSilent) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const verses = await fetchReferenceTrainerVerses(telegramIdValue, {
          limit: REFERENCE_TRAINER_POOL_LIMIT,
        });
        const merged = verses
          .map(mapUserVerseToReferenceVerse)
          .filter((verse): verse is ReferenceVerse => verse !== null);
        setVersePool(merged);
        startSessionFromPool(merged, selectedTrack);
      } catch (error) {
        console.error("Не удалось загрузить стихи для раздела опор:", error);
        setErrorMessage("Не удалось загрузить стихи для тренировки опор.");
        toast.error("Не удалось загрузить раздел «Якоря»", {
          description: "Проверьте соединение и попробуйте снова.",
        });
      } finally {
        if (isSilent) setIsRefreshing(false);
        else setIsLoading(false);
      }
    },
    [selectedTrack, startSessionFromPool]
  );

  useEffect(() => {
    if (!telegramId) {
      initializedTelegramIdRef.current = null;
      setVersePool([]);
      setQuestions([]);
      setResults([]);
      setSessionUpdates([]);
      setErrorMessage(null);
      return;
    }
    if (initializedTelegramIdRef.current === telegramId) return;
    initializedTelegramIdRef.current = telegramId;
    void loadVersePool(telegramId);
  }, [loadVersePool, telegramId]);

  const persistSessionUpdates = useCallback(
    async (
      updates: ReferenceTrainerSessionUpdate[],
      activeTrack: SessionTrack
    ) => {
      if (!telegramId || updates.length === 0) return;
      setIsSavingSession(true);

      const doSubmit = async () =>
        submitReferenceTrainerSession({
          telegramId,
          sessionTrack: activeTrack as ReferenceTrainerSessionTrack,
          updates,
        });

      try {
        let response:
          | {
              updated: Array<{
                externalVerseId: string;
                referenceScore: number;
                incipitScore: number;
                contextScore: number;
              }>;
            }
          | null = null;

        try {
          response = await doSubmit();
        } catch (firstError) {
          console.warn("Session save failed, retrying once:", firstError);
          response = await doSubmit();
        }

        setVersePool((prev) => mergeUpdatedSkillScores(prev, response.updated));
      } catch (error) {
        console.error("Не удалось сохранить прогресс сессии опор:", error);
        toast.error("Прогресс по навыкам не сохранён", {
          description: "Попробуйте обновить раздел и повторить сессию.",
        });
      } finally {
        setIsSavingSession(false);
      }
    },
    [telegramId]
  );

  const sessionKey = useMemo(
    () => questions.map((question) => question.id).join("|"),
    [questions]
  );

  useEffect(() => {
    if (!telegramId || !sessionComplete || sessionUpdates.length === 0 || !sessionKey) {
      return;
    }
    if (savedSessionKeyRef.current === sessionKey) return;
    savedSessionKeyRef.current = sessionKey;
    void persistSessionUpdates(sessionUpdates, sessionTrack);
  }, [
    persistSessionUpdates,
    sessionComplete,
    sessionKey,
    sessionTrack,
    sessionUpdates,
    telegramId,
  ]);

  const finalizeAnswer = useCallback(
    (
      isCorrect: boolean,
      attemptsUsed: number,
      options?: { acceptedWithTolerance?: boolean; forgotten?: boolean }
    ) => {
      if (!currentQuestion || isAnswered) return;
      const outcome: ReferenceTrainerSessionOutcome = isCorrect
        ? attemptsUsed <= 1
          ? "correct_first"
          : "correct_retry"
        : "wrong";

      setIsAnswered(true);
      setLastAnswerCorrect(isCorrect);
      setLastAnswerUsedTolerance(Boolean(isCorrect && options?.acceptedWithTolerance));
      setLastAnswerForgotten(Boolean(options?.forgotten));
      setResults((prev) => [
        ...prev,
        {
          track: currentQuestion.track,
          modeId: currentQuestion.modeId,
          isCorrect,
        },
      ]);
      setSessionUpdates((prev) => [
        ...prev,
        {
          externalVerseId: currentQuestion.verse.externalVerseId,
          track: currentQuestion.track,
          outcome,
        },
      ]);
    },
    [currentQuestion, isAnswered]
  );

  const handleChoiceSelect = (value: string) => {
    if (!currentQuestion || currentQuestion.interaction !== "choice") return;
    if (isAnswered || sessionComplete) return;
    setSelectedOption(value);
    finalizeAnswer(currentQuestion.isCorrectOption(value), 1);
  };

  const handleTapSelect = (optionId: string) => {
    if (!currentQuestion || currentQuestion.interaction !== "tap") return;
    if (isAnswered || sessionComplete) return;
    if (tapSequence.includes(optionId)) return;

    const option = currentQuestion.options.find((item) => item.id === optionId);
    if (!option) return;

    const nextSequence = [...tapSequence, optionId];
    setTapSequence(nextSequence);

    const expectedIndex = nextSequence.length - 1;
    const expectedValue = currentQuestion.expectedNormalized[expectedIndex];
    if (option.normalized !== expectedValue) {
      finalizeAnswer(false, 1);
      return;
    }

    if (nextSequence.length >= currentQuestion.expectedNormalized.length) {
      finalizeAnswer(true, 1);
    }
  };

  const handleTypeSubmit = () => {
    if (!currentQuestion || currentQuestion.interaction !== "type") return;
    if (isAnswered || sessionComplete) return;

    const input = typedAnswer.trim();
    if (!input) return;
    const readiness = getTypeInputReadiness(currentQuestion, input);
    if (!readiness.canSubmit) return;

    const nextAttempt = typingAttempts + 1;
    setTypingAttempts(nextAttempt);

    const evaluation = evaluateTypeInput(currentQuestion, input);
    if (evaluation.isCorrect) {
      finalizeAnswer(true, nextAttempt, {
        acceptedWithTolerance: evaluation.acceptedWithTolerance,
      });
      return;
    }

    if (nextAttempt >= currentQuestion.maxAttempts) {
      finalizeAnswer(false, nextAttempt);
    }
  };

  const handleForgotAnswer = () => {
    if (!currentQuestion) return;
    if (isAnswered || sessionComplete) return;

    const attemptsUsed =
      currentQuestion.interaction === "type" ? currentQuestion.maxAttempts : 1;
    finalizeAnswer(false, attemptsUsed, { forgotten: true });
  };

  const handleMoveNext = () => {
    if (!isAnswered || !currentQuestion) return;
    if (currentQuestionIndex >= questions.length - 1) return;
    setCurrentQuestionIndex((prev) => prev + 1);
    resetAnswerState();
  };

  const handleStartNewSession = () => {
    if (versePool.length === 0) return;
    startSessionFromPool(versePool, selectedTrack);
  };

  const handleTrackSelect = (nextTrack: SessionTrack) => {
    if (nextTrack === selectedTrack) return;
    setSelectedTrack(nextTrack);
    if (versePool.length > 0) {
      startSessionFromPool(versePool, nextTrack);
    }
  };

  const canGoNext =
    isAnswered && currentQuestionIndex < questions.length - 1 && !sessionComplete;
  const isTypeMode = currentQuestion?.interaction === "type";
  const isContextPrefixTypeMode = currentQuestion?.modeId === "context-prefix-type";
  const typeInputReadiness =
    currentQuestion?.interaction === "type"
      ? getTypeInputReadiness(currentQuestion, typedAnswer)
      : null;
  const canSubmitTypeAnswer =
    currentQuestion?.interaction === "type"
      ? typeInputReadiness?.canSubmit === true
      : false;
  const revealedVerseText = getRevealedVerseText(currentQuestion);
  const nextActionLabel = lastAnswerForgotten ? "Продолжить" : "Далее →";

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram?.WebApp;
    const vv = window.visualViewport;

    const handleViewportChange = () => {
      let newHeight: number;
      let keyboardDetected: boolean;

      if (tg?.viewportStableHeight && tg?.viewportHeight) {
        newHeight = tg.viewportHeight;
        keyboardDetected = tg.viewportStableHeight - tg.viewportHeight > 100;
      } else if (vv) {
        newHeight = vv.height;
        keyboardDetected = window.innerHeight - vv.height > 150 && vv.height > 100;
      } else {
        return;
      }

      setVisualViewportHeight(newHeight);
      setIsKeyboardVisible(keyboardDetected);
    };

    handleViewportChange();
    vv?.addEventListener("resize", handleViewportChange);
    tg?.onEvent("viewportChanged", handleViewportChange);
    return () => {
      vv?.removeEventListener("resize", handleViewportChange);
      tg?.offEvent("viewportChanged", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (!isTypeMode || isAnswered) return;
    const t1 = window.setTimeout(
      () => inputRef.current?.focus({ preventScroll: true }),
      50
    );
    const t2 = window.setTimeout(
      () => inputRef.current?.focus({ preventScroll: true }),
      250
    );
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [currentQuestion?.id, isAnswered, isTypeMode]);

  const selectedTapLabels =
    currentQuestion?.interaction === "tap"
      ? tapSequence
          .map((id) => currentQuestion.options.find((option) => option.id === id)?.label)
          .filter((value): value is string => Boolean(value))
      : [];

  return (
    <div className="mx-auto w-full max-w-3xl p-3 sm:p-4">
      <Card
        className="flex w-full flex-col gap-0 overflow-hidden rounded-2xl border-border/70"
        style={
          frameHeight
            ? { height: `${frameHeight}px` }
            : { height: "calc(100dvh - 11rem)" }
        }
      >
        <div className="shrink-0 border-b border-border/70 px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">Якоря</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {Math.min(answeredCount, questions.length)} / {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-xs text-foreground/70 border-border/70 bg-background/70"
                onClick={handleStartNewSession}
                disabled={isLoading || isRefreshing || versePool.length === 0}
              >
                <Shuffle className="h-3.5 w-3.5" />
                Новая
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-xs text-foreground/70 border-border/70 bg-background/70"
                onClick={() => {
                  if (!telegramId) return;
                  void loadVersePool(telegramId, { silent: true });
                }}
                disabled={isLoading || isRefreshing || !telegramId}
              >
                <RefreshCcw
                  className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          <div className="mt-2">
            <Progress value={progressValue} />
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1 rounded-2xl border border-border/70 bg-muted/25 p-1">
            {(["reference", "incipit", "context", "mixed"] as const).map((trackKey) => {
              const isActive = selectedTrack === trackKey;
              return (
                <button
                  key={trackKey}
                  type="button"
                  onClick={() => handleTrackSelect(trackKey)}
                  className={`h-8 rounded-xl text-xs transition-colors ${
                    isActive
                      ? "bg-border/25 text-primary border border-primary/25"
                      : "text-foreground/70 hover:bg-background/70"
                  }`}
                >
                  {TRACK_META[trackKey].shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-4">
          {!telegramId && (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Не найден `telegramId`.
            </div>
          )}

          {telegramId && isLoading && (
            <div className="space-y-2 animate-pulse pt-1">
              <div className="h-4 w-1/3 rounded-xl bg-muted border border-border/70" />
              <div className="h-20 rounded-xl bg-muted border border-border/70" />
              <div className="h-10 rounded-xl bg-muted border border-border/70" />
              <div className="h-10 rounded-xl bg-muted border border-border/70" />
            </div>
          )}

          {telegramId && !isLoading && errorMessage && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg px-3 text-xs"
                onClick={() => {
                  if (!telegramId) return;
                  void loadVersePool(telegramId);
                }}
              >
                Повторить
              </Button>
            </div>
          )}

          {telegramId && !isLoading && !errorMessage && versePool.length === 0 && (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Нужны стихи в статусах Изучаемые, Повторяемые и Выученные.
            </div>
          )}

          {telegramId &&
            !isLoading &&
            !errorMessage &&
            versePool.length > 0 &&
            questions.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Для выбранного трека пока не хватает подходящих стихов.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => handleTrackSelect("mixed")}
                >
                  Перейти в Смешанный
                </Button>
              </div>
            )}

          {telegramId &&
            !isLoading &&
            !errorMessage &&
            versePool.length > 0 &&
            questions.length > 0 &&
            !sessionComplete &&
            currentQuestion && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex h-full min-h-0 flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-5">
                    <div className="flex items-center gap-2">
                      {/* <Badge variant="outline" className="rounded-full text-xs text-foreground/75"> */}
                      <p className="text-xs text-muted-foreground">
                        {currentQuestion.modeHint}
                      </p>
                      {/* </Badge> */}
                      {sessionTrack === "mixed" && (
                        <Badge variant="outline" className="rounded-full text-xs text-foreground/65">
                          {TRACK_META[currentQuestion.track].shortLabel}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {currentQuestionIndex + 1}/{questions.length}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                    <p className="max-h-[15.8vh] overflow-hidden text-ellipsis line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                      {currentQuestion.prompt}
                    </p>
                  </div>

                  {currentQuestion.interaction === "choice" && (
                    <div className="min-h-0 overflow-auto pr-0.5">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {currentQuestion.options.map((option) => {
                          const optionIsSelected = selectedOption === option;
                          const optionIsCorrect = currentQuestion.isCorrectOption(option);
                          const stateClassName = getChoiceStateClass({
                            isAnswered,
                            optionIsCorrect,
                            optionIsSelected,
                          });

                          return (
                            <button
                              key={`${currentQuestion.id}-${option}`}
                              type="button"
                              onClick={() => handleChoiceSelect(option)}
                              disabled={isAnswered}
                              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${stateClassName}`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {currentQuestion.interaction === "tap" && (
                    <div className="min-h-0 overflow-auto pr-0.5 space-y-2">
                      <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            Собрано:{" "}
                            <span className="tabular-nums">
                              {Math.min(
                                tapSequence.length,
                                currentQuestion.expectedNormalized.length
                              )}
                              /{currentQuestion.expectedNormalized.length}
                            </span>
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-foreground/75 line-clamp-2">
                          {selectedTapLabels.length > 0
                            ? selectedTapLabels.join(" ")
                            : "Нажимайте слова по порядку"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {currentQuestion.options.map((option) => {
                          const isUsed = tapSequence.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={isAnswered || isUsed}
                              onClick={() => handleTapSelect(option.id)}
                              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                                isUsed
                                  ? "border-primary/35 bg-primary/10 text-primary"
                                  : "border-border/70 bg-background text-foreground/80 hover:bg-muted/45"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {currentQuestion.interaction === "type" && !isAnswered && (
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="shrink-0 space-y-2.5 pb-1"
                    >
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleTypeSubmit();
                        }}
                      >
                        <div className="relative">
                          <Input
                            ref={inputRef}
                            value={typedAnswer}
                            onChange={(event) => {
                              const inputValue = event.target.value;
                              setTypedAnswer(
                                isContextPrefixTypeMode
                                  ? inputValue.toUpperCase()
                                  : inputValue
                              );
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                if (canSubmitTypeAnswer) {
                                  handleTypeSubmit();
                                }
                              }
                            }}
                            placeholder={currentQuestion.placeholder}
                            className="h-12 rounded-xl border-border/50 bg-background/60 pr-24 text-base transition-colors focus:border-primary/40"
                            autoCapitalize={
                              isContextPrefixTypeMode ? "characters" : "none"
                            }
                            autoCorrect="off"
                            spellCheck={false}
                            inputMode="text"
                            enterKeyHint="done"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Button
                              type="submit"
                              size="sm"
                              className="h-8 rounded-lg px-4 text-xs font-medium active:scale-95"
                              disabled={!canSubmitTypeAnswer}
                            >
                              {typingAttempts === 0 ? "Проверить" : "Ещё раз"}
                            </Button>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between px-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary tabular-nums">
                              {Math.min(typingAttempts + 1, currentQuestion.maxAttempts)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              из {currentQuestion.maxAttempts} попыток
                            </span>
                          </div>
                          {typingAttempts > 0 && currentQuestion.retryHint && (
                            <motion.p
                              initial={{ opacity: 0, x: 8 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-xs font-medium text-primary/80"
                            >
                              {currentQuestion.retryHint}
                            </motion.p>
                          )}
                        </div>
                        {typeInputReadiness &&
                          !typeInputReadiness.canSubmit &&
                          typeInputReadiness.remainingChars > 0 && (
                            <p className="mt-1 px-0.5 text-[11px] text-muted-foreground">
                              Введите ещё минимум {typeInputReadiness.remainingChars} симв. для проверки.
                            </p>
                          )}
                      </form>
                    </motion.div>
                  )}

                  {!isAnswered && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-lg px-3 text-xs text-foreground/75 border-border/70 bg-background/70"
                        onClick={handleForgotAnswer}
                      >
                        Забыл
                      </Button>
                    </div>
                  )}

                  {isAnswered && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        lastAnswerCorrect
                          ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5"
                          : "border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-rose-500/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            lastAnswerCorrect
                              ? "bg-emerald-500/20 text-emerald-600"
                              : "bg-rose-500/20 text-rose-600"
                          }`}
                        >
                          {lastAnswerCorrect ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <XCircle className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium ${
                              lastAnswerCorrect ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {lastAnswerForgotten
                              ? "Пропущено"
                              : lastAnswerCorrect
                              ? lastAnswerUsedTolerance
                                ? "Зачтено, с ошибкой"
                                : "Правильно!"
                              : "Неправильно"}
                          </p>
                          <p className="text-foreground/70 text-xs mt-0.5">
                            Стих:
                          </p>
                          <p className="text-foreground/80 text-xs mt-0.5 whitespace-pre-line">
                            {revealedVerseText}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {canGoNext && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.2 }}
                      className="flex justify-end"
                    >
                      <Button
                        type="button"
                        size="sm"
                        className="h-10 rounded-xl px-5 text-sm font-medium bg-background text-foreground/80 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-95 border border-border/70"
                        onClick={handleMoveNext}
                      >
                        {nextActionLabel}
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

          {telegramId &&
            !isLoading &&
            !errorMessage &&
            versePool.length > 0 &&
            sessionComplete && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <p className="text-base font-medium text-primary">{resultPercent}%</p>
                <p className="text-sm text-foreground/80">
                  {correctCount} из {questions.length} ответов верны.
                </p>
                <p className="text-xs text-muted-foreground">{getResultCaption(resultPercent)}</p>

                <div className="w-full max-w-xs rounded-xl border border-border/70 bg-background/65 p-3 text-xs">
                  {referenceStats.total > 0 && (
                    <div className="flex items-center justify-between text-foreground/80">
                      <span>Ссылки</span>
                      <span className="tabular-nums">
                        {referenceStats.correct}/{referenceStats.total}
                      </span>
                    </div>
                  )}
                  {incipitStats.total > 0 && (
                    <div className="mt-1 flex items-center justify-between text-foreground/80">
                      <span>Начало</span>
                      <span className="tabular-nums">
                        {incipitStats.correct}/{incipitStats.total}
                      </span>
                    </div>
                  )}
                  {contextStats.total > 0 && (
                    <div className="mt-1 flex items-center justify-between text-foreground/80">
                      <span>Контекст</span>
                      <span className="tabular-nums">
                        {contextStats.correct}/{contextStats.total}
                      </span>
                    </div>
                  )}
                </div>

                {isSavingSession && (
                  <p className="text-xs text-muted-foreground">Сохраняем прогресс навыков…</p>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={handleStartNewSession}
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Снова
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => {
                      if (!telegramId) return;
                      void loadVersePool(telegramId, { silent: true });
                    }}
                    disabled={isRefreshing}
                  >
                    <RefreshCcw
                      className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                  </Button>
                </div>
              </div>
            )}
        </div>
      </Card>
    </div>
  );
}
