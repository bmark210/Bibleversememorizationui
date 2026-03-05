"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  RefreshCcw,
  Shuffle,
  XCircle,
} from "lucide-react";
import type { UserVerse } from "@/api/models/UserVerse";
import { fetchReferenceTrainerVerses } from "@/api/services/referenceTrainer";
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

type ReferenceTrainingMode = "reference-choice" | "book-choice" | "keyboard";

type ReferenceVerse = {
  externalVerseId: string;
  text: string;
  reference: string;
  status: DisplayVerseStatus;
  bookName: string;
  chapterVerse: string;
};

type BaseQuestion = {
  id: string;
  mode: ReferenceTrainingMode;
  verse: ReferenceVerse;
};

type ReferenceChoiceQuestion = BaseQuestion & {
  mode: "reference-choice";
  options: string[];
};

type BookChoiceQuestion = BaseQuestion & {
  mode: "book-choice";
  options: string[];
};

type KeyboardQuestion = BaseQuestion & {
  mode: "keyboard";
};

type ReferenceQuestion =
  | ReferenceChoiceQuestion
  | BookChoiceQuestion
  | KeyboardQuestion;

type QuestionResult = {
  mode: ReferenceTrainingMode;
  isCorrect: boolean;
};

const REFERENCE_OPTIONS_COUNT = 4;
const BOOK_OPTIONS_COUNT = 4;
const SESSION_QUESTION_MIN = 8;
const SESSION_QUESTION_MAX = 24;
const SESSION_QUESTION_MULTIPLIER = 2;
const MAX_TYPING_ATTEMPTS = 2;

const MODE_META: Record<
  ReferenceTrainingMode,
  {
    label: string;
    hint: string;
  }
> = {
  "reference-choice": {
    label: "Выбор ссылки",
    hint: "Выберите правильную ссылку.",
  },
  "book-choice": {
    label: "Выбор книги",
    hint: "Выберите правильную книгу.",
  },
  keyboard: {
    label: "Ввод вручную",
    hint: "Введите ссылку с клавиатуры.",
  },
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
  return value
    .replace(/^ко/u, "")
    .replace(/^к/u, "")
    .replace(/^от/u, "");
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

function mapUserVerseToReferenceVerse(verse: UserVerse): ReferenceVerse | null {
  const text = String(verse.text ?? "").trim();
  const reference = String(verse.reference ?? verse.externalVerseId ?? "").trim();
  if (!text || !reference) return null;

  const parsedReference = parseReferenceParts(reference);

  return {
    externalVerseId: verse.externalVerseId,
    text,
    reference,
    status: normalizeDisplayVerseStatus(verse.status),
    bookName: parsedReference?.bookName ?? "",
    chapterVerse: parsedReference?.chapterVerse ?? "",
  };
}

function buildReferenceChoiceQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number
): ReferenceChoiceQuestion | null {
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
    mode: "reference-choice",
    verse,
    options,
  };
}

function buildBookChoiceQuestion(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number
): BookChoiceQuestion | null {
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

  return {
    id: `book-choice-${order}-${verse.externalVerseId}`,
    mode: "book-choice",
    verse,
    options: shuffle([
      verse.bookName,
      ...distractorBooks.slice(0, BOOK_OPTIONS_COUNT - 1),
    ]),
  };
}

function buildKeyboardQuestion(
  verse: ReferenceVerse,
  order: number
): KeyboardQuestion {
  return {
    id: `keyboard-${order}-${verse.externalVerseId}`,
    mode: "keyboard",
    verse,
  };
}

function getWeightedModes(
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  previousMode: ReferenceTrainingMode | null
): ReferenceTrainingMode[] {
  const canBuildReferenceChoice =
    buildReferenceChoiceQuestion(verse, pool, -1) !== null;
  const canBuildBookChoice = buildBookChoiceQuestion(verse, pool, -1) !== null;

  let weighted: ReferenceTrainingMode[] = [];

  if (canBuildReferenceChoice) {
    weighted = [...weighted, "reference-choice", "reference-choice"];
  }
  if (canBuildBookChoice) {
    weighted = [...weighted, "book-choice"];
  }
  weighted = [...weighted, "keyboard", "keyboard"];

  if (previousMode && weighted.some((mode) => mode !== previousMode)) {
    const filtered = weighted.filter((mode) => mode !== previousMode);
    if (filtered.length > 0) return filtered;
  }

  return weighted;
}

