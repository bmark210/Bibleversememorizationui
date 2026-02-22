'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, RotateCcw, Undo2 } from 'lucide-react';
import { motion } from 'motion/react';

import { Button } from '../../ui/button';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import type { Verse } from '../../../data/mockData';

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

export function ModeClickWordsExercise({ verse, onRate }: ClickWordsExerciseProps) {
  const [tokens, setTokens] = useState<WordToken[]>([]);
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashTokenId, setErrorFlashTokenId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const words = tokenizeWords(verse.text);
    setTokens(shuffleTokens(words));
    setSelectedTokenIds([]);
    setMistakes(0);
    setIsCompleted(false);
    setErrorFlashTokenId(null);
    setFeedback(null);

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

  const selectedCount = selectedTokens.length;
  const totalWords = tokens.length;
  const progress = totalWords > 0 ? Math.round((selectedCount / totalWords) * 100) : 0;

  const handleWordClick = (token: WordToken) => {
    if (isCompleted) return;
    if (selectedTokenIds.includes(token.id)) return;

    const expectedOrder = selectedCount;

    if (token.order === expectedOrder) {
      const nextIds = [...selectedTokenIds, token.id];
      setSelectedTokenIds(nextIds);
      setFeedback(null);

      if (expectedOrder + 1 === totalWords) {
        setIsCompleted(true);
        setFeedback('Отлично! Вы собрали стих в правильной последовательности.');
      }
      return;
    }

    setMistakes((prev) => prev + 1);
    setFeedback('Неверное слово. Последовательность сброшена, попробуйте снова.');
    setSelectedTokenIds([]);
    setErrorFlashTokenId(token.id);

    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashTokenId(null);
      clearFlashTimeoutRef.current = null;
    }, 280);
  };

  const handleUndo = () => {
    if (isCompleted || selectedTokenIds.length === 0) return;
    setSelectedTokenIds((prev) => prev.slice(0, -1));
    setFeedback(null);
  };

  const handleReset = () => {
    if (isCompleted || selectedTokenIds.length === 0) return;
    setSelectedTokenIds([]);
    setFeedback(null);
  };

  const nextWordNumber = Math.min(selectedCount + 1, totalWords);

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
              Нажимайте слова в правильной последовательности
            </p>
          </div>

          {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Прогресс</div>
              <div className="text-sm font-semibold">{selectedCount} / {totalWords}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Следующее</div>
              <div className="text-sm font-semibold">Слово #{nextWordNumber}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Ошибки</div>
              <div className="text-sm font-semibold">{mistakes}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Готовность</div>
              <div className="text-sm font-semibold">{progress}%</div>
            </div>
          </div> */}

          {/* <div className="h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div> */}

          <div className="rounded-lg border border-border/60 bg-background p-4 min-h-[92px]">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Собранная последовательность
            </div>

            {selectedTokens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedTokens.map((token) => (
                  <motion.span
                    key={token.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-sm"
                  >
                    {token.text}
                  </motion.span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Начните с первого слова стиха. Ошибка сбрасывает текущую последовательность.
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
              Слова для выбора
            </div>
            <div className="flex flex-wrap gap-2">
              {tokens.map((token) => {
                const isSelected = selectedTokenIds.includes(token.id);
                const isError = errorFlashTokenId === token.id;

                return (
                  <motion.div
                    key={token.id}
                    animate={isError ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      type="button"
                      variant={isSelected ? 'secondary' : 'outline'}
                      className={`h-auto py-2.5 px-3 ${
                        isSelected ? 'opacity-70 cursor-default' : ''
                      } ${isError ? 'border-destructive text-destructive' : ''}`}
                      onClick={() => handleWordClick(token)}
                      disabled={isSelected || isCompleted}
                      aria-pressed={isSelected}
                    >
                      {token.text}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {!isCompleted ? (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* <Button
                type="button"
                variant="outline"
                onClick={handleUndo}
                disabled={selectedTokenIds.length === 0}
                className="gap-2"
              >
                <Undo2 className="w-4 h-4" />
                Отменить ход
              </Button> */}
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={selectedTokenIds.length === 0}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Сбросить последовательность
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-muted/40 p-4 text-sm">
                <div className="text-muted-foreground mb-1">Полный стих</div>
                <p className="leading-relaxed">{verse.text}</p>
              </div>
              <TrainingRatingFooter><RatingButtons onRate={onRate} /></TrainingRatingFooter>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}


