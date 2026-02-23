'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
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
  const [mistakes, setMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFlashTokenId, setErrorFlashTokenId] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const chunks = splitIntoChunks(verse.text);
    setTokens(shuffleTokens(chunks));
    setSelectedIds([]);
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
  const progress = totalChunks > 0 ? Math.round((selectedCount / totalChunks) * 100) : 0;

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
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl p-6 sm:p-8 shadow-sm border border-border"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-primary mb-2">{verse.reference}</h2>
            <div className="text-sm text-muted-foreground">{verse.translation}</div>
          </div>

          {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Прогресс</div>
              <div className="text-sm font-semibold">{selectedCount} / {totalChunks}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Следующее</div>
              <div className="text-sm font-semibold">Кусок #{nextChunkNumber}</div>
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
            {/* <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Собранная последовательность
            </div> */}
            {selectedTokens.length > 0 ? (
              <div className="space-y-2">
                {selectedTokens.map((token) => (
                  <motion.div
                    key={token.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm"
                  >
                    {token.text}
                  </motion.div>
                ))}
              </div>
            )
             : (
               <p className="text-sm text-muted-foreground">
                 Нажмите с начальную часть стиха.
               </p>
             )}
          </div>

          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border p-3 text-sm bg-destructive/10 border-destructive/30 text-destructive"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{feedback}</span>
              </div>
            </motion.div>
          )}
        {!tokens.every((token) => selectedIds.includes(token.id)) && (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Части стиха
            </div>
            <div className="space-y-2">
              {tokens.map((token) => {
                const isSelected = selectedIds.includes(token.id);
                const isError = errorFlashTokenId === token.id;

                if (isSelected) {
                  return null;
                }

                return (
                  <motion.div
                    key={token.id}
                    animate={isError ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full h-auto justify-start text-left whitespace-normal py-3 px-4 ${
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

          {/* {isCompleted && (
            <div className="rounded-lg bg-muted/40 p-4 text-sm">
              <div className="text-muted-foreground mb-1">Полный стих</div>
              <p className="leading-relaxed">{verse.text}</p>
            </div>
          )} */}
        </div>

        {isCompleted && (
          <TrainingRatingFooter>
            <RatingButtons onRate={onRate} />
          </TrainingRatingFooter>
        )}
      </motion.div>
    </div>
  );
}
