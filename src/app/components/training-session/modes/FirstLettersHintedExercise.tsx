'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';
import { TrainingModeId } from '@/shared/training/modeEngine';

import { Info } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Verse } from '@/app/App';
import {
  getComparableFirstLetter,
  getWordMask,
  getWordMaskWidth,
  tokenizeWords,
} from './wordUtils';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { WordSequenceField, type WordSequenceFieldItem } from './WordSequenceField';
import type { HintState } from './useHintState';
import { createExerciseProgressSnapshot } from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import {
  getExerciseMaxMistakes,
  getHintedRevealCount,
} from '@/modules/training/hints/exerciseDifficultyConfig';
import { useFittedBatchSize } from './useFittedBatchSize';
import { useTrainingFontSize } from './useTrainingFontSize';

interface FirstLettersHintedExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
}

interface WordSlot {
  id: string;
  text: string;
  firstLetter: string;
  order: number;
  revealed: boolean;
}

function pickRevealedIndices(totalWords: number, revealCount: number): Set<number> {
  if (totalWords <= 1) return new Set<number>();

  const revealed = new Set<number>();
  if (totalWords >= 3 && revealed.size < revealCount) revealed.add(0);
  if (totalWords >= 5 && revealed.size < revealCount) revealed.add(totalWords - 1);

  const candidates = Array.from({ length: totalWords }, (_, i) => i).filter(
    (index) => !revealed.has(index)
  );

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    swapArrayItems(candidates, i, j);
  }

  for (const index of candidates) {
    if (revealed.size >= revealCount) break;
    revealed.add(index);
  }

  if (revealed.size >= totalWords) {
    revealed.delete(totalWords - 1);
  }

  return revealed;
}

function shuffleLetters(letters: string[]) {
  const shuffled = [...letters];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    swapArrayItems(shuffled, i, j);
  }

  return shuffled;
}

