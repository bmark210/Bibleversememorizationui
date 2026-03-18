'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { Verse } from '@/app/App';
import { normalizeComparableText } from '@/shared/training/fullRecallTypingAssist';
import { similarityRatio } from '@/shared/utils/levenshtein';

import { Info } from 'lucide-react';
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { useTrainingFontSize } from './useTrainingFontSize';
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { FixedBottomPanel } from './FixedBottomPanel';
import type { HintState } from './useHintState';
import { tokenizeWords } from './wordUtils';
import {
  createExerciseProgressSnapshot,
  getCompletedWordCountFromFreeText,
} from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import { getExerciseRecallThreshold } from '@/modules/training/hints/exerciseDifficultyConfig';

interface TypingModeProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
}

function calculateTextMatchPercent(userText: string, targetText: string) {
  return Math.max(0, Math.min(100, Math.round(similarityRatio(userText, targetText) * 100)));
}

export function ModeFullRecallExercise({ verse, onRate, hintState, onProgressChange, isLateStageReview = false, onOpenTutorial }: TypingModeProps) {
  const fontSizes = useTrainingFontSize();
  const RECALL_THRESHOLD = getExerciseRecallThreshold(verse.difficultyLevel);
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [userInput, setUserInput] = useState('');
  const [matchPercent, setMatchPercent] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const clearShakeTimeoutRef = useRef<number | null>(null);
  const clearSuccessFlashTimeoutRef = useRef<number | null>(null);
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
    setShakeInput(false);
    setSuccessFlash(false);

    return () => {
      if (clearShakeTimeoutRef.current) {
        window.clearTimeout(clearShakeTimeoutRef.current);
        clearShakeTimeoutRef.current = null;
      }
      if (clearSuccessFlashTimeoutRef.current) {
        window.clearTimeout(clearSuccessFlashTimeoutRef.current);
        clearSuccessFlashTimeoutRef.current = null;
      }
      if (mobileFocusTimeoutRef.current) {
        window.clearTimeout(mobileFocusTimeoutRef.current);
        mobileFocusTimeoutRef.current = null;
      }
    };
  }, [verse]);

  useEffect(() => {
    if (surrendered && !isCompleted) setIsCompleted(true);
  }, [surrendered, isCompleted]);

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
    setShakeInput(true);
    if (clearShakeTimeoutRef.current) {
      window.clearTimeout(clearShakeTimeoutRef.current);
    }
    clearShakeTimeoutRef.current = window.setTimeout(() => {
      setShakeInput(false);
      clearShakeTimeoutRef.current = null;
    }, 240);
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

      setSuccessFlash(true);
      if (clearSuccessFlashTimeoutRef.current) {
        window.clearTimeout(clearSuccessFlashTimeoutRef.current);
      }
      clearSuccessFlashTimeoutRef.current = window.setTimeout(() => {
        setSuccessFlash(false);
        clearSuccessFlashTimeoutRef.current = null;
      }, 260);

      toast.success(`Совпадение ${nextMatchPercent}%. Отлично!`, {
        toasterId: GALLERY_TOASTER_ID,
        size: 'compact',
      });
      return;
    }

    setTotalMistakes((prev) => prev + 1);
    toast.warning(`Совпадение ${nextMatchPercent}%. Попробуйте ещё раз.`, {
      toasterId: GALLERY_TOASTER_ID,
      size: 'compact',
    });
    triggerInputShake();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      {totalMistakes > 0 && (
        <span className="absolute right-0 top-0 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold tabular-nums text-white">
          {totalMistakes}
        </span>
      )}
      <div className="shrink-0 flex items-center justify-center gap-1.5">
        <label className="text-sm font-medium text-foreground/90">
          Напечатайте стих по памяти
        </label>
        {onOpenTutorial && (
          <button type="button" onClick={onOpenTutorial} className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground/60 hover:text-foreground/80 transition-colors" aria-label="Подробнее о режиме">
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

      <ScrollShadowContainer className="mt-3 flex-1" scrollClassName="space-y-3" shadowSize={20}>

        <motion.div
          animate={shakeInput ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.2 }}
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b from-background to-muted/20 p-2 shadow-sm transition-colors focus-within:border-primary/40 ${
            shakeInput
              ? 'border-destructive/60 bg-destructive/5'
              : successFlash
                ? 'border-emerald-500/60 bg-emerald-500/5'
                : 'border-border/60'
          }`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary/5 to-transparent"
          />
          <Textarea
            ref={inputRef}
            value={userInput}
            onChange={(event) => handleInputChange(event.target.value)}
            onFocus={handleInputFocus}
            placeholder="Введите стих целиком..."
            rows={5}
            className="relative min-h-[clamp(7.5rem,24dvh,10rem)] resize-none border-0 bg-transparent p-4 leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
      </ScrollShadowContainer>

      <FixedBottomPanel visible={!isCompleted}>
        <Button type="button" className="mb-2 w-full rounded-xl border border-border/60 bg-card/60 text-foreground/80" onClick={handleCheck}>
          Проверить
        </Button>
      </FixedBottomPanel>

      {isCompleted && (
        <div className="shrink-0 pt-3">
          <TrainingRatingFooter>
            <TrainingRatingButtons
              stage={ratingStage}
              mode="full-recall"
              onRate={onRate}
              ratingPolicy={hintState?.ratingPolicy}
              allowEasySkip={false}
              excludeForget={isLateStageReview ? true : (ratingStage === 'learning' ? false : !surrendered)}
              lateStageReview={isLateStageReview}
              disabled={false}
            />
          </TrainingRatingFooter>
        </div>
      )}
    </motion.div>
  );
}
