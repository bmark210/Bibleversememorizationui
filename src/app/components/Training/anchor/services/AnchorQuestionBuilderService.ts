/**
 * AnchorQuestionBuilderService
 * Отделённая логика построения вопросов для тренировки
 */

import { parseExternalVerseId } from "@/shared/bible/externalVerseId";
import { similarityRatio } from "@/shared/utils/levenshtein";
import type {
  ChoiceQuestion,
  ModeStrategy,
  ReferenceVerse,
  SkillTrack,
  TapQuestion,
  TapQuestionOption,
  TrainerModeId,
  TrainerQuestion,
  TypeQuestion,
} from "../anchorTrainingTypes";
import {
  extractWordTokens,
  matchesReferenceWithTolerance,
  matchesIncipitWithTolerance,
  normalizeIncipitText,
  normalizeBookName,
  softenBookName,
  parseReferenceChapterAndVerseStart,
} from "./AnchorValidationService";

export const CONFIG = {
  REFERENCE_OPTIONS_COUNT: 4,
  BOOK_OPTIONS_COUNT: 4,
  INCIPIT_OPTIONS_COUNT: 4,
  INCIPIT_TAP_DISTRACTORS_COUNT: 2,
  MAX_TYPING_ATTEMPTS: 2,
  TYPE_INPUT_SIMILARITY_THRESHOLD: 0.8,
  TYPE_PREFIX_READY_RATIO: 0.8,
};

type ContextTargetRelation = {
  direction: "forward" | "backward";
  distance: number;
};

function shuffle<T>(source: T[], randomInt: (max: number) => number): T[] {
  const next = [...source];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
  }
  return next;
}

function resolveContextTargetRelation(verse: ReferenceVerse): ContextTargetRelation | null {
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

function getContextTargetDescriptor(verse: ReferenceVerse): string {
  const relation = resolveContextTargetRelation(verse);
  if (!relation) return "нужного стиха";

  if (relation.direction === "forward") {
    if (relation.distance === 1) return "следующего стиха";
    return `стиха, который идёт через ${relation.distance - 1} стихов после подсказки`;
  }

  if (relation.distance === 1) return "предыдущего стиха";
  return `стиха, который находится через ${relation.distance - 1} стихов до подсказки`;
}

function buildContextModeHint(
  verse: ReferenceVerse,
  mode: "incipit" | "tap" | "prefix"
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

function getIncipitPrefixTokens(verse: ReferenceVerse): string[] {
  return verse.incipitWords
    .map((word) => normalizeIncipitText(word))
    .filter(Boolean)
    .map((word) => Array.from(word)[0] ?? "")
    .filter(Boolean);
}

function hasContextPrompt(verse: ReferenceVerse): boolean {
  return verse.contextPromptText.trim().length > 0;
}

function buildContextPrompt(verse: ReferenceVerse): string {
  const promptText = verse.contextPromptText.trim();
  if (!promptText) return "";
  return promptText;
}

export function buildReferenceChoiceQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number,
  randomInt: (max: number) => number
): ChoiceQuestion | null {
  const normalizedCorrect = normalizeBookName(verse.reference);

  const distractors = shuffle(
    pool
      .map((item) => item.reference)
      .filter((candidate) => candidate.trim().length > 0)
      .filter(
        (candidate) => normalizeBookName(candidate) !== normalizedCorrect
      ),
    randomInt
  );

  if (distractors.length < CONFIG.REFERENCE_OPTIONS_COUNT - 1) return null;

  return {
    id: `reference-choice-${order}-${verse.externalVerseId}`,
    modeId: "reference-choice",
    track: "reference",
    modeHint: "Выберите правильную ссылку",
    verse,
    prompt: verse.text,
    answerLabel: verse.reference,
    interaction: "choice",
    options: shuffle(
      [
        verse.reference,
        ...distractors.slice(0, CONFIG.REFERENCE_OPTIONS_COUNT - 1),
      ],
      randomInt
    ),
    isCorrectOption: (value: string) =>
      matchesReferenceWithTolerance(value, verse.reference),
  };
}

export function buildBookChoiceQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number,
  randomInt: (max: number) => number
): ChoiceQuestion | null {
  const normalizedCorrect = normalizeBookName(verse.bookName);

  const distractors = shuffle(
    pool
      .map((item) => item.bookName)
      .filter((candidate) => candidate.trim().length > 0)
      .filter(
        (candidate) => normalizeBookName(candidate) !== normalizedCorrect
      ),
    randomInt
  );

  if (distractors.length < CONFIG.BOOK_OPTIONS_COUNT - 1) return null;

  return {
    id: `book-choice-${order}-${verse.externalVerseId}`,
    modeId: "book-choice",
    track: "reference",
    modeHint: "Выберите правильную книгу",
    verse,
    prompt: verse.text,
    answerLabel: verse.bookName,
    interaction: "choice",
    options: shuffle(
      [
        verse.bookName,
        ...distractors.slice(0, CONFIG.BOOK_OPTIONS_COUNT - 1),
      ],
      randomInt
    ),
    isCorrectOption: (value: string) =>
      normalizeBookName(value) === normalizedCorrect,
  };
}