function buildQuestionByMode(
  mode: ReferenceTrainingMode,
  verse: ReferenceVerse,
  pool: ReferenceVerse[],
  order: number
): ReferenceQuestion {
  if (mode === "reference-choice") {
    return (
      buildReferenceChoiceQuestion(verse, pool, order) ??
      buildKeyboardQuestion(verse, order)
    );
  }

  if (mode === "book-choice") {
    return (
      buildBookChoiceQuestion(verse, pool, order) ??
      buildReferenceChoiceQuestion(verse, pool, order) ??
      buildKeyboardQuestion(verse, order)
    );
  }

  return buildKeyboardQuestion(verse, order);
}

function buildRandomSessionQuestions(pool: ReferenceVerse[]): ReferenceQuestion[] {
  if (pool.length === 0) return [];

  const targetQuestionCount = Math.min(
    SESSION_QUESTION_MAX,
    Math.max(SESSION_QUESTION_MIN, pool.length * SESSION_QUESTION_MULTIPLIER)
  );

  const questions: ReferenceQuestion[] = [];
  const recentVerseIds: string[] = [];
  let previousMode: ReferenceTrainingMode | null = null;

  for (let index = 0; index < targetQuestionCount; index += 1) {
    const preferredPool = pool.filter(
      (verse) => !recentVerseIds.includes(verse.externalVerseId)
    );
    const sourcePool = preferredPool.length > 0 ? preferredPool : pool;
    const verse = sourcePool[randomInt(sourcePool.length)];
    const weightedModes = getWeightedModes(verse, pool, previousMode);
    const selectedMode = weightedModes[randomInt(weightedModes.length)];
    const question = buildQuestionByMode(selectedMode, verse, pool, index);

    questions.push(question);
    previousMode = question.mode;

    recentVerseIds.push(verse.externalVerseId);
    if (recentVerseIds.length > 2) {
      recentVerseIds.shift();
    }
  }

  return questions;
}

function getResultCaption(percent: number) {
  if (percent >= 90) return "Отличная точность. Ссылки закрепляются уверенно.";
  if (percent >= 70) return "Хороший результат. Ещё одна сессия поднимет стабильность.";
  return "Нужна дополнительная практика. Попробуйте повторить с новыми режимами.";
}

