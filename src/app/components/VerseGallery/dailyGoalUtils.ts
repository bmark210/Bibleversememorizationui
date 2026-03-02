import type { DailyGoalGalleryContext, DailyGoalResumeMode } from "@/app/features/daily-goal/types";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { VerseStatus } from "@/generated/prisma";
import type { DailyGoalPillMeta, TrainingSubsetFilter } from "./types";

export function getDailyGoalPreferredTrainingSubset(
  context: DailyGoalGalleryContext | undefined
): TrainingSubsetFilter {
  if (!context) return "catalog";
  if (context.effectiveResumeMode === "learning") return "learning";
  if (context.effectiveResumeMode === "review") return "review";
  return "catalog";
}

export function getDailyGoalModeFromDisplayStatus(
  status: DisplayVerseStatus | null | undefined
): DailyGoalResumeMode | null {
  if (!status) return null;
  if (status === "REVIEW" || status === "MASTERED") return "review";
  if (status === VerseStatus.LEARNING) return "learning";
  return null;
}

export function getDailyGoalPhasePillMeta(options: {
  mode: DailyGoalResumeMode;
  title: string;
  done: number;
  total: number;
  completed: boolean;
  isCurrentMode: boolean;
}): DailyGoalPillMeta {
  const { mode, title, done, total, completed, isCurrentMode } = options;
  const accent =
    mode === "learning"
      ? {
          active:
            "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
          chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
          icon: "text-emerald-500",
        }
      : {
          active: "border-violet-500/35 bg-violet-500/12 text-violet-700 dark:text-violet-300",
          chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20",
          icon: "text-violet-500",
        };
  const className = completed
    ? "border-border/60 bg-background/65 text-muted-foreground"
    : isCurrentMode
      ? accent.active
      : "border-border/60 bg-background/60 text-muted-foreground";
  return {
    mode,
    title,
    progress: `${done}/${total}`,
    planCount: total,
    className,
    completed,
    isCurrentMode,
    chipClassName: accent.chip,
    iconClassName: completed
      ? "text-emerald-500"
      : isCurrentMode
        ? accent.icon
        : "text-muted-foreground/70",
  };
}
