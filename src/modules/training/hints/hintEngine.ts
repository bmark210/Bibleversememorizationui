import { type TrainingModeId, type TrainingModeRating } from "@/shared/training/modeEngine";
import type { VerseDifficultyLevel } from "@/shared/verses/difficulty";
import {
  getNextWordMaxUses,
  getShowVerseDurationSeconds,
} from "./exerciseDifficultyConfig";
import type {
  AssistContent,
  AssistDecision,
  AssistKind,
  AssistSuggestionState,
  AssistVariant,
  ExerciseProgressSnapshot,
  HintRatingPolicy,
  HintRequestResult,
  TrainingAttempt,
  TrainingAttemptFlowState,
  TrainingAttemptPhase,
  TrainingAttemptStatus,
} from "./types";

function deriveTrainingAttemptFlowState(params: {
  status: TrainingAttemptStatus;
  progress?: { isCompleted: boolean } | null;
  finalRating?: number | null;
}): TrainingAttemptFlowState {
  if (params.finalRating != null) return "finalized";
  if (params.status === "abandoned") return "finalized";
  if (params.status === "surrendered" || params.status === "completed") return "awaiting_rating";
  if (params.progress?.isCompleted) return "awaiting_rating";
  return "active";
}

function canUseTrainingAssist(flowState: TrainingAttemptFlowState): boolean {
  return flowState === "active";
}

function canShowTrainingAnswer(flowState: TrainingAttemptFlowState): boolean {
  return flowState === "active";
}

export function canDiscardTrainingAttempt(flowState: TrainingAttemptFlowState): boolean {
  return flowState !== "finalized";
}

function tokenizeHintWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
}

function buildAllowedRatings(maxRating: TrainingModeRating, phase: TrainingAttemptPhase): TrainingModeRating[] {
  if (maxRating <= 0) return [0];
  // maxRating === 1: no assist used
  if (phase === "review") return [0, 1];
  return [-1, 0, 1];
}

function countAssistUsesByVariant(
  attempt: Pick<TrainingAttempt, "assistHistory">,
  variant: AssistVariant
): number {
  return attempt.assistHistory.filter((assist) => assist.variant === variant).length;
}

function hasAssistVariant(
  attempt: Pick<TrainingAttempt, "assistHistory">,
  variant: AssistVariant
): boolean {
  return countAssistUsesByVariant(attempt, variant) > 0;
}

function getAssistKindForVariant(variant: AssistVariant): AssistKind {
  if (variant === "full_text" || variant === "full_text_preview") return "full_reveal";
  // next_word and legacy variants → content_reveal
  return "content_reveal";
}

function resolveInitialRatingPolicy(phase: TrainingAttemptPhase): HintRatingPolicy {
  const maxRating: TrainingModeRating = 1;
  return {
    maxRating,
    allowedRatings: buildAllowedRatings(maxRating, phase),
    assisted: false,
  };
}

export function resolveHintRatingPolicy(params: {
  phase: TrainingAttemptPhase;
  assistHistory: readonly Pick<AssistDecision, "kind" | "variant">[];
}): HintRatingPolicy {
  const assisted = params.assistHistory.length > 0;

  // Any assist caps rating to 0 (сложно) — user cannot claim "далее" after receiving help
  const maxRating: TrainingModeRating = assisted ? 0 : 1;
  const allowedRatings = buildAllowedRatings(maxRating, params.phase);

  return {
    maxRating,
    allowedRatings,
    assisted,
  };
}

export function generateNextWordHint(
  verseText: string,
  expectedIndex: number | null
): string | null {
  if (expectedIndex == null || expectedIndex < 0) return null;
  const words = tokenizeHintWords(verseText);
  return words[expectedIndex] ?? null;
}

