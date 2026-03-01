import { CheckCircle2 } from "lucide-react";
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
      {dailyGoalContext.learningStageBlocked ? (
        <p className="mb-2 text-[11px] text-amber-600/80 dark:text-amber-400/70">
          Добавьте стих или переведите его в режим изучения, чтобы начать.
        </p>
      ) : null}

      <div className="flex gap-2">
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
        "group relative flex-1 min-w-0 rounded-2xl border px-3 py-2 text-left",
        "transition-all duration-150 backdrop-blur-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isPressed ? "scale-[0.97]" : "hover:scale-[1.02] active:scale-[0.97]",
        pill.className
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-xs font-medium truncate opacity-80">{pill.title}</span>
        {pill.completed && (
          <CheckCircle2 className={cn("h-3.5 w-3.5 shrink-0", pill.iconClassName)} />
        )}
      </div>
      <span className={cn("text-base font-bold tabular-nums leading-tight", pill.iconClassName)}>
        {pill.progress}
      </span>
      </button>
  );
}
