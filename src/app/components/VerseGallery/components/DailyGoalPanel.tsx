import { CheckCircle2, Clock3 } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import type { DailyGoalGalleryContext, DailyGoalResumeMode } from "@/app/features/daily-goal/types";
import type { PanelMode, DailyGoalPillMeta } from "../types";

type Props = {
  dailyGoalContext: DailyGoalGalleryContext;
  learningPill: DailyGoalPillMeta | null;
  reviewPill: DailyGoalPillMeta | null;
  panelMode: PanelMode;
  currentExecutionMode: DailyGoalResumeMode | null;
  onPillClick: (mode: DailyGoalResumeMode) => void;
};

export function DailyGoalPanel({
  dailyGoalContext,
  learningPill,
  reviewPill,
  panelMode,
  currentExecutionMode,
  onPillClick,
}: Props) {
  return (
    <div className="shrink-0 px-4 sm:px-6 pt-3 z-30">
      <div className="flex flex-col gap-2.5">
        {dailyGoalContext.learningStageBlocked ? (
          <div className="mt-1 text-xs sm:text-sm text-amber-700 dark:text-amber-300">
            Чтобы начать цель, добавьте стих или переведите стих в режим изучения (LEARNING).
          </div>
        ) : null}

        <div className="flex flex-row md:flex-col gap-2 h-full">
          {learningPill ? (
            <PillButton
              pill={learningPill}
              isPressed={panelMode === "training" && currentExecutionMode === "learning"}
              onClick={() => onPillClick("learning")}
            />
          ) : null}
          {reviewPill ? (
            <PillButton
              pill={reviewPill}
              isPressed={panelMode === "training" && currentExecutionMode === "review"}
              onClick={() => onPillClick("review")}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PillButton({
  pill,
  isPressed,
  onClick,
}: {
  pill: DailyGoalPillMeta;
  isPressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isPressed}
      className={cn(
        "flex-1 rounded-xl border px-3 py-2.5 backdrop-blur-sm text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "hover:bg-background/70",
        pill.className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {pill.completed ? (
            <CheckCircle2 className={cn("h-4 w-4 shrink-0", pill.iconClassName)} />
          ) : (
            <Clock3 className={cn("h-4 w-4 shrink-0", pill.iconClassName)} />
          )}
          <span className="font-medium truncate text-sm">{pill.title}</span>
        </div>
        <span className="text-xs tabular-nums font-semibold shrink-0">{pill.progress}</span>
      </div>
    </button>
  );
}
