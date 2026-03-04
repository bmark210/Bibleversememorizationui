'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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

  // Avoid accidental original order for short verses if possible.
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
  const [showHint, setShowHint] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashWord, setErrorFlashWord] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const words = tokenizeWords(verse.text);
    setTokens(shuffleTokens(words));
    setSelectedTokenIds([]);
    setShowHint(false);
    setMistakes(0);
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
  const progressPercent = totalWords > 0 ? Math.round((selectedCount / totalWords) * 100) : 0;
  const mistakesLeftBeforeReset = Math.max(
    0,
    MAX_MISTAKES_BEFORE_RESET - mistakesSinceReset
  );
  const isMistakeRiskHigh = mistakesLeftBeforeReset <= 2;
  const isMistakeRiskCritical = mistakesLeftBeforeReset <= 1;

  const availableWords = useMemo(() => {
    const remainingWords = orderedTokens.slice(selectedCount).map((token) => token.text);
    const remainingSet = new Set<string>(remainingWords);
    return shuffledUniqueWords.filter((word) => remainingSet.has(word));
  }, [orderedTokens, selectedCount, shuffledUniqueWords]);

  const handleWordClick = (word: string) => {
    if (isCompleted) return;
    const expectedToken = orderedTokens[selectedCount];
    if (!expectedToken) return;

    // Для повторяющихся слов используем одну кнопку-экземпляр.
    // Засчитываем нажатие, если текст совпадает со следующим ожидаемым словом.
    if (word === expectedToken.text) {
      const nextIds = [...selectedTokenIds, expectedToken.id];
      setSelectedTokenIds(nextIds);

      if (selectedCount + 1 === totalWords) {
        setIsCompleted(true);
        // toast.success('Отлично! Вы собрали стих в правильной последовательности.');
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetSequence = nextMistakesSinceReset >= MAX_MISTAKES_BEFORE_RESET;

    setMistakes((prev) => prev + 1);
    setMistakesSinceReset(shouldResetSequence ? 0 : nextMistakesSinceReset);

    if (shouldResetSequence) {
      setSelectedTokenIds([]);
      toast.error(
        `Допущено ${MAX_MISTAKES_BEFORE_RESET} ошибок. Последовательность сброшена, попробуйте снова.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    } else {
      toast.error(
        `Неверное слово. Осталось ошибок до сброса: ${
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
    }, 280);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium mx-auto text-foreground/90">
                Соберите стих, нажимая слова по порядку
              </label>
            </div>

            {!isCompleted && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHint((prev) => !prev)}
                  aria-pressed={showHint}
                  className="gap-2 rounded-full"
                >
                  <Lightbulb className="h-4 w-4" />
                  {showHint ? 'Скрыть подсказку' : 'Подсказка'}
                </Button>
              </div>
            )}
          </div>

          {!isCompleted && (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background via-muted/10 to-muted/20 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <span>Прогресс последовательности</span>
                <span className="tabular-nums">{selectedCount}/{totalWords}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                <motion.div
                  className="h-full rounded-full bg-primary/80"
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                  Готово: {progressPercent}%
                </div>
                <div
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
                    isMistakeRiskCritical
                      ? 'border-destructive/45 bg-destructive/10 text-destructive'
                      : isMistakeRiskHigh
                        ? 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-border/60 bg-background/80 text-muted-foreground'
                  }`}
                >
                  До сброса: {mistakesLeftBeforeReset}/{MAX_MISTAKES_BEFORE_RESET}
                </div>
                {mistakes > 0 && (
                  <div className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                    Ошибок всего: {mistakes}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 min-h-[128px] shadow-sm">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary/5 to-transparent"
            />
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Собранная последовательность
              </div>
              {!isCompleted && totalWords > 0 && (
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {selectedCount}/{totalWords}
                </div>
              )}
            </div>

            {selectedTokens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedTokens.map((token) => (
                  <motion.span
                    key={token.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-sm"
                  >
                    {token.text}
                  </motion.span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ввод появится здесь
              </p>
            )}
          </div>

          <AnimatePresence initial={false}>
            {showHint && !isCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-background p-4"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                  <p className="text-muted-foreground">
                    {verse.text.split(' ').slice(0, 2).join(' ')}...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isCompleted && availableWords.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Слова для выбора
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableWords.map((word) => {
                  const isError = errorFlashWord === word;

                  return (
                    <motion.div
                      key={word}
                      animate={isError ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-auto rounded-xl px-3 py-2.5 transition-colors ${
                          isError
                            ? 'border-destructive text-destructive'
                            : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                        }`}
                        onClick={() => handleWordClick(word)}
                        disabled={isCompleted}
                      >
                        {word}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm">
                <div className="mb-2 text-sm font-medium text-foreground">Полный стих</div>
                <p className="leading-relaxed text-sm sm:text-base">
                  {verse.text}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
