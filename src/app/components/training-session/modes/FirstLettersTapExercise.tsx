'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';

import { Button } from '../../ui/button';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { Verse } from '@/app/App';

interface FirstLettersTapExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

interface LetterToken {
  id: string;
  letter: string;
  order: number;
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

function shuffleTokens(letters: string[]): LetterToken[] {
  const tokens = letters.map((letter, index) => ({
    id: `${index}-${letter}-${Math.random().toString(36).slice(2, 6)}`,
    letter,
    order: index,
  }));

  const shuffled = [...tokens];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const sameOrder = shuffled.every((token, index) => token.order === index);
  if (sameOrder && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}

export function ModeFirstLettersTapExercise({
  verse,
  onRate,
}: FirstLettersTapExerciseProps) {
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [tokens, setTokens] = useState<LetterToken[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashLetter, setErrorFlashLetter] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setTokens(shuffleTokens(letters));
    setSelectedLetters([]);
    setShowHint(false);
    setMistakes(0);
    setIsCompleted(false);
    setErrorFlashLetter(null);

    return () => {
      if (clearFlashTimeoutRef.current) {
        window.clearTimeout(clearFlashTimeoutRef.current);
        clearFlashTimeoutRef.current = null;
      }
    };
  }, [verse]);

  const expectedLetters = useMemo(
    () =>
      [...tokens]
        .sort((a, b) => a.order - b.order)
        .map((token) => token.letter),
    [tokens]
  );

  const selectedCount = selectedLetters.length;

  const shuffledUniqueLetters = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const token of tokens) {
      if (seen.has(token.letter)) continue;
      seen.add(token.letter);
      result.push(token.letter);
    }
    return result;
  }, [tokens]);

  const availableLetters = useMemo(() => {
    const remainingLetters = expectedLetters.slice(selectedCount);
    const remainingSet = new Set<string>(remainingLetters);
    return shuffledUniqueLetters.filter((letter) => remainingSet.has(letter));
  }, [expectedLetters, selectedCount, shuffledUniqueLetters]);

  const selectedTokens = useMemo(
    () => selectedLetters.map((letter, index) => ({ id: `${index}-${letter}`, letter, order: index })),
    [selectedLetters]
  );

  const total = tokens.length;

  const handlePick = (letter: string) => {
    if (isCompleted) return;

    const expectedOrder = selectedCount;
    const expectedLetter = expectedLetters[expectedOrder];

    // Важно: для повторяющихся букв засчитываем любую такую же букву,
    // даже если пользователь нажал "копию" от другого слова.
    if (letter === expectedLetter) {
      const next = [...selectedLetters, letter];
      setSelectedLetters(next);

      if (expectedOrder + 1 === total) {
        setIsCompleted(true);
        // toast.success('Отлично! Последовательность первых букв собрана верно.');
      }
      return;
    }

    setMistakes((prev) => prev + 1);
    setSelectedLetters([]);
    toast.error('Неверная буква. Последовательность сброшена, попробуйте ещё раз.', {
      toasterId: GALLERY_TOASTER_ID,
      size: 'compact',
    });
    setErrorFlashLetter(letter);

    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashLetter(null);
      clearFlashTimeoutRef.current = null;
    }, 280);
  };

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
                Соберите первые буквы слов
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

          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 min-h-[128px] shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Собранные буквы
              </div>
              {!isCompleted && total > 0 && (
                <div className="text-[11px] tabular-nums text-muted-foreground">
                  {selectedCount}/{total}
                </div>
              )}
            </div>

            {selectedTokens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedTokens.map((token) => (
                  <motion.span
                    key={token.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex min-w-9 items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-sm uppercase"
                  >
                    {token.letter}
                  </motion.span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ввод появится здесь
              </p>
            )}
          </div>

          {!availableLetters.every((letter) => selectedLetters.includes(letter)) && (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Варианты букв
                </div>
                {mistakes > 0 && (
                  <div className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                    Ошибок: {mistakes}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {availableLetters.map((letter) => {
                  const isError = errorFlashLetter === letter;

                  return (
                    <motion.div
                      key={letter}
                      animate={isError ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-auto min-w-10 rounded-xl px-3 py-2 font-mono uppercase ${
                          isError
                            ? 'border-destructive text-destructive'
                            : 'border-border/70 bg-background/60'
                        }`}
                        onClick={() => handlePick(letter)}
                        disabled={isCompleted}
                      >
                        {letter}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
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
              className="overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-background p-4"
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
                <p className="leading-relaxed text-sm sm:text-base">{verse.text}</p>
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
