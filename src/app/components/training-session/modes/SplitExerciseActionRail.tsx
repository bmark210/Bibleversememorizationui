"use client";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";

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
      <div className="relative mt-1.5 mb-2 flex w-full max-w-xl items-center justify-end gap-2.5 p-2 text-[11px]">
        {showQuickForgetAction ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-xl border border-status-paused/25 bg-status-paused-soft px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-status-paused shadow-[var(--shadow-soft)] hover:border-status-paused/35 hover:bg-status-paused-soft"
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
    <div className="relative my-2 flex w-full max-w-xl items-center gap-2.5 rounded-xl border border-border-subtle bg-bg-elevated p-2 text-[11px] shadow-[var(--shadow-soft)]">
      <div
        className={cn(
          "min-w-0 rounded-xl border h-8 px-3 py-2",
          getMistakeToneClassName(remainingMistakes)
        )}
      >
        <span className="flex items-center text-nowrap font-semibold uppercase tracking-[0.16em] text-current/70">
          До сброса {remainingMistakes}
        </span>
      </div>

      <div className="flex justify-end">
        {showQuickForgetAction ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-xl border border-status-paused/25 bg-status-paused-soft px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-status-paused shadow-[var(--shadow-soft)] hover:border-status-paused/35 hover:bg-status-paused-soft"
            onClick={onRequestQuickForget}
            disabled={disabled}
          >
            Забыл
          </Button>
        ) : (
          <div aria-hidden="true" className="h-8 min-w-[104px]" />
        )}
      </div>
    </div>
  );
}
