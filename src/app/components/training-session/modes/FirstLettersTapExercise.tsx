'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
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
  const MAX_MISTAKES_BEFORE_RESET = 5;
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [tokens, setTokens] = useState<LetterToken[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashLetter, setErrorFlashLetter] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setTokens(shuffleTokens(letters));
    setSelectedLetters([]);
    setMistakesSinceReset(0);
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
  const total = tokens.length;

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

  const handlePick = (letter: string) => {
    if (isCompleted) return;

    const expectedOrder = selectedCount;
    const expectedLetter = expectedLetters[expectedOrder];

    if (letter === expectedLetter) {
      const next = [...selectedLetters, letter];
      setSelectedLetters(next);

      if (expectedOrder + 1 === total) {
        setIsCompleted(true);
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetSequence = nextMistakesSinceReset >= MAX_MISTAKES_BEFORE_RESET;
    setMistakesSinceReset(shouldResetSequence ? 0 : nextMistakesSinceReset);

    if (shouldResetSequence) {
      setSelectedLetters([]);
      toast.error(
        `Допущено ${MAX_MISTAKES_BEFORE_RESET} ошибок. Последовательность сброшена.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    } else {
      toast.error(
        `Неверная буква. До сброса: ${
          MAX_MISTAKES_BEFORE_RESET - nextMistakesSinceReset
        }.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    }

    setErrorFlashLetter(letter);
    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashLetter(null);
      clearFlashTimeoutRef.current = null;
    }, 260);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="space-y-3">
        <label className="block text-center text-sm font-medium text-foreground/90">
          Соберите первые буквы слов
        </label>

        <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Последовательность</span>
            <span className="tabular-nums">{selectedCount}/{total}</span>
          </div>

          {selectedLetters.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedLetters.map((letter, index) => (
                <span
                  key={`${index}-${letter}`}
                  className="inline-flex min-w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-sm uppercase"
                >
                  {letter}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Нажимайте буквы в правильном порядке.</p>
          )}
        </div>

        {!isCompleted && availableLetters.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
            <div className="flex flex-wrap gap-2">
              {availableLetters.map((letter) => (
                <Button
                  key={letter}
                  type="button"
                  variant="outline"
                  className={`h-auto min-w-10 rounded-xl px-3 py-2 font-mono uppercase transition-colors ${
                    errorFlashLetter === letter
                      ? 'border-destructive text-destructive'
                      : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                  }`}
                  onClick={() => handlePick(letter)}
                >
                  {letter}
                </Button>
              ))}
            </div>
          </div>
        )}

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
