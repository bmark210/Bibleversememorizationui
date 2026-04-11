"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GALLERY_TOASTER_ID, toast } from "@/app/lib/toast";
import { swapArrayItems } from "@/shared/utils/swapArrayItems";
import { TrainingModeId } from "@/shared/training/modeEngine";

import { Button } from "@/app/components/ui/button";
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import { TrainingExerciseModeHeader } from "./TrainingExerciseModeHeader";
import { SplitExerciseActionRail } from "./SplitExerciseActionRail";
import { Verse } from "@/app/domain/verse";
import type { TrainingExerciseResolution } from "./exerciseResult";
import {
  tokenizeWords,
  normalizeWord,
  cleanWordForDisplay,
  getWordMask,
  getWordMaskWidthWithFont,
} from "./wordUtils";
import { buildFont } from "@/app/utils/textLayout";
import {
  WordSequenceField,
  type WordSequenceFieldItem,
} from "./WordSequenceField";
import type { HintState } from "./useHintState";
import { createExerciseProgressSnapshot } from "@/modules/training/hints/exerciseProgress";
import type { ExerciseProgressSnapshot } from "@/modules/training/hints/types";
import {
  getExerciseMaxMistakes,
  getHintedRevealCount,
} from "@/modules/training/hints/exerciseDifficultyConfig";
import { useTrainingFontSize } from "./useTrainingFontSize";
import {
  getChoiceButtonFlashClassName,
  useChoiceFlashFeedback,
} from "./useChoiceFlashFeedback";
import { useSurrenderEffect } from "./useSurrenderEffect";
import {
  TRAINING_HALVES_GAP_CLASS,
  TRAINING_SECTION_CONTENT_INSET_SM,
  TRAINING_SECTION_INSET_MD,
} from "../trainingActionTokens";

interface ClickWordsHintedExerciseProps {
  verse: Verse;
  trainingModeId: TrainingModeId;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
  onOpenVerseProgress?: () => void;
  showInlineQuickForgetAction?: boolean;
  onRequestInlineQuickForget?: () => void;
  inlineActionsDisabled?: boolean;
}

interface WordSlot {
  id: string;
  text: string;
  normalized: string;
  order: number;
  revealed: boolean;
}

interface UniqueChoice {
  displayText: string;
  normalized: string;
  totalCount: number;
}

