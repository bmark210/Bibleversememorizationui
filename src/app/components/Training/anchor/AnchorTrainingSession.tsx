"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { domain_UserVerse } from "@/api/models/domain_UserVerse";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramUiStore } from "@/app/stores/telegramUiStore";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
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
import {
  coerceVerseDifficultyLevel,
  getDifficultyLevelByLetters,
} from "@/shared/verses/difficulty";
import { AnchorTrainingStateCard } from "./AnchorTrainingCards";
import { AnchorTrainingModeRenderer } from "./AnchorTrainingModeRenderer";
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import { getAnchorModeShortLabel } from "./anchorModeLabels";
import { fetchAnchorVersesPool, submitAnchorSession } from "./services/sessionApi";
import { generateImpostorWord, getAIAvailability } from "./services/aiService";
import { MODE_STRATEGIES, pickWeightedStrategy } from "./modeRegistry";
import type { TrainingVerse, DragQuestion } from "./types";
import type { AnchorTrainingResult } from "./types/session";
import type {
  QuestionSessionState,
  QuestionTerminalState,
  TrainerModeId,
  TrainerQuestion,
  TypeInputReadiness,
  TypeQuestion,
} from "./anchorTrainingTypes";
import {
  evaluateIncipitInput,
  evaluateCompactPrefixInput,
  getIncipitPrefixTokens,
  type TypeInputEvaluation,
} from "./modes/builders/builderUtils";
import {
  normalizeIncipitText,
  parseReferenceParts,
  extractWordTokens,
} from "./services/validation";

import type { AnchorModeGroup } from "../types";

type AnchorTrainingSessionProps = {
  telegramId: string | null;
  anchorModes?: AnchorModeGroup[];
  onSessionCommitted?: () => void;
  onClose: () => void;
};

/** Размер одной «волны» карточек; после прохождения подмешивается следующая */
const ANCHOR_SESSION_BATCH_SIZE = 10;
const REFERENCE_TRAINER_POOL_LIMIT = 24;
const TYPE_INPUT_READY_RATIO = 0.8;
const TYPE_PREFIX_READY_RATIO = 0.8;