function buildAssistContent(params: {
  attempt: TrainingAttempt;
  variant: AssistVariant;
}): AssistContent | null {
  const { attempt, variant } = params;

  if (variant === "next_word") {
    const text = generateNextWordHint(
      attempt.verseText,
      attempt.progress?.expectedIndex ?? attempt.progress?.expectedWordIndex ?? null
    );
    if (!text) return null;
    return {
      kind: "content_reveal",
      variant,
      title: "Следующий шаг",
      text,
    };
  }

  if (variant === "full_text_preview") {
    return {
      kind: "full_reveal",
      variant,
      title: "Полный стих",
      text: attempt.verseText,
      durationSeconds: getShowVerseDurationSeconds(attempt.difficultyLevel),
    };
  }

  return {
    kind: "full_reveal",
    variant,
    title: "Полный текст",
    text: attempt.verseText,
  };
}

function buildAssistDecision(params: {
  attempt: TrainingAttempt;
  variant: AssistVariant;
}): AssistDecision | null {
  const content = buildAssistContent(params);
  if (!content) return null;

  const kind = getAssistKindForVariant(params.variant);

  return {
    kind,
    variant: params.variant,
    stage:
      params.variant === "next_word"
        ? params.attempt.assistStage + 1
        : params.attempt.assistStage,
    content,
    locksInput: params.variant === "full_text",
  };
}

function applyAssistDecision(
  attempt: TrainingAttempt,
  decision: AssistDecision
): TrainingAttempt {
  const assistHistory = [
    ...attempt.assistHistory,
    {
      kind: decision.kind,
      variant: decision.variant,
      createdAt: new Date().toISOString(),
      progressBefore: attempt.progress,
      content: decision.content,
    },
  ];

  const ratingPolicy = resolveHintRatingPolicy({
    phase: attempt.phase,
    assistHistory,
  });

  const nextStatus = decision.locksInput ? "surrendered" : attempt.status;

  return {
    ...attempt,
    assistStage: decision.stage,
    assisted: true,
    activeAssist: decision.content,
    assistHistory,
    status: nextStatus,
    flowState: deriveTrainingAttemptFlowState({
      status: nextStatus,
      progress: attempt.progress,
      finalRating: null,
    }),
    ratingPolicy,
  };
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
    flowState: "active",
    progress: null,
    assistStage: 0,
    assisted: false,
    assistHistory: [],
    activeAssist: null,
    ratingPolicy: resolveInitialRatingPolicy(params.phase),
  };
}

export function updateTrainingAttemptProgress(
  attempt: TrainingAttempt,
  progress: ExerciseProgressSnapshot
): TrainingAttempt {
  if (attempt.status === "abandoned") {
    return {
      ...attempt,
      progress,
      flowState: deriveTrainingAttemptFlowState({
        status: attempt.status,
        progress,
        finalRating: null,
      }),
    };
  }

  const nextStatus =
    attempt.status === "surrendered"
      ? "surrendered"
      : progress.isCompleted
        ? "completed"
        : "active";

  return {
    ...attempt,
    progress,
    status: nextStatus,
    flowState: deriveTrainingAttemptFlowState({
      status: nextStatus,
      progress,
      finalRating: null,
    }),
  };
}

export function canUseNextWordHint(
  attempt: Pick<TrainingAttempt, "progress" | "verseText">
): boolean {
  const expectedIndex =
    attempt.progress?.expectedIndex ?? attempt.progress?.expectedWordIndex ?? null;
  if (expectedIndex == null || expectedIndex < 0) return false;
  return expectedIndex < tokenizeHintWords(attempt.verseText).length;
}

export function getNextAssistPreview(params: {
  attempt: TrainingAttempt;
}):
  | { label: string; description: string; nextWordUsed: number; nextWordMax: number }
  | null {
  const nextWordMax = getNextWordMaxUses(params.attempt.difficultyLevel);
  const nextWordUsed = Math.min(
    countAssistUsesByVariant(params.attempt, "next_word"),
    nextWordMax
  );

  if (nextWordUsed >= nextWordMax || !canUseNextWordHint(params.attempt)) {
    return null;
  }

  return {
    label: "След. слово",
    description: "Подсказка следующего ожидаемого слова",
    nextWordUsed,
    nextWordMax,
  };
}

