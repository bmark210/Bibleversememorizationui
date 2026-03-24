'use client'

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';
import { TrainingModeId } from '@/shared/training/modeEngine';

import { Button } from "@/app/components/ui/button";
import { TrainingExerciseModeHeader } from './TrainingExerciseModeHeader';
import { SplitExerciseActionRail } from './SplitExerciseActionRail';
import {
  getRemainingMistakesTone,
  TrainingExerciseSection,
  TrainingMetricBadge,
} from './TrainingExerciseSection';
import { Verse } from "@/app/domain/verse";
import type { TrainingExerciseResolution } from './exerciseResult';
import type { ExerciseInlineActionsProps } from './exerciseInlineActions';
import type { HintState } from './useHintState';
import { createExerciseProgressSnapshot } from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import { getExerciseMaxMistakes } from '@/modules/training/hints/exerciseDifficultyConfig';
import { useTrainingFontSize } from './useTrainingFontSize';
import { useFlashTimeout } from './useFlashTimeout';
import { useSurrenderEffect } from './useSurrenderEffect';

interface ClickChunksExerciseProps extends ExerciseInlineActionsProps {
  verse: Verse;
  trainingModeId: TrainingModeId;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
  onOpenVerseProgress?: () => void;
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

export function ModeClickChunksExercise({ verse, trainingModeId, onExerciseResolved, hintState, onProgressChange, isLateStageReview: _isLateStageReview = false, onOpenTutorial, onOpenVerseProgress, showInlineQuickForgetAction = false, onRequestInlineQuickForget, inlineActionsDisabled = false }: ClickChunksExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const [tokens, setTokens] = useState<ChunkToken[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const errorFlash = useFlashTimeout<string>();
  const successFlash = useFlashTimeout<string>();

  const surrendered = hintState?.surrendered ?? false;

  useEffect(() => {
    const chunks = splitIntoChunks(verse.text);
    setTokens(shuffleTokens(chunks));
    setSelectedIds([]);
    setMistakesSinceReset(0);
    setIsCompleted(false);
    errorFlash.clear();
    successFlash.clear();

    return () => {
      errorFlash.cleanup();
      successFlash.cleanup();
    };
  }, [verse]);

  useSurrenderEffect({
    surrendered,
    isCompleted,
    setIsCompleted,
    onExerciseResolved,
  });

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
  const remainingMistakes = Math.max(0, maxMistakes - mistakesSinceReset);

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
      successFlash.flash(token.id);

      if (expectedOrder + 1 === totalChunks) {
        setIsCompleted(true);
        onExerciseResolved?.({
          kind: 'success',
          message: 'Последовательность собрана верно.',
        });
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetSequence = nextMistakesSinceReset >= maxMistakes;
    setMistakesSinceReset(nextMistakesSinceReset);

    if (shouldResetSequence) {
      setIsCompleted(true);
      onExerciseResolved?.({
        kind: 'failure',
        reason: 'max-mistakes',
        message: `Допущено ${maxMistakes} ошибок. Попробуйте ещё раз.`,
      });
    } else {
      toast.warning(
        `Неверный фрагмент. До сброса: ${maxMistakes - nextMistakesSinceReset}.`,
        { toasterId: GALLERY_TOASTER_ID, size: 'compact' }
      );
    }

    errorFlash.flash(token.id);
  };

  const showChoices = !isCompleted && !surrendered && remainingTokens.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden"
    >
      <TrainingExerciseModeHeader
        modeId={trainingModeId}
        verse={verse}
        onOpenHelp={onOpenTutorial}
        onOpenVerseProgress={onOpenVerseProgress}
      />
      <TrainingExerciseSection
        title="Собранная последовательность"
        meta={
          <TrainingMetricBadge
            tone={selectedCount === totalChunks && totalChunks > 0 ? 'success' : 'neutral'}
          >
            {selectedCount}/{totalChunks}
          </TrainingMetricBadge>
        }
        className="mt-3 min-h-0 flex-1"
        scrollable
        contentClassName="space-y-1.5 pb-1"
      >
        {selectedTokens.length > 0 ? (
          selectedTokens.map((token) => (
            <div
              key={token.id}
              className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 leading-relaxed text-foreground/90"
              style={{ fontSize: `${fontSizes.sm}px` }}
            >
              {token.text}
            </div>
          ))
        ) : (
          <div className="flex min-h-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-6 text-center text-muted-foreground">
            <p style={{ fontSize: `${fontSizes.sm}px` }}>
              Нажимайте фрагменты в правильном порядке.
            </p>
          </div>
        )}
      </TrainingExerciseSection>

      {showChoices && (
        <TrainingExerciseSection
          title="Варианты фрагментов"
          meta={
            <TrainingMetricBadge tone={getRemainingMistakesTone(remainingMistakes)}>
              До сброса {remainingMistakes}
            </TrainingMetricBadge>
          }
          className="mt-2 min-h-0 flex-[1.1]"
          scrollable
          contentClassName="grid grid-cols-1 gap-2 pb-1 min-[520px]:grid-cols-2"
        >
            {remainingTokens.map((token) => (
              <Button
                key={token.id}
                type="button"
                variant="outline"
                className={`h-auto w-full justify-start whitespace-normal rounded-xl px-3 py-2 text-left leading-relaxed transition-colors ${
                  errorFlash.value === token.id
                    ? 'border-destructive text-destructive bg-destructive/10'
                    : successFlash.value === token.id
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                      : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                }`}
                style={{ fontSize: `${fontSizes.sm}px` }}
                onClick={() => handleChunkClick(token)}
              >
                {token.text}
              </Button>
            ))}
        </TrainingExerciseSection>
      )}

      <SplitExerciseActionRail
        remainingMistakes={remainingMistakes}
        showRemainingMistakes={false}
        showQuickForgetAction={showInlineQuickForgetAction}
        onRequestQuickForget={onRequestInlineQuickForget}
        disabled={inlineActionsDisabled}
      />
    </motion.div>
  );
}
