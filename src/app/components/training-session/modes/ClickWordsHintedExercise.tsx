'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';
import { TrainingModeId } from '@/shared/training/modeEngine';

import { Info } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
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
  getWordMask,
  getWordMaskWidth,
} from './wordUtils';
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

interface ClickWordsHintedExerciseProps {
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
  normalized: string;
  order: number;
  revealed: boolean;
}

interface UniqueChoice {
  displayText: string;
  normalized: string;
  totalCount: number;
}

function pickRevealedIndices(totalWords: number, revealCount: number): Set<number> {
  if (totalWords <= 1) return new Set<number>();

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

function buildExercise(params: {
  text: string;
  difficultyLevel: Verse["difficultyLevel"];
}) {
  const { text, difficultyLevel } = params;
  const words = tokenizeWords(text);
  const revealed = pickRevealedIndices(
    words.length,
    getHintedRevealCount({
      modeId: TrainingModeId.ClickWordsHinted,
      difficultyLevel,
      totalWords: words.length,
    })
  );

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
  for (let i = uniqueChoices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    swapArrayItems(uniqueChoices, i, j);
  }

  return { slots, uniqueChoices };
}

const MAX_DISPLAYED_CHOICES = 20;

export function ModeClickWordsHintedExercise({
  verse,
  onRate,
  hintState,
  onProgressChange,
  isLateStageReview = false,
  onOpenTutorial,
}: ClickWordsHintedExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [{ slots, uniqueChoices }, setExerciseData] = useState(
    () => buildExercise({ text: verse.text, difficultyLevel: verse.difficultyLevel })
  );
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashNormalized, setErrorFlashNormalized] = useState<string | null>(null);
  const [successFlashNormalized, setSuccessFlashNormalized] = useState<string | null>(null);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const clearFlashTimeoutRef = useRef<number | null>(null);
  const clearSuccessFlashTimeoutRef = useRef<number | null>(null);

  const surrendered = hintState?.surrendered ?? false;

  const prevVerseRef = useRef(verse);
  useEffect(() => {
    if (prevVerseRef.current === verse) return;
    prevVerseRef.current = verse;
    setExerciseData(buildExercise({ text: verse.text, difficultyLevel: verse.difficultyLevel }));
    setSelectedCount(0);
    setMistakesSinceReset(0);
    setTotalMistakes(0);
    setIsCompleted(false);
    setErrorFlashNormalized(null);
    setSuccessFlashNormalized(null);
  }, [verse]);

  useEffect(() => {
    return () => {
      if (clearFlashTimeoutRef.current) {
        window.clearTimeout(clearFlashTimeoutRef.current);
      }
      if (clearSuccessFlashTimeoutRef.current) {
        window.clearTimeout(clearSuccessFlashTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (surrendered && !isCompleted) {
      setIsCompleted(true);
    }
  }, [surrendered, isCompleted]);

  const hiddenSlots = useMemo(
    () => slots.filter((slot) => !slot.revealed),
    [slots]
  );

  const totalHiddenWords = hiddenSlots.length;
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.ClickWordsHinted,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: totalHiddenWords,
  });
  const nextHiddenSlot = hiddenSlots[selectedCount] ?? null;
  // const nextHiddenNormalized = nextHiddenSlot?.normalized ?? null;

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'word-order-hinted',
        unitType: 'word',
        expectedIndex: nextHiddenSlot?.order ?? null,
        completedCount: selectedCount,
        totalCount: totalHiddenWords,
        isCompleted: isCompleted || surrendered,
      })
    );
  }, [
    isCompleted,
    nextHiddenSlot,
    onProgressChange,
    selectedCount,
    surrendered,
    totalHiddenWords,
  ]);

  const hiddenIndexByOrder = useMemo(() => {
    const map = new Map<number, number>();
    hiddenSlots.forEach((slot, index) => map.set(slot.order, index));
    return map;
  }, [hiddenSlots]);

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

  const remainingCountByNormalized = useMemo(() => {
    const counts = new Map<string, number>();
    for (const choice of uniqueChoices) {
      counts.set(choice.normalized, choice.totalCount);
    }

    for (let i = 0; i < selectedCount; i += 1) {
      const slot = hiddenSlots[i];
      if (!slot) break;
      const current = counts.get(slot.normalized) ?? 0;
      if (current > 0) counts.set(slot.normalized, current - 1);
    }

    return counts;
  }, [uniqueChoices, selectedCount, hiddenSlots]);

  const visibleChoices = useMemo(
    () =>
      uniqueChoices.filter(
        (choice) => (remainingCountByNormalized.get(choice.normalized) ?? 0) > 0
      ),
    [uniqueChoices, remainingCountByNormalized]
  );

  const handleWordClick = (choice: UniqueChoice) => {
    if (isCompleted || surrendered) return;
    if (!nextHiddenSlot) return;

    if (choice.normalized === nextHiddenSlot.normalized) {
      const next = selectedCount + 1;
      setSelectedCount(next);

      setSuccessFlashNormalized(choice.normalized);
      if (clearSuccessFlashTimeoutRef.current) {
        window.clearTimeout(clearSuccessFlashTimeoutRef.current);
      }
      clearSuccessFlashTimeoutRef.current = window.setTimeout(() => {
        setSuccessFlashNormalized(null);
        clearSuccessFlashTimeoutRef.current = null;
      }, 260);

      if (next === totalHiddenWords) {
        setIsCompleted(true);
      }
      return;
    }

    setTotalMistakes((prev) => prev + 1);
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

  const showChoices = !isCompleted && !surrendered && visibleChoices.length > 0;

  const { ref: choicesContainerRef, batchSize } = useFittedBatchSize({
    itemHeight: 36,
    rowGap: 6,
    itemMinWidth: 60,
    columnGap: 6,
    minItems: 4,
    maxItems: 40,
    enabled: showChoices,
  });

  const displayedChoices = useMemo(() => {
    const batch = visibleChoices.slice(0, batchSize);
    const expectedNormalized = nextHiddenSlot?.normalized;
    if (expectedNormalized && !batch.some((c) => c.normalized === expectedNormalized)) {
      const expectedChoice = visibleChoices.find((c) => c.normalized === expectedNormalized);
      if (expectedChoice && batch.length > 0) {
        const swapIdx = selectedCount % batch.length;
        batch[swapIdx] = expectedChoice;
      }
    }
    return batch;
  }, [visibleChoices, nextHiddenSlot, selectedCount, batchSize]);

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
          Выберите слова по порядку
        </label>
        {onOpenTutorial && (
          <button type="button" onClick={onOpenTutorial} className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground/60 hover:text-foreground/80 transition-colors" aria-label="Подробнее о режиме">
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Top half: verse field ── */}
      <div className="mt-3 min-h-0 flex-1 basis-1/2 overflow-hidden">
        <WordSequenceField
          className="h-full"
          label="Стих с пропусками"
          progressCurrent={selectedCount}
          progressTotal={totalHiddenWords}
          items={sequenceItems}
          focusItemId={focusItemId}
          fontSizes={fontSizes}
        />
      </div>

      {/* ── Bottom half: word choices ── */}
      {showChoices && (
        <div className="mt-2 min-h-0 flex-1 basis-1/2 flex flex-col overflow-hidden border-t border-border/60 pt-2">
          <div className="mb-2 flex shrink-0 items-center text-xs text-muted-foreground">
            <span>Варианты слов</span>
          </div>
          <div
            ref={choicesContainerRef}
            className="flex-1 min-h-0 overflow-hidden"
          >
            <div className="flex flex-wrap content-start gap-1.5 py-1">
            {displayedChoices.map((choice) => (
              <Button
                key={choice.normalized}
                type="button"
                variant="outline"
                title={choice.displayText}
                className={`h-auto max-w-full min-w-0 justify-start rounded-lg px-3 py-2 leading-5 text-left whitespace-nowrap transition-colors ${
                  errorFlashNormalized === choice.normalized
                    ? 'border-destructive text-destructive bg-destructive/10'
                    : successFlashNormalized === choice.normalized
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                      : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                }`}
                style={{ fontSize: `${fontSizes.sm}px` }}
                onClick={() => handleWordClick(choice)}
              >
                <span className="block min-w-0 truncate">
                  {choice.displayText}
                </span>
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
              mode="default"
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
