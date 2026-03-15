import { TrainingModeId, type TrainingModeRating } from "@/shared/training/modeEngine";
import type { VerseDifficultyLevel } from "@/shared/verses/difficulty";
import {
  getHintFirstWordsCount,
} from "./exerciseDifficultyConfig";
import type {
  ExerciseProgressSnapshot,
  HintRequestResult,
  HintType,
  TrainingAttempt,
  TrainingAttemptPhase,
  HintRatingPolicy,
} from "./types";

const HINT_AVAILABILITY: Partial<Record<TrainingModeId, HintType[]>> = {
  [TrainingModeId.ClickChunks]: ["context", "firstWords", "surrender"],
  [TrainingModeId.ClickWordsHinted]: ["context", "firstWords", "nextWord", "surrender"],
  [TrainingModeId.ClickWordsNoHints]: ["context", "firstWords", "nextWord", "surrender"],
  [TrainingModeId.FirstLettersWithWordHints]: ["context", "firstWords", "surrender"],
  [TrainingModeId.FirstLettersTapNoHints]: ["context", "firstWords", "surrender"],
  [TrainingModeId.FirstLettersTyping]: ["context", "firstWords", "nextWord", "surrender"],
  [TrainingModeId.FullRecall]: ["context", "firstWords", "nextWord", "surrender"],
  [TrainingModeId.VoiceRecall]: ["context", "firstWords", "surrender"],
};

function tokenizeHintWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
}

function getHintMaxRating(
  phase: TrainingAttemptPhase,
  type: HintType
): TrainingModeRating {
  if (type === "surrender") return 0;
  if (type === "nextWord" || type === "firstWords") return 1;
  if (type === "context") return phase === "review" ? 1 : 2;
  return phase === "review" ? 2 : 3;
}

function buildAllowedRatings(maxRating: TrainingModeRating): TrainingModeRating[] {
  if (maxRating <= 0) return [0];
  if (maxRating === 1) return [0, 1];
  if (maxRating === 2) return [0, 1, 2];
  return [0, 1, 2, 3];
}

export function resolveHintRatingPolicy(params: {
  phase: TrainingAttemptPhase;
  usedHints: readonly HintType[];
}): HintRatingPolicy {
  let maxRating: TrainingModeRating = params.phase === "review" ? 2 : 3;

  for (const type of params.usedHints) {
    maxRating = Math.min(maxRating, getHintMaxRating(params.phase, type)) as TrainingModeRating;
  }

  return {
    maxRating,
    allowedRatings: buildAllowedRatings(maxRating),
  };
}

export function getAvailableHints(
  modeId: TrainingModeId | number | null | undefined
): HintType[] {
  if (modeId == null) return [];
  return HINT_AVAILABILITY[modeId as TrainingModeId] ?? [];
}

export function isHintFree(type: HintType): boolean {
  return type === "context" || type === "surrender";
}

export function hasContextHint(
  contextPromptText: string | null | undefined
): boolean {
  return Boolean(contextPromptText?.trim());
}

export function generateHintFirstWords(
  verseText: string,
  difficultyLevel?: VerseDifficultyLevel | null
): string {
  const words = tokenizeHintWords(verseText);
  const count = Math.min(getHintFirstWordsCount(difficultyLevel), words.length);
  let result = words.slice(0, count).join(" ");

  if (difficultyLevel === "EXPERT" && words.length > count) {
    const nextWord = words[count];
    result += nextWord ? ` ${nextWord.charAt(0).toUpperCase()}\u2026` : "\u2026";
    return result;
  }

  return `${result}\u2026`;
}

export function generateNextWordHint(
  verseText: string,
  expectedWordIndex: number | null
): string | null {
  if (expectedWordIndex == null || expectedWordIndex < 0) return null;
  const words = tokenizeHintWords(verseText);
  return words[expectedWordIndex] ?? null;
}

