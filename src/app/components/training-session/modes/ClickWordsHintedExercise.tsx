"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { GALLERY_TOASTER_ID, toast } from "@/app/lib/toast";
import { swapArrayItems } from "@/shared/utils/swapArrayItems";
import { TrainingModeId } from "@/shared/training/modeEngine";

import { Button } from "@/app/components/ui/button";
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import { TrainingExerciseModeHeader } from "./TrainingExerciseModeHeader";
import { SplitExerciseActionRail } from "./SplitExerciseActionRail";
import { Verse } from "@/app/App";
import type { TrainingExerciseResolution } from "./exerciseResult";
import {
  tokenizeWords,
  normalizeWord,
  cleanWordForDisplay,
  getWordMask,
  getWordMaskWidth,
} from "./wordUtils";
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
import { ArrowDownIcon } from "lucide-react";

interface ClickWordsHintedExerciseProps {
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
  "h-auto max-w-full min-w-0 justify-start rounded-lg px-3 py-2 leading-5 text-left whitespace-nowrap";
const CHOICES_SECTION_CLASS =
  "mt-2 min-h-0 flex flex-1 basis-1/2 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/70 px-3 pt-3";
const CHOICES_HEADER_CLASS =
  "mb-2 flex shrink-0 items-center text-xs text-muted-foreground";
const CHOICES_WRAPPER_CLASS = "min-h-0 flex-1";
const CHOICES_LIST_CLASS =
  "flex flex-wrap content-start gap-1.5 px-0.5 pb-2.5 pt-0.5";
const CHOICES_MISTAKE_BADGE_CLASS =
  "inline-flex items-center rounded-full border border-border/60 bg-background/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/65";
const CHOICES_BOTTOM_CUE = (
  <span className="rounded-full border border-border/50 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/60 shadow-sm backdrop-blur-sm">
    <ArrowDownIcon className="size-3" />
  </span>
);

export function ModeClickWordsHintedExercise({
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
}: ClickWordsHintedExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const [{ slots, uniqueChoices }, setExerciseData] = useState(() =>
    buildExercise({ text: verse.text, difficultyLevel: verse.difficultyLevel }),
  );
  const [selectedCount, setSelectedCount] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashNormalized, setErrorFlashNormalized] = useState<
    string | null
  >(null);
  const [successFlashNormalized, setSuccessFlashNormalized] = useState<
    string | null
  >(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);
  const clearSuccessFlashTimeoutRef = useRef<number | null>(null);
  const resolvedRef = useRef(false);

  const surrendered = hintState?.surrendered ?? false;

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
        kind: "revealed",
        message:
          "Правильный текст открыт. Оцените, насколько уверенно вы вспоминали стих.",
      });
    }
  }, [isCompleted, onExerciseResolved, surrendered]);

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
          minWidth: getWordMaskWidth(slot.text),
          state: isActiveGap ? "active-gap" : "future-gap",
        };
      }),
    [slots, hiddenIndexByOrder, selectedCount, isCompleted],
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

  const visibleChoices = useMemo(
    () =>
      uniqueChoices.filter(
        (choice) =>
          (remainingCountByNormalized.get(choice.normalized) ?? 0) > 0,
      ),
    [uniqueChoices, remainingCountByNormalized],
  );

  const handleWordClick = (choice: UniqueChoice) => {
    if (isCompleted || surrendered) return;
    if (!nextHiddenSlot) return;

    if (choice.normalized === nextHiddenSlot.normalized) {
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
      <div className="min-h-0 flex-1 basis-1/2 overflow-hidden">
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
              shadowSize={40}
              bottomCue={CHOICES_BOTTOM_CUE}
            >
              <div className={CHOICES_LIST_CLASS}>
                {visibleChoices.map((choice) => (
                  <div key={choice.normalized} className="min-w-0">
                    <Button
                      type="button"
                      variant="outline"
                      title={choice.displayText}
                      className={`${WORD_CHOICE_BUTTON_BASE_CLASS} transition-colors ${
                        errorFlashNormalized === choice.normalized
                          ? "border-destructive text-destructive bg-destructive/10"
                          : successFlashNormalized === choice.normalized
                            ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                            : "border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5"
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
            </ScrollShadowContainer>
          </div>
        </div>
      )}

      <SplitExerciseActionRail
        remainingMistakes={Math.max(0, maxMistakes - mistakesSinceReset)}
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
