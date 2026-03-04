'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { AnimatePresence, motion } from 'motion/react';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { Verse } from '@/app/App';
import {
  analyzeGuidedInput,
  normalizeComparableText,
  tokenizeComparableWords,
} from '@/shared/training/fullRecallTypingAssist';

interface TypingModeProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

function isFullRecallInputPrefixValid(userInput: string, targetWords: string[]) {
  const analysis = analyzeGuidedInput(userInput, targetWords);

  if (analysis.completedWords.length > targetWords.length) {
    return { valid: false, analysis };
  }

  for (let index = 0; index < analysis.completedWords.length; index += 1) {
    if (analysis.completedWords[index] !== targetWords[index]) {
      return { valid: false, analysis };
    }
  }

  if (!analysis.currentPrefix) {
    return { valid: true, analysis };
  }

  if (!analysis.expectedWord) {
    return { valid: false, analysis };
  }

  return {
    valid: analysis.expectedWord.startsWith(analysis.currentPrefix),
    analysis,
  };
}

export function ModeFullRecallExercise({ verse, onRate }: TypingModeProps) {
  const MAX_MISTAKES_BEFORE_RESET = 5;
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [shakeInput, setShakeInput] = useState(false);
  const clearShakeTimeoutRef = useRef<number | null>(null);
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const targetComparableWords = useMemo(
    () => tokenizeComparableWords(verse.text),
    [verse.text]
  );
  const targetComparableText = useMemo(
    () => normalizeComparableText(verse.text),
    [verse.text]
  );

  useEffect(() => {
    setUserInput('');
    setShowHint(false);
    setIsChecked(false);
    setMistakes(0);
    setMistakesSinceReset(0);
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
  }, [verse.id, verse.text]);

  const triggerInputShake = () => {
    setShakeInput(true);
    if (clearShakeTimeoutRef.current) {
      window.clearTimeout(clearShakeTimeoutRef.current);
    }
    clearShakeTimeoutRef.current = window.setTimeout(() => {
      setShakeInput(false);
      clearShakeTimeoutRef.current = null;
    }, 260);
  };

  const currentInputAnalysis = useMemo(
    () => analyzeGuidedInput(userInput, targetComparableWords),
    [userInput, targetComparableWords]
  );
  const typedComparableText = useMemo(
    () => normalizeComparableText(userInput),
    [userInput]
  );
  const typedWordsCount = useMemo(() => {
    const completed = currentInputAnalysis.completedWords.length;
    const hasCurrentWord = Boolean(currentInputAnalysis.currentPrefix);
    return Math.min(targetComparableWords.length, completed + (hasCurrentWord ? 1 : 0));
  }, [currentInputAnalysis, targetComparableWords.length]);
  const progressPercent = useMemo(() => {
    const targetLength = targetComparableText.length;
    if (targetLength === 0) return 0;
    return Math.min(100, Math.round((typedComparableText.length / targetLength) * 100));
  }, [typedComparableText, targetComparableText]);
  const mistakesLeftBeforeReset = Math.max(
    0,
    MAX_MISTAKES_BEFORE_RESET - mistakesSinceReset
  );
  const isMistakeRiskHigh = mistakesLeftBeforeReset <= 2;
  const isMistakeRiskCritical = mistakesLeftBeforeReset <= 1;

  const handleInputChange = (nextRaw: string) => {
    if (isChecked) return;

    const validation = isFullRecallInputPrefixValid(nextRaw, targetComparableWords);
    if (validation.valid) {
      setUserInput(nextRaw);
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetInput = nextMistakesSinceReset >= MAX_MISTAKES_BEFORE_RESET;

    setMistakes((prev) => prev + 1);
    setMistakesSinceReset(shouldResetInput ? 0 : nextMistakesSinceReset);

    if (shouldResetInput) {
      setUserInput('');
      toast.error(
        `Допущено ${MAX_MISTAKES_BEFORE_RESET} ошибок. Ввод сброшен, попробуйте снова.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    } else {
      setUserInput(userInput);
      toast.error(
        `Неверный фрагмент. Осталось ошибок до сброса: ${
          MAX_MISTAKES_BEFORE_RESET - nextMistakesSinceReset
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

  const isInputComplete = useMemo(() => {
    if (!targetComparableText) return false;
    return normalizeComparableText(userInput) === targetComparableText;
  }, [userInput, targetComparableText]);

  useEffect(() => {
    if (!isChecked && isInputComplete) {
      setIsChecked(true);
    }
  }, [isChecked, isInputComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium text-foreground mx-auto">
                  Напечатайте стих по памяти
                </label>
              </div>

              {!isChecked && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHint((prev) => !prev)}
                    aria-pressed={showHint}
                    className="gap-2 rounded-full"
                  >
                    <Lightbulb className="h-4 w-4" />
                    {showHint ? 'Скрыть подсказку' : 'Подсказка'}
                  </Button>
                </div>
              )}
            </div>

            {!isChecked && (
              <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background via-muted/10 to-muted/20 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Прогресс ввода</span>
                  <span className="tabular-nums">{typedWordsCount}/{targetComparableWords.length} слов</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                  <motion.div
                    className="h-full rounded-full bg-primary/80"
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.24, ease: 'easeOut' }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                    Готово: {progressPercent}%
                  </div>
                  <div
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
                      isMistakeRiskCritical
                        ? 'border-destructive/45 bg-destructive/10 text-destructive'
                        : isMistakeRiskHigh
                          ? 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          : 'border-border/60 bg-background/80 text-muted-foreground'
                    }`}
                  >
                    До сброса: {mistakesLeftBeforeReset}/{MAX_MISTAKES_BEFORE_RESET}
                  </div>
                  {mistakes > 0 && (
                    <div className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                      Ошибок всего: {mistakes}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
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
                  placeholder="Начните печатать..."
                  rows={6}
                  className="relative min-h-[clamp(9rem,30dvh,12rem)] resize-none border-0 bg-transparent p-4 text-base leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isChecked}
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="done"
                />
              </motion.div>

            </div>
          </div>

          <AnimatePresence initial={false}>
            {showHint && !isChecked && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden rounded-2xl m-0 border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-background p-4"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                  <p className="text-muted-foreground">
                    {verse.text.split(' ').slice(0, 2).join(' ')}...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isChecked && (
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
