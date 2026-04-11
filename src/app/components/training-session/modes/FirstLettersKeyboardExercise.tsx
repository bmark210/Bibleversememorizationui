"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GALLERY_TOASTER_ID, toast } from "@/app/lib/toast";
import { TrainingModeId } from "@/shared/training/modeEngine";

import { Textarea } from "@/app/components/ui/textarea";
import { useTrainingFontSize } from "./useTrainingFontSize";
import { TrainingExerciseModeHeader } from "./TrainingExerciseModeHeader";
import { SplitExerciseActionRail } from "./SplitExerciseActionRail";
import {
  getRemainingMistakesTone,
  TrainingExerciseSection,
  TrainingMetricBadge,
} from "./TrainingExerciseSection";
import type { TrainingExerciseResolution } from "./exerciseResult";
import type { ExerciseInlineActionsProps } from "./exerciseInlineActions";
import type { HintState } from "./useHintState";
import { Verse } from "@/app/domain/verse";
import { tokenizeFirstLetters } from "./wordUtils";
import { createExerciseProgressSnapshot } from "@/modules/training/hints/exerciseProgress";
import type { ExerciseProgressSnapshot } from "@/modules/training/hints/types";
import { getExerciseMaxMistakes } from "@/modules/training/hints/exerciseDifficultyConfig";
import { useFlashTimeout } from "./useFlashTimeout";
import { useSurrenderEffect } from "./useSurrenderEffect";
import { TRAINING_COMPACT_TEXT_ENTRY_SECTION_STYLE } from "./textEntryLayout";

interface FirstLettersKeyboardExerciseProps extends ExerciseInlineActionsProps {
  verse: Verse;
  trainingModeId: TrainingModeId;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
  onOpenVerseProgress?: () => void;
}

function normalizeComparableLetter(value: string) {
  return value.toLowerCase().replace(/ё/g, "е");
}

function sanitizeInput(value: string) {
  return value.replace(/[^\p{L}\p{N}\s]+/gu, "").replace(/[ \t]+/g, " ");
}

function compactLetters(value: string) {
  return normalizeComparableLetter(value).replace(/[^\p{L}\p{N}]+/gu, "");
}

function trimToMaxLetters(rawValue: string, maxLetters: number) {
  let lettersSeen = 0;
  let out = "";
  for (const ch of rawValue) {
    const isLetterLike = /[\p{L}\p{N}]/u.test(ch);
    if (isLetterLike) {
      if (lettersSeen >= maxLetters) break;
      lettersSeen += 1;
      out += ch;
      continue;
    }
    if (/\s/u.test(ch)) {
      out += ch;
    }
  }
  return out;
}

