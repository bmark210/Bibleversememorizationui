'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';
import { TrainingModeId } from '@/shared/training/modeEngine';

import { Button } from '@/app/components/ui/button';
import { Verse } from '@/app/App';
import {
  getComparableFirstLetter,
  getWordMask,
  getWordMaskWidth,
  tokenizeWords,
} from './wordUtils';
import type { TrainingExerciseResolution } from './exerciseResult';
import type { ExerciseInlineActionsProps } from './exerciseInlineActions';
import { SplitExerciseActionRail } from './SplitExerciseActionRail';
import { TrainingExerciseModeHeader } from './TrainingExerciseModeHeader';
import {
  getRemainingMistakesTone,
  TrainingExerciseSection,
  TrainingMetricBadge,
} from './TrainingExerciseSection';
import { WordSequenceField, type WordSequenceFieldItem } from './WordSequenceField';
import type { HintState } from './useHintState';
import { createExerciseProgressSnapshot } from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import {
  getExerciseMaxMistakes,
  getHintedRevealCount,
} from '@/modules/training/hints/exerciseDifficultyConfig';
import {
  useMeasuredChoiceBatch,
  type MeasuredChoiceBatchItem,
} from './useMeasuredChoiceBatch';
import { useTrainingFontSize } from './useTrainingFontSize';

interface FirstLettersHintedExerciseProps extends ExerciseInlineActionsProps {
  verse: Verse;
  trainingModeId: TrainingModeId;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
  onOpenVerseProgress?: () => void;
}

interface WordSlot {
  id: string;
  text: string;
  firstLetter: string;
  order: number;
  revealed: boolean;
}

function pickRevealedIndices(totalWords: number, revealCount: number): Set<number> {
  if (totalWords <= 1) return new Set<number>();

  const revealed = new Set<number>();
  if (totalWords >= 3 && revealed.size < revealCount) revealed.add(0);
  if (totalWords >= 5 && revealed.size < revealCount) revealed.add(totalWords - 1);

  const candidates = Array.from({ length: totalWords }, (_, i) => i).filter(
    (index) => !revealed.has(index)
  );

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    swapArrayItems(candidates, i, j);
  }

  for (const index of candidates) {
    if (revealed.size >= revealCount) break;
    revealed.add(index);
  }

  if (revealed.size >= totalWords) {
    revealed.delete(totalWords - 1);
  }

  return revealed;
}

function shuffleLetters(letters: string[]) {
  const shuffled = [...letters];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    swapArrayItems(shuffled, i, j);
  }

  return shuffled;
}

