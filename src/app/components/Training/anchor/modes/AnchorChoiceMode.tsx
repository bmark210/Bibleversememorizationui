"use client";

import { cn } from "@/app/components/ui/utils";
import type { TrainingFontSizes } from "@/app/components/training-session/modes/useTrainingFontSize";
import type { ChoiceQuestion } from "../anchorTrainingTypes";
import { getChoiceStateClass } from "../AnchorTrainingCardUi";

type AnchorChoiceModeProps = {
  fontSizes: TrainingFontSizes;
  question: ChoiceQuestion;
  selectedOption: string | null;
  isAnswered: boolean;
  controlsLocked: boolean;
  onChoiceSelect: (value: string) => void;
};

export function AnchorChoiceMode({
  fontSizes,
  question,
  selectedOption,
  isAnswered,
  controlsLocked,
  onChoiceSelect,
}: AnchorChoiceModeProps) {
  const badgePx = Math.max(9, fontSizes.mask - 1);

  return (
    <div className="grid grid-cols-1 gap-2">
      {question.options.map((option, index) => {
        const optionIsSelected = selectedOption === option;
        const optionIsCorrect = question.isCorrectOption(option);
        const stateClassName = getChoiceStateClass({
          isAnswered,
          optionIsCorrect,
          optionIsSelected,
        });

        const letter = String.fromCharCode(65 + index);

        return (
          <button
            key={`${question.id}-${option}`}
            type="button"
            disabled={isAnswered || controlsLocked}
            onClick={() => onChoiceSelect(option)}
            className={cn(
              "group flex w-full items-center gap-3 min-h-[3rem] rounded-xl border px-4 py-3 text-left font-medium leading-snug transition-all duration-150 active:scale-[0.98]",
              stateClassName,
            )}
            style={{ fontSize: `${fontSizes.sm}px` }}
          >
            <span
              className={cn(
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-semibold tabular-nums transition-colors",
                isAnswered && optionIsCorrect
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : isAnswered && optionIsSelected
                    ? "bg-rose-500/15 text-rose-500 dark:text-rose-400"
                    : "bg-foreground/[0.06] text-foreground/45 group-hover:bg-foreground/[0.1]",
              )}
              style={{ fontSize: `${badgePx}px` }}
            >
              {letter}
            </span>
            <span className="min-w-0">{option}</span>
          </button>
        );
      })}
    </div>
  );
}
