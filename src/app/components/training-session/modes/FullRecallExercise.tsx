'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { Verse } from '@/app/App';
import { normalizeComparableText } from '@/shared/training/fullRecallTypingAssist';
import { similarityRatio } from '@/shared/utils/levenshtein';

import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';

interface TypingModeProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

function calculateTextMatchPercent(userText: string, targetText: string) {
  return Math.max(0, Math.min(100, Math.round(similarityRatio(userText, targetText) * 100)));
}

export function ModeFullRecallExercise({ verse, onRate }: TypingModeProps) {
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [userInput, setUserInput] = useState('');
  const [matchPercent, setMatchPercent] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const clearShakeTimeoutRef = useRef<number | null>(null);
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const targetComparableText = useMemo(
    () => normalizeComparableText(verse.text),
    [verse.text]
  );

  useEffect(() => {
    setUserInput('');
    setMatchPercent(null);
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
    if (isCompleted) return;
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

    if (nextMatchPercent >= 80) {
      setIsCompleted(true);
      toast.success(`Совпадение ${nextMatchPercent}%. Отлично!`, {
        toasterId: GALLERY_TOASTER_ID,
        size: 'compact',
      });
      return;
    }

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
      className="w-full"
    >
      <div className="space-y-3">
        <label className="block text-center text-sm font-medium text-foreground/90">
          Напечатайте стих по памяти
        </label>

        <motion.div
          animate={shakeInput ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.2 }}
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b from-background to-muted/20 p-2 shadow-sm transition-colors focus-within:border-primary/40 ${
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
            value={userInput}
            onChange={(event) => handleInputChange(event.target.value)}
            onFocus={handleInputFocus}
            placeholder="Введите стих целиком..."
            rows={5}
            className="relative min-h-[clamp(7.5rem,24dvh,10rem)] resize-none border-0 bg-transparent p-4 text-base leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isCompleted}
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
                : matchPercent >= 80
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

        {!isCompleted ? (
          <Button type="button" className="w-full rounded-xl border border-border/60 bg-background/20 text-foreground/80" onClick={handleCheck}>
            Проверить
          </Button>
        ) : (
          <TrainingRatingFooter>
            <TrainingRatingButtons
              stage={ratingStage}
              mode="full-recall"
              onRate={onRate}
            />
          </TrainingRatingFooter>
        )}
      </div>
    </motion.div>
  );
}
