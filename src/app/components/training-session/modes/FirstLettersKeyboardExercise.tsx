'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { TrainingModeId } from '@/shared/training/modeEngine';

import { TrainingRatingFooter } from './TrainingRatingFooter';
import { Textarea } from "@/app/components/ui/textarea";
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import type { HintState } from './useHintState';
import { Verse } from '@/app/App';
import { tokenizeFirstLetters } from './wordUtils';
import { createExerciseProgressSnapshot } from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import { getExerciseMaxMistakes } from '@/modules/training/hints/exerciseDifficultyConfig';

interface FirstLettersKeyboardExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
}

function normalizeComparableLetter(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е');
}

function sanitizeInput(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .replace(/[ \t]+/g, ' ');
}

function compactLetters(value: string) {
  return normalizeComparableLetter(value).replace(/[^\p{L}\p{N}]+/gu, '');
}

function trimToMaxLetters(rawValue: string, maxLetters: number) {
  let lettersSeen = 0;
  let out = '';
  for (const ch of rawValue) {
    const isLetterLike = /[\p{L}\p{N}]/u.test(ch);
    if (isLetterLike) {
      if (lettersSeen >= maxLetters) break;
      lettersSeen += 1;
      out += ch;
      continue;
    }
    if (/\s/u.test(ch)) {
      out += ch;
    }
  }
  return out;
}

export function ModeFirstLettersKeyboardExercise({
  verse,
  onRate,
  hintState,
  onProgressChange,
}: FirstLettersKeyboardExerciseProps) {
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [expectedLetters, setExpectedLetters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const clearShakeTimeoutRef = useRef<number | null>(null);
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const surrendered = hintState?.surrendered ?? false;

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setExpectedLetters(letters);
    setInputValue('');
    setMistakesSinceReset(0);
    setIsCompleted(false);
    setShakeInput(false);

    return () => {
      if (clearShakeTimeoutRef.current) {
        window.clearTimeout(clearShakeTimeoutRef.current);
        clearShakeTimeoutRef.current = null;
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

  const expectedCompact = useMemo(
    () => expectedLetters.join(''),
    [expectedLetters]
  );
  const completedUnits = compactLetters(inputValue).length;
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.FirstLettersTyping,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: expectedLetters.length,
  });

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'first-letters-typing',
        expectedWordIndex:
          completedUnits < expectedLetters.length ? completedUnits : null,
        completedUnits,
        totalUnits: expectedLetters.length,
        isCompleted: isCompleted || surrendered,
      })
    );
  }, [completedUnits, expectedLetters.length, isCompleted, onProgressChange, surrendered]);

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

  const applyNextInputValue = (nextRaw: string) => {
    if (isCompleted || surrendered) return;

    const sanitized = trimToMaxLetters(sanitizeInput(nextRaw), expectedCompact.length);
    const compact = compactLetters(sanitized);
    const expectedPrefix = expectedCompact.slice(0, compact.length);

    if (compact === expectedPrefix) {
      setInputValue(sanitized);

      if (compact.length === expectedCompact.length && expectedCompact.length > 0) {
        setIsCompleted(true);
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetInput = nextMistakesSinceReset >= maxMistakes;
    setMistakesSinceReset(shouldResetInput ? 0 : nextMistakesSinceReset);

    if (shouldResetInput) {
      setInputValue('');
      toast.warning(
        `Допущено ${maxMistakes} ошибок. Ввод сброшен.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    } else {
      toast.warning(
        `Неверная буква. До сброса: ${
          maxMistakes - nextMistakesSinceReset
        }.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    }

    triggerInputShake();
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <div className="shrink-0 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/90">
          Введите первые буквы слов
        </label>
      </div>

      <ScrollShadowContainer className="mt-3 flex-1" scrollClassName="space-y-3" shadowSize={20}>

        <motion.div
          animate={shakeInput ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.2 }}
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b from-background to-muted/20 p-2 transition-colors ${
            shakeInput
              ? 'border-destructive/60 bg-destructive/5'
              : 'border-border/60'
          }`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary/5 to-transparent"
          />
          <Textarea
            ref={inputRef}
            value={inputValue}
            onChange={(event) => applyNextInputValue(event.target.value)}
            onFocus={handleInputFocus}
            placeholder="Введите первые буквы..."
            disabled={isCompleted || surrendered}
            data-swipe-through="true"
            className="relative min-h-[clamp(7.5rem,24dvh,10rem)] resize-none border-0 bg-transparent p-4 font-mono text-base uppercase tracking-[0.16em] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
          />
        </motion.div>
      </ScrollShadowContainer>

      {isCompleted && (
        <div className="shrink-0 pt-3">
          <TrainingRatingFooter>
            <TrainingRatingButtons
              stage={ratingStage}
              mode="first-letters"
              onRate={onRate}
              ratingPolicy={hintState?.ratingPolicy}
              allowEasySkip={false}
              excludeForget={!surrendered}
            />
          </TrainingRatingFooter>
        </div>
      )}
    </motion.div>
  );
}
