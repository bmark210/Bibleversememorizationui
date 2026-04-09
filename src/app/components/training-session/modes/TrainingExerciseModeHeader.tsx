"use client";

import { HelpCircle } from "lucide-react";
import type { Verse } from "@/app/domain/verse";
import type { TrainingModeId } from "@/shared/training/modeEngine";
import { cn } from "@/app/components/ui/utils";
import { getTrainingModeShortLabel } from "./trainingModeMeta";
import { resolveVerseState } from "@/shared/verseRules";

type TrainingExerciseModeHeaderProps = {
  modeId: TrainingModeId;
  verse: Verse;
  /** Открывает ту же модалку подсказки, что и в TrainingModeRenderer */
  onOpenHelp?: () => void;
  /** Открывает {@link VerseProgressDrawer} с детализацией шагов (родитель — TrainingCard) */
  onOpenVerseProgress?: () => void;
  className?: string;
};

function resolvePhaseChip(verse: Verse): {
  label: string;
  pillClass: string;
  progressPercent: number;
  emphasisClass?: string;
} {
  const resolved = resolveVerseState(verse);
  const status = resolved.displayStatus;
  const progressPercent = resolved.progress.progressPercent;

  if (status === "MASTERED") {
    return {
      label: "Выучен",
      pillClass:
        "border-status-mastered/30 bg-status-mastered-soft text-status-mastered",
      progressPercent,
    };
  }
  if (resolved.isPaused) {
    return {
      label: "Пауза",
      pillClass:
        "border-status-paused/25 bg-status-paused-soft text-status-paused",
      progressPercent,
    };
  }
  if (status === "REVIEW") {
    return {
      label: "Повторение",
      pillClass:
        "border-status-review/25 bg-status-review-soft text-status-review",
      emphasisClass: "ring-1 ring-status-review/30 ring-offset-1 ring-offset-bg-app",
      progressPercent,
    };
  }
  return {
    label: "Изучение",
    pillClass:
      "border-status-learning/25 bg-status-learning-soft text-status-learning",
    progressPercent,
  };
}

export function TrainingExerciseModeHeader({
  modeId,
  verse,
  onOpenHelp,
  onOpenVerseProgress,
  className,
}: TrainingExerciseModeHeaderProps) {
  const label = getTrainingModeShortLabel(modeId);
  const {
    label: phaseLabel,
    pillClass,
    progressPercent,
    emphasisClass,
  } = resolvePhaseChip(verse);

  return (
    <div
      className={cn(
        "my-2 flex shrink-0 items-center justify-between gap-2",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span onClick={onOpenHelp} className="truncate text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">
          {label}
        </span>
        {onOpenHelp ? (
          <button
            type="button"
            onClick={onOpenHelp}
            className="inline-flex shrink-0 items-center justify-center rounded-full p-1 text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary"
            aria-label="Как проходить этот режим"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onOpenVerseProgress ? (
          <button
            type="button"
            onClick={onOpenVerseProgress}
            className={cn(
              "flex flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] transition-[opacity,transform] hover:opacity-92 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app",
              pillClass,
              emphasisClass,
            )}
            aria-label="Подробный прогресс стиха"
          >
            <span>{phaseLabel}</span>
            <span className="tabular-nums">{progressPercent}%</span>
          </button>
        ) : (
          <span
            className={cn(
              "flex flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em]",
              pillClass,
              emphasisClass,
            )}
          >
            <span>{phaseLabel}</span>
            <span className="tabular-nums">{progressPercent}%</span>
          </span>
        )}
      </div>
    </div>
  );
}