export function requestTrainingAssist(params: {
  attempt: TrainingAttempt;
}): HintRequestResult {
  const { attempt } = params;

  if (!canUseTrainingAssist(attempt.flowState)) {
    return { kind: "rejected", reason: "attempt-locked" };
  }

  if (!canUseNextWordHint(attempt)) {
    return { kind: "rejected", reason: "hint-unavailable" };
  }

  const maxUses = getNextWordMaxUses(attempt.difficultyLevel);
  const nextWordUsed = countAssistUsesByVariant(attempt, "next_word");
  if (nextWordUsed >= maxUses) {
    return { kind: "rejected", reason: "hint-unavailable" };
  }

  const attemptForDecision =
    nextWordUsed !== attempt.assistStage
      ? { ...attempt, assistStage: nextWordUsed }
      : attempt;

  const decision = buildAssistDecision({
    attempt: attemptForDecision,
    variant: "next_word",
  });
  if (!decision) {
    return { kind: "rejected", reason: "hint-unavailable" };
  }

  const nextAttempt = applyAssistDecision(attemptForDecision, decision);
  return {
    kind: "applied",
    attempt: nextAttempt,
    content: decision.content,
  };
}

export function requestTrainingShowVerse(params: {
  attempt: TrainingAttempt;
}): HintRequestResult {
  const { attempt } = params;

  if (!canShowTrainingAnswer(attempt.flowState)) {
    return { kind: "rejected", reason: "attempt-locked" };
  }

  if (hasAssistVariant(attempt, "full_text_preview")) {
    return { kind: "rejected", reason: "hint-unavailable" };
  }

  const decision = buildAssistDecision({
    attempt,
    variant: "full_text_preview",
  });
  if (!decision) {
    return { kind: "rejected", reason: "hint-unavailable" };
  }

  const nextAttempt = applyAssistDecision(attempt, decision);
  return {
    kind: "applied",
    attempt: nextAttempt,
    content: decision.content,
  };
}

export function clearActiveAssist(attempt: TrainingAttempt): TrainingAttempt {
  if (!attempt.activeAssist) return attempt;
  return {
    ...attempt,
    activeAssist: null,
  };
}

export function abandonTrainingAttempt(attempt: TrainingAttempt): TrainingAttempt {
  if (attempt.flowState === "finalized") {
    return attempt;
  }

  return {
    ...attempt,
    status: "abandoned",
    flowState: "finalized",
    activeAssist: null,
  };
}

export function getAssistSuggestionState(params: {
  attempt: TrainingAttempt;
  stallMs: number;
  mistakeCount: number;
  stallThresholdMs: number;
  mistakeThreshold: number;
}): AssistSuggestionState {
  const isLocked =
    params.attempt.flowState !== "active" ||
    Boolean(params.attempt.activeAssist);

  if (isLocked) {
    return {
      shouldSuggest: false,
      label: "Подсказка",
    };
  }

  const preview = getNextAssistPreview({
    attempt: params.attempt,
  });
  const shouldSuggest =
    params.stallMs >= params.stallThresholdMs ||
    params.mistakeCount >= params.mistakeThreshold;

  return {
    shouldSuggest,
    label:
      shouldSuggest && preview
        ? `Нужна подсказка: ${preview.label}`
        : "Подсказка",
  };
}

export function getAttemptProgressSummary(
  attempt: Pick<TrainingAttempt, "progress">
): ExerciseProgressSnapshot | null {
  return attempt.progress ?? null;
}

export function getAttemptExpectedIndex(
  attempt: Pick<TrainingAttempt, "progress">
): number | null {
  return attempt.progress?.expectedIndex ?? attempt.progress?.expectedWordIndex ?? null;
}

export function getAttemptWordCount(attempt: Pick<TrainingAttempt, "verseText">): number {
  return tokenizeHintWords(attempt.verseText).length;
}

export function hasMeaningfulProgress(attempt: Pick<TrainingAttempt, "progress">): boolean {
  return Boolean(attempt.progress && attempt.progress.totalCount > 0);
}
