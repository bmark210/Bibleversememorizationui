'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';

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
  getMaxMistakes,
  getWordMask,
  getWordMaskWidth,
  pickVisibleChoices,
} from './wordUtils';
import { WordSequenceField, type WordSequenceFieldItem } from './WordSequenceField';
import { useMeasuredElementSize } from './useMeasuredElementSize';

interface ClickWordsExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
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

export function ModeClickWordsExercise({ verse, onRate }: ClickWordsExerciseProps) {
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [orderedTokens, setOrderedTokens] = useState<WordToken[]>([]);
  const [uniqueChoices, setUniqueChoices] = useState<UniqueChoice[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashNormalized, setErrorFlashNormalized] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);
  const { ref: choicePanelRef, size: choicePanelSize } =
    useMeasuredElementSize<HTMLDivElement>(!isCompleted);

  useEffect(() => {
    const words = tokenizeWords(verse.text);
    const shuffled = shuffleTokens(words);
    const ordered = [...shuffled].sort((a, b) => a.order - b.order);

    setOrderedTokens(ordered);
    setUniqueChoices(shuffleArray(buildUniqueChoices(shuffled)));
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

  const totalWords = orderedTokens.length;
  const maxMistakes = getMaxMistakes(totalWords);
  const expectedNormalized = orderedTokens[selectedCount]?.normalized ?? null;

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
      pickVisibleChoices(
        uniqueChoices,
        remainingCountByNormalized,
        expectedNormalized,
        choicePanelSize.width
      ),
    [uniqueChoices, remainingCountByNormalized, expectedNormalized, choicePanelSize.width]
  );

  const handleWordClick = (choice: UniqueChoice) => {
    if (isCompleted) return;
    const expectedToken = orderedTokens[selectedCount];
    if (!expectedToken) return;

    if (choice.normalized === expectedToken.normalized) {
      const next = selectedCount + 1;
      setSelectedCount(next);
      if (next === totalWords) {
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
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <div className="shrink-0">
        <label className="block text-center text-sm font-medium text-foreground/90">
          Соберите стих по словам
        </label>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        {showChoices ? (
          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
            <WordSequenceField
              className="h-full"
              label="Стих для сборки"
              progressCurrent={selectedCount}
              progressTotal={totalWords}
              items={sequenceItems}
              focusItemId={focusItemId}
            />

            <div
              ref={choicePanelRef}
              className="flex min-h-0 flex-col rounded-2xl border border-border/60 bg-background/70 pt-3 px-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Варианты слов</span>
                <span className="tabular-nums">{visibleChoices.length}</span>
              </div>

                <div
                  data-card-swipe-ignore="true"
                  className="flex h-full items-start overflow-hidden py-2"
                >
                  <div className="flex w-full flex-wrap content-start gap-1">
                    {visibleChoices.map((choice) => {
                      const remaining = remainingCountByNormalized.get(choice.normalized) ?? 0;
                      return (
                        <Button
                          key={choice.normalized}
                          type="button"
                          variant="outline"
                          title={choice.displayText}
                          className={`h-auto max-w-full min-w-0 justify-start rounded-lg px-2.5 py-1.5 text-[13px] leading-4 text-left whitespace-normal transition-colors ${
                            errorFlashNormalized === choice.normalized
                              ? 'border-destructive text-destructive'
                              : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                          }`}
                          onClick={() => handleWordClick(choice)}
                        >
                          <span className="min-w-0 [overflow-wrap:anywhere]">
                            {choice.displayText}
                          </span>
                          {remaining > 1 && (
                            <span className="shrink-0 text-[11px] text-muted-foreground">×{remaining}</span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden">
            <WordSequenceField
              className="h-full"
              label="Собранный стих"
              progressCurrent={selectedCount}
              progressTotal={totalWords}
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
              mode="default"
              onRate={onRate}
            />
          </TrainingRatingFooter>
        </div>
      )}
    </motion.div>
  );
}
