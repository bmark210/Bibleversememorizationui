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
  const [tokens, setTokens] = useState<WordToken[]>([]);
  const [orderedTokens, setOrderedTokens] = useState<WordToken[]>([]);
  const [uniqueChoices, setUniqueChoices] = useState<UniqueChoice[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashNormalized, setErrorFlashNormalized] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const words = tokenizeWords(verse.text);
    const shuffled = shuffleTokens(words);
    const ordered = [...shuffled].sort((a, b) => a.order - b.order);

    setTokens(shuffled);
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

  const totalWords = tokens.length;
  const maxMistakes = getMaxMistakes(totalWords);

  const selectedTokens = useMemo(
    () => orderedTokens.slice(0, selectedCount),
    [orderedTokens, selectedCount]
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

  const availableChoices = useMemo(
    () => uniqueChoices.filter((c) => (remainingCountByNormalized.get(c.normalized) ?? 0) > 0),
    [uniqueChoices, remainingCountByNormalized]
  );

  const expectedNormalized = orderedTokens[selectedCount]?.normalized ?? null;

  const visibleChoices = useMemo(
    () => pickVisibleChoices(availableChoices, expectedNormalized),
    [availableChoices, expectedNormalized]
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
      className="w-full"
    >
      <div className={`space-y-3 ${showChoices ? 'pb-20' : ''}`}>
        <label className="block text-center text-sm font-medium text-foreground/90">
          Соберите стих по словам
        </label>

        <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Последовательность</span>
            <span className="tabular-nums">{selectedCount}/{totalWords}</span>
          </div>

          {selectedTokens.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedTokens.map((token) => (
                <span
                  key={token.id}
                  className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-sm"
                >
                  {token.text}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Нажимайте слова в правильном порядке.</p>
          )}
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
        <div className="sticky bottom-0 z-10 mt-3 rounded-2xl border border-border/60 bg-background/95 p-3 backdrop-blur-sm">
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
