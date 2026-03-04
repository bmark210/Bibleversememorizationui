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

export function ModeClickChunksExercise({ verse, onRate }: ClickChunksExerciseProps) {
  const MAX_MISTAKES_BEFORE_RESET = 5;
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [tokens, setTokens] = useState<ChunkToken[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
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
    setMistakesSinceReset(0);
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
  const selectedIdSet = useMemo(
    () => new Set(selectedIds),
    [selectedIds]
  );

  const selectedCount = selectedTokens.length;
  const totalChunks = tokens.length;
  const progressPercent = totalChunks > 0 ? Math.round((selectedCount / totalChunks) * 100) : 0;
  const mistakesLeftBeforeReset = Math.max(
    0,
    MAX_MISTAKES_BEFORE_RESET - mistakesSinceReset
  );
  const isMistakeRiskHigh = mistakesLeftBeforeReset <= 2;
  const isMistakeRiskCritical = mistakesLeftBeforeReset <= 1;
  const remainingTokens = useMemo(
    () => tokens.filter((token) => !selectedIdSet.has(token.id)),
    [tokens, selectedIdSet]
  );

  const handleChunkClick = (token: ChunkToken) => {
    if (isCompleted) return;
    if (selectedIdSet.has(token.id)) return;

    const expectedOrder = selectedCount;
    if (token.order === expectedOrder) {
      const next = [...selectedIds, token.id];
      setSelectedIds(next);
      setFeedback(null);

      if (expectedOrder + 1 === totalChunks) {
        setIsCompleted(true);
        // toast.success('Отлично! Вы собрали стих по кускам в правильной последовательности.');
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetSequence = nextMistakesSinceReset >= MAX_MISTAKES_BEFORE_RESET;
    const message = shouldResetSequence
      ? `Допущено ${MAX_MISTAKES_BEFORE_RESET} ошибок. Последовательность сброшена, попробуйте снова.`
      : `Неверный фрагмент. Осталось ошибок до сброса: ${
          MAX_MISTAKES_BEFORE_RESET - nextMistakesSinceReset
        }.`;

    setMistakes((prev) => prev + 1);
    setMistakesSinceReset(shouldResetSequence ? 0 : nextMistakesSinceReset);
    if (shouldResetSequence) {
      setSelectedIds([]);
    }
    setFeedback(message);
    toast.error(message, {
      toasterId: GALLERY_TOASTER_ID,
      size: 'compact',
    });
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
    if (isCompleted || selectedIds.length === 0) return;
    setSelectedIds((prev) => prev.slice(0, -1));
    setFeedback(null);
  };

  const handleReset = () => {
    if (isCompleted || selectedIds.length === 0) return;
    setSelectedIds([]);
    setFeedback(null);
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
                  className="gap-2 rounded-full border border-border/60 bg-muted/35 text-foreground/90"
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
                <span className="tabular-nums">{selectedCount}/{totalChunks}</span>
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
                    className="rounded-md border border-border/60 bg-muted/35 px-3 py-2 text-sm text-foreground/90"
                  >
                    {token.text}
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground/90">
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

          {!isCompleted && remainingTokens.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Части стиха
                </div>
              </div>

              <AnimatePresence initial={false}>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="inline-flex max-w-full text-foreground/90 items-center rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-xs"
                    role="status"
                    aria-live="polite"
                  >
                    {feedback}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {remainingTokens.map((token) => {
                  const isError = errorFlashTokenId === token.id;

                  return (
                    <motion.div
                      key={token.id}
                      animate={isError ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-auto w-full justify-start whitespace-normal rounded-xl border-border/70 bg-background/60 px-4 py-3 text-left transition-colors ${
                          isError
                            ? 'border-destructive text-destructive'
                            : 'hover:border-primary/35 hover:bg-primary/5'
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
