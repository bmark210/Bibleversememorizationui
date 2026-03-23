'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { Verse } from '@/app/App';
import { normalizeComparableText } from '@/shared/training/fullRecallTypingAssist';
import { TrainingModeId } from '@/shared/training/modeEngine';
import { similarityRatio } from '@/shared/utils/levenshtein';

import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { useTrainingFontSize } from './useTrainingFontSize';
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import { TrainingExerciseModeHeader } from './TrainingExerciseModeHeader';
import { SplitExerciseActionRail } from './SplitExerciseActionRail';
import { TrainingExerciseSection, TrainingMetricBadge } from './TrainingExerciseSection';
import type { TrainingExerciseResolution } from './exerciseResult';
import type { ExerciseInlineActionsProps } from './exerciseInlineActions';
import type { HintState } from './useHintState';
import { tokenizeWords } from './wordUtils';
import {
  createExerciseProgressSnapshot,
  getCompletedWordCountFromFreeText,
} from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import { getExerciseRecallThreshold } from '@/modules/training/hints/exerciseDifficultyConfig';
import { useFlashTimeout } from './useFlashTimeout';
import { useSurrenderEffect } from './useSurrenderEffect';

interface TypingModeProps extends ExerciseInlineActionsProps {
  verse: Verse;
  trainingModeId: TrainingModeId;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
  onOpenVerseProgress?: () => void;
}

function calculateTextMatchPercent(userText: string, targetText: string) {
  return Math.max(0, Math.min(100, Math.round(similarityRatio(userText, targetText) * 100)));
}

