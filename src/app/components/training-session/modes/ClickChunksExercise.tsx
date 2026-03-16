'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';
import { TrainingModeId } from '@/shared/training/modeEngine';

import { Button } from "@/app/components/ui/button";
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { Verse } from '@/app/App';
import type { HintState } from './useHintState';
import { createExerciseProgressSnapshot } from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import { getExerciseMaxMistakes } from '@/modules/training/hints/exerciseDifficultyConfig';

interface ClickChunksExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
}

interface ChunkToken {
  id: string;
  text: string;
  order: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mergeChunksEvenly(chunks: string[], targetCount: number): string[] {
  if (chunks.length <= targetCount) return chunks;

  const normalized = chunks.map((chunk) => chunk.trim()).filter(Boolean);
  if (normalized.length <= targetCount) return normalized;

  const merged: string[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const start = Math.floor((i * normalized.length) / targetCount);
    const end = Math.floor(((i + 1) * normalized.length) / targetCount);
    const nextChunk = normalized.slice(start, end).join(' ').trim();
    if (nextChunk) merged.push(nextChunk);
  }

  return merged;
}

function splitIntoChunks(text: string): string[] {
  const byPunctuation = text
    .split(/[.;!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const words = text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return [];

  const desiredChunks = clamp(Math.ceil(words.length / 5), 2, 5);

  if (byPunctuation.length >= 3) {
    const targetByPunctuation = clamp(desiredChunks, 3, 5);
    return mergeChunksEvenly(byPunctuation, targetByPunctuation);
  }

  if (words.length <= 4) {
    return [words.join(' ')].filter(Boolean);
  }

  const chunkSize = Math.max(2, Math.ceil(words.length / desiredChunks));
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }

  return mergeChunksEvenly(chunks, desiredChunks);
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
    swapArrayItems(shuffled, i, j);
  }

  const sameOrder = shuffled.every((token, index) => token.order === index);
  if (sameOrder && shuffled.length > 1) {
    swapArrayItems(shuffled, 0, 1);
  }

  return shuffled;
}

export function ModeClickChunksExercise({ verse, onRate, hintState, onProgressChange, isLateStageReview = false }: ClickChunksExerciseProps) {
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [tokens, setTokens] = useState<ChunkToken[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashTokenId, setErrorFlashTokenId] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  const surrendered = hintState?.surrendered ?? false;

  useEffect(() => {
    const chunks = splitIntoChunks(verse.text);
    setTokens(shuffleTokens(chunks));
    setSelectedIds([]);
    setMistakesSinceReset(0);
    setIsCompleted(false);
    setErrorFlashTokenId(null);

    return () => {
      if (clearFlashTimeoutRef.current) {
        window.clearTimeout(clearFlashTimeoutRef.current);
        clearFlashTimeoutRef.current = null;
      }
    };
  }, [verse]);

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'chunks-order',
        unitType: 'chunk',
        expectedIndex: null,
        completedCount: selectedIds.length,
        totalCount: tokens.length,
        isCompleted: isCompleted || surrendered,
      })
    );
  }, [isCompleted, onProgressChange, selectedIds.length, surrendered, tokens.length]);

  useEffect(() => {
    if (surrendered && !isCompleted) {
      setIsCompleted(true);
    }
  }, [surrendered, isCompleted]);

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
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.ClickChunks,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: totalChunks,
  });

  const remainingTokens = useMemo(
    () => tokens.filter((token) => !selectedIdSet.has(token.id)),
    [tokens, selectedIdSet]
  );

  const handleChunkClick = (token: ChunkToken) => {
    if (isCompleted || surrendered) return;
    if (selectedIdSet.has(token.id)) return;

    const expectedOrder = selectedCount;
    if (token.order === expectedOrder) {
      const next = [...selectedIds, token.id];
      setSelectedIds(next);

      if (expectedOrder + 1 === totalChunks) {
        setIsCompleted(true);
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetSequence = nextMistakesSinceReset >= maxMistakes;
    setMistakesSinceReset(shouldResetSequence ? 0 : nextMistakesSinceReset);

    if (shouldResetSequence) {
      setSelectedIds([]);
      toast.warning(
        `Допущено ${maxMistakes} ошибок. Последовательность сброшена.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    } else {
      toast.warning(
        `Неверный фрагмент. До сброса: ${
          maxMistakes - nextMistakesSinceReset
        }.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    }

    setErrorFlashTokenId(token.id);
    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashTokenId(null);
      clearFlashTimeoutRef.current = null;
    }, 260);
  };

  const showChoices = !isCompleted && !surrendered && remainingTokens.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <div className="shrink-0">
        <label className="block text-center text-sm font-medium text-foreground/90">
          Соберите стих по фрагментам
        </label>
      </div>

      {/* ── Top half: assembled sequence ── */}
      <div className="mt-3 min-h-0 flex-1 basis-1/2 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Последовательность</span>
            <span className="tabular-nums">{selectedCount}/{totalChunks}</span>
          </div>

          {selectedTokens.length > 0 ? (
            <div className="space-y-1.5">
              {selectedTokens.map((token) => (
                <div
                  key={token.id}
                  className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-sm leading-relaxed"
                >
                  {token.text}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Нажимайте фрагменты в правильном порядке.</p>
          )}
        </div>
      </div>

      {/* ── Bottom half: chunk choices ── */}
      {showChoices && (
        <div className="mt-2 min-h-0 flex-1 basis-1/2 flex flex-col overflow-auto border-t border-border/60 pt-2">
          <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 pb-1">
            {remainingTokens.map((token) => (
              <Button
                key={token.id}
                type="button"
                variant="outline"
                className={`h-auto w-full justify-start whitespace-normal rounded-xl px-3 py-2 text-left leading-relaxed transition-colors ${
                  errorFlashTokenId === token.id
                    ? 'border-destructive text-destructive'
                    : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                }`}
                onClick={() => handleChunkClick(token)}
              >
                {token.text}
              </Button>
            ))}
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
