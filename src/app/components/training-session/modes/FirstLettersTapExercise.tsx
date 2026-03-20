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
  resolveTrainingRatingExcludeForget,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { TrainingStageCorner } from './TrainingStageCorner';
import { tokenizeFirstLetters } from './wordUtils';
import type { HintState } from './useHintState';
import { createExerciseProgressSnapshot } from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import { getExerciseMaxMistakes } from '@/modules/training/hints/exerciseDifficultyConfig';
import { useTrainingFontSize } from './useTrainingFontSize';
import { useMeasuredElementSize } from './useMeasuredElementSize';

interface FirstLettersTapExerciseProps {
  verse: Verse;
  trainingModeId: TrainingModeId;
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

const LETTER_GRID_GAP = 8;

function getAutoGridColumns(
  width: number,
  minCellWidth: number,
  gap: number,
  fallback = 1
) {
  if (width <= 0 || minCellWidth <= 0) return fallback;
  return Math.max(1, Math.floor((width + gap) / (minCellWidth + gap)));
}

function getVisibleGridItemCount(
  width: number,
  height: number,
  minCellWidth: number,
  cellHeight: number,
  gap: number
) {
  if (width <= 0 || height <= 0) return 0;

  const columns = getAutoGridColumns(width, minCellWidth, gap, 1);
  const rows = Math.max(0, Math.floor((height + gap) / (cellHeight + gap)));
  return columns * rows;
}

function injectExpectedLetterIntoBatch(
  letters: string[],
  expectedLetter: string | null,
  selectedCount: number
) {
  if (!expectedLetter || letters.length === 0 || letters.includes(expectedLetter)) {
    return letters;
  }

  const nextLetters = [...letters];
  const swapIndex = selectedCount % nextLetters.length;
  nextLetters[swapIndex] = expectedLetter;
  return nextLetters;
}

function getSequenceCellClassName(params: {
  isFilled: boolean;
  isActiveGap: boolean;
}) {
  if (params.isFilled) {
    return 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (params.isActiveGap) {
    return 'border-2 border-primary/40 bg-primary/5 text-primary/70';
  }

  return 'border border-border/60 bg-muted/20 text-muted-foreground';
}

export function ModeFirstLettersTapExercise({
  verse,
  trainingModeId,
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
  const clearFlashTimeoutRef = useRef<number | null>(null);
  const clearSuccessFlashTimeoutRef = useRef<number | null>(null);

  const surrendered = hintState?.surrendered ?? false;

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setTokens(shuffleTokens(letters));
    setSelectedCount(0);
    setMistakesSinceReset(0);
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

  const showChoices = !isCompleted && !surrendered && availableLetters.length > 0;
  const sequenceItemRefs = useRef(new Map<string, HTMLSpanElement>());
  const {
    ref: sequenceGridContainerRef,
    size: sequenceGridContainerSize,
  } = useMeasuredElementSize<HTMLDivElement>(true);
  const {
    ref: choicesGridContainerRef,
    size: choicesGridContainerSize,
  } = useMeasuredElementSize<HTMLDivElement>(showChoices);

  const sequenceCellMinWidth = Math.max(38, Math.ceil(fontSizes.letter + 22));
  const sequenceCellHeight = Math.max(40, Math.ceil(fontSizes.letter + 24));
  const choiceCellMinWidth = Math.max(44, Math.ceil(fontSizes.letter + 26));
  const choiceCellHeight = Math.max(44, Math.ceil(fontSizes.letter + 26));

  const sequenceColumns = useMemo(
    () =>
      Math.max(
        1,
        Math.min(
          total || 1,
          getAutoGridColumns(
            sequenceGridContainerSize.width,
            sequenceCellMinWidth,
            LETTER_GRID_GAP,
            8
          )
        )
      ),
    [sequenceCellMinWidth, sequenceGridContainerSize.width, total]
  );

  const choiceColumns = useMemo(
    () =>
      getAutoGridColumns(
        choicesGridContainerSize.width,
        choiceCellMinWidth,
        LETTER_GRID_GAP,
        4
      ),
    [choiceCellMinWidth, choicesGridContainerSize.width]
  );

  const visibleChoiceCount = useMemo(
    () =>
      getVisibleGridItemCount(
        choicesGridContainerSize.width,
        choicesGridContainerSize.height,
        choiceCellMinWidth,
        choiceCellHeight,
        LETTER_GRID_GAP
      ),
    [
      choiceCellHeight,
      choiceCellMinWidth,
      choicesGridContainerSize.height,
      choicesGridContainerSize.width,
    ]
  );

  const displayedLetters = useMemo(() => {
    const batch = availableLetters.slice(0, visibleChoiceCount);
    return injectExpectedLetterIntoBatch(batch, expectedLetter, selectedCount);
  }, [availableLetters, expectedLetter, selectedCount, visibleChoiceCount]);

  const renderedChoiceColumns = Math.max(
    1,
    Math.min(choiceColumns, displayedLetters.length || 1)
  );

  const focusItemId = useMemo(() => {
    if (expectedTokens.length === 0) return null;
    if (selectedCount <= 0) return expectedTokens[0]?.id ?? null;
    return expectedTokens[Math.min(selectedCount - 1, expectedTokens.length - 1)]?.id ?? null;
  }, [expectedTokens, selectedCount]);

  useEffect(() => {
    if (!focusItemId) return;
    if (typeof window === 'undefined') return;

    const frameId = window.requestAnimationFrame(() => {
      const target = sequenceItemRefs.current.get(focusItemId);
      if (!target) return;

      const prefersReducedMotion = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

      target.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [focusItemId, expectedTokens]);

  const setSequenceItemRef = (id: string) => (node: HTMLSpanElement | null) => {
    if (node) {
      sequenceItemRefs.current.set(id, node);
      return;
    }

    sequenceItemRefs.current.delete(id);
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <TrainingStageCorner stage={ratingStage} progressPercent={verse.masteryLevel} />
      {mistakesSinceReset > 0 && (
        <span className="absolute right-0 top-0 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold tabular-nums text-white">
          {maxMistakes - mistakesSinceReset}
        </span>
      )}
      <div className="shrink-0 text-xs sm:text-xs flex items-center justify-center gap-1.5">
        <label className="text-xs font-medium text-foreground/90">
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
        <div className="relative flex h-full min-h-0 flex-col rounded-2xl border border-border/60 bg-background/70 px-3 pt-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Последовательность букв</span>
            <span className="tabular-nums">{selectedCount}/{total}</span>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 pr-1"
            role="group"
            aria-label="Последовательность букв"
          >
            <div
              ref={sequenceGridContainerRef}
              className="grid content-start"
              style={{
                gap: `${LETTER_GRID_GAP}px`,
                gridTemplateColumns: `repeat(${sequenceColumns}, minmax(0, 1fr))`,
                gridAutoRows: `${sequenceCellHeight}px`,
              }}
            >
              {expectedTokens.map((token, index) => {
                const isFilled = index < selectedCount;
                const isActiveGap = !isCompleted && !surrendered && index === selectedCount;

                return (
                  <span
                    key={token.id}
                    ref={setSequenceItemRef(token.id)}
                    className={`inline-flex h-full w-full items-center justify-center rounded-lg font-mono uppercase transition-colors ${getSequenceCellClassName({
                      isFilled,
                      isActiveGap,
                    })}`}
                    style={{ fontSize: `${fontSizes.letter}px` }}
                    aria-current={token.id === focusItemId ? 'step' : undefined}
                  >
                    {isFilled ? token.letter.toUpperCase() : '•'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom half: letter choices ── */}
      {showChoices && (
        <div className="mt-2 min-h-0 flex-1 basis-1/2 flex flex-col overflow-hidden border-t border-border/60 pt-2">
          <div className="mb-2 flex shrink-0 items-center text-xs text-muted-foreground">
            <span>Варианты букв</span>
          </div>
          <div
            ref={choicesGridContainerRef}
            className="min-h-0 flex-1 overflow-hidden"
          >
            <div
              className="grid content-start"
              style={{
                gap: `${LETTER_GRID_GAP}px`,
                gridTemplateColumns: `repeat(${renderedChoiceColumns}, minmax(0, 1fr))`,
                gridAutoRows: `${choiceCellHeight}px`,
              }}
            >
              {displayedLetters.map((letter) => (
                <div key={letter} className="min-w-0">
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-full w-full rounded-lg font-mono uppercase transition-colors ${
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
                </div>
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
              allowEasySkip={false}
              excludeForget={resolveTrainingRatingExcludeForget({
                isLateStageReview,
                ratingStage,
                trainingModeId,
                surrendered,
              })}
              currentTrainingModeId={trainingModeId}
              lateStageReview={isLateStageReview}
              disabled={false}
            />
          </TrainingRatingFooter>
        </div>
      )}
    </motion.div>
  );
}
