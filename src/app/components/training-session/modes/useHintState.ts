'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TrainingModeId } from '@/shared/training/modeEngine';
import type { VerseDifficultyLevel } from '@/shared/verses/difficulty';
import {
  canUseNextWordHint,
  createTrainingAttempt,
  getAvailableHints,
  hasContextHint,
  requestTrainingAttemptHint,
  updateTrainingAttemptProgress,
} from '@/modules/training/hints/hintEngine';
import type {
  ExerciseProgressSnapshot,
  HintContent,
  HintRatingPolicy,
  HintType,
  TrainingAttempt,
  TrainingAttemptPhase,
  TrainingAttemptStatus,
} from '@/modules/training/hints/types';
import {
  readHintBudget,
  consumeHintToken,
  getHintBudgetTotal,
} from './hintBudgetStorage';

export interface HintState {
  attempt: TrainingAttempt;
  usedHints: ReadonlySet<HintType>;
  nextWordCount: number;
  surrendered: boolean;
  attemptStatus: TrainingAttemptStatus;
  ratingPolicy: HintRatingPolicy;
  activeHintContent: HintContent | null;
  remainingBudget: number;
  totalBudget: number;
}

export interface UseHintStateOptions {
  attemptKey: string;
  phase: TrainingAttemptPhase;
  verseText: string;
  contextPromptText?: string;
  contextPromptReference?: string;
  modeId?: TrainingModeId | number;
  difficultyLevel?: VerseDifficultyLevel | null;
}

export interface UseHintStateReturn {
  hintState: HintState;
  requestHint: (type: HintType) => void;
  dismissHintContent: () => void;
  resetHints: () => void;
  updateProgress: (progress: ExerciseProgressSnapshot) => void;
  hasContext: boolean;
  canShowNextWord: () => boolean;
  availableHints: HintType[];
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
  contextPromptText,
  contextPromptReference,
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
  const [activeHintContent, setActiveHintContent] = useState<HintContent | null>(
    null
  );
  const [budgetRemaining, setBudgetRemaining] = useState(
    () => readHintBudget().remaining
  );

  const attemptRef = useRef(attempt);
  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    setAttempt(
      toAttempt({
        attemptKey,
        phase,
        verseText,
        modeId,
        difficultyLevel,
      })
    );
    setActiveHintContent(null);
    setBudgetRemaining(readHintBudget().remaining);
  }, [attemptKey, phase, verseText, modeId, difficultyLevel]);

  const hasContext = hasContextHint(contextPromptText);

  const availableHints = useMemo(
    () => getAvailableHints(modeId),
    [modeId]
  );

  const totalBudget = getHintBudgetTotal();

  const requestHint = useCallback(
    (type: HintType) => {
      const currentAttempt = attemptRef.current;
      const budget = readHintBudget();
      const result = requestTrainingAttemptHint({
        attempt: currentAttempt,
        type,
        contextPromptText,
        contextPromptReference,
        remainingBudget: budget.remaining,
      });

      if (result.kind !== 'applied') {
        setBudgetRemaining(budget.remaining);
        return;
      }

      if (result.tokensToConsume > 0) {
        const consumed = consumeHintToken();
        const refreshedBudget = readHintBudget();
        setBudgetRemaining(refreshedBudget.remaining);
        if (!consumed) return;
      } else if (budgetRemaining !== budget.remaining) {
        setBudgetRemaining(budget.remaining);
      }

      setAttempt(result.attempt);
      setActiveHintContent(result.content);
    },
    [budgetRemaining, contextPromptReference, contextPromptText]
  );

  const dismissHintContent = useCallback(() => {
    setActiveHintContent(null);
  }, []);

  const resetHints = useCallback(() => {
    setAttempt(
      toAttempt({
        attemptKey,
        phase,
        verseText,
        modeId,
        difficultyLevel,
      })
    );
    setActiveHintContent(null);
    setBudgetRemaining(readHintBudget().remaining);
  }, [attemptKey, difficultyLevel, modeId, phase, verseText]);

  const updateProgress = useCallback((progress: ExerciseProgressSnapshot) => {
    setAttempt((prev) => updateTrainingAttemptProgress(prev, progress));
  }, []);

  const hintState: HintState = useMemo(
    () => ({
      attempt,
      usedHints: new Set(attempt.usedHints),
      nextWordCount: attempt.nextWordCount,
      surrendered: attempt.status === 'surrendered',
      attemptStatus: attempt.status,
      ratingPolicy: attempt.ratingPolicy,
      activeHintContent,
      remainingBudget: budgetRemaining,
      totalBudget,
    }),
    [attempt, activeHintContent, budgetRemaining, totalBudget]
  );

  const canShowNextWord = useCallback(() => {
    return canUseNextWordHint(attemptRef.current);
  }, []);

  return {
    hintState,
    requestHint,
    dismissHintContent,
    resetHints,
    updateProgress,
    hasContext,
    canShowNextWord,
    availableHints,
  };
}
