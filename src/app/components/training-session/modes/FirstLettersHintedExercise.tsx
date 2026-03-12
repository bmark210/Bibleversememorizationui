'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';

import { Button } from '@/app/components/ui/button';
import { Verse } from '@/app/App';
import {
  getComparableFirstLetter,
  getWordMask,
  getWordMaskWidth,
  pickVisibleChoices,
  tokenizeWordsPreservingPunctuation,
} from './wordUtils';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { WordSequenceField, type WordSequenceFieldItem } from './WordSequenceField';
import { useMeasuredElementSize } from './useMeasuredElementSize';

interface FirstLettersHintedExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

interface WordSlot {
  id: string;
  text: string;
  firstLetter: string;
  order: number;
  revealed: boolean;
}

const LETTER_CHOICE_LAYOUT = {
  estimatedCharWidthPx: 10,
  baseWidthPx: 24,
  minChoiceWidthPx: 48,
  rowHeightPx: 34,
  leadingContextChoices: 1,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pickRevealedIndices(totalWords: number): Set<number> {
  if (totalWords <= 1) return new Set<number>();

  let revealCount = clamp(Math.round(totalWords * 0.4), 1, totalWords - 1);
  if (totalWords >= 6) {
    revealCount = clamp(Math.round(totalWords * 0.45), 2, totalWords - 2);
  }

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

function buildExercise(text: string) {
  const words = tokenizeWordsPreservingPunctuation(text);
  const revealed = pickRevealedIndices(words.length);

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
}: FirstLettersHintedExerciseProps) {
  const MAX_MISTAKES_BEFORE_RESET = 5;
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [slots, setSlots] = useState<WordSlot[]>([]);
  const [choiceOrder, setChoiceOrder] = useState<string[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashLetter, setErrorFlashLetter] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);
  const { ref: choiceTrayRef, size: choiceTraySize } =
    useMeasuredElementSize<HTMLDivElement>(!isCompleted);

  useEffect(() => {
    const exercise = buildExercise(verse.text);
    setSlots(exercise.slots);
    setChoiceOrder(exercise.choiceOrder);
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

  const visibleLetters = useMemo(() => {
    const letterChoices = availableLetters.map((letter) => ({
      displayText: letter,
      normalized: letter,
    }));

    return pickVisibleChoices(
      letterChoices,
      remainingCountByLetter,
      nextHiddenSlot?.firstLetter ?? null,
      {
        trayWidth: choiceTraySize.width,
        trayHeight: choiceTraySize.height,
        ...LETTER_CHOICE_LAYOUT,
      }
    ).map((choice) => choice.normalized);
  }, [availableLetters, remainingCountByLetter, nextHiddenSlot, choiceTraySize.width, choiceTraySize.height]);

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
    if (isCompleted) return;
    if (!nextHiddenSlot) return;

    if (letter === nextHiddenSlot.firstLetter) {
      const next = selectedCount + 1;
      setSelectedCount(next);

      if (next === totalHidden) {
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

  const showChoices = !isCompleted && visibleLetters.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <div className="shrink-0">
        <label className="block text-center text-sm font-medium text-foreground/90">
          Восстановите скрытые слова по первым буквам
        </label>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        {showChoices ? (
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
            <WordSequenceField
              className="h-full"
              label="Стих с пропусками"
              progressCurrent={selectedCount}
              progressTotal={totalHidden}
              items={sequenceItems}
              focusItemId={focusItemId}
            />

            <div className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-background/70 px-3 pt-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Варианты букв</span>
                <span className="tabular-nums">{visibleLetters.length}</span>
              </div>

              <div
                ref={choiceTrayRef}
                data-card-swipe-ignore="true"
                className="flex min-h-0 flex-1 items-start overflow-hidden py-2"
              >
                <div className="flex w-full flex-wrap content-start gap-1">
                  {visibleLetters.map((letter) => (
                    <Button
                      key={letter}
                      type="button"
                      variant="outline"
                      className={`h-auto min-w-11 justify-center rounded-lg px-3 py-1.5 font-mono text-[15px] uppercase leading-4 transition-colors ${
                        errorFlashLetter === letter
                          ? 'border-destructive text-destructive'
                          : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                      }`}
                      onClick={() => handleLetterClick(letter)}
                    >
                      <span>{letter}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden">
            <WordSequenceField
              className="h-full"
              label="Стих с пропусками"
              progressCurrent={selectedCount}
              progressTotal={totalHidden}
              items={sequenceItems}
              focusItemId={focusItemId}
            />
          </div>
        )}
      </div>

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
