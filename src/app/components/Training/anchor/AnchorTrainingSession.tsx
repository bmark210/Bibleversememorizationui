"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import type { UserVerse } from "@/api/models/UserVerse";
import {
  fetchReferenceTrainerVerses,
  submitReferenceTrainerSession,
  type ReferenceTrainerSessionOutcome,
  type ReferenceTrainerSessionTrack,
  type ReferenceTrainerSessionUpdate,
} from "@/api/services/referenceTrainer";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { triggerHaptic } from "@/app/lib/haptics";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { getTelegramWebApp } from "@/app/lib/telegramWebApp";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { toast } from "@/app/lib/toast";
import { levenshteinDistance, similarityRatio } from "@/shared/utils/levenshtein";
import { swapArrayItems } from "@/shared/utils/swapArrayItems";
import { parseExternalVerseId } from "@/shared/bible/externalVerseId";
import {
  AnchorTrainingQuestionCard,
  AnchorTrainingStateCard,
  AnchorTrainingSummaryCard,
} from "./AnchorTrainingCards";
import { AnchorTrainingTrackSelect } from "./AnchorTrainingTrackSelect";
import type {
  ChoiceQuestion,
  ModeStrategy,
  QuestionSessionState,
  QuestionTerminalState,
  QuestionResult,
  ReferenceVerse,
  SessionTrack,
  SkillTrack,
  TapQuestion,
  TrainerModeId,
  TrainerQuestion,
  TypeInputReadiness,
  TypeQuestion,
} from "./anchorTrainingTypes";

type AnchorTrainingSessionProps = {
  telegramId: string | null;
  initialTrack?: SessionTrack;
  onClose: () => void;
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

const slideVariants = {
  enter: (dir: number) =>
    dir === 0
      ? { opacity: 0, scale: 1, y: 0 }
      : { y: dir > 0 ? "100%" : "-100%", opacity: 0, scale: 0.88 },
  center: (dir: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition:
      dir === 0
        ? {
            duration: 0.22,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          }
        : { type: "spring" as const, stiffness: 320, damping: 32 },
  }),
  exit: (dir: number) =>
    dir === 0
      ? {
          opacity: 0,
          scale: 1,
          transition: { duration: 0.15, ease: "easeIn" as const },
        }
      : {
          y: dir > 0 ? "-18%" : "18%",
          opacity: 0,
          scale: 0.86,
          transition: { duration: 0.2, ease: "easeIn" as const },
        },
};

