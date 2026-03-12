'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';

import { Button } from "@/app/components/ui/button";
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { Verse } from '@/app/App';
import {
  tokenizeWords,
  normalizeWord,
  cleanWordForDisplay,
  getMaxMistakes,
  pickVisibleChoices,
} from './wordUtils';

interface ClickWordsHintedExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

interface WordSlot {
  id: string;
  text: string;
  normalized: string;
  order: number;
  revealed: boolean;
}

interface UniqueChoice {
  displayText: string;
  normalized: string;
  totalCount: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pickRevealedIndices(totalWords: number): Set<number> {
  if (totalWords <= 1) return new Set<number>();

  let revealCount = clamp(Math.round(totalWords * 0.35), 1, totalWords - 1);
  if (totalWords >= 6) {
    revealCount = clamp(Math.round(totalWords * 0.4), 2, totalWords - 2);
  }

  const revealed = new Set<number>();
  if (totalWords >= 3 && revealed.size < revealCount) revealed.add(0);
  if (totalWords >= 5 && revealed.size < revealCount) revealed.add(totalWords - 1);

  const candidates = Array.from({ length: totalWords }, (_, i) => i).filter(
    (i) => !revealed.has(i)
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

function buildExercise(text: string) {
  const words = tokenizeWords(text);
  const revealed = pickRevealedIndices(words.length);

  const slots: WordSlot[] = words.map((word, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 6)}`,
    text: word,
    normalized: normalizeWord(word),
    order: index,
    revealed: revealed.has(index),
  }));

  const hiddenSlots = slots.filter((s) => !s.revealed);

  const choiceMap = new Map<string, UniqueChoice>();
  for (const slot of hiddenSlots) {
    const existing = choiceMap.get(slot.normalized);
    if (existing) {
      existing.totalCount += 1;
    } else {
      choiceMap.set(slot.normalized, {
        displayText: cleanWordForDisplay(slot.text),
        normalized: slot.normalized,
        totalCount: 1,
      });
    }
  }

  const uniqueChoices = Array.from(choiceMap.values());
  // shuffle
  for (let i = uniqueChoices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    swapArrayItems(uniqueChoices, i, j);
  }

  return { slots, uniqueChoices };
}

export function ModeClickWordsHintedExercise({
  verse,
  onRate,
}: ClickWordsHintedExerciseProps) {
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [slots, setSlots] = useState<WordSlot[]>([]);
  const [uniqueChoices, setUniqueChoices] = useState<UniqueChoice[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashNormalized, setErrorFlashNormalized] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const exercise = buildExercise(verse.text);
    setSlots(exercise.slots);
    setUniqueChoices(exercise.uniqueChoices);
    setSelectedCount(0);
    setMistakesSinceReset(0);
    setIsCompleted(false);
    setErrorFlashNormalized(null);

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

  const totalHiddenWords = hiddenSlots.length;
  const maxMistakes = getMaxMistakes(totalHiddenWords);
  const nextHiddenSlot = hiddenSlots[selectedCount] ?? null;

  const hiddenIndexByOrder = useMemo(() => {
    const map = new Map<number, number>();
    hiddenSlots.forEach((slot, index) => map.set(slot.order, index));
    return map;
  }, [hiddenSlots]);

  const remainingCountByNormalized = useMemo(() => {
    const counts = new Map<string, number>();
    for (const choice of uniqueChoices) {
      counts.set(choice.normalized, choice.totalCount);
    }
    // Subtract already placed words
    for (let i = 0; i < selectedCount; i++) {
      const slot = hiddenSlots[i];
      if (!slot) break;
      const current = counts.get(slot.normalized) ?? 0;
      if (current > 0) counts.set(slot.normalized, current - 1);
    }
    return counts;
  }, [uniqueChoices, selectedCount, hiddenSlots]);

  const availableChoices = useMemo(
    () => uniqueChoices.filter((c) => (remainingCountByNormalized.get(c.normalized) ?? 0) > 0),
    [uniqueChoices, remainingCountByNormalized]
  );

  const visibleChoices = useMemo(
    () => pickVisibleChoices(availableChoices, nextHiddenSlot?.normalized ?? null),
    [availableChoices, nextHiddenSlot]
  );

  const handleWordClick = (choice: UniqueChoice) => {
    if (isCompleted) return;
    if (!nextHiddenSlot) return;

    if (choice.normalized === nextHiddenSlot.normalized) {
      const next = selectedCount + 1;
      setSelectedCount(next);
      if (next === totalHiddenWords) {
        setIsCompleted(true);
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldReset = nextMistakesSinceReset >= maxMistakes;
    setMistakesSinceReset(shouldReset ? 0 : nextMistakesSinceReset);

    if (shouldReset) {
      setSelectedCount(0);
      toast.warning(
        `Допущено ${maxMistakes} ошибок. Последовательность сброшена.`,
        { toasterId: GALLERY_TOASTER_ID, size: 'compact' }
      );
    } else {
      toast.warning(
        `Неверное слово. До сброса: ${maxMistakes - nextMistakesSinceReset}.`,
        { toasterId: GALLERY_TOASTER_ID, size: 'compact' }
      );
    }

    setErrorFlashNormalized(choice.normalized);
    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashNormalized(null);
      clearFlashTimeoutRef.current = null;
    }, 260);
  };

  const showChoices = !isCompleted && visibleChoices.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className={`space-y-3 ${showChoices ? 'pb-20' : ''}`}>
        <label className="block text-center text-sm font-medium text-foreground/90">
          Восстановите скрытые слова по порядку
        </label>

        <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Стих с пропусками</span>
            <span className="tabular-nums">{selectedCount}/{totalHiddenWords}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 leading-relaxed">
            {slots.map((slot) => {
              const hiddenIndex = hiddenIndexByOrder.get(slot.order) ?? -1;
              const isHidden = hiddenIndex >= 0;
              const isFilled = isHidden && hiddenIndex < selectedCount;
              const isNextGap = isHidden && hiddenIndex === selectedCount;

              if (slot.revealed || isFilled) {
                return (
                  <span
                    key={slot.id}
                    className={`inline-flex items-center rounded-md px-2 py-1 text-sm ${
                      slot.revealed
                        ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border border-primary/20 bg-primary/10'
                    }`}
                  >
                    {slot.text}
                  </span>
                );
              }

              const width = clamp(slot.text.length * 8, 30, 140);
              return (
                <span
                  key={slot.id}
                  className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-sm ${
                    isNextGap
                      ? 'border-2 border-primary/40 bg-primary/5 text-primary/60'
                      : 'border border-border/60 bg-muted/20 text-muted-foreground'
                  }`}
                  style={{ minWidth: `${width}px` }}
                >
                  {'•'.repeat(clamp(slot.text.length, 3, 10))}
                </span>
              );
            })}
          </div>
        </div>

        {isCompleted && (
          <TrainingRatingFooter>
            <TrainingRatingButtons
              stage={ratingStage}
              mode="default"
              onRate={onRate}
            />
          </TrainingRatingFooter>
        )}
      </div>

      {showChoices && (
        <div className="sticky bottom-0 z-10 mt-3 rounded-2xl border border-border/60 bg-background p-3">
          <div className="flex flex-wrap gap-2">
            {visibleChoices.map((choice) => {
              const remaining = remainingCountByNormalized.get(choice.normalized) ?? 0;
              return (
                <Button
                  key={choice.normalized}
                  type="button"
                  variant="outline"
                  className={`h-auto rounded-xl px-3 py-2 transition-colors ${
                    errorFlashNormalized === choice.normalized
                      ? 'border-destructive text-destructive'
                      : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                  }`}
                  onClick={() => handleWordClick(choice)}
                >
                  {choice.displayText}
                  {remaining > 1 && (
                    <span className="ml-1 text-xs text-muted-foreground">×{remaining}</span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
