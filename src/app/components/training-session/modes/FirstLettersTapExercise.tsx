'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';
import { TrainingModeId } from '@/shared/training/modeEngine';

import { Info } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Verse } from '@/app/App';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { WordSequenceField, type WordSequenceFieldItem } from './WordSequenceField';
import { tokenizeFirstLetters } from './wordUtils';
import type { HintState } from './useHintState';
import { createExerciseProgressSnapshot } from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import { getExerciseMaxMistakes } from '@/modules/training/hints/exerciseDifficultyConfig';
import { ScrollShadowContainer } from '@/app/components/ui/ScrollShadowContainer';
import { useTrainingFontSize } from './useTrainingFontSize';

interface FirstLettersTapExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
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

const MAX_DISPLAYED_CHOICES = 20;

export function ModeFirstLettersTapExercise({
  verse,
  onRate,
  hintState,
  onProgressChange,
  isLateStageReview = false,
  onOpenTutorial,
}: FirstLettersTapExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [tokens, setTokens] = useState<LetterToken[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashLetter, setErrorFlashLetter] = useState<string | null>(null);
  const [successFlashLetter, setSuccessFlashLetter] = useState<string | null>(null);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const clearFlashTimeoutRef = useRef<number | null>(null);
  const clearSuccessFlashTimeoutRef = useRef<number | null>(null);

  const surrendered = hintState?.surrendered ?? false;

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setTokens(shuffleTokens(letters));
    setSelectedCount(0);
    setMistakesSinceReset(0);
    setTotalMistakes(0);
    setIsCompleted(false);
    setErrorFlashLetter(null);
    setSuccessFlashLetter(null);

    return () => {
      if (clearFlashTimeoutRef.current) {
        window.clearTimeout(clearFlashTimeoutRef.current);
        clearFlashTimeoutRef.current = null;
      }
      if (clearSuccessFlashTimeoutRef.current) {
        window.clearTimeout(clearSuccessFlashTimeoutRef.current);
        clearSuccessFlashTimeoutRef.current = null;
      }
    };
  }, [verse]);

  useEffect(() => {
    if (surrendered && !isCompleted) {
      setIsCompleted(true);
    }
  }, [surrendered, isCompleted]);

  const expectedTokens = useMemo(
    () => [...tokens].sort((a, b) => a.order - b.order),
    [tokens]
  );

  const total = expectedTokens.length;
  const expectedLetter = expectedTokens[selectedCount]?.letter ?? null;
  const expectedWordIndex = expectedTokens[selectedCount]?.order ?? null;
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.FirstLettersTapNoHints,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: total,
  });

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'first-letters',
        unitType: 'letter',
        expectedIndex: expectedWordIndex,
        completedCount: selectedCount,
        totalCount: total,
        isCompleted: isCompleted || surrendered,
      })
    );
  }, [expectedWordIndex, isCompleted, onProgressChange, selectedCount, surrendered, total]);

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

  const displayedLetters = useMemo(() => {
    const batch = availableLetters.slice(0, MAX_DISPLAYED_CHOICES);
    if (expectedLetter && !batch.includes(expectedLetter)) {
      const idx = availableLetters.indexOf(expectedLetter);
      if (idx >= 0 && batch.length > 0) {
        const swapIdx = selectedCount % batch.length;
        batch[swapIdx] = expectedLetter;
      }
    }
    return batch;
  }, [availableLetters, expectedLetter, selectedCount]);

  const focusItemId = useMemo(() => {
    if (expectedTokens.length === 0) return null;
    if (selectedCount <= 0) return expectedTokens[0]?.id ?? null;
    return expectedTokens[Math.min(selectedCount - 1, expectedTokens.length - 1)]?.id ?? null;
  }, [expectedTokens, selectedCount]);

  const sequenceItems = useMemo<WordSequenceFieldItem[]>(
    () =>
      expectedTokens.map((token, index) => {
        const isFilled = index < selectedCount;
        const isActiveGap = !isCompleted && !surrendered && index === selectedCount;

        return {
          id: token.id,
          content: isFilled ? token.letter.toUpperCase() : '•',
          minWidth: 30,
          state: isFilled ? 'filled' : isActiveGap ? 'active-gap' : 'future-gap',
        };
      }),
    [expectedTokens, selectedCount, isCompleted, surrendered]
  );

  const handlePick = (letter: string) => {
    if (isCompleted || surrendered) return;
    if (!expectedLetter) return;

    if (letter === expectedLetter) {
      const next = selectedCount + 1;
      setSelectedCount(next);

      setSuccessFlashLetter(letter);
      if (clearSuccessFlashTimeoutRef.current) {
        window.clearTimeout(clearSuccessFlashTimeoutRef.current);
      }
      clearSuccessFlashTimeoutRef.current = window.setTimeout(() => {
        setSuccessFlashLetter(null);
        clearSuccessFlashTimeoutRef.current = null;
      }, 260);

      if (next === total) {
        setIsCompleted(true);
      }
      return;
    }

    setTotalMistakes((prev) => prev + 1);
    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetSequence = nextMistakesSinceReset >= maxMistakes;
    setMistakesSinceReset(shouldResetSequence ? 0 : nextMistakesSinceReset);

    if (shouldResetSequence) {
      setSelectedCount(0);
      toast.warning(
        `Допущено ${maxMistakes} ошибок. Последовательность сброшена.`,
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

    setErrorFlashLetter(letter);
    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashLetter(null);
      clearFlashTimeoutRef.current = null;
    }, 260);
  };

  const showChoices = !isCompleted && !surrendered && availableLetters.length > 0;

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
          Соберите первые буквы слов
        </label>
        {onOpenTutorial && (
          <button type="button" onClick={onOpenTutorial} className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground/60 hover:text-foreground/80 transition-colors" aria-label="Подробнее о режиме">
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Top half: letter sequence ── */}
      <div className="mt-3 min-h-0 flex-1 basis-1/2 overflow-hidden">
        <WordSequenceField
          className="h-full"
          label="Последовательность букв"
          progressCurrent={selectedCount}
          progressTotal={total}
          items={sequenceItems}
          focusItemId={focusItemId}
          fontSizes={fontSizes}
        />
      </div>

      {/* ── Bottom half: letter choices ── */}
      {showChoices && (
        <div className="mt-2 min-h-0 flex-1 basis-1/2 flex flex-col overflow-hidden border-t border-border/60 pt-2">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Варианты букв</span>
            <span className="tabular-nums">{availableLetters.length}</span>
          </div>
          <ScrollShadowContainer
            className="flex-1 min-h-0"
            scrollClassName="flex flex-wrap content-start gap-1 py-1"
            shadowSize={16}
          >
            {displayedLetters.map((letter) => (
              <Button
                key={letter}
                type="button"
                variant="outline"
                className={`h-auto min-h-11 min-w-12 justify-center rounded-lg px-3 py-1.5 font-mono uppercase leading-4 transition-colors ${
                  errorFlashLetter === letter
                    ? 'border-destructive text-destructive bg-destructive/10'
                    : successFlashLetter === letter
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                      : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                }`}
                style={{ fontSize: `${fontSizes.letter}px` }}
                onClick={() => handlePick(letter)}
              >
                <span>{letter}</span>
              </Button>
            ))}
          </ScrollShadowContainer>
        </div>
      )}

      {isCompleted && (
        <div className="shrink-0 pt-3">
          <TrainingRatingFooter>
            <TrainingRatingButtons
              stage={ratingStage}
              mode="first-letters"
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