function randomFloat() {
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
    swapArrayItems(next, index, swapIndex);
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

type ContextTargetRelation = {
  direction: "forward" | "backward";
  distance: number;
};

function getPluralForm(
  value: number,
  one: string,
  few: string,
  many: string
) {
  const absValue = Math.abs(value) % 100;
  const lastDigit = absValue % 10;

  if (absValue > 10 && absValue < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
}

function formatVerseGap(count: number) {
  if (count === 1) return "один стих";
  if (count === 2) return "два стиха";
  if (count === 3) return "три стиха";
  if (count === 4) return "четыре стиха";
  return `${count} ${getPluralForm(count, "стих", "стиха", "стихов")}`;
}

function parseReferenceChapterAndVerseStart(reference: string): {
  chapter: number;
  verseStart: number;
} | null {
  const normalized = reference.replace(/\u00A0/g, " ").trim();
  const match = normalized.match(
    /^(.*?)(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/u
  );
  if (!match) return null;

  const chapter = Number(match[2]);
  const verseStart = Number(match[3]);
  if (!Number.isInteger(chapter) || chapter <= 0) return null;
  if (!Number.isInteger(verseStart) || verseStart <= 0) return null;

  return {
    chapter,
    verseStart,
  };
}

function resolveContextTargetRelation(
  verse: ReferenceVerse
): ContextTargetRelation | null {
  const targetReference = parseExternalVerseId(verse.externalVerseId);
  const promptReference = parseReferenceChapterAndVerseStart(
    verse.contextPromptReference
  );

  if (
    !targetReference ||
    !promptReference ||
    targetReference.chapter !== promptReference.chapter
  ) {
    return null;
  }

  const distance = Math.abs(targetReference.verseStart - promptReference.verseStart);
  if (distance <= 0) return null;

  return {
    direction:
      targetReference.verseStart > promptReference.verseStart
        ? "forward"
        : "backward",
    distance,
  };
}

function getContextTargetDescriptor(verse: ReferenceVerse) {
  const relation = resolveContextTargetRelation(verse);
  if (!relation) return "нужного стиха";

  if (relation.direction === "forward") {
    if (relation.distance === 1) return "следующего стиха";
    return `стиха, который идёт через ${formatVerseGap(
      relation.distance - 1
    )} после подсказки`;
  }

  if (relation.distance === 1) return "предыдущего стиха";
  return `стиха, который находится через ${formatVerseGap(
    relation.distance - 1
  )} до подсказки`;
}

function buildContextModeHint(
  verse: ReferenceVerse,
  mode: "incipit" | "tap" | "prefix"
) {
  const descriptor = getContextTargetDescriptor(verse);

  if (mode === "tap") {
    return `Соберите начало ${descriptor}.`;
  }

  if (mode === "prefix") {
    return `Введите первые буквы начала ${descriptor}.`;
  }

  return `Введите начало ${descriptor}.`;
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

  const similarity = similarityRatio(normalizedInput, normalizedExpected);
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

  const similarity = similarityRatio(joinedInput, joinedExpected);
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
    // modeLabel: "Выбор ссылки",
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
    modeHint: "Выберите правильную книгу",
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
    modeHint: "Введите ссылку вручную",
    verse,
    prompt: verse.text,
    answerLabel: verse.reference,
    interaction: "type",
    placeholder: "Иоанна 3:16",
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
    modeHint: buildContextModeHint(verse, "incipit"),
    verse,
    prompt,
    answerLabel: verse.incipit,
    interaction: "type",
    placeholder: `Введите начало ${getContextTargetDescriptor(verse)}`,
    maxAttempts: MAX_TYPING_ATTEMPTS,
    retryHint: initials ? `Первые буквы: ${initials}` : undefined,
    isCorrectInput: (value: string) => matchesIncipitWithTolerance(value, verse.incipit),
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
    modeHint: buildContextModeHint(verse, "tap"),
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
  const compactUppercasePrefix = prefixTokens.join("").toUpperCase();

  return {
    id: `context-prefix-type-${order}-${verse.externalVerseId}`,
    modeId: "context-prefix-type",
    track: "context",
    modeHint: buildContextModeHint(verse, "prefix"),
    verse,
    prompt,
    answerLabel: compactUppercasePrefix,
    interaction: "type",
    placeholder: "ИТВБМ",
    maxAttempts: MAX_TYPING_ATTEMPTS,
    retryHint: `Формат: ${compactUppercasePrefix}`,
    isCorrectInput: (value: string) =>
      matchesContextPrefixInput(value, prefixTokens),
  };
}

const MODE_STRATEGIES: ReadonlyArray<ModeStrategy> = [
  {
    id: "reference-choice",
    track: "reference",
    hint: "Выберите правильную ссылку",
    weight: 2,
    canBuild: (verse, pool) => buildReferenceChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) => buildReferenceChoiceQuestion(verse, pool, order),
  },
  {
    id: "book-choice",
    track: "reference",
    hint: "Выберите правильную книгу",
    weight: 1,
    canBuild: (verse, pool) => buildBookChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) => buildBookChoiceQuestion(verse, pool, order),
  },
  {
    id: "reference-type",
    track: "reference",
    hint: "Введите ссылку вручную",
    weight: 2,
    canBuild: () => true,
    buildQuestion: (verse, _pool, order) => buildReferenceTypeQuestion(verse, order),
  },
  {
    id: "incipit-choice",
    track: "incipit",
    hint: "Выберите правильное начало стиха",
    weight: 2,
    canBuild: (verse, pool) => buildIncipitChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) => buildIncipitChoiceQuestion(verse, pool, order),
  },
  {
    id: "incipit-tap",
    track: "incipit",
    hint: "Соберите начало стиха по словам",
    weight: 1,
    canBuild: (verse, pool) => buildIncipitTapQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) => buildIncipitTapQuestion(verse, pool, order),
  },
  {
    id: "incipit-type",
    track: "incipit",
    hint: "Введите первые слова стиха",
    weight: 2,
    canBuild: (verse, _pool) => buildIncipitTypeQuestion(verse, -1) !== null,
    buildQuestion: (verse, _pool, order) => buildIncipitTypeQuestion(verse, order),
  },
  {
    id: "context-incipit-type",
    track: "context",
    hint: "Введите начало стиха по контексту",
    weight: 2,
    canBuild: (verse, _pool) => buildContextIncipitTypeQuestion(verse, -1) !== null,
    buildQuestion: (verse, _pool, order) => buildContextIncipitTypeQuestion(verse, order),
  },
  {
    id: "context-incipit-tap",
    track: "context",
    hint: "Соберите начало стиха по контексту",
    weight: 1,
    canBuild: (verse, pool) => buildContextIncipitTapQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) => buildContextIncipitTapQuestion(verse, pool, order),
  },
  {
    id: "context-prefix-type",
    track: "context",
    hint: "Введите первые буквы начала стиха",
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

function buildInitialQuestionSessionState(
  questions: TrainerQuestion[]
): Record<string, QuestionSessionState> {
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      {
        questionId: question.id,
        status: "pending",
        outcome: null,
      } satisfies QuestionSessionState,
    ])
  );
}