const slideVariants = {
  enter: (dir: number) =>
    dir === 0
      ? { opacity: 0, scale: 1, y: 0 }
      : { y: dir > 0 ? "60%" : "-60%", opacity: 0, scale: 0.95 },
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

// ---------------------------------------------------------------------------
// mapToTrainingVerse
// ---------------------------------------------------------------------------

function mapToTrainingVerse(verse: domain_UserVerse): TrainingVerse | null {
  const enriched = verse as domain_UserVerse & {
    text?: string | null;
    reference?: string | null;
    externalVerseId?: string | null;
    difficultyLevel?: unknown;
  };
  const externalVerseId = String(
    enriched.externalVerseId?.trim() ||
      enriched.verse?.externalVerseId?.trim() ||
      ""
  );
  const text = String(enriched.text ?? "").trim();
  const reference = String(enriched.reference ?? externalVerseId).trim();
  if (!text || !reference) return null;

  const parsedReference = parseReferenceParts(reference);
  const words = extractWordTokens(text);
  const incipitLength = words.length >= 4 ? 4 : words.length >= 3 ? 3 : words.length;
  const incipitWords = words.slice(0, incipitLength);
  const endingLength = words.length >= 4 ? 4 : words.length >= 3 ? 3 : words.length;
  const endingWords = words.slice(-endingLength);
  const rawVerse = verse as Record<string, unknown>;
  const contextPromptText = String(rawVerse.contextPromptText ?? "").trim();
  const contextPromptReference = String(rawVerse.contextPromptReference ?? "").trim();

  const difficultyLevel =
    enriched.difficultyLevel != null
      ? coerceVerseDifficultyLevel(enriched.difficultyLevel)
      : getDifficultyLevelByLetters(enriched.verse?.difficultyLetters);

  return {
    externalVerseId,
    text,
    reference,
    status: normalizeDisplayVerseStatus(verse.status),
    difficultyLevel,
    masteryLevel: Math.max(0, Math.round(Number(verse.masteryLevel ?? 0))),
    repetitions: Math.max(0, Math.round(Number(verse.repetitions ?? 0))),
    bookName: parsedReference?.bookName ?? "",
    chapterVerse: parsedReference?.chapterVerse ?? "",
    incipit: incipitWords.join(" "),
    incipitWords,
    ending: endingWords.join(" "),
    endingWords,
    contextPromptText,
    contextPromptReference,
  };
}

// ---------------------------------------------------------------------------
// getTypeInputReadiness / evaluateTypeInput
// ---------------------------------------------------------------------------

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

  if (
    question.modeId === "context-prefix-type" ||
    question.modeId === "incipit-type"
  ) {
    const expected = getIncipitPrefixTokens(question.verse).join("");
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
  if (question.modeId === "context-incipit-type") {
    return evaluateIncipitInput(input, question.verse.incipit);
  }

  if (
    question.modeId === "context-prefix-type" ||
    question.modeId === "incipit-type"
  ) {
    return evaluateCompactPrefixInput(input, getIncipitPrefixTokens(question.verse));
  }

  return {
    isCorrect: question.isCorrectInput(input),
    acceptedWithTolerance: false,
  };
}

// ---------------------------------------------------------------------------
// buildInitialQuestionSessionState
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// buildRandomSessionQuestions (async — supports AI modes)
// ---------------------------------------------------------------------------

async function buildRandomSessionQuestions(
  pool: TrainingVerse[],
  allowedGroups?: AnchorModeGroup[],
): Promise<TrainerQuestion[]> {
  if (pool.length === 0) return [];

  const uniquePool = Array.from(
    new Map(pool.map((v) => [v.externalVerseId, v] as const)).values()
  );

  const allowedSet = allowedGroups ? new Set(allowedGroups) : null;
  const filteredStrategies = allowedSet
    ? MODE_STRATEGIES.filter((s) => allowedSet.has(s.group))
    : MODE_STRATEGIES;

  // Shuffle verse order
  const verseOrder = [...uniquePool];
  for (let i = verseOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [verseOrder[i], verseOrder[j]] = [verseOrder[j]!, verseOrder[i]!];
  }

  const targetCount = Math.min(ANCHOR_SESSION_BATCH_SIZE, verseOrder.length);
  const questions: TrainerQuestion[] = [];
  let previousModeId: TrainerModeId | null = null;
  const aiAvailable = getAIAvailability();

  for (const verse of verseOrder) {
    if (questions.length >= targetCount) break;

    const order = questions.length;

    // Filter strategies that can build for this verse
    const eligible = filteredStrategies.filter((s) =>
      s.canBuild(verse, uniquePool, aiAvailable)
    );
    if (eligible.length === 0) continue;

    // Avoid repeating the same mode consecutively
    const candidates =
      previousModeId && eligible.some((s) => s.id !== previousModeId)
        ? eligible.filter((s) => s.id !== previousModeId)
        : eligible;

    // Try weighted pick, fall back if build returns null
    const remaining = [...candidates];
    let question: TrainerQuestion | null = null;

    while (remaining.length > 0) {
      const picked = pickWeightedStrategy(remaining);
      if (!picked) break;

      // For AI modes, fetch data first
      let aiData: unknown;
      if (picked.requiresAI && picked.id === "impostor-word") {
        aiData = await generateImpostorWord(verse);
        if (!aiData) {
          // AI failed, remove this strategy and try another
          const idx = remaining.findIndex((s) => s.id === picked.id);
          if (idx >= 0) remaining.splice(idx, 1);
          continue;
        }
      }

      question = picked.buildQuestion(verse, uniquePool, order, aiData);
      if (question) break;

      const idx = remaining.findIndex((s) => s.id === picked.id);
      if (idx >= 0) remaining.splice(idx, 1);
    }

    if (!question) continue;
    questions.push(question);
    previousModeId = question.modeId;
  }

  return questions;
}

// ---------------------------------------------------------------------------
// buildSyncSessionQuestions (sync — client-only modes, for mid-session refresh)
// ---------------------------------------------------------------------------

function buildSyncSessionQuestions(
  pool: TrainingVerse[],
  allowedGroups?: AnchorModeGroup[],
): TrainerQuestion[] {
  if (pool.length === 0) return [];
  const uniquePool = Array.from(
    new Map(pool.map((v) => [v.externalVerseId, v] as const)).values()
  );
  const allowedSet = allowedGroups ? new Set(allowedGroups) : null;
  const verseOrder = [...uniquePool];
  for (let i = verseOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [verseOrder[i], verseOrder[j]] = [verseOrder[j]!, verseOrder[i]!];
  }
  const targetCount = Math.min(ANCHOR_SESSION_BATCH_SIZE, verseOrder.length);
  const questions: TrainerQuestion[] = [];
  let previousModeId: TrainerModeId | null = null;
  const clientStrategies = MODE_STRATEGIES.filter(
    (s) => !s.requiresAI && (!allowedSet || allowedSet.has(s.group)),
  );

  for (const verse of verseOrder) {
    if (questions.length >= targetCount) break;
    const order = questions.length;
    const eligible = clientStrategies.filter((s) =>
      s.canBuild(verse, uniquePool, false)
    );
    if (eligible.length === 0) continue;
    const candidates =
      previousModeId && eligible.some((s) => s.id !== previousModeId)
        ? eligible.filter((s) => s.id !== previousModeId)
        : eligible;
    const remaining = [...candidates];
    let question: TrainerQuestion | null = null;
    while (remaining.length > 0) {
      const picked = pickWeightedStrategy(remaining);
      if (!picked) break;
      question = picked.buildQuestion(verse, uniquePool, order);
      if (question) break;
      const idx = remaining.findIndex((s) => s.id === picked.id);
      if (idx >= 0) remaining.splice(idx, 1);
    }
    if (!question) continue;
    questions.push(question);
    previousModeId = question.modeId;
  }
  return questions;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnchorTrainingSession({
  telegramId,
  anchorModes,
  onSessionCommitted,
  onClose,
}: AnchorTrainingSessionProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen,
  );
  const initializedTelegramIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const batchSeqRef = useRef(0);
  const persistChainRef = useRef(Promise.resolve());

  const [versePool, setVersePool] = useState<TrainingVerse[]>([]);
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
  const [lastAnswerSkipped, setLastAnswerSkipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const sessionXpRef = useRef(0);

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
  const results = useMemo(
    () =>
      questions.flatMap((question) => {
        const state = questionStates[question.id];
        if (!state || state.status === "pending") return [];
        return [
          {
            modeId: question.modeId,
            isCorrect: state.status === "correct",
          },
        ];
      }),
    [questionStates, questions]
  );
  const correctCount = useMemo(
    () => results.filter((result) => result.isCorrect).length,
    [results]
  );
  const answeredCount = results.length;
  const resultPercent =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const resetAnswerState = useCallback(() => {
    setSelectedOption(null);
    setTypedAnswer("");
    setTypingAttempts(0);
    setTapSequence([]);
    setIsAnswered(false);
    setLastAnswerCorrect(null);
    setLastAnswerUsedTolerance(false);
    setLastAnswerSkipped(false);
    setHasInteracted(false);
  }, []);

  const startSessionFromPool = useCallback(
    async (pool: TrainingVerse[]) => {
      const nextQuestions = await buildRandomSessionQuestions(pool, anchorModes);
      const firstQuestionId = nextQuestions[0]?.id ?? null;
      setQuestions(nextQuestions);
      setQuestionStates(buildInitialQuestionSessionState(nextQuestions));
      setCurrentQuestionId(firstQuestionId);
      setCurrentPendingQuestionId(firstQuestionId);
      batchSeqRef.current = 0;
      resetAnswerState();
    },
    [resetAnswerState],
  );

  const loadVersePool = useCallback(
    async (telegramIdValue: string) => {
      setErrorMessage(null);
      setIsLoading(true);

      try {
        const response = await fetchAnchorVersesPool({
          telegramId: telegramIdValue,
          limit: REFERENCE_TRAINER_POOL_LIMIT,
        });
        if (response.verses.length === 0 && response.totalCount < response.minRequired) {
          setErrorMessage(
            `Недостаточно стихов на этапе повторения или выученных. Нужно минимум ${response.minRequired}, сейчас ${response.totalCount}.`
          );
          setVersePool([]);
          return;
        }
        const merged = response.verses
          .map(mapToTrainingVerse)
          .filter((verse): verse is TrainingVerse => verse !== null);
        setVersePool(merged);
        await startSessionFromPool(merged);
      } catch (error) {
        console.error("Не удалось загрузить стихи для закрепления:", error);
        setErrorMessage("Не удалось загрузить стихи для закрепления.");
        toast.error("Не удалось загрузить закрепление", {
          description: "Проверьте соединение и попробуйте снова.",
          label: "Закрепление",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [startSessionFromPool],
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

  const enqueueAnchorPersist = useCallback(
    (result: AnchorTrainingResult) => {
      if (!telegramId) return;
      persistChainRef.current = persistChainRef.current
        .then(async () => {
          try {
            const response = await submitAnchorSession({
              telegramId,
              results: [result],
            });
            if (response?.xpAwarded) {
              sessionXpRef.current += response.xpAwarded;
            }
            onSessionCommitted?.();
          } catch (error) {
            console.error("Не удалось сохранить прогресс закрепления:", error);
            toast.error("Прогресс не сохранён", {
              description: "Проверьте соединение и попробуйте снова.",
              label: "Закрепление",
            });
          }
        })
        .catch(() => {});
    },
    [onSessionCommitted, telegramId],
  );

  const finalizeAnswer = useCallback(
    (
      isCorrect: boolean,
      attemptsUsed: number,
      options?: { acceptedWithTolerance?: boolean; skipped?: boolean },
    ) => {
      if (!currentQuestion || isAnswered) return;
      const outcome: "correct_first" | "correct_retry" | "wrong" = isCorrect
        ? attemptsUsed <= 1
          ? "correct_first"
          : "correct_retry"
        : "wrong";
      const nextStatus: QuestionTerminalState = isCorrect ? "correct" : "wrong";
      const currentPendingOrderIndex = Math.max(
        0,
        pendingQuestionIds.findIndex((questionId) => questionId === currentQuestion.id),
      );
      const nextPendingQuestionIds = pendingQuestionIds.filter(
        (questionId) => questionId !== currentQuestion.id,
      );
      let nextPendingQuestionId =
        nextPendingQuestionIds.length > 0
          ? nextPendingQuestionIds[
              Math.min(currentPendingOrderIndex, nextPendingQuestionIds.length - 1)
            ] ?? nextPendingQuestionIds[0] ?? null
          : null;

      if (nextPendingQuestionId === null) {
        const seq = batchSeqRef.current;
        batchSeqRef.current += 1;
        const buildFresh = () =>
          buildSyncSessionQuestions(versePool, anchorModes).map((q) => ({
            ...q,
            id: `w${seq}-${q.id}`,
          }));
        let fresh = buildFresh();
        if (fresh.length === 0) {
          fresh = buildSyncSessionQuestions(versePool, anchorModes).map((q) => ({
            ...q,
            id: `w${seq}r-${q.id}`,
          }));
        }
        if (fresh.length > 0) {
          setQuestions((prev) => [...prev, ...fresh]);
          setQuestionStates((prev) => ({
            ...prev,
            ...buildInitialQuestionSessionState(fresh),
          }));
          nextPendingQuestionId = fresh[0]?.id ?? null;
        }
      }

      setIsAnswered(true);
      setLastAnswerCorrect(isCorrect);
      setLastAnswerUsedTolerance(Boolean(isCorrect && options?.acceptedWithTolerance));
      setLastAnswerSkipped(Boolean(options?.skipped));
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
      enqueueAnchorPersist({
        externalVerseId: currentQuestion.verse.externalVerseId,
        modeId: currentQuestion.modeId,
        outcome,
      });
    },
    [
      currentQuestion,
      enqueueAnchorPersist,
      isAnswered,
      pendingQuestionIds,
      versePool,
    ],
  );

  const handleChoiceSelect = (value: string) => {
    if (!currentQuestion || currentQuestion.interaction !== "choice") return;
    if (isAnswered) return;
    setHasInteracted(true);
    setSelectedOption(value);
    finalizeAnswer(currentQuestion.isCorrectOption(value), 1);
  };

  const handleTapSelect = (optionId: string) => {
    if (!currentQuestion || currentQuestion.interaction !== "tap") return;
    if (isAnswered) return;
    if (tapSequence.includes(optionId)) return;

    const option = currentQuestion.options.find((item) => item.id === optionId);
    if (!option) return;

    setHasInteracted(true);
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

  const handleOrderSubmit = (orderedIds: string[]) => {
    if (!currentQuestion || currentQuestion.interaction !== "drag") return;
    if (isAnswered) return;
    setHasInteracted(true);
    const isCorrect = orderedIds.every(
      (id, i) => id === (currentQuestion as DragQuestion).correctOrder[i],
    );
    finalizeAnswer(isCorrect, 1);
  };

  const handleTypeSubmit = () => {
    if (!currentQuestion || currentQuestion.interaction !== "type") return;
    if (isAnswered) return;

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

  const handleSkipQuestion = () => {
    if (!currentQuestion) return;
    if (isAnswered) return;

    const attemptsUsed =
      currentQuestion.interaction === "type" ? currentQuestion.maxAttempts : 1;
    finalizeAnswer(false, attemptsUsed, { skipped: true });
  };

  const controlsLocked = isLoading || isExitConfirmOpen;

  const advanceToNextQuestion = useCallback(() => {
    if (!isAnswered || !currentPendingQuestionId) return;

    setCurrentQuestionId(currentPendingQuestionId);
    resetAnswerState();
  }, [currentPendingQuestionId, isAnswered, resetAnswerState]);

  const isTypeMode = currentQuestion?.interaction === "type";
  const isCompactTypeMode =
    currentQuestion?.modeId === "context-prefix-type" ||
    currentQuestion?.modeId === "incipit-type";
  const typeInputReadiness =
    currentQuestion?.interaction === "type"
      ? getTypeInputReadiness(currentQuestion, typedAnswer)
      : null;
  const canSubmitTypeAnswer =
    currentQuestion?.interaction === "type"
      ? typeInputReadiness?.canSubmit === true
      : false;
  const shouldLiftTypeCard = isKeyboardOpen && isTypeMode && !isAnswered;
  const canContinueAfterReveal =
    isAnswered && currentPendingQuestionId !== null;
  const showSkipAction = Boolean(
    telegramId && !isLoading && !errorMessage && currentQuestion && !isAnswered,
  );

  const handleContinueAfterReveal = useCallback(() => {
    if (!canContinueAfterReveal) return;
    setDirection(1);
    advanceToNextQuestion();
  }, [advanceToNextQuestion, canContinueAfterReveal]);

  const showResultModal = useCallback(() => {
    setIsExitConfirmOpen(false);
    if (answeredCount > 0) {
      setIsResultModalOpen(true);
    } else {
      onClose();
    }
  }, [answeredCount, onClose]);

  const requestClose = useCallback(() => {
    if (hasInteracted && !isAnswered) {
      setIsExitConfirmOpen(true);
      return;
    }
    showResultModal();
  }, [hasInteracted, isAnswered, showResultModal]);

  const handleBackAction = useCallback(() => {
    if (isExitConfirmOpen) {
      setIsExitConfirmOpen(false);
      return;
    }

    requestClose();
  }, [isExitConfirmOpen, requestClose]);

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

  useEffect(() => {
    if (direction === 0 || typeof window === "undefined") return;

    const timeoutId = window.setTimeout(() => {
      setDirection(0);
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [direction, currentQuestion?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleBackAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBackAction]);

  const hasActiveQuestion = Boolean(
    telegramId && !isLoading && !errorMessage && versePool.length > 0 && questions.length > 0 && currentQuestion,
  );

  const modeRenderer = currentQuestion && (currentQuestion.interaction !== "type" || !isAnswered) ? (
    <AnchorTrainingModeRenderer
      question={currentQuestion}
      selectedOption={selectedOption}
      isAnswered={isAnswered}
      controlsLocked={controlsLocked}
      tapSequence={tapSequence}
      selectedTapLabels={selectedTapLabels}
      typedAnswer={typedAnswer}
      typingAttempts={typingAttempts}
      canSubmitTypeAnswer={canSubmitTypeAnswer}
      isCompactTypeMode={Boolean(isCompactTypeMode)}
      typeInputReadiness={typeInputReadiness}
      inputRef={inputRef}
      onChoiceSelect={handleChoiceSelect}
      onTapSelect={handleTapSelect}
      onTypedAnswerChange={(v: string) => {
        setTypedAnswer(v);
        if (v.trim()) setHasInteracted(true);
      }}
      onTypeSubmit={handleTypeSubmit}
      onOrderSubmit={handleOrderSubmit}
    />
  ) : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden overscroll-none bg-gradient-to-br from-background via-background to-muted/20">
        {isTelegramFullscreen ? (
          <header
            id="anchor-session-header"
            className="sticky top-0 z-10 shrink-0 overflow-hidden border-b border-border bg-card/90 backdrop-blur-xl transition-[opacity,transform] duration-400 ease-out opacity-100 translate-y-0"
            style={{ paddingTop: `${topInset}px` }}
          >
            <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
              <div className="flex min-h-11 items-center justify-center">
                <div className="truncate text-sm font-semibold text-primary">
                  Закрепление
                </div>
              </div>
            </div>
          </header>
        ) : (
          <div className="shrink-0" style={{ height: `${topInset}px` }} />
        )}

        {/* Accuracy bar + mode info */}
        {hasActiveQuestion && currentQuestion && (
          <div className="shrink-0 px-4 pt-2 pb-1 space-y-1.5">
            <div className="h-1.5 w-full max-w-md mx-auto rounded-full overflow-hidden bg-rose-500/30 flex">
              {answeredCount > 0 && (
                <div
                  className="bg-emerald-500/70 transition-[width] duration-300"
                  style={{ width: `${resultPercent}%` }}
                />
              )}
            </div>
            <p className="text-center text-[13px] text-muted-foreground/80 truncate">
              {getAnchorModeShortLabel(currentQuestion.modeId)} · {currentQuestion.modeHint}
            </p>
          </div>
        )}

        {/* Main content */}
        <div
          className="relative flex-1 min-h-0 flex flex-col"
          role="region"
          aria-roledescription="carousel"
          aria-label="Карточки закрепления"
        >
          {/* State screens (loading, error, empty) */}
          {!telegramId && (
            <div className="flex flex-1 items-center justify-center min-h-0 px-4">
              <AnchorTrainingStateCard
                title="Нет Telegram ID"
                description="Не удалось определить пользователя. Откройте закрепление из Telegram Mini App и попробуйте снова."
              />
            </div>
          )}

          {telegramId && isLoading && (
            <div className="flex flex-1 items-center justify-center min-h-0 px-4">
              <AnchorTrainingStateCard
                title="Загружаем сессию"
                description="Подбираем стихи для закрепления и собираем последовательность вопросов."
                visual="loading"
              />
            </div>
          )}

          {telegramId && !isLoading && errorMessage && (
            <div className="flex flex-1 items-center justify-center min-h-0 px-4">
              <AnchorTrainingStateCard
                title="Не удалось загрузить стихи"
                description={errorMessage}
                action={
                  <Button type="button" variant="outline" onClick={() => void loadVersePool(telegramId)}>
                    Повторить
                  </Button>
                }
              />
            </div>
          )}

          {telegramId && !isLoading && !errorMessage && versePool.length === 0 && (
            <div className="flex flex-1 items-center justify-center min-h-0 px-4">
              <AnchorTrainingStateCard
                title="Нет стихов для закрепления"
                description="Нужны стихи в статусах Изучаемые, Повторяемые или Выученные."
              />
            </div>
          )}

          {telegramId && !isLoading && !errorMessage && versePool.length > 0 && questions.length === 0 && (
            <div className="flex flex-1 items-center justify-center min-h-0 px-4">
              <AnchorTrainingStateCard
                title="Недостаточно данных для режима"
                description="Для выбранного режима пока не хватает подходящих стихов. Выберите другой режим закрепления."
              />
            </div>
          )}

          {/* Active question — 2-half layout */}
          {hasActiveQuestion && currentQuestion && (
            <AnimatePresence initial={false} mode="sync" custom={direction}>
              <motion.div
                key={currentQuestion.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 flex flex-col focus-visible:outline-none"
                tabIndex={-1}
              >
                {/* TOP HALF: verse prompt */}
                <div className={cn(
                  "flex items-center justify-center px-4 overflow-hidden",
                  shouldLiftTypeCard ? "flex-none max-h-[22vh] py-1" : "flex-1 min-h-0 py-3",
                )}>
                  <div className="w-full max-w-lg">
                    <div className="rounded-2xl border border-border/55 bg-card/40 px-4 py-4 shadow-sm backdrop-blur-sm">
                      <p className="whitespace-pre-line text-center font-serif text-[1.02rem] italic leading-relaxed text-foreground/90 sm:text-[1.08rem]">
                        {currentQuestion.prompt}
                      </p>
                    </div>
                    {/* Compact result feedback */}
                    {isAnswered && (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        {lastAnswerCorrect ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                        )}
                        <span className="text-sm text-foreground/70">
                          {lastAnswerSkipped
                            ? "Пропущено"
                            : lastAnswerCorrect
                              ? lastAnswerUsedTolerance
                                ? "Почти верно"
                                : "Верно"
                              : currentQuestion.answerLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM HALF: action area */}
                <ScrollShadowContainer className={cn(
                  "px-4 pb-2",
                  shouldLiftTypeCard ? "flex-1" : "flex-1 min-h-0",
                )}>
                  {modeRenderer}
                </ScrollShadowContainer>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div
          style={{ paddingBottom: `${Math.max(12, bottomInset)}px` }}
          className="shrink-0 px-4 sm:px-6 z-40 border-t border-border/30 bg-background/60 backdrop-blur-xl pt-2"
        >
          <div className="mx-auto w-full max-w-lg">
            {isAnswered ? (
              /* After answer: full-width "Дальше" */
              <Button
                type="button"
                className="w-full h-11 rounded-2xl border border-primary/25 bg-primary/85 text-primary-foreground shadow-sm hover:bg-primary/90"
                onClick={handleContinueAfterReveal}
              >
                Дальше
              </Button>
            ) : (
              /* Before answer: nav + skip + finish */
              <div className="flex items-center justify-center gap-2">
                <div className="flex flex-wrap items-center justify-center gap-2 min-w-0">
                  {showSkipAction && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-2xl border border-border/60 bg-muted/25 px-3 text-sm text-foreground/70 hover:bg-muted/40"
                      onClick={handleSkipQuestion}
                      disabled={controlsLocked}
                    >
                      Пропустить
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-10 rounded-2xl bg-background border border-border/60 w-fit text-sm px-3 text-foreground/75"
                    onClick={requestClose}
                  >
                    Завершить
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog
        open={isExitConfirmOpen}
        onOpenChange={(open) => { if (!open) setIsExitConfirmOpen(false); }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/90">
              Завершить сессию?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/90">
              Уже отправленные ответы сохранены. Текущая нерешённая карточка будет сброшена.
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
              onClick={showResultModal}
            >
              Выйти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result modal */}
      <AlertDialog
        open={isResultModalOpen}
        onOpenChange={(open) => { if (!open) onClose(); }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-base text-foreground/90">
              Сессия завершена
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 py-2 text-center">
            <p className="text-5xl font-semibold tabular-nums text-foreground/90">
              {resultPercent}%
            </p>
            <p className="text-sm text-foreground/70">
              {correctCount} из {answeredCount} верно
            </p>
            <div className="h-2 w-full max-w-xs mx-auto rounded-full overflow-hidden bg-rose-500/30 flex">
              {answeredCount > 0 && (
                <div
                  className="bg-emerald-500/70 rounded-full"
                  style={{ width: `${resultPercent}%` }}
                />
              )}
            </div>
            {sessionXpRef.current > 0 && (
              <p className="text-sm font-medium text-primary/85">
                +{sessionXpRef.current} XP
              </p>
            )}
          </div>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              className="rounded-full border border-primary/25 bg-primary/85 px-8 text-primary-foreground hover:bg-primary/90"
              onClick={onClose}
            >
              Закрыть
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
