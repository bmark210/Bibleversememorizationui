"use client";

import { cn } from "@/app/components/ui/utils";
import type { TrainingFontSizes } from "@/app/components/training-session/modes/useTrainingFontSize";
import type { TapQuestion } from "../anchorTrainingTypes";

type AnchorTapModeProps = {
  fontSizes: TrainingFontSizes;
  question: TapQuestion;
  tapSequence: string[];
  selectedTapLabels: string[];
  isAnswered: boolean;
  controlsLocked: boolean;
  onTapSelect: (optionId: string) => void;
};

export function AnchorTapMode({
  fontSizes,
  question,
  tapSequence,
  selectedTapLabels,
  isAnswered,
  controlsLocked,
  onTapSelect,
}: AnchorTapModeProps) {
  const total = question.expectedNormalized.length;
  const current = Math.min(tapSequence.length, total);
  const progress = total > 0 ? (current / total) * 100 : 0;
  const optionPx = Math.max(12, Math.round(fontSizes.sm * 0.93));

  return (
    <div className="space-y-3">
      {/* Progress + assembled text */}
      <div className="rounded-2xl border border-border/40 bg-card/50 px-4 py-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-2.5">
          <div className="flex-1 h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
            <div
              className="h-full bg-primary/50 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground/60 shrink-0">
            {current}/{total}
          </span>
        </div>
        <p className="leading-relaxed min-h-[1.75rem]">
          {selectedTapLabels.length > 0 ? (
            <span
              className="text-foreground/85"
              style={{ fontSize: `${fontSizes.sm}px` }}
            >
              {selectedTapLabels.join(" ")}
              <span className="inline-block w-[2px] h-[1.1em] bg-primary/50 align-text-bottom ml-0.5 animate-pulse" />
            </span>
          ) : (
            <span className="text-sm text-muted-foreground/45 italic">
              Нажимайте слова по порядку
            </span>
          )}
        </p>
      </div>

      {/* Word grid */}
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => {
          const isUsed = tapSequence.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              disabled={isAnswered || isUsed || controlsLocked}
              onClick={() => onTapSelect(option.id)}
              className={cn(
                "min-h-[2.75rem] rounded-xl border px-3.5 py-2 font-medium transition-all duration-150 active:scale-[0.97]",
                isUsed
                  ? "border-primary/20 bg-primary/[0.06] text-primary/40 opacity-60"
                  : "border-border/40 bg-card/60 text-foreground/80 shadow-sm hover:bg-card/80 hover:border-border/60 active:bg-card/90",
              )}
              style={{ fontSize: `${optionPx}px` }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
