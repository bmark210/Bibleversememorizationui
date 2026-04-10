'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';
import { TrainingModeId } from '@/shared/training/modeEngine';

import { Button } from '@/app/components/ui/button';
import { Verse } from "@/app/domain/verse";
import type { TrainingExerciseResolution } from './exerciseResult';
import type { ExerciseInlineActionsProps } from './exerciseInlineActions';
import { SplitExerciseActionRail } from './SplitExerciseActionRail';
import { TrainingExerciseModeHeader } from './TrainingExerciseModeHeader';
import {
  getRemainingMistakesTone,
  TrainingExerciseSection,
  TrainingMetricBadge,
} from './TrainingExerciseSection';
import { tokenizeFirstLetters } from './wordUtils';
import type { HintState } from './useHintState';
import { createExerciseProgressSnapshot } from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import { getExerciseMaxMistakes } from '@/modules/training/hints/exerciseDifficultyConfig';
import { useTrainingFontSize } from './useTrainingFontSize';
import { useMeasuredElementSize } from './useMeasuredElementSize';
import {
  getChoiceButtonFlashClassName,
  useChoiceFlashFeedback,
} from './useChoiceFlashFeedback';
import { useSurrenderEffect } from './useSurrenderEffect';
import {
  TRAINING_HALVES_GAP_CLASS,
  TRAINING_SECTION_CONTENT_INSET_SM,
} from '../trainingActionTokens';

interface FirstLettersTapExerciseProps extends ExerciseInlineActionsProps {
  verse: Verse;
  trainingModeId: TrainingModeId;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
  onOpenVerseProgress?: () => void;
}

interface LetterToken {
  id: string;
  letter: string;
  order: number;
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
    swapArrayItems(shuffled, i, j);
  }

  const sameOrder = shuffled.every((token, index) => token.order === index);
  if (sameOrder && shuffled.length > 1) {
    swapArrayItems(shuffled, 0, 1);
  }

  return shuffled;
}

const LETTER_GRID_GAP = 8;
const LETTER_CHOICE_BUTTON_BASE_CLASS =
  'h-auto min-h-11 min-w-12 justify-center rounded-lg px-3 py-1.5 font-mono uppercase leading-4';

function getAutoGridColumns(
  width: number,
  minCellWidth: number,
  gap: number,
  fallback = 1
) {
  if (width <= 0 || minCellWidth <= 0) return fallback;
  return Math.max(1, Math.floor((width + gap) / (minCellWidth + gap)));
}

function getSequenceCellClassName(params: {
  isFilled: boolean;
  isActiveGap: boolean;
  }) {
    if (params.isFilled) {
      return 'border border-status-learning/25 bg-status-learning-soft text-status-learning';
    }

  if (params.isActiveGap) {
    return 'border-2 border-primary/40 bg-primary/5 text-primary/70';
  }

  return 'border border-border/60 bg-muted/20 text-muted-foreground';
}