export function ReferenceTrainer({ telegramId }: ReferenceTrainerProps) {
  const { viewportHeight } = useTelegramSafeArea();
  const initializedTelegramIdRef = useRef<string | null>(null);
  const answersViewportRef = useRef<HTMLDivElement | null>(null);
  const [versePool, setVersePool] = useState<ReferenceVerse[]>([]);
  const [questions, setQuestions] = useState<ReferenceQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedReference, setTypedReference] = useState("");
  const [typingAttempts, setTypingAttempts] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const answeredCount = results.length;
  const correctCount = useMemo(
    () => results.filter((result) => result.isCorrect).length,
    [results]
  );
  const sessionComplete = questions.length > 0 && answeredCount >= questions.length;
  const progressValue =
    questions.length > 0
      ? Math.round((Math.min(answeredCount, questions.length) / questions.length) * 100)
      : 0;
  const resultPercent =
    questions.length > 0
      ? Math.round((correctCount / questions.length) * 100)
      : 0;
  const frameHeight = useMemo(() => {
    if (viewportHeight <= 0) return undefined;
    return Math.max(300, viewportHeight - 210);
  }, [viewportHeight]);

  const resetAnswerState = useCallback(() => {
    setSelectedOption(null);
    setTypedReference("");
    setTypingAttempts(0);
    setIsAnswered(false);
    setLastAnswerCorrect(null);
  }, []);

  const startSessionFromPool = useCallback(
    (pool: ReferenceVerse[]) => {
      const nextQuestions = buildRandomSessionQuestions(pool);
      setQuestions(nextQuestions);
      setCurrentQuestionIndex(0);
      setResults([]);
      resetAnswerState();
    },
    [resetAnswerState]
  );

  const loadVersePool = useCallback(
    async (telegramIdValue: string, options?: { silent?: boolean }) => {
      const isSilent = options?.silent === true;
      setErrorMessage(null);
      if (isSilent) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const verses = await fetchReferenceTrainerVerses(telegramIdValue);
        const merged = verses
          .map(mapUserVerseToReferenceVerse)
          .filter((verse): verse is ReferenceVerse => verse !== null);

        setVersePool(merged);
        startSessionFromPool(merged);
      } catch (error) {
        console.error("Не удалось загрузить стихи для раздела ссылок:", error);
        setErrorMessage("Не удалось загрузить стихи для тренировки ссылок.");
        toast.error("Не удалось загрузить раздел «Ссылки»", {
          description: "Проверьте соединение и попробуйте снова.",
        });
      } finally {
        if (isSilent) setIsRefreshing(false);
        else setIsLoading(false);
      }
    },
    [startSessionFromPool]
  );

  useEffect(() => {
    if (!telegramId) {
      initializedTelegramIdRef.current = null;
      setVersePool([]);
      setQuestions([]);
      setResults([]);
      setErrorMessage(null);
      return;
    }
    if (initializedTelegramIdRef.current === telegramId) return;
    initializedTelegramIdRef.current = telegramId;
    void loadVersePool(telegramId);
  }, [loadVersePool, telegramId]);

  const finalizeAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!currentQuestion || isAnswered) return;

      setIsAnswered(true);
      setLastAnswerCorrect(isCorrect);
      setResults((prev) => [...prev, { mode: currentQuestion.mode, isCorrect }]);
    },
    [currentQuestion, isAnswered]
  );

  const handleOptionSelect = (value: string) => {
    if (!currentQuestion || isAnswered || sessionComplete) return;
    if (currentQuestion.mode !== "reference-choice" && currentQuestion.mode !== "book-choice") {
      return;
    }

    setSelectedOption(value);

    const isCorrect =
      currentQuestion.mode === "book-choice"
        ? normalizeBookName(value) === normalizeBookName(currentQuestion.verse.bookName)
        : normalizeReferenceForComparison(value) ===
          normalizeReferenceForComparison(currentQuestion.verse.reference);
    finalizeAnswer(isCorrect);
  };

  const handleTypedSubmit = () => {
    if (!currentQuestion || currentQuestion.mode !== "keyboard" || isAnswered || sessionComplete) {
      return;
    }

    const input = typedReference.trim();
    if (!input) return;

    const nextAttempt = typingAttempts + 1;
    setTypingAttempts(nextAttempt);

    const isCorrect = matchesReferenceWithTolerance(
      input,
      currentQuestion.verse.reference
    );

    if (isCorrect) {
      finalizeAnswer(true);
      return;
    }

    if (nextAttempt < MAX_TYPING_ATTEMPTS) {
      return;
    }

    finalizeAnswer(false);
  };

  const handleMoveNext = () => {
    if (!isAnswered || !currentQuestion) return;
    if (currentQuestionIndex >= questions.length - 1) return;
    setCurrentQuestionIndex((prev) => prev + 1);
    resetAnswerState();
  };

  const handleStartNewSession = () => {
    if (versePool.length === 0) return;
    startSessionFromPool(versePool);
  };

  const canGoNext =
    isAnswered && currentQuestionIndex < questions.length - 1 && !sessionComplete;
  const isKeyboardMode = currentQuestion?.mode === "keyboard";

  const ensureKeyboardFormVisible = useCallback(() => {
    const container = answersViewportRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  useEffect(() => {
    if (!isKeyboardMode) return;
    const rafId = window.requestAnimationFrame(ensureKeyboardFormVisible);
    const timeoutId = window.setTimeout(ensureKeyboardFormVisible, 120);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [currentQuestion?.id, ensureKeyboardFormVisible, isKeyboardMode]);

  useEffect(() => {
    if (!isKeyboardMode || typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const onResize = () => ensureKeyboardFormVisible();
    viewport.addEventListener("resize", onResize);
    return () => viewport.removeEventListener("resize", onResize);
  }, [ensureKeyboardFormVisible, isKeyboardMode]);

  return (
    <div className="mx-auto w-full max-w-3xl p-3 sm:p-4">
      <Card
        className="flex w-full flex-col overflow-hidden rounded-2xl border-border/70"
        style={frameHeight ? { height: `${frameHeight}px` } : { height: "calc(100dvh - 11rem)" }}
      >
        <div className="shrink-0 border-b border-border/70 px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">Ссылки</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {Math.min(answeredCount, questions.length)} / {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-xs"
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
                className="h-8 rounded-lg px-2.5 text-xs"
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
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-4">
          {!telegramId && (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Не найден `telegramId`.
            </div>
          )}

          {telegramId && isLoading && (
            <div className="space-y-2 animate-pulse pt-1">
              <div className="h-4 w-1/3 rounded bg-muted/45" />
              <div className="h-20 rounded-xl bg-muted/25" />
              <div className="h-10 rounded-xl bg-muted/25" />
              <div className="h-10 rounded-xl bg-muted/25" />
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
              Нужны стихи в статусах Изучаемые и Выученные.
            </div>
          )}

          {telegramId &&
            !isLoading &&
            !errorMessage &&
            versePool.length > 0 &&
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
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="rounded-full border-border/70 text-xs">
                      {MODE_META[currentQuestion.mode].label}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {currentQuestionIndex + 1}/{questions.length}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                    <p className="max-h-[24vh] overflow-auto text-sm leading-relaxed">
                      {currentQuestion.verse.text}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">{MODE_META[currentQuestion.mode].hint}</p>

                  <div
                    ref={answersViewportRef}
                    className={`min-h-0 flex-1 overflow-auto pr-0.5 ${
                      currentQuestion.mode === "keyboard" ? "pb-1" : ""
                    }`}
                  >
                    {currentQuestion.mode === "reference-choice" && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {currentQuestion.options.map((option) => {
                          const optionIsCorrect =
                            normalizeReferenceForComparison(option) ===
                            normalizeReferenceForComparison(currentQuestion.verse.reference);
                          const optionIsSelected = selectedOption === option;
                          const stateClassName = isAnswered
                            ? optionIsCorrect
                              ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : optionIsSelected
                                ? "border-destructive/45 bg-destructive/10 text-destructive"
                                : "border-border/70 bg-background text-foreground/80"
                            : "border-border/70 bg-background text-foreground/80 hover:bg-muted/45";

                          return (
                            <button
                              key={`${currentQuestion.id}-${option}`}
                              type="button"
                              onClick={() => handleOptionSelect(option)}
                              disabled={isAnswered}
                              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${stateClassName}`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {currentQuestion.mode === "book-choice" && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {currentQuestion.options.map((option) => {
                          const optionIsCorrect =
                            normalizeBookName(option) ===
                            normalizeBookName(currentQuestion.verse.bookName);
                          const optionIsSelected = selectedOption === option;
                          const stateClassName = isAnswered
                            ? optionIsCorrect
                              ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : optionIsSelected
                                ? "border-destructive/45 bg-destructive/10 text-destructive"
                                : "border-border/70 bg-background text-foreground/80"
                            : "border-border/70 bg-background text-foreground/80 hover:bg-muted/45";

                          return (
                            <button
                              key={`${currentQuestion.id}-${option}`}
                              type="button"
                              onClick={() => handleOptionSelect(option)}
                              disabled={isAnswered}
                              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${stateClassName}`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {currentQuestion.mode === "keyboard" && (
                      <div className="sticky bottom-0 z-10 mt-2 rounded-xl border border-border/70 bg-background/95 p-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
                        <form
                          className="space-y-2.5"
                          onSubmit={(event) => {
                            event.preventDefault();
                            handleTypedSubmit();
                          }}
                        >
                          <Input
                            value={typedReference}
                            onChange={(event) => setTypedReference(event.target.value)}
                            placeholder="Иоанна 3:16"
                            disabled={isAnswered}
                            className="h-10 rounded-lg border-border/70 bg-background/70 text-sm"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            onFocus={() => {
                              ensureKeyboardFormVisible();
                              window.setTimeout(ensureKeyboardFormVisible, 120);
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="submit"
                              size="sm"
                              className="h-8 rounded-lg px-3 text-xs"
                              disabled={isAnswered || typedReference.trim().length === 0}
                            >
                              Проверить
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {Math.min(typingAttempts + 1, MAX_TYPING_ATTEMPTS)}/{MAX_TYPING_ATTEMPTS}
                            </span>
                          </div>
                          {typingAttempts > 0 && !isAnswered && (
                            <p className="text-xs text-muted-foreground">
                              Подсказка: {currentQuestion.verse.bookName} {currentQuestion.verse.chapterVerse}
                            </p>
                          )}
                        </form>
                      </div>
                    )}
                  </div>

                  {isAnswered && (
                    <div
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        lastAnswerCorrect
                          ? "border-emerald-500/45 bg-emerald-500/10"
                          : "border-destructive/45 bg-destructive/10"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {lastAnswerCorrect ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
                        )}
                        <p className="text-foreground/85">
                          {lastAnswerCorrect ? "Верно." : "Неверно."} {currentQuestion.verse.reference}
                        </p>
                      </div>
                    </div>
                  )}

                  {canGoNext && (
                    <div className="flex justify-end">
                      <Button type="button" size="sm" className="h-8 rounded-lg px-3 text-xs bg-primary/60" onClick={handleMoveNext}>
                        Далее
                      </Button>
                    </div>
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
                    <RefreshCcw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            )}
        </div>
      </Card>
    </div>
  );
}