export function ModeFirstLettersKeyboardExercise({
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
}: FirstLettersKeyboardExerciseProps) {
  const fontSizes = useTrainingFontSize();
  const [expectedLetters, setExpectedLetters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const shakeFlash = useFlashTimeout<boolean>(240);
  const successFlash = useFlashTimeout<boolean>();
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const surrendered = hintState?.surrendered ?? false;

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setExpectedLetters(letters);
    setInputValue("");
    setMistakesSinceReset(0);
    setIsCompleted(false);
    shakeFlash.clear();
    successFlash.clear();

    return () => {
      shakeFlash.cleanup();
      successFlash.cleanup();
      if (mobileFocusTimeoutRef.current) {
        window.clearTimeout(mobileFocusTimeoutRef.current);
        mobileFocusTimeoutRef.current = null;
      }
    };
  }, [verse]);

  useSurrenderEffect({
    surrendered,
    isCompleted,
    setIsCompleted,
    onExerciseResolved,
  });

  const expectedCompact = useMemo(
    () => expectedLetters.join(""),
    [expectedLetters],
  );
  const completedUnits = compactLetters(inputValue).length;
  const maxMistakes = getExerciseMaxMistakes({
    modeId: TrainingModeId.FirstLettersTyping,
    difficultyLevel: verse.difficultyLevel,
    totalUnits: expectedLetters.length,
  });
  const remainingMistakes = Math.max(0, maxMistakes - mistakesSinceReset);

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: "first-letters-typing",
        unitType: "letter",
        expectedIndex:
          completedUnits < expectedLetters.length ? completedUnits : null,
        completedCount: completedUnits,
        totalCount: expectedLetters.length,
        isCompleted: isCompleted || surrendered,
      }),
    );
  }, [
    completedUnits,
    expectedLetters.length,
    isCompleted,
    onProgressChange,
    surrendered,
  ]);

  const applyNextInputValue = (nextRaw: string) => {
    if (isCompleted || surrendered) return;

    const sanitized = trimToMaxLetters(
      sanitizeInput(nextRaw),
      expectedCompact.length,
    );
    const compact = compactLetters(sanitized);
    const expectedPrefix = expectedCompact.slice(0, compact.length);

    if (compact === expectedPrefix) {
      setInputValue(sanitized);

      successFlash.flash(true);

      if (
        compact.length === expectedCompact.length &&
        expectedCompact.length > 0
      ) {
        setIsCompleted(true);
        onExerciseResolved?.({
          kind: "success",
          message: "Последовательность букв введена верно.",
        });
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetInput = nextMistakesSinceReset >= maxMistakes;
    setMistakesSinceReset(nextMistakesSinceReset);

    if (shouldResetInput) {
      setIsCompleted(true);
      onExerciseResolved?.({
        kind: "failure",
        reason: "max-mistakes",
        message: `Допущено ${maxMistakes} ошибок. Попробуйте ещё раз.`,
      });
    } else {
      toast.warning(
        `Неверная буква. До сброса: ${maxMistakes - nextMistakesSinceReset}.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: "compact",
        },
      );
    }

    shakeFlash.flash(true);
  };

  const handleInputFocus = () => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    if (mobileFocusTimeoutRef.current) {
      window.clearTimeout(mobileFocusTimeoutRef.current);
    }

    mobileFocusTimeoutRef.current = window.setTimeout(() => {
      inputRef.current?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
      mobileFocusTimeoutRef.current = null;
    }, 140);
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
        headerClassName="mb-4"
        title="Первые буквы"
        meta={
          <div className="flex items-center gap-1.5">
            <TrainingMetricBadge
              tone={
                completedUnits === expectedLetters.length &&
                expectedLetters.length > 0
                  ? "success"
                  : "neutral"
              }
            >
              {completedUnits}/{expectedLetters.length}
            </TrainingMetricBadge>
            <TrainingMetricBadge
              tone={getRemainingMistakesTone(remainingMistakes)}
            >
              До сброса {remainingMistakes}
            </TrainingMetricBadge>
          </div>
        }
        className="mt-3 min-h-0 shrink-0"
        style={TRAINING_COMPACT_TEXT_ENTRY_SECTION_STYLE}
        contentClassName="flex h-full flex-col"
      >
        <div
          className={`flex flex-1 flex-col overflow-hidden rounded-2xl border mb-4 transition-colors ${
            shakeFlash.value === true
              ? "border-state-error/50 bg-state-error/8"
              : successFlash.value === true
                ? "border-status-learning/25 bg-status-learning-soft"
                : "border-border/40 bg-bg-subtle"
          }`}
        >
          <Textarea
            ref={inputRef}
            value={inputValue}
            onChange={(event) => applyNextInputValue(event.target.value)}
            onFocus={handleInputFocus}
            placeholder="Введите первые буквы..."
            disabled={isCompleted || surrendered}
            data-swipe-through="true"
            className="flex-1 h-[8rem] placeholder:tracking-[0.08em] font-sans resize-none border-0 !bg-transparent p-4 uppercase placeholder:normal-case tracking-[0.16em] shadow-none !focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ fontSize: `${fontSizes.base}px` }}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
          />
        </div>
      </TrainingExerciseSection>

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
