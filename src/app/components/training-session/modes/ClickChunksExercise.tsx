'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';

import { Button } from '../../ui/button';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import type { Verse } from '../../../data/mockData';

interface ClickChunksExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

interface ChunkToken {
  id: string;
  text: string;
  order: number;
}

function splitIntoChunks(text: string): string[] {
  const byPunctuation = text
    .split(/[.;!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (byPunctuation.length >= 3) {
    return byPunctuation;
  }

  const words = text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length <= 4) {
    return [words.join(' ')].filter(Boolean);
  }

  const desiredChunks = clamp(Math.ceil(words.length / 4), 2, 4);
  const chunkSize = Math.max(2, Math.ceil(words.length / desiredChunks));
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }

  return chunks.filter(Boolean);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function shuffleTokens(chunks: string[]): ChunkToken[] {
  const tokens = chunks.map((chunk, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 6)}`,
    text: chunk,
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

export function ModeClickChunksExercise({ verse, onRate }: ClickChunksExerciseProps) {
  const [tokens, setTokens] = useState<ChunkToken[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFlashTokenId, setErrorFlashTokenId] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const chunks = splitIntoChunks(verse.text);
    setTokens(shuffleTokens(chunks));
    setSelectedIds([]);
    setShowHint(false);
    setMistakes(0);
    setIsCompleted(false);
    setFeedback(null);
    setErrorFlashTokenId(null);

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
      selectedIds
        .map((id) => tokenMap.get(id))
        .filter((token): token is ChunkToken => Boolean(token)),
    [selectedIds, tokenMap]
  );

  const selectedCount = selectedTokens.length;
  const totalChunks = tokens.length;

  const handleChunkClick = (token: ChunkToken) => {
    if (isCompleted) return;
    if (selectedIds.includes(token.id)) return;

    const expectedOrder = selectedCount;
    if (token.order === expectedOrder) {
      const next = [...selectedIds, token.id];
      setSelectedIds(next);
      setFeedback(null);

      if (expectedOrder + 1 === totalChunks) {
        setIsCompleted(true);
        toast.success('Отлично! Вы собрали стих по кускам в правильной последовательности.');
      }
      return;
    }

    setMistakes((prev) => prev + 1);
    setSelectedIds([]);
    setFeedback('Неверный кусок. Последовательность сброшена, попробуйте снова.');
    setErrorFlashTokenId(token.id);

    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashTokenId(null);
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
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Соберите стих по частям
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

          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 min-h-[128px] shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Собранная последовательность
              </div>
              {!isCompleted && totalChunks > 0 && (
                <div className="text-[11px] tabular-nums text-muted-foreground">
                  {selectedCount}/{totalChunks}
                </div>
              )}
            </div>

            {selectedTokens.length > 0 ? (
              <div className="space-y-2">
                {selectedTokens.map((token) => (
                  <motion.div
                    key={token.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm"
                  >
                    {token.text}
                  </motion.div>
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

          {!tokens.every((token) => selectedIds.includes(token.id)) && (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Части стиха
                </div>
                {mistakes > 0 && (
                  <div className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                    Ошибок: {mistakes}
                  </div>
                )}
              </div>

              <AnimatePresence initial={false}>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="inline-flex max-w-full items-center rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-xs text-destructive"
                    role="status"
                    aria-live="polite"
                  >
                    {feedback}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {tokens.map((token) => {
                  const isSelected = selectedIds.includes(token.id);
                  const isError = errorFlashTokenId === token.id;

                  if (isSelected) return null;

                  return (
                    <motion.div
                      key={token.id}
                      animate={isError ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-auto w-full justify-start whitespace-normal rounded-xl border-border/70 bg-background/60 px-4 py-3 text-left ${
                          isError ? 'border-destructive text-destructive' : ''
                        }`}
                        onClick={() => handleChunkClick(token)}
                        disabled={isCompleted}
                        aria-pressed={false}
                      >
                        {token.text}
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
                <p className="leading-relaxed text-sm sm:text-base">{verse.text}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isCompleted && (
          <TrainingRatingFooter>
            <RatingButtons onRate={onRate} />
          </TrainingRatingFooter>
        )}
      </div>
    </motion.div>
  );
}
