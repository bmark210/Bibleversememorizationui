'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';
import { swapArrayItems } from '@/shared/utils/swapArrayItems';
import { TrainingModeId } from '@/shared/training/modeEngine';

import { Button } from '@/app/components/ui/button';
import { ScrollShadowContainer } from '@/app/components/ui/ScrollShadowContainer';
import { TrainingExerciseModeHeader } from './TrainingExerciseModeHeader';
import { SplitExerciseActionRail } from './SplitExerciseActionRail';
import { Verse } from '@/app/App';
import type { TrainingExerciseResolution } from './exerciseResult';
import {
  tokenizeWords,
  normalizeWord,
  cleanWordForDisplay,
  getWordMask,
  getWordMaskWidth,
} from './wordUtils';
import { WordSequenceField, type WordSequenceFieldItem } from './WordSequenceField';
import type { HintState } from './useHintState';
import { createExerciseProgressSnapshot } from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import { getExerciseMaxMistakes } from '@/modules/training/hints/exerciseDifficultyConfig';
import { useTrainingFontSize } from './useTrainingFontSize';
import { ArrowDownIcon } from 'lucide-react';

interface ClickWordsExerciseProps {
  verse: Verse;
  trainingModeId: TrainingModeId;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
  onOpenVerseProgress?: () => void;
  showInlineAssistButton?: boolean;
  onRequestInlineAssist?: () => void;
  showInlineQuickForgetAction?: boolean;
  onRequestInlineQuickForget?: () => void;
  inlineActionsDisabled?: boolean;
}

interface WordToken {
  id: string;
  text: string;
  normalized: string;
  order: number;
}

interface UniqueChoice {
  displayText: string;
  normalized: string;
  totalCount: number;
}

