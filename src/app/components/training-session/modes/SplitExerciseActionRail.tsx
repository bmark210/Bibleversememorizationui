"use client";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import {
  TRAINING_ACTION_BUTTON_STRONG_CLASS,
  TRAINING_ACTION_ROW_PADDING_CLASS,
} from "../trainingActionTokens";

interface SplitExerciseActionRailProps {
  remainingMistakes: number;
  showRemainingMistakes?: boolean;
  showQuickForgetAction?: boolean;
  onRequestQuickForget?: () => void;
  disabled?: boolean;
}

function getMistakeToneClassName(remainingMistakes: number) {
  if (remainingMistakes <= 1) {
    return "border-status-paused/30 bg-status-paused-soft text-status-paused";
  }

  if (remainingMistakes <= 3) {
    return "border-state-warning/30 bg-state-warning/12 text-state-warning";
  }

  return "border-border-subtle bg-bg-elevated text-text-secondary";
}

export function SplitExerciseActionRail({
  remainingMistakes,
  showRemainingMistakes = true,
  showQuickForgetAction = false,
  onRequestQuickForget,
  disabled = false,
}: SplitExerciseActionRailProps) {
  if (!showRemainingMistakes && !showQuickForgetAction) {
    return null;
  }

  if (!showRemainingMistakes) {
    return (
      <div className={cn(
        "relative flex w-full max-w-xl items-center justify-end gap-2.5 text-sm",
        TRAINING_ACTION_ROW_PADDING_CLASS,
      )}>
        {showQuickForgetAction ? (
          <Button
            type="button"
            variant="ghost"
            className={`${TRAINING_ACTION_BUTTON_STRONG_CLASS} border border-status-paused/25 bg-status-paused-soft text-status-paused shadow-[var(--shadow-soft)] hover:border-status-paused/35 hover:bg-status-paused-soft`}
            onClick={onRequestQuickForget}
            disabled={disabled}
          >
            Забыл
          </Button>
        ) : null}
      </div>
    );
  }

  return ( 
    <div className={cn(
      "relative my-2 flex w-full max-w-xl items-center gap-2.5 rounded-2xl border border-border-subtle bg-bg-elevated text-sm shadow-[var(--shadow-soft)]",
      TRAINING_ACTION_ROW_PADDING_CLASS,
    )}>
      <div
        className={cn(
          "min-w-0 rounded-2xl border h-12 px-4",
          getMistakeToneClassName(remainingMistakes)
        )}
      >
        <span className="flex h-full items-center text-nowrap text-sm font-semibold uppercase tracking-[0.14em] text-current/80">
          До сброса {remainingMistakes}
        </span>
      </div>

      <div className="flex justify-end">
        {showQuickForgetAction ? (
          <Button
            type="button"
            variant="ghost"
            className={`${TRAINING_ACTION_BUTTON_STRONG_CLASS} border border-status-paused/25 bg-status-paused-soft text-status-paused shadow-[var(--shadow-soft)] hover:border-status-paused/35 hover:bg-status-paused-soft`}
            onClick={onRequestQuickForget}
            disabled={disabled}
          >
            Забыл
          </Button>
        ) : (
          <div aria-hidden="true" className="h-12 min-w-[112px]" />
        )}
      </div>
    </div>
  );
}
