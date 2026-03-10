"use client";

import { cn } from "@/app/components/ui/utils";
import type { ChoiceQuestion } from "../anchorTrainingTypes";
import { getChoiceStateClass } from "../AnchorTrainingCardUi";

type AnchorChoiceModeProps = {
  question: ChoiceQuestion;
  selectedOption: string | null;
  isAnswered: boolean;
  controlsLocked: boolean;
  onChoiceSelect: (value: string) => void;
};

export function AnchorChoiceMode({
  question,
  selectedOption,
  isAnswered,
  controlsLocked,
  onChoiceSelect,
}: AnchorChoiceModeProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {question.options.map((option) => {
        const optionIsSelected = selectedOption === option;
        const optionIsCorrect = question.isCorrectOption(option);
        const stateClassName = getChoiceStateClass({
          isAnswered,
          optionIsCorrect,
          optionIsSelected,
        });

        return (
          <button
            key={`${question.id}-${option}`}
            type="button"
            disabled={isAnswered || controlsLocked}
            onClick={() => onChoiceSelect(option)}
            className={cn(
              "rounded-[1.45rem] border px-4 py-3.5 text-left text-sm leading-relaxed transition-colors",
              stateClassName
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