function shuffleTokens(words: string[]): WordToken[] {
  const tokens = words.map((word, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 6)}`,
    text: word,
    normalized: normalizeWord(word),
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

function buildUniqueChoices(tokens: WordToken[]): UniqueChoice[] {
  const map = new Map<string, UniqueChoice>();
  for (const token of tokens) {
    const existing = map.get(token.normalized);
    if (existing) {
      existing.totalCount += 1;
    } else {
      map.set(token.normalized, {
        displayText: cleanWordForDisplay(token.text),
        normalized: token.normalized,
        totalCount: 1,
      });
    }
  }
  return Array.from(map.values());
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    swapArrayItems(result, i, j);
  }
  return result;
}

function initClickWordsExercise(text: string) {
  const words = tokenizeWords(text);
  const shuffled = shuffleTokens(words);
  const orderedTokens = [...shuffled].sort((a, b) => a.order - b.order);
  const uniqueChoices = shuffleArray(buildUniqueChoices(shuffled));
  return { orderedTokens, uniqueChoices };
}

const WORD_CHOICE_BUTTON_BASE_CLASS =
  'h-auto max-w-full min-w-0 justify-start rounded-lg px-3 py-2 leading-5 text-left whitespace-nowrap';

export function ModeClickWordsExercise({
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
}: ClickWordsExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const [{ orderedTokens, uniqueChoices }, setTokenData] = useState(
    () => initClickWordsExercise(verse.text)
  );
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashNormalized, setErrorFlashNormalized] = useState<string | null>(null);
  const [successFlashNormalized, setSuccessFlashNormalized] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);
  const clearSuccessFlashTimeoutRef = useRef<number | null>(null);
  const resolvedRef = useRef(false);

  const surrendered = hintState?.surrendered ?? false;

  const prevVerseRef = useRef(verse);
  useEffect(() => {
    if (prevVerseRef.current === verse) return;
    prevVerseRef.current = verse;
    resolvedRef.current = false;
    setTokenData(initClickWordsExercise(verse.text));
    setSelectedCount(0);
    setMistakesSinceReset(0);
    setIsCompleted(false);
    setErrorFlashNormalized(null);
    setSuccessFlashNormalized(null);
  }, [verse]);

  useEffect(() => {
    return () => {
      if (clearFlashTimeoutRef.current) {
        window.clearTimeout(clearFlashTimeoutRef.current);
      }
      if (clearSuccessFlashTimeoutRef.current) {
        window.clearTimeout(clearSuccessFlashTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (surrendered && !isCompleted) {
      resolvedRef.current = true;
      setIsCompleted(true);
      onExerciseResolved?.({
        kind: 'revealed',
        message: 'Правильный текст открыт. Оцените, насколько уверенно вы вспоминали стих.',
      });
    }
  }, [isCompleted, onExerciseResolved, surrendered]);

  const totalWords = orderedTokens.length;
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.ClickWordsNoHints,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: totalWords,
  });
  const expectedWordIndex = orderedTokens[selectedCount]?.order ?? null;

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'word-order',
        unitType: 'word',
        expectedIndex: expectedWordIndex,
        completedCount: selectedCount,
        totalCount: totalWords,
        isCompleted: isCompleted || surrendered,
      })
    );
  }, [expectedWordIndex, isCompleted, onProgressChange, selectedCount, surrendered, totalWords]);

  const selectedTokens = useMemo(
    () => orderedTokens.slice(0, selectedCount),
    [orderedTokens, selectedCount]
  );

  const focusItemId = useMemo(() => {
    if (orderedTokens.length === 0) return null;
    if (selectedCount <= 0) return orderedTokens[0]?.id ?? null;
    return orderedTokens[Math.min(selectedCount - 1, orderedTokens.length - 1)]?.id ?? null;
  }, [orderedTokens, selectedCount]);

  const sequenceItems = useMemo<WordSequenceFieldItem[]>(
    () =>
      orderedTokens.map((token, index) => {
        const isFilled = index < selectedCount;
        const isActiveGap = !isCompleted && index === selectedCount;

        return {
          id: token.id,
          content: isFilled ? token.text : getWordMask(token.text),
          minWidth: isFilled ? undefined : getWordMaskWidth(token.text),
          state: isFilled ? 'filled' : isActiveGap ? 'active-gap' : 'future-gap',
        };
      }),
    [orderedTokens, selectedCount, isCompleted]
  );

  const remainingCountByNormalized = useMemo(() => {
    const counts = new Map<string, number>();
    for (const choice of uniqueChoices) {
      counts.set(choice.normalized, choice.totalCount);
    }
    for (const token of selectedTokens) {
      const current = counts.get(token.normalized) ?? 0;
      if (current > 0) counts.set(token.normalized, current - 1);
    }
    return counts;
  }, [uniqueChoices, selectedTokens]);

  const visibleChoices = useMemo(
    () =>
      uniqueChoices.filter(
        (choice) => (remainingCountByNormalized.get(choice.normalized) ?? 0) > 0
      ),
    [uniqueChoices, remainingCountByNormalized]
  );

  const handleWordClick = (choice: UniqueChoice) => {
    if (isCompleted || surrendered) return;
    const expectedToken = orderedTokens[selectedCount];
    if (!expectedToken) return;

    if (choice.normalized === expectedToken.normalized) {
      const next = selectedCount + 1;
      setSelectedCount(next);

      setSuccessFlashNormalized(choice.normalized);
      if (clearSuccessFlashTimeoutRef.current) {
        window.clearTimeout(clearSuccessFlashTimeoutRef.current);
      }
      clearSuccessFlashTimeoutRef.current = window.setTimeout(() => {
        setSuccessFlashNormalized(null);
        clearSuccessFlashTimeoutRef.current = null;
      }, 260);

      if (next === totalWords) {
        resolvedRef.current = true;
        setIsCompleted(true);
        onExerciseResolved?.({
          kind: 'success',
          message: 'Стих собран верно.',
        });
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldReset = nextMistakesSinceReset >= maxMistakes;
    setMistakesSinceReset(nextMistakesSinceReset);

    if (shouldReset) {
      resolvedRef.current = true;
      setIsCompleted(true);
      onExerciseResolved?.({
        kind: 'failure',
        reason: 'max-mistakes',
        message: `Допущено ${maxMistakes} ошибок. Попробуйте ещё раз.`,
      });
    } else {
      toast.warning(
        `Неверное слово. До сброса: ${maxMistakes - nextMistakesSinceReset}.`,
        { toasterId: GALLERY_TOASTER_ID, size: 'compact' }
      );
    }

    setErrorFlashNormalized(choice.normalized);
    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashNormalized(null);
      clearFlashTimeoutRef.current = null;
    }, 260);
  };

  const showChoices = !isCompleted && !surrendered && visibleChoices.length > 0;

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
      {/* ── Top half: verse field ── */}
      <div className="mt-3 min-h-0 flex-1 basis-1/2 overflow-hidden">
        <WordSequenceField
          className="h-full"
          label={isCompleted ? 'Собранный стих' : 'Стих для сборки'}
          progressCurrent={selectedCount}
          progressTotal={totalWords}
          items={sequenceItems}
          focusItemId={focusItemId}
          fontSizes={fontSizes}
        />
      </div>

      <SplitExerciseActionRail
        remainingMistakes={Math.max(0, maxMistakes - mistakesSinceReset)}
        showAssistButton={showInlineAssistButton}
        onRequestAssist={onRequestInlineAssist}
        showQuickForgetAction={showInlineQuickForgetAction}
        onRequestQuickForget={onRequestInlineQuickForget}
        disabled={inlineActionsDisabled}
      />

      {/* ── Bottom half: word choices ── */}
      {showChoices && (
        <div className="mt-2 min-h-0 flex-1 basis-1/2 flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/70 px-3 pt-3">
          <ScrollShadowContainer
            className="min-h-0 h-full"
            scrollClassName="h-full overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
            shadowSize={40}
            bottomCue={
              <span className="rounded-full border border-border/50 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/60 shadow-sm backdrop-blur-sm">
                <ArrowDownIcon className="size-3" />
              </span>
            }
          >
            <div className="min-h-full">
              <div className="mb-2 flex shrink-0 items-center text-xs text-muted-foreground">
                <span>Варианты слов</span>
              </div>
              <div className="min-h-0 flex-1">
                <div className="flex flex-wrap content-start gap-1.5 px-0.5 pb-2 pt-0.5">
                  {visibleChoices.map((choice) => (
                    <div key={choice.normalized} className="min-w-0">
                      <Button
                        type="button"
                        variant="outline"
                        title={choice.displayText}
                        className={`${WORD_CHOICE_BUTTON_BASE_CLASS} transition-colors ${
                          errorFlashNormalized === choice.normalized
                            ? 'border-destructive text-destructive bg-destructive/10'
                            : successFlashNormalized === choice.normalized
                              ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                              : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                        }`}
                        style={{ fontSize: `${fontSizes.sm}px` }}
                        onClick={() => handleWordClick(choice)}
                      >
                        <span className="block min-w-0 truncate">
                          {choice.displayText}
                        </span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollShadowContainer>
        </div>
      )}

    </motion.div>
  );
}
