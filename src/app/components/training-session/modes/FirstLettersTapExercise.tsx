'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, RotateCcw, Undo2 } from 'lucide-react';
import { motion } from 'motion/react';

import { Button } from '../../ui/button';
import type { Verse } from '../../../data/mockData';

interface FirstLettersTapExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

interface LetterToken {
  id: string;
  letter: string;
  order: number;
}

function tokenizeFirstLetters(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => {
      const cleaned = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      return (cleaned.charAt(0) || word.charAt(0) || '').toLowerCase();
    })
    .filter(Boolean);
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
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const sameOrder = shuffled.every((token, index) => token.order === index);
  if (sameOrder && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}

function RatingButtons({ onRate }: { onRate: (rating: 0 | 1 | 2 | 3) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <p className="text-sm text-muted-foreground text-center">Оцените своё запоминание:</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          onClick={() => onRate(0)}
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          size="lg" 
        >
          Забыл
        </Button>
        <Button
          onClick={() => onRate(1)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
          size="lg"
        >
          Сложно
        </Button>
        <Button
          onClick={() => onRate(2)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
          size="lg"
        >
          Норм
        </Button>
        <Button
          onClick={() => onRate(3)}
          className="bg-[#059669] hover:bg-[#047857] text-white"
          size="lg"
        >
          Отлично
        </Button>
      </div>
    </motion.div>
  );
}

export function ModeFirstLettersTapExercise({
  verse,
  onRate,
}: FirstLettersTapExerciseProps) {
  const [tokens, setTokens] = useState<LetterToken[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFlashLetter, setErrorFlashLetter] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setTokens(shuffleTokens(letters));
    setSelectedLetters([]);
    setMistakes(0);
    setIsCompleted(false);
    setFeedback(null);
    setErrorFlashLetter(null);

    return () => {
      if (clearFlashTimeoutRef.current) {
        window.clearTimeout(clearFlashTimeoutRef.current);
        clearFlashTimeoutRef.current = null;
      }
    };
  }, [verse]);

  const expectedLetters = useMemo(
    () =>
      [...tokens]
        .sort((a, b) => a.order - b.order)
        .map((token) => token.letter),
    [tokens]
  );

  const selectedCount = selectedLetters.length;

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

  const availableLetters = useMemo(() => {
    const remainingLetters = expectedLetters.slice(selectedCount);
    const remainingSet = new Set<string>(remainingLetters);
    return shuffledUniqueLetters.filter((letter) => remainingSet.has(letter));
  }, [expectedLetters, selectedCount, shuffledUniqueLetters]);

  const selectedTokens = useMemo(
    () => selectedLetters.map((letter, index) => ({ id: `${index}-${letter}`, letter, order: index })),
    [selectedLetters]
  );

  const total = tokens.length;
  const progress = total > 0 ? Math.round((selectedCount / total) * 100) : 0;

  const handlePick = (letter: string) => {
    if (isCompleted) return;

    const expectedOrder = selectedCount;
    const expectedLetter = expectedLetters[expectedOrder];

    // Важно: для повторяющихся букв засчитываем любую такую же букву,
    // даже если пользователь нажал "копию" от другого слова.
    if (letter === expectedLetter) {
      const next = [...selectedLetters, letter];
      setSelectedLetters(next);
      setFeedback(null);

      if (expectedOrder + 1 === total) {
        setIsCompleted(true);
        setFeedback('Отлично! Последовательность первых букв собрана верно.');
      }
      return;
    }

    setMistakes((prev) => prev + 1);
    setSelectedLetters([]);
    setFeedback('Неверная буква. Последовательность сброшена, попробуйте ещё раз.');
    setErrorFlashLetter(letter);

    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashLetter(null);
      clearFlashTimeoutRef.current = null;
    }, 280);
  };

  const handleUndo = () => {
    if (isCompleted || selectedLetters.length === 0) return;
    setSelectedLetters((prev) => prev.slice(0, -1));
    setFeedback(null);
  };

  const handleReset = () => {
    if (isCompleted || selectedLetters.length === 0) return;
    setSelectedLetters([]);
    setFeedback(null);
  };

  const nextIndex = Math.min(selectedCount + 1, total);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-6 sm:p-8 shadow-sm border border-border"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-primary mb-2">{verse.reference}</h2>
            <div className="text-sm text-muted-foreground">{verse.translation}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Нажимайте первые буквы слов в правильной последовательности
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Прогресс</div>
              <div className="text-sm font-semibold">{selectedCount} / {total}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Следующее</div>
              <div className="text-sm font-semibold">Буква #{nextIndex}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Ошибки</div>
              <div className="text-sm font-semibold">{mistakes}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Готовность</div>
              <div className="text-sm font-semibold">{progress}%</div>
            </div>
          </div>

          <div className="h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-background p-4 min-h-[84px]">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Собранные буквы
            </div>
            {selectedTokens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedTokens.map((token) => (
                  <motion.span
                    key={token.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 min-w-9 font-mono text-sm uppercase"
                  >
                    {token.letter}
                  </motion.span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Выберите первую букву первого слова. Ошибка сбросит последовательность.
              </p>
            )}
          </div>

          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border p-3 text-sm ${
                isCompleted
                  ? 'bg-[#059669]/10 border-[#059669]/30 text-[#047857]'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                {isCompleted ? (
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{feedback}</span>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Варианты букв
            </div>
            <div className="flex flex-wrap gap-2">
              {availableLetters.map((letter) => {
                const isError = errorFlashLetter === letter;

                return (
                  <motion.div
                    key={letter}
                    animate={isError ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className={`min-w-10 h-auto py-2 px-3 font-mono uppercase ${
                        isError ? 'border-destructive text-destructive' : ''
                      }`}
                      onClick={() => handlePick(letter)}
                      disabled={isCompleted}
                    >
                      {letter}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {!isCompleted ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleUndo}
                disabled={selectedLetters.length === 0}
                className="gap-2"
              >
                <Undo2 className="w-4 h-4" />
                Отменить ход
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={selectedLetters.length === 0}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Сбросить последовательность
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-muted/40 p-4 text-sm">
                <div className="text-muted-foreground mb-1">Подсказка по стиху</div>
                <p className="leading-relaxed">
                  {verse.text
                    .split(/\s+/)
                    .map((word) => {
                      const clean = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
                      const first = clean.charAt(0) || '';
                      return first ? `${first.toUpperCase()}…` : word;
                    })
                    .join(' ')}
                </p>
              </div>
              <RatingButtons onRate={onRate} />
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