export function ModeFullRecallExercise({
  verse,
  trainingModeId,
  onExerciseResolved,
  hintState,
  onProgressChange,
  isLateStageReview: _isLateStageReview = false,
  onOpenTutorial,
  onOpenVerseProgress,
  showInlineAssistButton = false,
  onRequestInlineAssist,
  showInlineQuickForgetAction = false,
  onRequestInlineQuickForget,
  inlineActionsDisabled = false,
}: TypingModeProps) {
  const fontSizes = useTrainingFontSize();
  const RECALL_THRESHOLD = getExerciseRecallThreshold(verse.difficultyLevel);
  const [userInput, setUserInput] = useState('');
  const [matchPercent, setMatchPercent] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const shakeFlash = useFlashTimeout<boolean>(240);
  const successFlashState = useFlashTimeout<boolean>();
  const [totalMistakes, setTotalMistakes] = useState(0);
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const surrendered = hintState?.surrendered ?? false;

  const targetComparableText = useMemo(
    () => normalizeComparableText(verse.text),
    [verse.text]
  );

  useEffect(() => {
    setUserInput('');
    setMatchPercent(null);
    setTotalMistakes(0);
    setIsCompleted(false);
    shakeFlash.clear();
    successFlashState.clear();

    return () => {
      shakeFlash.cleanup();
      successFlashState.cleanup();
      if (mobileFocusTimeoutRef.current) {
        window.clearTimeout(mobileFocusTimeoutRef.current);
        mobileFocusTimeoutRef.current = null;
      }
    };
  }, [verse]);

  useSurrenderEffect({
    surrendered,
    isCompleted,
    setIsCompleted,
    onExerciseResolved,
  });

  const totalWords = useMemo(() => tokenizeWords(verse.text).length, [verse.text]);
  const completedWords = useMemo(
    () => getCompletedWordCountFromFreeText(userInput),
    [userInput]
  );

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'full-recall',
        unitType: 'typed-word',
        expectedIndex: completedWords < totalWords ? completedWords : null,
        completedCount: completedWords,
        totalCount: totalWords,
        isCompleted: isCompleted || surrendered,
      })
    );
  }, [completedWords, isCompleted, onProgressChange, surrendered, totalWords]);

  const triggerInputShake = () => {
    shakeFlash.flash(true);
  };

  const handleInputChange = (nextRaw: string) => {
    if (isCompleted || surrendered) return;
    setUserInput(nextRaw);
    if (matchPercent !== null) {
      setMatchPercent(null);
    }
  };

  const handleInputFocus = () => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    if (mobileFocusTimeoutRef.current) {
      window.clearTimeout(mobileFocusTimeoutRef.current);
    }

    mobileFocusTimeoutRef.current = window.setTimeout(() => {
      inputRef.current?.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      });
      mobileFocusTimeoutRef.current = null;
    }, 140);
  };

  const handleCheck = () => {
    if (isCompleted) return;

    const typedComparableText = normalizeComparableText(userInput);
    if (!typedComparableText || !targetComparableText) {
      toast.warning('Сначала введите текст стиха', {
        toasterId: GALLERY_TOASTER_ID,
        size: 'compact',
      });
      triggerInputShake();
      return;
    }

    const nextMatchPercent = calculateTextMatchPercent(
      typedComparableText,
      targetComparableText
    );
    setMatchPercent(nextMatchPercent);

    if (nextMatchPercent >= RECALL_THRESHOLD) {
      setIsCompleted(true);

      successFlashState.flash(true);

      onExerciseResolved?.({
        kind: 'success',
        message: `Совпадение ${nextMatchPercent}%. Проверка пройдена.`,
        matchPercent: nextMatchPercent,
      });
      return;
    }

    setIsCompleted(true);
    setTotalMistakes((prev) => prev + 1);
    onExerciseResolved?.({
      kind: 'failure',
      reason: 'check-failed',
      message: `Совпадение ${nextMatchPercent}%. Попробуйте ещё раз.`,
      matchPercent: nextMatchPercent,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <TrainingExerciseModeHeader
        modeId={trainingModeId}
        verse={verse}
        onOpenHelp={onOpenTutorial}
        onOpenVerseProgress={onOpenVerseProgress}
      />
      <ScrollShadowContainer className="mt-3 flex-1" scrollClassName="space-y-3" shadowSize={20}>
        <TrainingExerciseSection
          title="Введите стих целиком"
          meta={
            <div className="flex items-center gap-1.5">
              <TrainingMetricBadge
                tone={completedWords === totalWords && totalWords > 0 ? 'success' : 'neutral'}
              >
                {completedWords}/{totalWords}
              </TrainingMetricBadge>
              <TrainingMetricBadge>{`Порог ${RECALL_THRESHOLD}%`}</TrainingMetricBadge>
              {totalMistakes > 0 ? (
                <TrainingMetricBadge tone="warning">
                  Проверок {totalMistakes}
                </TrainingMetricBadge>
              ) : null}
            </div>
          }
          className="min-h-0"
          contentClassName="flex h-full flex-col gap-3 pb-1"
        >
          <motion.div
            animate={shakeFlash.value === true ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
            transition={{ duration: 0.2 }}
            className={`relative flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background/70 p-2 transition-colors ${
              shakeFlash.value === true
                ? 'border-destructive/60 bg-destructive/5'
                : successFlashState.value === true
                  ? 'border-emerald-500/60 bg-emerald-500/5'
                  : 'border-border/60'
            }`}
          >
            <Textarea
              ref={inputRef}
              value={userInput}
              onChange={(event) => handleInputChange(event.target.value)}
              onFocus={handleInputFocus}
              placeholder="Введите стих целиком..."
              rows={5}
              className="relative min-h-[clamp(7.5rem,24dvh,10rem)] resize-none border-0 !bg-transparent p-4 leading-relaxed shadow-none !focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ fontSize: `${fontSizes.base}px` }}
              disabled={isCompleted || surrendered}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
            />
          </motion.div>

          {matchPercent !== null && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                matchPercent === 100
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : matchPercent >= RECALL_THRESHOLD
                    ? 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-destructive/45 bg-destructive/10 text-destructive'
              }`}
            >
              <p className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Процент соответствия</span>
                <span className="font-semibold tabular-nums">{matchPercent}%</span>
              </p>
            </div>
          )}

          {!isCompleted && !surrendered ? (
            <Button
              type="button"
              className="mb-2 w-full rounded-2xl border border-primary/20 bg-primary/85 text-primary-foreground shadow-sm hover:bg-primary/90"
              onClick={handleCheck}
            >
              Проверить
            </Button>
          ) : null}
        </TrainingExerciseSection>
      </ScrollShadowContainer>

      <SplitExerciseActionRail
        remainingMistakes={Math.max(0, totalMistakes)}
        showRemainingMistakes={false}
        showAssistButton={showInlineAssistButton}
        onRequestAssist={onRequestInlineAssist}
        showQuickForgetAction={showInlineQuickForgetAction}
        onRequestQuickForget={onRequestInlineQuickForget}
        disabled={inlineActionsDisabled}
      />

    </motion.div>
  );
}
