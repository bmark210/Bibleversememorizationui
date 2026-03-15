'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TrainingModeId } from '@/shared/training/modeEngine';
import type { VerseDifficultyLevel } from '@/shared/verses/difficulty';
import {
  abandonTrainingAttempt,
  clearActiveAssist,
  createTrainingAttempt,
  getAssistSuggestionState,
  getNextAssistPreview,
  requestTrainingShowVerse,
  requestTrainingAssist,
  updateTrainingAttemptProgress,
} from '@/modules/training/hints/hintEngine';
import {
  getAssistSuggestionMistakeThreshold,
  getAssistSuggestionThresholdMs,
  getShowVerseDurationSeconds,
} from '@/modules/training/hints/exerciseDifficultyConfig';
import { consumeHintToken, readHintBudget } from './hintBudgetStorage';
import type {
  AssistContent,
  AssistSuggestionState,
  ExerciseProgressSnapshot,
  HintRatingPolicy,
  HintRequestResult,
  TrainingAttempt,
  TrainingAttemptFlowState,
  TrainingAttemptPhase,
  TrainingAttemptStatus,
} from '@/modules/training/hints/types';

export interface HintState {
  attempt: TrainingAttempt;
  assistStage: number;
  assisted: boolean;
  surrendered: boolean;
  attemptStatus: TrainingAttemptStatus;
  flowState: TrainingAttemptFlowState;
  ratingPolicy: HintRatingPolicy;
  activeHintContent: AssistContent | null;
  nextAssistPreview:
    | { label: string; description: string; nextWordUsed: number; nextWordMax: number }
    | null;
  assistSuggestion: AssistSuggestionState;
  showVerseUsed: boolean;
  canShowVerse: boolean;
  showVerseDurationSeconds: number;
  hintBudgetRemaining: number;
  hintBudgetTotal: number;
}

export interface UseHintStateOptions {
  attemptKey: string;
  phase: TrainingAttemptPhase;
  verseText: string;
  modeId?: TrainingModeId | number;
  difficultyLevel?: VerseDifficultyLevel | null;
}

export interface UseHintStateReturn {
  hintState: HintState;
  requestAssist: () => void;
  requestShowVerse: () => void;
  dismissHintContent: () => void;
  resetHints: () => void;
  abandonAttempt: () => void;
  updateProgress: (progress: ExerciseProgressSnapshot) => void;
}

export interface BudgetedHintRequestExecution {
  requestResult: HintRequestResult | null;
  consumedBudget: boolean;
}

export function executeHintRequestWithBudget(params: {
  request: () => HintRequestResult;
  readBudget?: typeof readHintBudget;
  consumeToken?: typeof consumeHintToken;
}): BudgetedHintRequestExecution {
  const readBudgetState = params.readBudget ?? readHintBudget;
  const consumeToken = params.consumeToken ?? consumeHintToken;

  if (readBudgetState().remaining <= 0) {
    return {
      requestResult: null,
      consumedBudget: false,
    };
  }

  const requestResult = params.request();
  if (requestResult.kind !== 'applied') {
    return {
      requestResult,
      consumedBudget: false,
    };
  }

  const consumedBudget = consumeToken();
  return {
    requestResult: consumedBudget ? requestResult : null,
    consumedBudget,
  };
}

function toAttempt(params: {
  attemptKey: string;
  phase: TrainingAttemptPhase;
  verseText: string;
  modeId?: TrainingModeId | number;
  difficultyLevel?: VerseDifficultyLevel | null;
}): TrainingAttempt {
  return createTrainingAttempt({
    key: params.attemptKey,
    modeId:
      typeof params.modeId === 'number'
        ? (params.modeId as TrainingModeId)
        : null,
    phase: params.phase,
    verseText: params.verseText,
    difficultyLevel: params.difficultyLevel ?? null,
  });
}