export function ModeFirstLettersTapExercise({
  verse,
  trainingModeId,
  onExerciseResolved,
  hintState,
  onProgressChange,
  isLateStageReview: _isLateStageReview = false,
  onOpenTutorial,
  onOpenVerseProgress,
  showInlineQuickForgetAction = false,
  onRequestInlineQuickForget,
  inlineActionsDisabled = false,
}: FirstLettersTapExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const [tokens, setTokens] = useState<LetterToken[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const {
    clear: clearChoiceFlash,
    flashError: flashChoiceError,
    flashSuccess: flashChoiceSuccess,
    getChoiceFlashKind,
  } = useChoiceFlashFeedback<string>();

  const surrendered = hintState?.surrendered ?? false;

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setTokens(shuffleTokens(letters));
    setSelectedCount(0);
    setMistakesSinceReset(0);
    setIsCompleted(false);
    clearChoiceFlash();
  }, [clearChoiceFlash, verse]);

  useSurrenderEffect({
    surrendered,
    isCompleted,
    setIsCompleted,
    onExerciseResolved,
  });

  const expectedTokens = useMemo(
    () => [...tokens].sort((a, b) => a.order - b.order),
    [tokens]
  );

  const total = expectedTokens.length;
  const expectedLetter = expectedTokens[selectedCount]?.letter ?? null;
  const expectedWordIndex = expectedTokens[selectedCount]?.order ?? null;
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.FirstLettersTapNoHints,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: total,
  });
  const remainingMistakes = Math.max(0, maxMistakes - mistakesSinceReset);

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'first-letters',
        unitType: 'letter',
        expectedIndex: expectedWordIndex,
        completedCount: selectedCount,
        totalCount: total,
        isCompleted: isCompleted || surrendered,
      })
    );
  }, [expectedWordIndex, isCompleted, onProgressChange, selectedCount, surrendered, total]);

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

  const remainingCountByLetter = useMemo(() => {
    const counts = new Map<string, number>();

    for (let index = selectedCount; index < expectedTokens.length; index += 1) {
      const letter = expectedTokens[index]?.letter;
      if (!letter) continue;
      counts.set(letter, (counts.get(letter) ?? 0) + 1);
    }

    return counts;
  }, [expectedTokens, selectedCount]);

  const showChoices = !isCompleted && !surrendered && shuffledUniqueLetters.length > 0;
  const sequenceItemRefs = useRef(new Map<string, HTMLSpanElement>());
  const {
    ref: sequenceGridContainerRef,
    size: sequenceGridContainerSize,
  } = useMeasuredElementSize<HTMLDivElement>(true);

  const sequenceCellMinWidth = Math.max(38, Math.ceil(fontSizes.letter + 22));
  const sequenceCellHeight = Math.max(40, Math.ceil(fontSizes.letter + 24));

  const sequenceColumns = useMemo(
    () =>
      Math.max(
        1,
        Math.min(
          total || 1,
          getAutoGridColumns(
            sequenceGridContainerSize.width,
            sequenceCellMinWidth,
            LETTER_GRID_GAP,
            8
          )
        )
      ),
    [sequenceCellMinWidth, sequenceGridContainerSize.width, total]
  );

  const focusItemId = useMemo(() => {
    if (expectedTokens.length === 0) return null;
    if (selectedCount <= 0) return expectedTokens[0]?.id ?? null;
    return expectedTokens[Math.min(selectedCount - 1, expectedTokens.length - 1)]?.id ?? null;
  }, [expectedTokens, selectedCount]);

  useEffect(() => {
    if (!focusItemId) return;
    if (typeof window === 'undefined') return;

    const frameId = window.requestAnimationFrame(() => {
      const target = sequenceItemRefs.current.get(focusItemId);
      if (!target) return;

      const prefersReducedMotion = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

      target.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [focusItemId, expectedTokens]);

  const setSequenceItemRef = (id: string) => (node: HTMLSpanElement | null) => {
    if (node) {
      sequenceItemRefs.current.set(id, node);
      return;
    }

    sequenceItemRefs.current.delete(id);
  };

  const handlePick = (letter: string) => {
    if (isCompleted || surrendered) return;
    if (!expectedLetter) return;

    if (letter === expectedLetter) {
      const next = selectedCount + 1;
      setSelectedCount(next);

      flashChoiceSuccess(letter);

      if (next === total) {
        setIsCompleted(true);
        onExerciseResolved?.({
          kind: 'success',
          message: 'Последовательность букв собрана верно.',
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
        `Неверная буква. До сброса: ${
          maxMistakes - nextMistakesSinceReset
        }.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    }

    flashChoiceError(letter);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <TrainingExerciseModeHeader
        modeId={trainingModeId}
        verse={verse}
        onOpenHelp={onOpenTutorial}
        onOpenVerseProgress={onOpenVerseProgress}
      />
      <TrainingExerciseSection
        title="Последовательность букв"
        meta={
          <TrainingMetricBadge
            tone={selectedCount === total && total > 0 ? 'success' : 'neutral'}
          >
            {selectedCount}/{total}
          </TrainingMetricBadge>
        }
        className="mt-3 min-h-0 flex-[1_1_0]"
        contentClassName="h-full"
      >
        <div
          className="h-full min-h-0 overflow-y-auto overscroll-contain pt-2 pb-4 pr-1"
          role="group"
          aria-label="Последовательность букв"
        >
          <div
            ref={sequenceGridContainerRef}
            className="grid content-start"
            style={{
              gap: `${LETTER_GRID_GAP}px`,
              gridTemplateColumns: `repeat(${sequenceColumns}, minmax(0, 1fr))`,
              gridAutoRows: `${sequenceCellHeight}px`,
            }}
          >
            {expectedTokens.map((token, index) => {
              const isFilled = index < selectedCount;
              const isActiveGap = !isCompleted && !surrendered && index === selectedCount;

              return (
                <span
                  key={token.id}
                  ref={setSequenceItemRef(token.id)}
                  className={`inline-flex h-full w-full items-center justify-center rounded-lg font-mono uppercase transition-colors ${getSequenceCellClassName({
                    isFilled,
                    isActiveGap,
                  })}`}
                  style={{ fontSize: `${fontSizes.letter}px` }}
                  aria-current={token.id === focusItemId ? 'step' : undefined}
                >
                  {isFilled ? token.letter.toUpperCase() : '•'}
                </span>
              );
            })}
          </div>
        </div>
      </TrainingExerciseSection>

      {showChoices && (
        <TrainingExerciseSection
          title="Варианты букв"
          meta={
            <TrainingMetricBadge tone={getRemainingMistakesTone(remainingMistakes)}>
              До сброса {remainingMistakes}
            </TrainingMetricBadge>
          }
          className={`${TRAINING_HALVES_GAP_CLASS} min-h-0 flex-[1_1_0]`}
          scrollable
          contentClassName={`flex flex-wrap content-start gap-2.5 ${TRAINING_SECTION_CONTENT_INSET_SM}`}
        >
          {shuffledUniqueLetters.map((letter) => {
            const remainingLetterCount = remainingCountByLetter.get(letter) ?? 0;
            const isUsed = remainingLetterCount <= 0;

            return (
              <div key={letter} className="min-w-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUsed}
                  className={`${LETTER_CHOICE_BUTTON_BASE_CLASS} transition-colors ${getChoiceButtonFlashClassName({
                    choiceKey: letter,
                    disabled: isUsed,
                    idleClassName:
                      'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5',
                    getChoiceFlashKind,
                  })}`}
                  style={{ fontSize: `${fontSizes.letter}px` }}
                  onClick={() => handlePick(letter)}
                >
                  <span>{letter}</span>
                </Button>
              </div>
            );
          })}
        </TrainingExerciseSection>
      )}

      <SplitExerciseActionRail
        remainingMistakes={remainingMistakes}
        showRemainingMistakes={false}
        showQuickForgetAction={showInlineQuickForgetAction}
        onRequestQuickForget={onRequestInlineQuickForget}
        disabled={inlineActionsDisabled}
      />

    </div>
  );
}
