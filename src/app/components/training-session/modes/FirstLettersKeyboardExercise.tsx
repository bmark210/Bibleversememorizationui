'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';

import { Button } from '../../ui/button';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import { Textarea } from '../../ui/textarea';
import { useIsMobile } from '../../ui/use-mobile';
import {
  MobileRuKeyboardOverlay,
  MOBILE_RU_KEYBOARD_OVERLAY_SPACER_HEIGHT,
} from './MobileRuKeyboardOverlay';
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

function removeLastMeaningfulChar(rawValue: string) {
  if (!rawValue) return '';
  let chars = Array.from(rawValue);
  while (chars.length > 0 && /\s/u.test(chars[chars.length - 1] ?? '')) {
    chars.pop();
  }
  if (chars.length > 0) {
    chars.pop();
  }
  return chars.join('');
}

export function ModeFirstLettersKeyboardExercise({
  verse,
  onRate,
}: FirstLettersKeyboardExerciseProps) {
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const isMobile = useIsMobile();
  const [expectedLetters, setExpectedLetters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const clearShakeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setExpectedLetters(letters);
    setInputValue('');
    setShowHint(false);
    setMistakes(0);
    setIsCompleted(false);
    setShakeInput(false);

    return () => {
      if (clearShakeTimeoutRef.current) {
        window.clearTimeout(clearShakeTimeoutRef.current);
        clearShakeTimeoutRef.current = null;
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

  const typedLettersList = useMemo(
    () => Array.from(typedCompact),
    [typedCompact]
  );

  const total = expectedLetters.length;
  const typedCount = typedLettersList.length;

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

    setMistakes((prev) => prev + 1);
    setInputValue('');
    toast.error('Неверная буква. Ввод сброшен, попробуйте ещё раз.', {
      toasterId: GALLERY_TOASTER_ID,
      size: 'compact',
    });
    triggerInputShake();
  };

  const handleInputChange = (nextRaw: string) => {
    applyNextInputValue(nextRaw);
  };

  const handleMobileKeyPress = (letter: string) => {
    if (isCompleted) return;
    applyNextInputValue(`${inputValue}${letter}`);
  };

  const isMobileKeyboardVisible = Boolean(isMobile && !isCompleted);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-3">
              <div className="space-y-1 text-center">
                <label className="text-sm font-medium text-foreground">
                  Введите первые буквы слов
                </label>
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

            {!isMobile ? (
              <motion.div
                animate={shakeInput ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
                transition={{ duration: 0.2 }}
                className={`rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-2 shadow-sm ${
                  shakeInput ? 'border-destructive/60 bg-destructive/5' : ''
                }`}
              >
                <Textarea
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Введите первые буквы слов..."
                  disabled={isCompleted}
                  className="min-h-[184px] resize-none border-0 bg-transparent p-4 font-mono text-base tracking-[0.16em] uppercase leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  aria-label="Поле ввода первых букв"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </motion.div>
            ) : (
              <div className="space-y-2">
                <motion.div
                  animate={shakeInput ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 min-h-[128px] shadow-sm ${
                    shakeInput ? 'border-destructive/60 bg-destructive/5' : ''
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary/5 to-transparent"
                  />
                  <div className="relative space-y-2">
                    {typedLettersList.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {typedLettersList.map((letter, index) => (
                          <motion.span
                            key={`${letter}-${index}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex min-w-9 items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-sm uppercase"
                          >
                            {letter}
                          </motion.span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Ввод появится здесь
                      </p>
                    )}
                  </div>
                </motion.div>

                {!isCompleted && mistakes > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                      Ошибок: {mistakes}
                    </div>
                  </div>
                )}
              </div>
            )}
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

          {isMobile && (
            <div
              aria-hidden="true"
              className="md:hidden pointer-events-none"
              style={{
                height: isMobileKeyboardVisible
                  ? MOBILE_RU_KEYBOARD_OVERLAY_SPACER_HEIGHT
                  : '0px',
                transition: 'height 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                willChange: 'height',
              }}
            />
          )}
        </div>

      <MobileRuKeyboardOverlay
        open={isMobileKeyboardVisible}
        disabled={isCompleted}
        onKeyPress={handleMobileKeyPress}
      />
    </motion.div>
  );
}