export function canUseNextWordHint(attempt: Pick<TrainingAttempt, "progress" | "verseText">): boolean {
  const expectedWordIndex = attempt.progress?.expectedWordIndex ?? null;
  if (expectedWordIndex == null || expectedWordIndex <= 0) return false;
  return expectedWordIndex < tokenizeHintWords(attempt.verseText).length;
}

export function createTrainingAttempt(params: {
  key: string;
  modeId: TrainingModeId | null;
  phase: TrainingAttemptPhase;
  difficultyLevel: VerseDifficultyLevel | null | undefined;
  verseText: string;
}): TrainingAttempt {
  return {
    key: params.key,
    modeId: params.modeId,
    phase: params.phase,
    difficultyLevel: params.difficultyLevel ?? null,
    verseText: params.verseText,
    status: "active",
    progress: null,
    usedHints: [],
    hintEvents: [],
    nextWordCount: 0,
    ratingPolicy: resolveHintRatingPolicy({
      phase: params.phase,
      usedHints: [],
    }),
  };
}

export function updateTrainingAttemptProgress(
  attempt: TrainingAttempt,
  progress: ExerciseProgressSnapshot
): TrainingAttempt {
  if (attempt.status === "surrendered") {
    return { ...attempt, progress };
  }

  return {
    ...attempt,
    progress,
    status: progress.isCompleted ? "completed" : "active",
  };
}

function buildContextHint(params: {
  contextPromptText?: string;
  contextPromptReference?: string;
}): string | null {
  const body = params.contextPromptText?.trim() ?? "";
  if (!body) return null;
  const reference = params.contextPromptReference?.trim();
  return reference ? `${reference}\n${body}` : body;
}

export function requestTrainingAttemptHint(params: {
  attempt: TrainingAttempt;
  type: HintType;
  contextPromptText?: string;
  contextPromptReference?: string;
  remainingBudget: number;
}): HintRequestResult {
  const { attempt, type, contextPromptText, contextPromptReference, remainingBudget } = params;

  if (attempt.status !== "active") {
    return { kind: "rejected", reason: "attempt-locked" };
  }

  if (!getAvailableHints(attempt.modeId).includes(type)) {
    return { kind: "rejected", reason: "hint-unavailable" };
  }

  if (!isHintFree(type) && remainingBudget <= 0) {
    return { kind: "rejected", reason: "budget-exhausted" };
  }

  let text: string | null = null;

  switch (type) {
    case "context":
      text = buildContextHint({ contextPromptText, contextPromptReference });
      break;
    case "firstWords":
      text = generateHintFirstWords(attempt.verseText, attempt.difficultyLevel);
      break;
    case "nextWord":
      text = generateNextWordHint(
        attempt.verseText,
        attempt.progress?.expectedWordIndex ?? null
      );
      break;
    case "surrender":
      text = attempt.verseText;
      break;
  }

  if (!text) {
    return { kind: "rejected", reason: "hint-unavailable" };
  }

  const usedHints = attempt.usedHints.includes(type)
    ? attempt.usedHints
    : [...attempt.usedHints, type];
  const nextWordCount =
    type === "nextWord" ? attempt.nextWordCount + 1 : attempt.nextWordCount;
  const nextStatus = type === "surrender" ? "surrendered" : attempt.status;
  const nextAttempt: TrainingAttempt = {
    ...attempt,
    usedHints,
    hintEvents: [
      ...attempt.hintEvents,
      {
        type,
        createdAt: new Date().toISOString(),
        progressBefore: attempt.progress,
      },
    ],
    nextWordCount,
    status: nextStatus,
    ratingPolicy: resolveHintRatingPolicy({
      phase: attempt.phase,
      usedHints,
    }),
  };

  return {
    kind: "applied",
    attempt: nextAttempt,
    content: { type, text },
    tokensToConsume: isHintFree(type) ? 0 : 1,
  };
}