export function AnchorTrainingSession({
  telegramId,
  initialTrack,
  onClose,
}: AnchorTrainingSessionProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;
  const initializedTelegramIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const savedSessionKeyRef = useRef<string | null>(null);

  const [selectedTrack, setSelectedTrack] = useState<SessionTrack>(() =>
    initialTrack ?? readStoredTrack()
  );
  const [sessionTrack, setSessionTrack] = useState<SessionTrack>(() =>
    initialTrack ?? readStoredTrack()
  );
  const [versePool, setVersePool] = useState<ReferenceVerse[]>([]);
  const [questions, setQuestions] = useState<TrainerQuestion[]>([]);
  const [questionStates, setQuestionStates] = useState<
    Record<string, QuestionSessionState>
  >({});
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [currentPendingQuestionId, setCurrentPendingQuestionId] = useState<
    string | null
  >(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typingAttempts, setTypingAttempts] = useState(0);
  const [tapSequence, setTapSequence] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [lastAnswerUsedTolerance, setLastAnswerUsedTolerance] = useState(false);
  const [lastAnswerForgotten, setLastAnswerForgotten] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const [pendingTrackChange, setPendingTrackChange] =
    useState<SessionTrack | null>(null);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isAutoAdvancePending, setIsAutoAdvancePending] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    writeStoredTrack(selectedTrack);
  }, [selectedTrack]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tg = getTelegramWebApp();
    const visualViewport = window.visualViewport;

    const checkKeyboardState = () => {
      if (tg?.viewportStableHeight && tg?.viewportHeight) {
        setIsKeyboardOpen(tg.viewportStableHeight - tg.viewportHeight > 100);
        return;
      }

      if (visualViewport) {
        setIsKeyboardOpen(window.innerHeight - visualViewport.height > 150);
      }
    };

    checkKeyboardState();
    visualViewport?.addEventListener("resize", checkKeyboardState);
    tg?.onEvent?.("viewportChanged", checkKeyboardState);

    return () => {
      visualViewport?.removeEventListener("resize", checkKeyboardState);
      tg?.offEvent?.("viewportChanged", checkKeyboardState);
    };
  }, []);

  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question] as const)),
    [questions]
  );
  const pendingQuestions = useMemo(
    () =>
      questions.filter(
        (question) => (questionStates[question.id]?.status ?? "pending") === "pending"
      ),
    [questionStates, questions]
  );
  const pendingQuestionIds = useMemo(
    () => pendingQuestions.map((question) => question.id),
    [pendingQuestions]
  );
  const currentQuestion = currentQuestionId
    ? questionById.get(currentQuestionId) ?? null
    : null;
  const totalCount = questions.length;
  const pendingCount = pendingQuestions.length;
  const completedCount = totalCount - pendingCount;
  const results = useMemo<QuestionResult[]>(
    () =>
      questions.flatMap((question) => {
        const state = questionStates[question.id];
        if (!state || state.status === "pending") return [];
        return [
          {
            track: question.track,
            modeId: question.modeId,
            isCorrect: state.status === "correct",
          },
        ];
      }),
    [questionStates, questions]
  );
  const sessionUpdates = useMemo<ReferenceTrainerSessionUpdate[]>(
    () =>
      questions.flatMap((question) => {
        const state = questionStates[question.id];
        if (!state || state.status === "pending" || !state.outcome) return [];
        return [
          {
            externalVerseId: question.verse.externalVerseId,
            track: question.track,
            outcome: state.outcome,
          },
        ];
      }),
    [questionStates, questions]
  );
  const correctCount = useMemo(
    () => results.filter((result) => result.isCorrect).length,
    [results]
  );
  const sessionComplete = totalCount > 0 && pendingCount === 0;
  const resultPercent =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

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
      const firstQuestionId = nextQuestions[0]?.id ?? null;
      setQuestions(nextQuestions);
      setQuestionStates(buildInitialQuestionSessionState(nextQuestions));
      setCurrentQuestionId(firstQuestionId);
      setCurrentPendingQuestionId(firstQuestionId);
      setSessionTrack(effectiveTrack);
      setSaveSucceeded(false);
      setSaveErrorMessage(null);
      savedSessionKeyRef.current = null;
      setIsAutoAdvancePending(false);
      resetAnswerState();
    },
    [resetAnswerState, selectedTrack]
  );

  const loadVersePool = useCallback(
    async (telegramIdValue: string) => {
      setErrorMessage(null);
      setIsLoading(true);

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
        console.error("Не удалось загрузить стихи для закрепления:", error);
        setErrorMessage("Не удалось загрузить стихи для закрепления.");
        toast.error("Не удалось загрузить закрепление", {
          description: "Проверьте соединение и попробуйте снова.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedTrack, startSessionFromPool]
  );

  useEffect(() => {
    if (!telegramId) {
      initializedTelegramIdRef.current = null;
      setVersePool([]);
      setQuestions([]);
      setQuestionStates({});
      setCurrentQuestionId(null);
      setCurrentPendingQuestionId(null);
      setErrorMessage(null);
      setSaveSucceeded(false);
      setSaveErrorMessage(null);
      setIsAutoAdvancePending(false);
      return;
    }
    if (initializedTelegramIdRef.current === telegramId) return;
    initializedTelegramIdRef.current = telegramId;
    void loadVersePool(telegramId);
  }, [loadVersePool, telegramId]);

  useEffect(() => {
    if (isAnswered) return;

    if (pendingQuestionIds.length === 0) {
      if (currentPendingQuestionId !== null) setCurrentPendingQuestionId(null);
      if (currentQuestionId !== null) setCurrentQuestionId(null);
      return;
    }

    const fallbackPendingId =
      currentPendingQuestionId && pendingQuestionIds.includes(currentPendingQuestionId)
        ? currentPendingQuestionId
        : pendingQuestionIds[0];

    if (currentPendingQuestionId !== fallbackPendingId) {
      setCurrentPendingQuestionId(fallbackPendingId);
    }
    if (!currentQuestionId || !pendingQuestionIds.includes(currentQuestionId)) {
      setCurrentQuestionId(fallbackPendingId);
    }
  }, [
    currentPendingQuestionId,
    currentQuestionId,
    isAnswered,
    pendingQuestionIds,
  ]);

  const persistSessionUpdates = useCallback(
    async (
      updates: ReferenceTrainerSessionUpdate[],
      activeTrack: SessionTrack
    ) => {
      if (!telegramId || updates.length === 0) return;
      setIsSavingSession(true);
      setSaveSucceeded(false);
      setSaveErrorMessage(null);

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
        setSaveSucceeded(true);
      } catch (error) {
        console.error("Не удалось сохранить прогресс закрепления:", error);
        setSaveSucceeded(false);
        setSaveErrorMessage("Не удалось сохранить прогресс. Попробуйте пройти новую сессию позже.");
        toast.error("Прогресс закрепления не сохранён", {
          description: "Попробуйте открыть режим позже и повторить сессию.",
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
      const nextStatus: QuestionTerminalState = options?.forgotten
        ? "forgotten"
        : isCorrect
          ? "correct"
          : "wrong";
      const currentPendingOrderIndex = Math.max(
        0,
        pendingQuestionIds.findIndex((questionId) => questionId === currentQuestion.id)
      );
      const nextPendingQuestionIds = pendingQuestionIds.filter(
        (questionId) => questionId !== currentQuestion.id
      );
      const nextPendingQuestionId =
        nextPendingQuestionIds.length > 0
          ? nextPendingQuestionIds[
              Math.min(currentPendingOrderIndex, nextPendingQuestionIds.length - 1)
            ] ?? nextPendingQuestionIds[0] ?? null
          : null;

      setIsAnswered(true);
      setLastAnswerCorrect(isCorrect);
      setLastAnswerUsedTolerance(Boolean(isCorrect && options?.acceptedWithTolerance));
      setLastAnswerForgotten(Boolean(options?.forgotten));
      setQuestionStates((prev) => {
        const previousState = prev[currentQuestion.id];
        if (previousState && previousState.status !== "pending") {
          return prev;
        }

        return {
          ...prev,
          [currentQuestion.id]: {
            questionId: currentQuestion.id,
            status: nextStatus,
            outcome,
          },
        };
      });
      setCurrentPendingQuestionId(nextPendingQuestionId);
    },
    [currentQuestion, isAnswered, pendingQuestionIds]
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

  const controlsLocked =
    isLoading ||
    isSavingSession ||
    isAutoAdvancePending ||
    pendingTrackChange !== null ||
    isExitConfirmOpen;

  const advanceToNextQuestion = useCallback(() => {
    if (!isAnswered || !currentPendingQuestionId) return;

    setCurrentQuestionId(currentPendingQuestionId);
    resetAnswerState();
  }, [currentPendingQuestionId, isAnswered, resetAnswerState]);

  const navigatePendingQuestion = useCallback(
    (step: 1 | -1) => {
      if (controlsLocked || isAnswered || sessionComplete) return;
      if (pendingQuestionIds.length === 0) return;

      const activePendingQuestionId =
        currentPendingQuestionId && pendingQuestionIds.includes(currentPendingQuestionId)
          ? currentPendingQuestionId
          : currentQuestionId && pendingQuestionIds.includes(currentQuestionId)
            ? currentQuestionId
            : pendingQuestionIds[0];
      const activePendingIndex = pendingQuestionIds.indexOf(activePendingQuestionId);
      if (activePendingIndex < 0) return;

      if (step === -1 && activePendingIndex === 0) {
        triggerHaptic("light");
        return;
      }

      if (step === 1 && pendingQuestionIds.length <= 1) return;

      const nextPendingIndex =
        step === 1
          ? (activePendingIndex + 1) % pendingQuestionIds.length
          : activePendingIndex - 1;
      const nextPendingQuestionId = pendingQuestionIds[nextPendingIndex];

      if (!nextPendingQuestionId || nextPendingQuestionId === currentQuestionId) return;

      setDirection(step);
      setCurrentPendingQuestionId(nextPendingQuestionId);
      setCurrentQuestionId(nextPendingQuestionId);
      resetAnswerState();
    },
    [
      controlsLocked,
      currentPendingQuestionId,
      currentQuestionId,
      isAnswered,
      pendingQuestionIds,
      resetAnswerState,
      sessionComplete,
    ]
  );

  const handleTrackSelect = useCallback(
    (nextTrack: SessionTrack) => {
      if (nextTrack === selectedTrack) return;
      if (versePool.length === 0 || questions.length === 0) {
        setDirection(0);
        setSelectedTrack(nextTrack);
        if (versePool.length > 0) {
          startSessionFromPool(versePool, nextTrack);
        }
        return;
      }

      setPendingTrackChange(nextTrack);
    },
    [questions.length, selectedTrack, startSessionFromPool, versePool]
  );

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
  const shouldLiftTypeCard =
    isKeyboardOpen && isTypeMode && !isAnswered && !sessionComplete;
  const revealedVerseText = getRevealedVerseText(currentQuestion);
  const requiresContinueAfterReveal =
    isAnswered && !sessionComplete && currentPendingQuestionId !== null;
  const showTrackSelector = !sessionComplete && telegramId && !isLoading;
  const showForgotAnswerAction = Boolean(
    telegramId &&
      !isLoading &&
      !errorMessage &&
      !sessionComplete &&
      currentQuestion &&
      !isAnswered
  );

  const confirmTrackChange = useCallback(() => {
    if (pendingTrackChange === null) return;

    setDirection(0);
    setSelectedTrack(pendingTrackChange);
    setPendingTrackChange(null);
    if (versePool.length > 0) {
      startSessionFromPool(versePool, pendingTrackChange);
    }
  }, [pendingTrackChange, startSessionFromPool, versePool]);

  const cancelTrackChange = useCallback(() => {
    setPendingTrackChange(null);
  }, []);

  const handleContinueAfterReveal = useCallback(() => {
    if (!requiresContinueAfterReveal) return;
    setDirection(1);
    setIsAutoAdvancePending(false);
    advanceToNextQuestion();
  }, [advanceToNextQuestion, requiresContinueAfterReveal]);

  const requestClose = useCallback(() => {
    if (!sessionComplete && questions.length > 0) {
      setIsExitConfirmOpen(true);
      return;
    }

    onClose();
  }, [onClose, questions.length, sessionComplete]);

  const handleBackAction = useCallback(() => {
    if (pendingTrackChange !== null) {
      setPendingTrackChange(null);
      return;
    }

    if (isExitConfirmOpen) {
      setIsExitConfirmOpen(false);
      return;
    }

    requestClose();
  }, [isExitConfirmOpen, pendingTrackChange, requestClose]);

  useTelegramBackButton({
    enabled: true,
    onBack: handleBackAction,
    priority: 50,
  });

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

  const handleQuestionSwipeStep = useCallback(
    (step: 1 | -1) => {
      navigatePendingQuestion(step);
    },
    [navigatePendingQuestion]
  );

  useEffect(() => {
    if (
      !isAnswered ||
      sessionComplete ||
      !requiresContinueAfterReveal ||
      currentPendingQuestionId === null ||
      pendingTrackChange !== null ||
      isExitConfirmOpen
    ) {
      setIsAutoAdvancePending(false);
      return;
    }

    setIsAutoAdvancePending(true);
    const timeoutId = window.setTimeout(() => {
      setDirection(1);
      advanceToNextQuestion();
      setIsAutoAdvancePending(false);
    }, 1100);

    return () => {
      window.clearTimeout(timeoutId);
      setIsAutoAdvancePending(false);
    };
  }, [
    advanceToNextQuestion,
    currentPendingQuestionId,
    isAnswered,
    isExitConfirmOpen,
    pendingTrackChange,
    requiresContinueAfterReveal,
    sessionComplete,
  ]);

  useEffect(() => {
    if (direction === 0 || typeof window === "undefined") return;

    const timeoutId = window.setTimeout(() => {
      setDirection(0);
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [direction, currentQuestion?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleBackAction();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBackAction]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col overflow-hidden overscroll-none bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-md"
      >
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
          <div
            className="shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-xl z-40"
            style={{ paddingTop: `${topInset}px` }}
          >
            <div className="mx-auto max-w-4xl px-4 py-2.5 sm:px-6">
              <div className="flex items-center justify-center">
                <div
                  role="status"
                  aria-label={`Готово ${completedCount} из ${totalCount}.`}
                  className="rounded-full border border-border/50 bg-background/90 px-3 py-1 shadow-lg backdrop-blur-md"
                >
                  <span className="block truncate text-sm font-semibold tabular-nums text-center text-foreground/75">
                    {completedCount} / {totalCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {showTrackSelector && (
            <div className="shrink-0 px-4 pt-3 sm:px-6 z-30">
                <AnchorTrainingTrackSelect
                  value={selectedTrack}
                  onValueChange={handleTrackSelect}
                  disabled={controlsLocked}
                />
            </div>
          )}

          <div
            className={cn(
              "relative flex-1 grid px-4 py-4 sm:px-6",
              shouldLiftTypeCard
                ? "items-start justify-items-center pt-3 sm:pt-4"
                : "place-items-center",
            )}
            role="region"
            aria-roledescription="carousel"
            aria-label="Карточки закрепления"
          >
            {!telegramId && (
              <div className="col-start-1 row-start-1 w-full max-w-4xl min-w-0">
                <AnchorTrainingStateCard
                  title="Нет Telegram ID"
                  description="Не удалось определить пользователя. Откройте закрепление из Telegram Mini App и попробуйте снова."
                  tone="catalog"
                />
              </div>
            )}

            {telegramId && isLoading && (
              <div className="col-start-1 row-start-1 w-full max-w-4xl min-w-0">
                <AnchorTrainingStateCard
                  title="Загружаем сессию"
                  description="Подбираем стихи для закрепления и собираем последовательность вопросов."
                  tone="catalog"
                  visual="loading"
                />
              </div>
            )}

            {telegramId && !isLoading && errorMessage && (
              <div className="col-start-1 row-start-1 w-full max-w-4xl min-w-0">
                <AnchorTrainingStateCard
                  title="Не удалось загрузить стихи"
                  description={errorMessage}
                  tone="stopped"
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void loadVersePool(telegramId)}
                    >
                      Повторить
                    </Button>
                  }
                />
              </div>
            )}

            {telegramId && !isLoading && !errorMessage && versePool.length === 0 && (
              <div className="col-start-1 row-start-1 w-full max-w-4xl min-w-0">
                <AnchorTrainingStateCard
                  title="Нет стихов для закрепления"
                  description="Нужны стихи в статусах Изучаемые, Повторяемые или Выученные."
                  tone="catalog"
                />
              </div>
            )}

            {telegramId &&
              !isLoading &&
              !errorMessage &&
              versePool.length > 0 &&
              questions.length === 0 && (
                <div className="col-start-1 row-start-1 w-full max-w-4xl min-w-0">
                  <AnchorTrainingStateCard
                    title="Недостаточно данных для режима"
                    description="Для выбранного режима пока не хватает подходящих стихов. Выберите другой режим закрепления."
                    tone="catalog"
                  />
                </div>
              )}

            {telegramId &&
              !isLoading &&
              !errorMessage &&
              versePool.length > 0 &&
              questions.length > 0 &&
              !sessionComplete &&
              currentQuestion && (
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="col-start-1 row-start-1 w-full max-w-4xl min-w-0 focus-visible:outline-none"
                    tabIndex={-1}
                  >
                    <AnchorTrainingQuestionCard
                      question={currentQuestion}
                      sessionTrack={sessionTrack}
                      selectedOption={selectedOption}
                      isAnswered={isAnswered}
                      controlsLocked={controlsLocked}
                      tapSequence={tapSequence}
                      selectedTapLabels={selectedTapLabels}
                      typedAnswer={typedAnswer}
                      typingAttempts={typingAttempts}
                      canSubmitTypeAnswer={canSubmitTypeAnswer}
                      isContextPrefixTypeMode={Boolean(isContextPrefixTypeMode)}
                      typeInputReadiness={typeInputReadiness}
                      inputRef={inputRef}
                      lastAnswerCorrect={lastAnswerCorrect}
                      lastAnswerUsedTolerance={lastAnswerUsedTolerance}
                      lastAnswerForgotten={lastAnswerForgotten}
                      revealedVerseText={revealedVerseText}
                      isAutoAdvancePending={isAutoAdvancePending}
                      showContinueButton={requiresContinueAfterReveal}
                      onSwipeStep={handleQuestionSwipeStep}
                      onChoiceSelect={handleChoiceSelect}
                      onTapSelect={handleTapSelect}
                      onTypedAnswerChange={setTypedAnswer}
                      onTypeSubmit={handleTypeSubmit}
                      onContinue={handleContinueAfterReveal}
                    />
                  </motion.div>
                </AnimatePresence>
              )}

            {telegramId &&
              !isLoading &&
              !errorMessage &&
              versePool.length > 0 &&
              sessionComplete && (
                <div className="col-start-1 row-start-1 w-full max-w-4xl min-w-0">
                  <AnchorTrainingSummaryCard
                    resultPercent={resultPercent}
                    correctCount={correctCount}
                    totalCount={totalCount}
                    referenceStats={referenceStats}
                    incipitStats={incipitStats}
                    contextStats={contextStats}
                    caption={getResultCaption(resultPercent)}
                    isSavingSession={isSavingSession}
                    saveSucceeded={saveSucceeded}
                    saveErrorMessage={saveErrorMessage}
                    selectedTrack={selectedTrack}
                  />
                </div>
              )}
          </div>

          <div
            style={{ paddingBottom: `${Math.max(25, bottomInset)}px` }}
            className="shrink-0 px-4 sm:px-6 z-40"
          >
            <div className="mx-auto w-full max-w-2xl">
              <div
                className={cn(
                  "flex gap-3",
                  showForgotAnswerAction ? "justify-center" : "justify-end"
                )}
              >
                {showForgotAnswerAction && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-2xl border border-amber-500/35 bg-amber-500/10 text-amber-700 backdrop-blur-xl hover:bg-amber-500/18 dark:text-amber-300"
                    onClick={handleForgotAnswer}
                    disabled={controlsLocked}
                  >
                    Забыл
                  </Button>
                )}
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 rounded-2xl bg-background border border-border/60 backdrop-blur-xl w-fit",
                    "text-foreground/75"
                  )}
                  onClick={requestClose}
                >
                  Завершить
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={pendingTrackChange !== null}
        onOpenChange={(open) => {
          if (!open) cancelTrackChange();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/60">
              Сменить режим закрепления?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/60">
              При смене режима прогресс текущей сессии сбросится. Сохранение произойдёт
              только после завершения всех стихов.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full border border-border/60 bg-muted/35 text-foreground/70"
              onClick={cancelTrackChange}
            >
              Остаться
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full border border-border/60 bg-primary/60 text-background"
              onClick={confirmTrackChange}
            >
              Сменить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isExitConfirmOpen}
        onOpenChange={(open) => {
          if (!open) setIsExitConfirmOpen(false);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/90">
              Завершить сессию?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/90">
              Если выйти сейчас, прогресс текущей сессии не сохранится.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full border border-border/60 bg-muted/35 text-foreground/70"
              onClick={() => setIsExitConfirmOpen(false)}
            >
              Остаться
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white rounded-full border border-border/60"
              onClick={onClose}
            >
              Выйти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
