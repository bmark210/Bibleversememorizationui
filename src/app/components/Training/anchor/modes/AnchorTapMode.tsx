"use client";

import { cn } from "@/app/components/ui/utils";
import { SurfacePanel } from "../AnchorTrainingCardUi";
import type { TapQuestion } from "../anchorTrainingTypes";

type AnchorTapModeProps = {
  question: TapQuestion;
  tapSequence: string[];
  selectedTapLabels: string[];
  isAnswered: boolean;
  controlsLocked: boolean;
  onTapSelect: (optionId: string) => void;
};

export function AnchorTapMode({
  question,
  tapSequence,
  selectedTapLabels,
  isAnswered,
  controlsLocked,
  onTapSelect,
}: AnchorTapModeProps) {
  return (
    <div className="space-y-3">
      <SurfacePanel className="px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-foreground/72">Собрано</span>
          <span className="text-xs font-semibold tabular-nums text-foreground/82">
            {Math.min(tapSequence.length, question.expectedNormalized.length)}/
            {question.expectedNormalized.length}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/82">
          {selectedTapLabels.length > 0
            ? selectedTapLabels.join(" ")
            : "Нажимайте слова по порядку"}
        </p>
      </SurfacePanel>

      <div className="grid grid-cols-2 gap-2.5">
        {question.options.map((option) => {
          const isUsed = tapSequence.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              disabled={isAnswered || isUsed || controlsLocked}
              onClick={() => onTapSelect(option.id)}
              className={cn(
                "rounded-[1.45rem] border px-3.5 py-3 text-left text-sm transition-colors",
                isUsed
                  ? "border-primary/25 bg-primary/[0.08] text-foreground/84"
                  : "border-border/60 bg-background/88 text-foreground/86 hover:bg-muted/35"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