function buildExercise(params: {
  text: string;
  difficultyLevel: Verse["difficultyLevel"];
}) {
  const { text, difficultyLevel } = params;
  const words = tokenizeWords(text);
  const revealed = pickRevealedIndices(
    words.length,
    getHintedRevealCount({
      modeId: TrainingModeId.FirstLettersWithWordHints,
      difficultyLevel,
      totalWords: words.length,
    })
  );

  const slots: WordSlot[] = words.map((word, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 6)}`,
    text: word,
    firstLetter: getComparableFirstLetter(word),
    order: index,
    revealed: revealed.has(index),
  }));

  const choiceOrder: string[] = [];
  const seenLetters = new Set<string>();
  for (const letter of shuffleLetters(
    slots.filter((slot) => !slot.revealed).map((slot) => slot.firstLetter)
  )) {
    if (!letter || seenLetters.has(letter)) continue;
    seenLetters.add(letter);
    choiceOrder.push(letter);
  }

  return {
    slots,
    choiceOrder,
  };
}

export function ModeFirstLettersHintedExercise({
  verse,
  onRate,
  hintState,
  onProgressChange,
  isLateStageReview = false,
  onOpenTutorial,
}: FirstLettersHintedExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [slots, setSlots] = useState<WordSlot[]>([]);
  const [choiceOrder, setChoiceOrder] = useState<string[]>([]);
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
    const exercise = buildExercise({
      text: verse.text,
      difficultyLevel: verse.difficultyLevel,
    });
    setSlots(exercise.slots);
    setChoiceOrder(exercise.choiceOrder);
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

  const hiddenSlots = useMemo(
    () => slots.filter((slot) => !slot.revealed),
    [slots]
  );

  const hiddenIndexByOrder = useMemo(() => {
    const map = new Map<number, number>();
    hiddenSlots.forEach((slot, index) => map.set(slot.order, index));
    return map;
  }, [hiddenSlots]);

  const totalHidden = hiddenSlots.length;
  const nextHiddenSlot = hiddenSlots[selectedCount] ?? null;
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.FirstLettersWithWordHints,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: totalHidden,
  });

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'first-letters-hinted',
        unitType: 'letter',
        expectedIndex: nextHiddenSlot?.order ?? null,
        completedCount: selectedCount,
        totalCount: totalHidden,
        isCompleted: isCompleted || surrendered,
      })
    );
  }, [isCompleted, nextHiddenSlot, onProgressChange, selectedCount, surrendered, totalHidden]);

  const remainingCountByLetter = useMemo(() => {
    const counts = new Map<string, number>();

    for (let index = selectedCount; index < hiddenSlots.length; index += 1) {
      const letter = hiddenSlots[index]?.firstLetter;
      if (!letter) continue;
      counts.set(letter, (counts.get(letter) ?? 0) + 1);
    }

    return counts;
  }, [hiddenSlots, selectedCount]);

  const availableLetters = useMemo(
    () =>
      choiceOrder.filter((letter) => (remainingCountByLetter.get(letter) ?? 0) > 0),
    [choiceOrder, remainingCountByLetter]
  );

  const expectedFirstLetter = nextHiddenSlot?.firstLetter ?? null;

  const focusItemId = useMemo(() => {
    if (hiddenSlots.length === 0) return null;
    if (selectedCount <= 0) return hiddenSlots[0]?.id ?? null;
    return hiddenSlots[Math.min(selectedCount - 1, hiddenSlots.length - 1)]?.id ?? null;
  }, [hiddenSlots, selectedCount]);

  const sequenceItems = useMemo<WordSequenceFieldItem[]>(
    () =>
      slots.map((slot) => {
        const hiddenIndex = hiddenIndexByOrder.get(slot.order) ?? -1;
        const isHidden = hiddenIndex >= 0;
        const isFilled = isHidden && hiddenIndex < selectedCount;
        const isActiveGap = isHidden && !isCompleted && hiddenIndex === selectedCount;

        if (slot.revealed) {
          return {
            id: slot.id,
            content: slot.text,
            state: 'revealed',
          };
        }

        if (isFilled) {
          return {
            id: slot.id,
            content: slot.text,
            state: 'filled',
          };
        }

        return {
          id: slot.id,
          content: getWordMask(slot.text),
          minWidth: getWordMaskWidth(slot.text),
          state: isActiveGap ? 'active-gap' : 'future-gap',
        };
      }),
    [slots, hiddenIndexByOrder, selectedCount, isCompleted]
  );

  const handleLetterClick = (letter: string) => {
    if (isCompleted || surrendered) return;
    if (!nextHiddenSlot) return;

    if (letter === nextHiddenSlot.firstLetter) {
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

      if (next === totalHidden) {
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

  // max(min-h-11=44, border(2) + py-1.5(12) + max(leading-4 fixed 16px, fontSize))
  const letterButtonHeight = Math.max(44, 14 + Math.max(16, fontSizes.letter));
  const { ref: choicesContainerRef, batchSize } = useFittedBatchSize({
    itemHeight: letterButtonHeight,
    rowGap: 4,
    itemMinWidth: 48 + Math.max(0, fontSizes.letter - 15),
    columnGap: 4,
    minItems: 4,
    maxItems: 40,
    enabled: showChoices,
    reduceHeightBy: 8, // py-1 wrapper padding
  });

  const displayedLetters = useMemo(() => {
    const batch = availableLetters.slice(0, batchSize);
    if (expectedFirstLetter && !batch.includes(expectedFirstLetter)) {
      const idx = availableLetters.indexOf(expectedFirstLetter);
      if (idx >= 0 && batch.length > 0) {
        const swapIdx = selectedCount % batch.length;
        batch[swapIdx] = expectedFirstLetter;
      }
    }
    return batch;
  }, [availableLetters, expectedFirstLetter, selectedCount, batchSize]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      {mistakesSinceReset > 0 && (
        <span className="absolute right-0 top-0 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold tabular-nums text-white">
          {maxMistakes - mistakesSinceReset}
        </span>
      )}
      <div className="shrink-0 flex items-center justify-center gap-1.5">
        <label className="text-sm font-medium text-foreground/90">
          Выберите первые буквы слов
        </label>
        {onOpenTutorial && (
          <button type="button" onClick={onOpenTutorial} className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground/60 hover:text-foreground/80 transition-colors" aria-label="Подробнее о режиме">
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 min-h-0 flex-1 basis-1/2 overflow-hidden">
        <WordSequenceField
          className="h-full"
          label="Стих с пропусками"
          progressCurrent={selectedCount}
          progressTotal={totalHidden}
          items={sequenceItems}
          focusItemId={focusItemId}
          fontSizes={fontSizes}
        />
      </div>

      {showChoices && (
        <div className="mt-2 min-h-0 flex-1 basis-1/2 flex flex-col overflow-hidden border-t border-border/60 pt-2">
          <div className="mb-2 flex shrink-0 items-center text-xs text-muted-foreground">
            <span>Варианты букв</span>
          </div>
          <div
            ref={choicesContainerRef}
            className="flex-1 min-h-0 overflow-hidden"
          >
            <div className="flex flex-wrap content-start gap-1 py-1">
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
                  onClick={() => handleLetterClick(letter)}
                >
                  <span>{letter}</span>
                </Button>
              ))}
            </div>
          </div>
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