function pickRevealedIndices(
  totalWords: number,
  revealCount: number,
): Set<number> {
  if (totalWords <= 1) return new Set<number>();

  const revealed = new Set<number>();
  if (totalWords >= 3 && revealed.size < revealCount) revealed.add(0);
  if (totalWords >= 5 && revealed.size < revealCount)
    revealed.add(totalWords - 1);

  const candidates = Array.from({ length: totalWords }, (_, i) => i).filter(
    (i) => !revealed.has(i),
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

function buildExercise(params: {
  text: string;
  difficultyLevel: Verse["difficultyLevel"];
}) {
  const { text, difficultyLevel } = params;
  const words = tokenizeWords(text);
  const revealed = pickRevealedIndices(
    words.length,
    getHintedRevealCount({
      modeId: TrainingModeId.ClickWordsHinted,
      difficultyLevel,
      totalWords: words.length,
    }),
  );

  const slots: WordSlot[] = words.map((word, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 6)}`,
    text: word,
    normalized: normalizeWord(word),
    order: index,
    revealed: revealed.has(index),
  }));

  const hiddenSlots = slots.filter((s) => !s.revealed);
  const choiceMap = new Map<string, UniqueChoice>();

  for (const slot of hiddenSlots) {
    const existing = choiceMap.get(slot.normalized);
    if (existing) {
      existing.totalCount += 1;
    } else {
      choiceMap.set(slot.normalized, {
        displayText: cleanWordForDisplay(slot.text),
        normalized: slot.normalized,
        totalCount: 1,
      });
    }
  }

  const uniqueChoices = Array.from(choiceMap.values());
  for (let i = uniqueChoices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    swapArrayItems(uniqueChoices, i, j);
  }

  return { slots, uniqueChoices };
}

const WORD_CHOICE_BUTTON_BASE_CLASS =
  "h-auto max-w-full min-w-0 justify-start rounded-lg px-3 py-2 leading-5 text-left whitespace-nowrap shadow-[var(--shadow-chip)]";
const CHOICES_SECTION_CLASS =
  `${TRAINING_HALVES_GAP_CLASS} min-h-0 flex flex-[1_1_0] flex-col overflow-hidden rounded-3xl border border-border-subtle bg-bg-elevated ${TRAINING_SECTION_INSET_MD}`;
const CHOICES_HEADER_CLASS =
  "mb-2 flex shrink-0 items-center justify-between text-sm text-text-secondary";
const CHOICES_WRAPPER_CLASS = "min-h-0 flex-1";
const CHOICES_LIST_CLASS =
  `flex flex-wrap content-start gap-2 ${TRAINING_SECTION_CONTENT_INSET_SM}`;
const CHOICES_MISTAKE_BADGE_CLASS =
  "inline-flex items-center rounded-full border border-border-subtle bg-bg-subtle px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary";

export function ModeClickWordsHintedExercise({
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
}: ClickWordsHintedExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const wordFont = buildFont(fontSizes.sm);
  const [{ slots, uniqueChoices }, setExerciseData] = useState(() =>
    buildExercise({ text: verse.text, difficultyLevel: verse.difficultyLevel }),
  );
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

  const resolvedRef = useSurrenderEffect({
    surrendered,
    isCompleted,
    setIsCompleted,
    onExerciseResolved,
  });

  const prevVerseRef = useRef(verse);
  useEffect(() => {
    if (prevVerseRef.current === verse) return;
    prevVerseRef.current = verse;
    resolvedRef.current = false;
    setExerciseData(
      buildExercise({
        text: verse.text,
        difficultyLevel: verse.difficultyLevel,
      }),
    );
    setSelectedCount(0);
    setMistakesSinceReset(0);
    setIsCompleted(false);
    clearChoiceFlash();
  }, [clearChoiceFlash, verse]);

  const hiddenSlots = useMemo(
    () => slots.filter((slot) => !slot.revealed),
    [slots],
  );

  const totalHiddenWords = hiddenSlots.length;
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.ClickWordsHinted,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: totalHiddenWords,
  });
  const nextHiddenSlot = hiddenSlots[selectedCount] ?? null;

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: "word-order-hinted",
        unitType: "word",
        expectedIndex: nextHiddenSlot?.order ?? null,
        completedCount: selectedCount,
        totalCount: totalHiddenWords,
        isCompleted: isCompleted || surrendered,
      }),
    );
  }, [
    isCompleted,
    nextHiddenSlot,
    onProgressChange,
    selectedCount,
    surrendered,
    totalHiddenWords,
  ]);

  const hiddenIndexByOrder = useMemo(() => {
    const map = new Map<number, number>();
    hiddenSlots.forEach((slot, index) => map.set(slot.order, index));
    return map;
  }, [hiddenSlots]);

  const focusItemId = useMemo(() => {
    if (hiddenSlots.length === 0) return null;
    if (selectedCount <= 0) return hiddenSlots[0]?.id ?? null;
    return (
      hiddenSlots[Math.min(selectedCount - 1, hiddenSlots.length - 1)]?.id ??
      null
    );
  }, [hiddenSlots, selectedCount]);

  const sequenceItems = useMemo<WordSequenceFieldItem[]>(
    () =>
      slots.map((slot) => {
        const hiddenIndex = hiddenIndexByOrder.get(slot.order) ?? -1;
        const isHidden = hiddenIndex >= 0;
        const isFilled = isHidden && hiddenIndex < selectedCount;
        const isActiveGap =
          isHidden && !isCompleted && hiddenIndex === selectedCount;

        if (slot.revealed) {
          return {
            id: slot.id,
            content: slot.text,
            state: "revealed",
          };
        }

        if (isFilled) {
          return {
            id: slot.id,
            content: slot.text,
            state: "filled",
          };
        }

        return {
          id: slot.id,
          content: getWordMask(slot.text),
          minWidth: getWordMaskWidthWithFont(slot.text, wordFont),
          state: isActiveGap ? "active-gap" : "future-gap",
        };
      }),
    [slots, hiddenIndexByOrder, selectedCount, isCompleted, wordFont],
  );

  const remainingCountByNormalized = useMemo(() => {
    const counts = new Map<string, number>();
    for (const choice of uniqueChoices) {
      counts.set(choice.normalized, choice.totalCount);
    }

    for (let i = 0; i < selectedCount; i += 1) {
      const slot = hiddenSlots[i];
      if (!slot) break;
      const current = counts.get(slot.normalized) ?? 0;
      if (current > 0) counts.set(slot.normalized, current - 1);
    }

    return counts;
  }, [uniqueChoices, selectedCount, hiddenSlots]);

  const handleWordClick = (choice: UniqueChoice) => {
    if (isCompleted || surrendered) return;
    if (!nextHiddenSlot) return;

    if (choice.normalized === nextHiddenSlot.normalized) {
      const next = selectedCount + 1;
      setSelectedCount(next);

      flashChoiceSuccess(choice.normalized);

      if (next === totalHiddenWords) {
        resolvedRef.current = true;
        setIsCompleted(true);
        onExerciseResolved?.({
          kind: "success",
          message: "Скрытые слова восстановлены верно.",
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
        kind: "failure",
        reason: "max-mistakes",
        message: `Допущено ${maxMistakes} ошибок. Попробуйте ещё раз.`,
      });
    } else {
      toast.warning(
        `Неверное слово. До сброса: ${maxMistakes - nextMistakesSinceReset}.`,
        { toasterId: GALLERY_TOASTER_ID, size: "compact" },
      );
    }

    flashChoiceError(choice.normalized);
  };

  const showChoices = !isCompleted && !surrendered && uniqueChoices.length > 0;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <TrainingExerciseModeHeader
        modeId={trainingModeId}
        verse={verse}
        onOpenHelp={onOpenTutorial}
        onOpenVerseProgress={onOpenVerseProgress}
      />
      {/* ── Top half: verse field ── */}
      <div className="min-h-0 flex-[1_1_0] mt-3 overflow-hidden">
        <WordSequenceField
          className="h-full"
          label="Стих с пропусками"
          progressCurrent={selectedCount}
          progressTotal={totalHiddenWords}
          items={sequenceItems}
          focusItemId={focusItemId}
          fontSizes={fontSizes}
        />
      </div>

      {/* ── Bottom half: word choices ── */}
      {showChoices && (
        <div className={CHOICES_SECTION_CLASS}>
          <div className={`${CHOICES_HEADER_CLASS} justify-between gap-2`}>
            <span>Варианты слов</span>
            <span className={CHOICES_MISTAKE_BADGE_CLASS}>
              До сброса {Math.max(0, maxMistakes - mistakesSinceReset)}
            </span>
          </div>
          <div className={CHOICES_WRAPPER_CLASS}>
            <ScrollShadowContainer
              className="min-h-0 h-full"
              scrollClassName="h-full overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
              showShadows={true}
              shadowSize={16}
            >
              <div className={CHOICES_LIST_CLASS}>
                {uniqueChoices.map((choice) => {
                  const remainingChoiceCount =
                    remainingCountByNormalized.get(choice.normalized) ?? 0;
                  const isUsed = remainingChoiceCount <= 0;

                  return (
                    <div key={choice.normalized} className="min-w-0">
                      <Button
                        type="button"
                        variant="outline"
                        title={choice.displayText}
                        disabled={isUsed}
                        className={`${WORD_CHOICE_BUTTON_BASE_CLASS} transition-colors ${getChoiceButtonFlashClassName({
                          choiceKey: choice.normalized,
                          disabled: isUsed,
                          idleClassName:
                            "border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5",
                          getChoiceFlashKind,
                        })}`}
                        style={{ fontSize: `${fontSizes.sm}px` }}
                        onClick={() => handleWordClick(choice)}
                      >
                        <span className="block min-w-0 truncate">
                          {choice.displayText}
                        </span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollShadowContainer>
          </div>
        </div>
      )}

      <SplitExerciseActionRail
        remainingMistakes={Math.max(0, maxMistakes - mistakesSinceReset)}
        showRemainingMistakes={false}
        showQuickForgetAction={showInlineQuickForgetAction}
        onRequestQuickForget={onRequestInlineQuickForget}
        disabled={inlineActionsDisabled}
      />
    </div>
  );
}
