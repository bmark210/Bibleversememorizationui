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
import { getExerciseMaxMistakes } from '@/modules/training/hints/exerciseDifficultyConfig';
import { useFittedBatchSize } from './useFittedBatchSize';
import { useTrainingFontSize } from './useTrainingFontSize';

interface ClickWordsExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
}

interface WordToken {
  id: string;
  text: string;
  normalized: string;
  order: number;
}

interface UniqueChoice {
  displayText: string;
  normalized: string;
  totalCount: number;
}

function shuffleTokens(words: string[]): WordToken[] {
  const tokens = words.map((word, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 6)}`,
    text: word,
    normalized: normalizeWord(word),
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

function buildUniqueChoices(tokens: WordToken[]): UniqueChoice[] {
  const map = new Map<string, UniqueChoice>();
  for (const token of tokens) {
    const existing = map.get(token.normalized);
    if (existing) {
      existing.totalCount += 1;
    } else {
      map.set(token.normalized, {
        displayText: cleanWordForDisplay(token.text),
        normalized: token.normalized,
        totalCount: 1,
      });
    }
  }
  return Array.from(map.values());
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    swapArrayItems(result, i, j);
  }
  return result;
}

function initClickWordsExercise(text: string) {
  const words = tokenizeWords(text);
  const shuffled = shuffleTokens(words);
  const orderedTokens = [...shuffled].sort((a, b) => a.order - b.order);
  const uniqueChoices = shuffleArray(buildUniqueChoices(shuffled));
  return { orderedTokens, uniqueChoices };
}

export function ModeClickWordsExercise({ verse, onRate, hintState, onProgressChange, isLateStageReview = false, onOpenTutorial }: ClickWordsExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [{ orderedTokens, uniqueChoices }, setTokenData] = useState(
    () => initClickWordsExercise(verse.text)
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
    setTokenData(initClickWordsExercise(verse.text));
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

  const totalWords = orderedTokens.length;
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.ClickWordsNoHints,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: totalWords,
  });
  const expectedWordIndex = orderedTokens[selectedCount]?.order ?? null;
  // const expectedNormalized = orderedTokens[selectedCount]?.normalized ?? null;

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'word-order',
        unitType: 'word',
        expectedIndex: expectedWordIndex,
        completedCount: selectedCount,
        totalCount: totalWords,
        isCompleted: isCompleted || surrendered,
      })
    );
  }, [expectedWordIndex, isCompleted, onProgressChange, selectedCount, surrendered, totalWords]);

  const selectedTokens = useMemo(
    () => orderedTokens.slice(0, selectedCount),
    [orderedTokens, selectedCount]
  );

  const focusItemId = useMemo(() => {
    if (orderedTokens.length === 0) return null;
    if (selectedCount <= 0) return orderedTokens[0]?.id ?? null;
    return orderedTokens[Math.min(selectedCount - 1, orderedTokens.length - 1)]?.id ?? null;
  }, [orderedTokens, selectedCount]);

  const sequenceItems = useMemo<WordSequenceFieldItem[]>(
    () =>
      orderedTokens.map((token, index) => {
        const isFilled = index < selectedCount;
        const isActiveGap = !isCompleted && index === selectedCount;

        return {
          id: token.id,
          content: isFilled ? token.text : getWordMask(token.text),
          minWidth: isFilled ? undefined : getWordMaskWidth(token.text),
          state: isFilled ? 'filled' : isActiveGap ? 'active-gap' : 'future-gap',
        };
      }),
    [orderedTokens, selectedCount, isCompleted]
  );

  const remainingCountByNormalized = useMemo(() => {
    const counts = new Map<string, number>();
    for (const choice of uniqueChoices) {
      counts.set(choice.normalized, choice.totalCount);
    }
    for (const token of selectedTokens) {
      const current = counts.get(token.normalized) ?? 0;
      if (current > 0) counts.set(token.normalized, current - 1);
    }
    return counts;
  }, [uniqueChoices, selectedTokens]);

  const visibleChoices = useMemo(
    () =>
      uniqueChoices.filter(
        (choice) => (remainingCountByNormalized.get(choice.normalized) ?? 0) > 0
      ),
    [uniqueChoices, remainingCountByNormalized]
  );

  const handleWordClick = (choice: UniqueChoice) => {
    if (isCompleted || surrendered) return;
    const expectedToken = orderedTokens[selectedCount];
    if (!expectedToken) return;

    if (choice.normalized === expectedToken.normalized) {
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

      if (next === totalWords) {
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

  // Реальная высота кнопки ≈ 38px (content 20 + padding 16 + border 2). +2px запас на subpixel.
  const wordButtonHeight = 40 + Math.max(0, fontSizes.sm - 14);
  const wordButtonMinWidth = 24 + Math.ceil(fontSizes.sm * 2.2);
  const { ref: choicesContainerRef, batchSize } = useFittedBatchSize({
    itemHeight: wordButtonHeight,
    rowGap: 6,
    itemMinWidth: wordButtonMinWidth,
    columnGap: 6,
    minItems: 4,
    maxItems: 40,
    enabled: showChoices,
    reduceHeightBy: 8, // py-1 обёртки
    safetyRows: 0, // убрали — последний ряд не перекрывается футером
  });

  const displayedChoices = useMemo(() => {
    const batch = visibleChoices.slice(0, batchSize);
    const expectedNormalized = orderedTokens[selectedCount]?.normalized;
    if (expectedNormalized && !batch.some((c) => c.normalized === expectedNormalized)) {
      const expectedChoice = visibleChoices.find((c) => c.normalized === expectedNormalized);
      if (expectedChoice && batch.length > 0) {
        const swapIdx = selectedCount % batch.length;
        batch[swapIdx] = expectedChoice;
      }
    }
    return batch;
  }, [visibleChoices, orderedTokens, selectedCount, batchSize]);

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
          Соберите стих по словам
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
          label={isCompleted ? 'Собранный стих' : 'Стих для сборки'}
          progressCurrent={selectedCount}
          progressTotal={totalWords}
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
