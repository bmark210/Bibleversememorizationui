'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';

import { Button } from '../../ui/button';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { Verse } from '@/app/App';

interface ClickWordsExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

interface WordToken {
  id: string;
  text: string;
  order: number;
}

function tokenizeWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function shuffleTokens(words: string[]): WordToken[] {
  const tokens = words.map((word, index) => ({
    id: `${index}-${word}-${Math.random().toString(36).slice(2, 6)}`,
    text: word,
    order: index,
  }));

  const shuffled = [...tokens];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const sameOrder = shuffled.every((token, index) => token.order === index);
  if (sameOrder && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}

export function ModeClickWordsExercise({ verse, onRate }: ClickWordsExerciseProps) {
  const MAX_MISTAKES_BEFORE_RESET = 5;
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [tokens, setTokens] = useState<WordToken[]>([]);
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashWord, setErrorFlashWord] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const words = tokenizeWords(verse.text);
    setTokens(shuffleTokens(words));
    setSelectedTokenIds([]);
    setMistakesSinceReset(0);
    setIsCompleted(false);
    setErrorFlashWord(null);

    return () => {
      if (clearFlashTimeoutRef.current) {
        window.clearTimeout(clearFlashTimeoutRef.current);
        clearFlashTimeoutRef.current = null;
      }
    };
  }, [verse]);

  const tokenMap = useMemo(
    () => new Map(tokens.map((token) => [token.id, token])),
    [tokens]
  );

  const selectedTokens = useMemo(
    () =>
      selectedTokenIds
        .map((id) => tokenMap.get(id))
        .filter((token): token is WordToken => Boolean(token)),
    [selectedTokenIds, tokenMap]
  );

  const orderedTokens = useMemo(
    () => [...tokens].sort((a, b) => a.order - b.order),
    [tokens]
  );

  const shuffledUniqueWords = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const token of tokens) {
      if (seen.has(token.text)) continue;
      seen.add(token.text);
      result.push(token.text);
    }

    return result;
  }, [tokens]);

  const selectedCount = selectedTokens.length;
  const totalWords = tokens.length;

  const availableWords = useMemo(() => {
    const remainingWords = orderedTokens.slice(selectedCount).map((token) => token.text);
    const remainingSet = new Set<string>(remainingWords);
    return shuffledUniqueWords.filter((word) => remainingSet.has(word));
  }, [orderedTokens, selectedCount, shuffledUniqueWords]);

  const handleWordClick = (word: string) => {
    if (isCompleted) return;
    const expectedToken = orderedTokens[selectedCount];
    if (!expectedToken) return;

    if (word === expectedToken.text) {
      const nextIds = [...selectedTokenIds, expectedToken.id];
      setSelectedTokenIds(nextIds);

      if (selectedCount + 1 === totalWords) {
        setIsCompleted(true);
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetSequence = nextMistakesSinceReset >= MAX_MISTAKES_BEFORE_RESET;
    setMistakesSinceReset(shouldResetSequence ? 0 : nextMistakesSinceReset);

    if (shouldResetSequence) {
      setSelectedTokenIds([]);
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

    setErrorFlashWord(word);
    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashWord(null);
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

        {!isCompleted && availableWords.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
            <div className="flex flex-wrap gap-2">
              {availableWords.map((word) => (
                <Button
                  key={word}
                  type="button"
                  variant="outline"
                  className={`h-auto rounded-xl px-3 py-2 transition-colors ${
                    errorFlashWord === word
                      ? 'border-destructive text-destructive'
                      : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                  }`}
                  onClick={() => handleWordClick(word)}
                >
                  {word}
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
