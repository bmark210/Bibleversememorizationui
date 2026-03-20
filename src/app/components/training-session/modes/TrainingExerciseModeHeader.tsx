"use client";

import { HelpCircle } from "lucide-react";
import type { Verse } from "@/app/App";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { computeVerseTotalProgressPercent } from "@/shared/training/verseTotalProgress";
import type { TrainingModeId } from "@/shared/training/modeEngine";
import { cn } from "@/app/components/ui/utils";
import { getTrainingModeShortLabel } from "./trainingModeMeta";

type TrainingExerciseModeHeaderProps = {
  modeId: TrainingModeId;
  verse: Verse;
  /** Открывает ту же модалку подсказки, что и в TrainingModeRenderer */
  onOpenHelp?: () => void;
  className?: string;
};

function resolvePhaseChip(verse: Verse): {
  label: string;
  pillClass: string;
  progressPercent: number;
} {
  const status = normalizeDisplayVerseStatus(verse.status);
  const basePct = computeVerseTotalProgressPercent(
    verse.masteryLevel,
    verse.repetitions
  );

  if (status === "MASTERED") {
    return {
      label: "Выучен",
      pillClass:
        "border-amber-500/35 bg-amber-500/[0.12] text-amber-900 dark:text-amber-200",
      progressPercent: 100,
    };
  }
  if (status === VerseStatus.STOPPED) {
    return {
      label: "Пауза",
      pillClass:
        "border-rose-500/30 bg-rose-500/[0.1] text-rose-800 dark:text-rose-200",
      progressPercent: basePct,
    };
  }
  if (status === "REVIEW") {
    return {
      label: "Повторение",
      pillClass:
        "border-violet-500/35 bg-violet-500/[0.12] text-violet-900 dark:text-violet-200",
      progressPercent: basePct,
    };
  }
  return {
    label: "Изучение",
    pillClass:
      "border-emerald-500/35 bg-emerald-500/[0.12] text-emerald-900 dark:text-emerald-200",
    progressPercent: basePct,
  };
}

export function TrainingExerciseModeHeader({
  modeId,
  verse,
  onOpenHelp,
  className,
}: TrainingExerciseModeHeaderProps) {
  const label = getTrainingModeShortLabel(modeId);
  const { label: phaseLabel, pillClass, progressPercent } =
    resolvePhaseChip(verse);

  return (
    <div
      className={cn(
        "mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-border/50 pb-2",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/80">
          {label}
        </span>
        {onOpenHelp ? (
          <button
            type="button"
            onClick={onOpenHelp}
            className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5 text-muted-foreground/55 transition-colors hover:bg-muted/60 hover:text-foreground/85"
            aria-label="Как проходить этот режим"
          >
            <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
            pillClass
          )}
        >
          {phaseLabel}
        </span>
        <span className="tabular-nums text-[11px] font-medium text-muted-foreground">
          {progressPercent}%
        </span>
      </div>
    </div>
  );
}
