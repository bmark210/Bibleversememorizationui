'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';

import { Button } from '../../ui/button';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import { Textarea } from '../../ui/textarea';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { Verse } from '@/app/App';

interface FirstLettersKeyboardExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

function tokenizeFirstLetters(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => {
      const cleaned = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      return (cleaned.charAt(0) || word.charAt(0) || '').toLowerCase();
    })
    .filter(Boolean);
}

function sanitizeInput(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .replace(/[ \t]+/g, ' ');
}

function compactLetters(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
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
}: FirstLettersKeyboardExerciseProps) {
  const MAX_MISTAKES_BEFORE_RESET = 5;
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [expectedLetters, setExpectedLetters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const clearShakeTimeoutRef = useRef<number | null>(null);
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setExpectedLetters(letters);
    setInputValue('');
    setShowHint(false);
    setMistakes(0);
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

  const expectedCompact = useMemo(
    () => expectedLetters.join(''),
    [expectedLetters]
  );

  const typedCompact = useMemo(
    () => compactLetters(inputValue),
    [inputValue]
  );

  const total = expectedLetters.length;
  const typedCount = typedCompact.length;
  const progressPercent = total > 0 ? Math.round((typedCount / total) * 100) : 0;
  const mistakesLeftBeforeReset = Math.max(
    0,
    MAX_MISTAKES_BEFORE_RESET - mistakesSinceReset
  );
  const isMistakeRiskHigh = mistakesLeftBeforeReset <= 2;
  const isMistakeRiskCritical = mistakesLeftBeforeReset <= 1;

  const triggerInputShake = () => {
    setShakeInput(true);
    if (clearShakeTimeoutRef.current) {
      window.clearTimeout(clearShakeTimeoutRef.current);
    }
    clearShakeTimeoutRef.current = window.setTimeout(() => {
      setShakeInput(false);
      clearShakeTimeoutRef.current = null;
    }, 280);
  };

  const applyNextInputValue = (nextRaw: string) => {
    if (isCompleted) return;

    const sanitized = trimToMaxLetters(sanitizeInput(nextRaw), expectedCompact.length);
    const compact = compactLetters(sanitized);
    const expectedPrefix = expectedCompact.slice(0, compact.length);

    if (compact === expectedPrefix) {
      setInputValue(sanitized);

      if (compact.length === expectedCompact.length && expectedCompact.length > 0) {
        setIsCompleted(true);
        // toast.success('Отлично! Вы ввели первые буквы слов в правильной последовательности.');
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetInput = nextMistakesSinceReset >= MAX_MISTAKES_BEFORE_RESET;

    setMistakes((prev) => prev + 1);
    setMistakesSinceReset(shouldResetInput ? 0 : nextMistakesSinceReset);

    if (shouldResetInput) {
      setInputValue('');
      toast.error(
        `Допущено ${MAX_MISTAKES_BEFORE_RESET} ошибок. Ввод сброшен, попробуйте снова.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    } else {
      setInputValue(inputValue);
      toast.error(
        `Неверная буква. Осталось ошибок до сброса: ${
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

  const handleInputChange = (nextRaw: string) => {
    applyNextInputValue(nextRaw);
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
      className="w-full"
    >
      <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium mx-auto text-foreground/90">
                  Введите первые буквы слов
                </label>
                {/* <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/85">
                  Клавиатурный режим
                </div> */}
              </div>

              {!isCompleted && (
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

            {!isCompleted && (
              <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background via-muted/10 to-muted/20 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Прогресс ввода</span>
                  <span className="tabular-nums">{typedCount}/{total}</span>
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
                  {/* {mistakes > 0 && (
                    <div className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                      Ошибок всего: {mistakes}
                    </div>
                  )} */}
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
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={handleInputFocus}
                  placeholder="Введите первые буквы слов..."
                  disabled={isCompleted}
                  className="relative min-h-[clamp(9rem,28dvh,11.5rem)] resize-none border-0 bg-transparent p-4 font-mono text-base tracking-[0.16em] uppercase leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  aria-label="Поле ввода первых букв"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="done"
                />
              </motion.div>

              {/* {!isCompleted && (
                <p className="px-1 text-xs text-muted-foreground">
                  Разрешены пробелы между буквами. Проверяется только порядок первых букв.
                </p>
              )} */}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showHint && !isCompleted && (
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

          <AnimatePresence initial={false}>
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm">
                  <div className="mb-2 text-sm font-medium text-foreground">Полный стих</div>
                  <p className="leading-relaxed text-sm sm:text-base">
                    {verse.text}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {isCompleted && (
          <TrainingRatingFooter>
            <TrainingRatingButtons
              stage={ratingStage}
              mode="first-letters"
              onRate={onRate}
            />
          </TrainingRatingFooter>
        )}
        </div>
    </motion.div>
  );
}
