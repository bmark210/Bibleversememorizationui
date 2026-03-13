'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';

import { Button } from '@/app/components/ui/button';
import { Verse } from '@/app/App';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { FixedBottomPanel } from './FixedBottomPanel';
import { WordSequenceField, type WordSequenceFieldItem } from './WordSequenceField';
import { tokenizeFirstLetters } from './wordUtils';

interface FirstLettersTapExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

interface LetterToken {
  id: string;
  letter: string;
  order: number;
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
    swapArrayItems(shuffled, i, j);
  }

  const sameOrder = shuffled.every((token, index) => token.order === index);
  if (sameOrder && shuffled.length > 1) {
    swapArrayItems(shuffled, 0, 1);
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
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashLetter, setErrorFlashLetter] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setTokens(shuffleTokens(letters));
    setSelectedCount(0);
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

  const expectedTokens = useMemo(
    () => [...tokens].sort((a, b) => a.order - b.order),
    [tokens]
  );

  const total = expectedTokens.length;
  const expectedLetter = expectedTokens[selectedCount]?.letter ?? null;

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

  const remainingCountByLetter = useMemo(() => {
    const counts = new Map<string, number>();

    for (let index = selectedCount; index < expectedTokens.length; index += 1) {
      const letter = expectedTokens[index]?.letter;
      if (!letter) continue;
      counts.set(letter, (counts.get(letter) ?? 0) + 1);
    }

    return counts;
  }, [expectedTokens, selectedCount]);

  const availableLetters = useMemo(
    () =>
      shuffledUniqueLetters.filter((letter) => (remainingCountByLetter.get(letter) ?? 0) > 0),
    [shuffledUniqueLetters, remainingCountByLetter]
  );

  const focusItemId = useMemo(() => {
    if (expectedTokens.length === 0) return null;
    if (selectedCount <= 0) return expectedTokens[0]?.id ?? null;
    return expectedTokens[Math.min(selectedCount - 1, expectedTokens.length - 1)]?.id ?? null;
  }, [expectedTokens, selectedCount]);

  const sequenceItems = useMemo<WordSequenceFieldItem[]>(
    () =>
      expectedTokens.map((token, index) => {
        const isFilled = index < selectedCount;
        const isActiveGap = !isCompleted && index === selectedCount;

        return {
          id: token.id,
          content: isFilled ? token.letter.toUpperCase() : '•',
          minWidth: 30,
          state: isFilled ? 'filled' : isActiveGap ? 'active-gap' : 'future-gap',
        };
      }),
    [expectedTokens, selectedCount, isCompleted]
  );

  const handlePick = (letter: string) => {
    if (isCompleted) return;
    if (!expectedLetter) return;

    if (letter === expectedLetter) {
      const next = selectedCount + 1;
      setSelectedCount(next);

      if (next === total) {
        setIsCompleted(true);
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetSequence = nextMistakesSinceReset >= MAX_MISTAKES_BEFORE_RESET;
    setMistakesSinceReset(shouldResetSequence ? 0 : nextMistakesSinceReset);

    if (shouldResetSequence) {
      setSelectedCount(0);
      toast.warning(
        `Допущено ${MAX_MISTAKES_BEFORE_RESET} ошибок. Последовательность сброшена.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    } else {
      toast.warning(
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

  const showChoices = !isCompleted && availableLetters.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <div className="shrink-0">
        <label className="block text-center text-sm font-medium text-foreground/90">
          Соберите первые буквы слов
        </label>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        <WordSequenceField
          className="h-full"
          label="Последовательность букв"
          progressCurrent={selectedCount}
          progressTotal={total}
          items={sequenceItems}
          focusItemId={focusItemId}
        />
      </div>

      <FixedBottomPanel visible={showChoices}>
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Варианты букв</span>
          <span className="tabular-nums">{availableLetters.length}</span>
        </div>
        <div className="flex flex-wrap content-start gap-1" data-card-swipe-ignore="true">
          {availableLetters.map((letter) => (
            <Button
              key={letter}
              type="button"
              variant="outline"
              className={`h-auto min-h-11 min-w-12 justify-center rounded-lg px-3 py-1.5 font-mono text-[15px] uppercase leading-4 transition-colors ${
                errorFlashLetter === letter
                  ? 'border-destructive text-destructive'
                  : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
              }`}
              onClick={() => handlePick(letter)}
            >
              <span>{letter}</span>
            </Button>
          ))}
        </div>
      </FixedBottomPanel>

      {isCompleted && (
        <div className="shrink-0 pt-3">
          <TrainingRatingFooter>
            <TrainingRatingButtons
              stage={ratingStage}
              mode="first-letters"
              onRate={onRate}
            />
          </TrainingRatingFooter>
        </div>
      )}
    </motion.div>
  );
}