export function useHintState({
  attemptKey,
  phase,
  verseText,
  modeId,
  difficultyLevel,
}: UseHintStateOptions): UseHintStateReturn {
  const [attempt, setAttempt] = useState(() =>
    toAttempt({
      attemptKey,
      phase,
      verseText,
      modeId,
      difficultyLevel,
    })
  );
  const [tick, setTick] = useState(() => Date.now());

  const attemptRef = useRef(attempt);
  const lastProgressAtRef = useRef(Date.now());

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  // Reset attempt when key changes
  useEffect(() => {
    const fresh = toAttempt({
      attemptKey,
      phase,
      verseText,
      modeId,
      difficultyLevel,
    });
    setAttempt(fresh);
    lastProgressAtRef.current = Date.now();
  }, [attemptKey, difficultyLevel, modeId, phase, verseText]);

  // Tick for stall detection
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const requestAssist = useCallback(() => {
    const { requestResult } = executeHintRequestWithBudget({
      request: () =>
        requestTrainingAssist({
          attempt: attemptRef.current,
        }),
    });
    if (requestResult?.kind === 'applied') {
      setAttempt(requestResult.attempt);
    }
  }, []);

  const requestShowVerse = useCallback(() => {
    const { requestResult } = executeHintRequestWithBudget({
      request: () =>
        requestTrainingShowVerse({
          attempt: attemptRef.current,
        }),
    });
    if (requestResult?.kind === 'applied') {
      setAttempt(requestResult.attempt);
    }
  }, []);

  const dismissHintContent = useCallback(() => {
    setAttempt((prev) => clearActiveAssist(prev));
  }, []);

  const resetHints = useCallback(() => {
    const fresh = toAttempt({
      attemptKey,
      phase,
      verseText,
      modeId,
      difficultyLevel,
    });
    setAttempt(fresh);
    lastProgressAtRef.current = Date.now();
  }, [attemptKey, difficultyLevel, modeId, phase, verseText]);

  const abandonAttempt = useCallback(() => {
    setAttempt((prev) => {
      if (prev.flowState === 'finalized') return prev;
      return abandonTrainingAttempt(prev);
    });
  }, []);

  const updateProgress = useCallback((progress: ExerciseProgressSnapshot) => {
    lastProgressAtRef.current = Date.now();
    setAttempt((prev) => updateTrainingAttemptProgress(prev, progress));
  }, []);

  const stallThresholdMs = getAssistSuggestionThresholdMs({
    phase,
    modeId: typeof modeId === 'number' ? (modeId as TrainingModeId) : null,
  });
  const mistakeThreshold = getAssistSuggestionMistakeThreshold({ phase });
  const liveStallMs = Math.max(0, tick - lastProgressAtRef.current);
  const assistSuggestion = useMemo(
    () =>
      getAssistSuggestionState({
        attempt,
        stallMs: liveStallMs,
        mistakeCount: attempt.progress?.mistakeCount ?? 0,
        stallThresholdMs,
        mistakeThreshold,
      }),
    [attempt, liveStallMs, mistakeThreshold, stallThresholdMs]
  );

  const nextAssistPreview = useMemo(
    () =>
      getNextAssistPreview({
        attempt,
      }),
    [attempt]
  );
  const showVerseUsed = useMemo(
    () => attempt.assistHistory.some((assist) => assist.variant === 'full_text_preview'),
    [attempt.assistHistory]
  );
  const showVerseDurationSeconds = useMemo(
    () => getShowVerseDurationSeconds(attempt.difficultyLevel),
    [attempt.difficultyLevel]
  );

  const hintBudget = readHintBudget();

  const hintState: HintState = useMemo(
    () => ({
      attempt,
      assistStage: attempt.assistStage,
      assisted: attempt.assisted,
      surrendered: attempt.status === 'surrendered',
      attemptStatus: attempt.status,
      flowState: attempt.flowState,
      ratingPolicy: attempt.ratingPolicy,
      activeHintContent: attempt.activeAssist,
      nextAssistPreview,
      assistSuggestion,
      showVerseUsed,
      canShowVerse: attempt.flowState === 'active' && !showVerseUsed,
      showVerseDurationSeconds,
      hintBudgetRemaining: hintBudget.remaining,
      hintBudgetTotal: hintBudget.total,
    }),
    [assistSuggestion, attempt, nextAssistPreview, showVerseDurationSeconds, showVerseUsed, tick]
  );

  return {
    hintState,
    requestAssist,
    requestShowVerse,
    dismissHintContent,
    resetHints,
    abandonAttempt,
    updateProgress,
  };
}
