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
    return "border-rose-500/35 bg-rose-500/[0.08] text-rose-700 dark:text-rose-200";
  }

  if (remainingMistakes <= 3) {
    return "border-amber-500/35 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300";
  }

  return "border-border/60 bg-background/45 text-foreground/80";
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
            className="h-8 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-800 shadow-sm hover:bg-rose-500/[0.12] dark:text-rose-200"
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
    <div className="relative my-2 flex w-full max-w-xl items-center gap-2.5 rounded-xl border border-border/60 bg-background/88 p-2 text-[11px]">
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
            className="h-8 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-800 shadow-sm hover:bg-rose-500/[0.12] dark:text-rose-200"
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
