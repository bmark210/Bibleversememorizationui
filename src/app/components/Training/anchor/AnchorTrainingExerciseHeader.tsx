"use client";

import type { ReferenceVerse } from "./anchorTrainingTypes";
import type { TrainerModeId } from "./anchorTrainingTypes";
import { getAnchorModeShortLabel } from "./anchorModeLabels";
import { referenceVerseToTrainingHeaderVerse } from "./referenceVerseForTrainingHeader";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { computeVerseProgressBreakdown } from "@/shared/training/verseTotalProgress";
import { cn } from "@/app/components/ui/utils";

type AnchorTrainingExerciseHeaderProps = {
  modeId: TrainerModeId;
  verse: ReferenceVerse;
  className?: string;
};

function resolvePhaseChip(verse: ReferenceVerse): {
  label: string;
  pillClass: string;
  progressPercent: number;
} {
  const v = referenceVerseToTrainingHeaderVerse(verse);
  const status = normalizeDisplayVerseStatus(v.status);
  const { progressPercent } = computeVerseProgressBreakdown(
    v.masteryLevel,
    v.repetitions,
  );

  if (status === "MASTERED") {
    return {
      label: "Выучен",
      pillClass:
        "border-amber-500/35 bg-amber-500/[0.12] text-amber-900 dark:text-amber-200",
      progressPercent,
    };
  }
  if (status === VerseStatus.STOPPED) {
    return {
      label: "Пауза",
      pillClass:
        "border-rose-500/30 bg-rose-500/[0.1] text-rose-800 dark:text-rose-200",
      progressPercent,
    };
  }
  if (status === "REVIEW") {
    return {
      label: "Повторение",
      pillClass:
        "border-violet-500/35 bg-violet-500/[0.12] text-violet-900 dark:text-violet-200",
      progressPercent,
    };
  }
  return {
    label: "Изучение",
    pillClass:
      "border-emerald-500/35 bg-emerald-500/[0.12] text-emerald-900 dark:text-emerald-200",
    progressPercent,
  };
}

export function AnchorTrainingExerciseHeader({
  modeId,
  verse,
  className,
}: AnchorTrainingExerciseHeaderProps) {
  const modeLabel = getAnchorModeShortLabel(modeId);
  const {
    label: phaseLabel,
    pillClass,
    progressPercent,
  } = resolvePhaseChip(verse);

  return (
    <div
      className={cn(
        "my-2 flex shrink-0 items-center justify-between gap-2 border-b border-border/50 pb-2",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/80">
          {modeLabel}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "flex flex-row items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
            pillClass,
          )}
        >
          <span>{phaseLabel}</span>
          <span className="tabular-nums">{progressPercent}%</span>
        </span>
      </div>
    </div>
  );
}
