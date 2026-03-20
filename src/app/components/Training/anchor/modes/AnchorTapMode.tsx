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
      <SurfacePanel className="border-border/55 bg-card/30 px-4 py-3.5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-foreground/75">Собрано</span>
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

      <div className="grid grid-cols-2 gap-2">
        {question.options.map((option) => {
          const isUsed = tapSequence.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              disabled={isAnswered || isUsed || controlsLocked}
              onClick={() => onTapSelect(option.id)}
              className={cn(
                "min-h-[3rem] rounded-2xl border px-3.5 py-2.5 text-left text-sm font-medium shadow-sm transition-[transform,colors] active:scale-[0.99]",
                isUsed
                  ? "border-primary/30 bg-primary/[0.1] text-foreground/90"
                  : "border-border/55 bg-card/40 text-foreground/85 hover:bg-muted/40"
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