export function buildIncipitChoiceQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number,
  randomInt: (max: number) => number
): ChoiceQuestion | null {
  if (verse.incipitWords.length < 2) return null;
  const normalizedCorrect = normalizeIncipitText(verse.incipit);

  const distractors = shuffle(
    pool
      .map((item) => item.incipit)
      .filter((candidate) => candidate.trim().length > 0)
      .filter(
        (candidate) => normalizeIncipitText(candidate) !== normalizedCorrect
      ),
    randomInt
  );

  if (distractors.length < CONFIG.INCIPIT_OPTIONS_COUNT - 1) return null;

  return {
    id: `incipit-choice-${order}-${verse.externalVerseId}`,
    modeId: "incipit-choice",
    track: "incipit",
    modeHint: "Выберите правильное начало стиха.",
    verse,
    prompt: verse.reference,
    answerLabel: verse.incipit,
    interaction: "choice",
    options: shuffle(
      [
        verse.incipit,
        ...distractors.slice(0, CONFIG.INCIPIT_OPTIONS_COUNT - 1),
      ],
      randomInt
    ),
    isCorrectOption: (value: string) =>
      normalizeIncipitText(value) === normalizedCorrect,
  };
}

export function buildIncipitTapQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number,
  randomInt: (max: number) => number
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

  const distractors = shuffle(distractorCandidates, randomInt).slice(
    0,
    CONFIG.INCIPIT_TAP_DISTRACTORS_COUNT
  );

  const options: TapQuestionOption[] = shuffle(
    [...verse.incipitWords, ...distractors],
    randomInt
  ).map((word, index) => ({
    id: `incipit-tap-${order}-${index}`,
    label: word,
    normalized: normalizeIncipitText(word),
  }));

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

export function buildIncipitTypeQuestion(
  verse: ReferenceVerse,
  order: number
): TypeQuestion | null {
  if (verse.incipitWords.length < 2) return null;
  const prefixTokens = getIncipitPrefixTokens(verse);
  if (prefixTokens.length === 0) return null;
  const compactUppercasePrefix = prefixTokens.join("").toUpperCase();

  return {
    id: `incipit-type-${order}-${verse.externalVerseId}`,
    modeId: "incipit-type",
    track: "incipit",
    modeHint: "Введите первые буквы начала стиха.",
    verse,
    prompt: verse.reference,
    answerLabel: compactUppercasePrefix,
    interaction: "type",
    placeholder: "ИТВБМ",
    maxAttempts: CONFIG.MAX_TYPING_ATTEMPTS,
    retryHint: `Формат: ${compactUppercasePrefix}`,
    isCorrectInput: (value: string) =>
      matchesCompactPrefixInput(value, prefixTokens),
  };
}

export function buildContextIncipitTypeQuestion(
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
    maxAttempts: CONFIG.MAX_TYPING_ATTEMPTS,
    retryHint: initials ? `Первые буквы: ${initials}` : undefined,
    isCorrectInput: (value: string) => matchesIncipitWithTolerance(value, verse.incipit),
  };
}

function matchesCompactPrefixInput(
  input: string,
  expectedTokens: string[]
): boolean {
  if (expectedTokens.length === 0) return false;

  const normalizedInput = normalizeIncipitText(input);
  if (!normalizedInput) return false;

  const joinedExpected = expectedTokens.join("");
  const joinedInput = normalizedInput.replace(/\s+/g, "");

  if (!joinedInput || !joinedExpected) return false;

  if (joinedInput === joinedExpected) return true;
  if (joinedInput.startsWith(joinedExpected)) return true;

  const similarity = similarityRatio(joinedInput, joinedExpected);
  return similarity >= CONFIG.TYPE_INPUT_SIMILARITY_THRESHOLD;
}

export const QUESTION_BUILDERS = {
  "reference-choice": buildReferenceChoiceQuestion,
  "book-choice": buildBookChoiceQuestion,
  "incipit-choice": buildIncipitChoiceQuestion,
  "incipit-tap": buildIncipitTapQuestion,
  "incipit-type": buildIncipitTypeQuestion,
  "context-incipit-type": buildContextIncipitTypeQuestion,
};
