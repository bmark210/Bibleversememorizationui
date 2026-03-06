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

interface HiddenChoice {
  id: string;
  text: string;
  normalized: string;
  slotOrder: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeWord(word: string) {
  const normalized = word
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return normalized || word.toLowerCase();
}

function tokenizeWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
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

function shuffleChoices(choices: HiddenChoice[]) {
  const shuffled = [...choices];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    swapArrayItems(shuffled, i, j);
  }

  const sameOrder = shuffled.every((choice, index) => choice.slotOrder === choices[index]?.slotOrder);
  if (sameOrder && shuffled.length > 1) {
    swapArrayItems(shuffled, 0, 1);
  }

  return shuffled;
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

  const hiddenChoices: HiddenChoice[] = slots
    .filter((slot) => !slot.revealed)
    .map((slot) => ({
      id: `${slot.order}-${Math.random().toString(36).slice(2, 6)}`,
      text: slot.text,
      normalized: slot.normalized,
      slotOrder: slot.order,
    }));

  return {
    slots,
    hiddenChoices: shuffleChoices(hiddenChoices),
  };
}

export function ModeClickWordsHintedExercise({
  verse,
  onRate,
}: ClickWordsHintedExerciseProps) {
  const MAX_MISTAKES_BEFORE_RESET = 5;
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [slots, setSlots] = useState<WordSlot[]>([]);
  const [choices, setChoices] = useState<HiddenChoice[]>([]);
  const [selectedChoiceIds, setSelectedChoiceIds] = useState<string[]>([]);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashChoiceId, setErrorFlashChoiceId] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const exercise = buildExercise(verse.text);
    setSlots(exercise.slots);
    setChoices(exercise.hiddenChoices);
    setSelectedChoiceIds([]);
    setMistakesSinceReset(0);
    setIsCompleted(false);
    setErrorFlashChoiceId(null);

    return () => {
      if (clearFlashTimeoutRef.current) {
        window.clearTimeout(clearFlashTimeoutRef.current);
        clearFlashTimeoutRef.current = null;
      }
    };
  }, [verse]);

  const choiceMap = useMemo(
    () => new Map(choices.map((choice) => [choice.id, choice])),
    [choices]
  );

  const selectedChoiceIdSet = useMemo(
    () => new Set(selectedChoiceIds),
    [selectedChoiceIds]
  );

  const hiddenSlots = useMemo(
    () => slots.filter((slot) => !slot.revealed),
    [slots]
  );

  const selectedChoices = useMemo(
    () =>
      selectedChoiceIds
        .map((id) => choiceMap.get(id))
        .filter((choice): choice is HiddenChoice => Boolean(choice)),
    [selectedChoiceIds, choiceMap]
  );

  const remainingChoices = useMemo(
    () => choices.filter((choice) => !selectedChoiceIdSet.has(choice.id)),
    [choices, selectedChoiceIdSet]
  );

  const hiddenIndexByOrder = useMemo(() => {
    const map = new Map<number, number>();
    hiddenSlots.forEach((slot, index) => map.set(slot.order, index));
    return map;
  }, [hiddenSlots]);

  const selectedCount = selectedChoices.length;
  const totalHiddenWords = hiddenSlots.length;
  const nextHiddenSlot = hiddenSlots[selectedCount] ?? null;

  const handleWordClick = (choice: HiddenChoice) => {
    if (isCompleted) return;
    if (selectedChoiceIdSet.has(choice.id)) return;
    if (!nextHiddenSlot) return;

    if (choice.normalized === nextHiddenSlot.normalized) {
      const nextIds = [...selectedChoiceIds, choice.id];
      setSelectedChoiceIds(nextIds);

      if (nextIds.length === totalHiddenWords) {
        setIsCompleted(true);
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetSequence = nextMistakesSinceReset >= MAX_MISTAKES_BEFORE_RESET;
    setMistakesSinceReset(shouldResetSequence ? 0 : nextMistakesSinceReset);

    if (shouldResetSequence) {
      setSelectedChoiceIds([]);
      toast.error(
        `Допущено ${MAX_MISTAKES_BEFORE_RESET} ошибок. Последовательность сброшена.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    } else {
      toast.error(
        `Неверное слово. До сброса: ${
          MAX_MISTAKES_BEFORE_RESET - nextMistakesSinceReset
        }.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    }

    setErrorFlashChoiceId(choice.id);
    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashChoiceId(null);
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
                  className="inline-flex items-center justify-center rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-sm text-muted-foreground"
                  style={{ minWidth: `${width}px` }}
                >
                  {'•'.repeat(clamp(slot.text.length, 3, 10))}
                </span>
              );
            })}
          </div>
        </div>

        {!isCompleted && remainingChoices.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
            <div className="flex flex-wrap gap-2">
              {remainingChoices.map((choice) => (
                <Button
                  key={choice.id}
                  type="button"
                  variant="outline"
                  className={`h-auto rounded-xl px-3 py-2 transition-colors ${
                    errorFlashChoiceId === choice.id
                      ? 'border-destructive text-destructive'
                      : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                  }`}
                  onClick={() => handleWordClick(choice)}
                >
                  {choice.text}
                </Button>
              ))}
            </div>
          </div>
        )}

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
    </motion.div>
  );
}