function buildExercise(params: {
  text: string;
  difficultyLevel: Verse["difficultyLevel"];
}) {
  const { text, difficultyLevel } = params;
  const words = tokenizeWords(text);
  const revealed = pickRevealedIndices(
    words.length,
    getHintedRevealCount({
      modeId: TrainingModeId.FirstLettersWithWordHints,
      difficultyLevel,
      totalWords: words.length,
    })
  );

  const slots: WordSlot[] = words.map((word, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 6)}`,
    text: word,
    firstLetter: getComparableFirstLetter(word),
    order: index,
    revealed: revealed.has(index),
  }));

  const choiceOrder: string[] = [];
  const seenLetters = new Set<string>();
  for (const letter of shuffleLetters(
    slots.filter((slot) => !slot.revealed).map((slot) => slot.firstLetter)
  )) {
    if (!letter || seenLetters.has(letter)) continue;
    seenLetters.add(letter);
    choiceOrder.push(letter);
  }

  return {
    slots,
    choiceOrder,
  };
}

const LETTER_CHOICE_BUTTON_BASE_CLASS =
  'h-auto min-h-11 min-w-12 justify-center rounded-lg px-3 py-1.5 font-mono uppercase leading-4';

export function ModeFirstLettersHintedExercise({
  verse,
  trainingModeId,
  onExerciseResolved,
  hintState,
  onProgressChange,
  isLateStageReview: _isLateStageReview = false,
  onOpenTutorial,
  onOpenVerseProgress,
  showInlineAssistButton = false,
  onRequestInlineAssist,
  showInlineQuickForgetAction = false,
  onRequestInlineQuickForget,
  inlineActionsDisabled = false,
}: FirstLettersHintedExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const [slots, setSlots] = useState<WordSlot[]>([]);
  const [choiceOrder, setChoiceOrder] = useState<string[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashLetter, setErrorFlashLetter] = useState<string | null>(null);
  const [successFlashLetter, setSuccessFlashLetter] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);
  const clearSuccessFlashTimeoutRef = useRef<number | null>(null);

  const surrendered = hintState?.surrendered ?? false;

  useEffect(() => {
    const exercise = buildExercise({
      text: verse.text,
      difficultyLevel: verse.difficultyLevel,
    });
    setSlots(exercise.slots);
    setChoiceOrder(exercise.choiceOrder);
    setSelectedCount(0);
    setMistakesSinceReset(0);
    setIsCompleted(false);
    setErrorFlashLetter(null);
    setSuccessFlashLetter(null);

    return () => {
      if (clearFlashTimeoutRef.current) {
        window.clearTimeout(clearFlashTimeoutRef.current);
        clearFlashTimeoutRef.current = null;
      }
      if (clearSuccessFlashTimeoutRef.current) {
        window.clearTimeout(clearSuccessFlashTimeoutRef.current);
        clearSuccessFlashTimeoutRef.current = null;
      }
    };
  }, [verse]);

  useEffect(() => {
    if (surrendered && !isCompleted) {
      setIsCompleted(true);
      onExerciseResolved?.({
        kind: 'revealed',
        message: 'Правильный текст открыт. Оцените, насколько уверенно вы вспоминали стих.',
      });
    }
  }, [isCompleted, onExerciseResolved, surrendered]);

  const hiddenSlots = useMemo(
    () => slots.filter((slot) => !slot.revealed),
    [slots]
  );

  const hiddenIndexByOrder = useMemo(() => {
    const map = new Map<number, number>();
    hiddenSlots.forEach((slot, index) => map.set(slot.order, index));
    return map;
  }, [hiddenSlots]);

  const totalHidden = hiddenSlots.length;
  const nextHiddenSlot = hiddenSlots[selectedCount] ?? null;
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.FirstLettersWithWordHints,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: totalHidden,
  });
  const remainingMistakes = Math.max(0, maxMistakes - mistakesSinceReset);

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'first-letters-hinted',
        unitType: 'letter',
        expectedIndex: nextHiddenSlot?.order ?? null,
        completedCount: selectedCount,
        totalCount: totalHidden,
        isCompleted: isCompleted || surrendered,
      })
    );
  }, [isCompleted, nextHiddenSlot, onProgressChange, selectedCount, surrendered, totalHidden]);

  const remainingCountByLetter = useMemo(() => {
    const counts = new Map<string, number>();

    for (let index = selectedCount; index < hiddenSlots.length; index += 1) {
      const letter = hiddenSlots[index]?.firstLetter;
      if (!letter) continue;
      counts.set(letter, (counts.get(letter) ?? 0) + 1);
    }

    return counts;
  }, [hiddenSlots, selectedCount]);

  const availableLetters = useMemo(
    () =>
      choiceOrder.filter((letter) => (remainingCountByLetter.get(letter) ?? 0) > 0),
    [choiceOrder, remainingCountByLetter]
  );

  const expectedFirstLetter = nextHiddenSlot?.firstLetter ?? null;

  const focusItemId = useMemo(() => {
    if (hiddenSlots.length === 0) return null;
    if (selectedCount <= 0) return hiddenSlots[0]?.id ?? null;
    return hiddenSlots[Math.min(selectedCount - 1, hiddenSlots.length - 1)]?.id ?? null;
  }, [hiddenSlots, selectedCount]);

  const sequenceItems = useMemo<WordSequenceFieldItem[]>(
    () =>
      slots.map((slot) => {
        const hiddenIndex = hiddenIndexByOrder.get(slot.order) ?? -1;
        const isHidden = hiddenIndex >= 0;
        const isFilled = isHidden && hiddenIndex < selectedCount;
        const isActiveGap = isHidden && !isCompleted && hiddenIndex === selectedCount;

        if (slot.revealed) {
          return {
            id: slot.id,
            content: slot.text,
            state: 'revealed',
          };
        }

        if (isFilled) {
          return {
            id: slot.id,
            content: slot.text,
            state: 'filled',
          };
        }

        return {
          id: slot.id,
          content: getWordMask(slot.text),
          minWidth: getWordMaskWidth(slot.text),
          state: isActiveGap ? 'active-gap' : 'future-gap',
        };
      }),
    [slots, hiddenIndexByOrder, selectedCount, isCompleted]
  );

  const handleLetterClick = (letter: string) => {
    if (isCompleted || surrendered) return;
    if (!nextHiddenSlot) return;

    if (letter === nextHiddenSlot.firstLetter) {
      const next = selectedCount + 1;
      setSelectedCount(next);

      setSuccessFlashLetter(letter);
      if (clearSuccessFlashTimeoutRef.current) {
        window.clearTimeout(clearSuccessFlashTimeoutRef.current);
      }
      clearSuccessFlashTimeoutRef.current = window.setTimeout(() => {
        setSuccessFlashLetter(null);
        clearSuccessFlashTimeoutRef.current = null;
      }, 260);

      if (next === totalHidden) {
        setIsCompleted(true);
        onExerciseResolved?.({
          kind: 'success',
          message: 'Первые буквы выбраны верно.',
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

    setErrorFlashLetter(letter);
    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashLetter(null);
      clearFlashTimeoutRef.current = null;
    }, 260);
  };

  const showChoices = !isCompleted && !surrendered && availableLetters.length > 0;
  const availableLetterItems = useMemo<MeasuredChoiceBatchItem<string>[]>(
    () => availableLetters.map((letter) => ({ key: letter, value: letter })),
    [availableLetters]
  );

  const preferredExpectedIndex = useMemo(
    () =>
      Math.min(2 + (selectedCount % 3), Math.max(availableLetterItems.length - 1, 0)),
    [availableLetterItems.length, selectedCount]
  );

  const {
    containerRef: choicesContainerRef,
    measureRef: measureChoicesRef,
    measurementItems: measuredLetterItems,
    displayedItems: displayedLetterItems,
  } = useMeasuredChoiceBatch({
    items: availableLetterItems,
    enabled: showChoices,
    requiredItemKey: expectedFirstLetter,
    preferredRequiredIndex: preferredExpectedIndex,
    dependencies: [fontSizes.level],
  });

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
      <div className="min-h-0 flex-1 basis-1/2 overflow-hidden">
        <WordSequenceField
          className="h-full"
          label="Стих с пропусками"
          progressCurrent={selectedCount}
          progressTotal={totalHidden}
          items={sequenceItems}
          focusItemId={focusItemId}
          fontSizes={fontSizes}
        />
      </div>

      {showChoices && (
        <TrainingExerciseSection
          title="Варианты букв"
          meta={
            <TrainingMetricBadge tone={getRemainingMistakesTone(remainingMistakes)}>
              До сброса {remainingMistakes}
            </TrainingMetricBadge>
          }
          className="mt-2 min-h-0 flex-1 basis-1/2"
          contentClassName="h-full"
        >
          <div className="relative h-full min-h-0">
            <div
              ref={choicesContainerRef}
              className="absolute inset-0 min-h-0 overflow-hidden"
            >
              <div className="flex flex-wrap content-start gap-1 py-1">
                {displayedLetterItems.map(({ key, value: letter }) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    className={`${LETTER_CHOICE_BUTTON_BASE_CLASS} transition-colors ${
                      errorFlashLetter === letter
                        ? 'border-destructive text-destructive bg-destructive/10'
                        : successFlashLetter === letter
                          ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                          : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                    }`}
                    style={{ fontSize: `${fontSizes.letter}px` }}
                    onClick={() => handleLetterClick(letter)}
                  >
                    <span>{letter}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none invisible absolute inset-x-0 top-0"
            >
              <div ref={measureChoicesRef} className="flex flex-wrap content-start gap-1 py-1">
                {measuredLetterItems.map(({ key, value: letter }) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    haptic={false}
                    tabIndex={-1}
                    data-choice-key={key}
                    className={`${LETTER_CHOICE_BUTTON_BASE_CLASS} border-border/70 bg-background/60`}
                    style={{ fontSize: `${fontSizes.letter}px` }}
                  >
                    <span>{letter}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </TrainingExerciseSection>
      )}

      <SplitExerciseActionRail
        remainingMistakes={remainingMistakes}
        showRemainingMistakes={false}
        showAssistButton={showInlineAssistButton}
        onRequestAssist={onRequestInlineAssist}
        showQuickForgetAction={showInlineQuickForgetAction}
        onRequestQuickForget={onRequestInlineQuickForget}
        disabled={inlineActionsDisabled}
      />

    </motion.div>
  );
}
