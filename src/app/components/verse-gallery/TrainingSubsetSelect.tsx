"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../ui/utils";

export type TrainingSubsetSelectValue = "learning" | "review" | "catalog";

const TRAINING_SUBSET_OPTIONS: Array<{ key: TrainingSubsetSelectValue; label: string }> = [
  { key: "catalog", label: "Смешанный" },
  { key: "learning", label: "Изучение" },
  { key: "review", label: "Повторение" },
];

const TRAINING_SUBSET_THEME: Record<
  TrainingSubsetSelectValue,
  {
    dotClassName: string;
    triggerClassName: string;
    contentClassName: string;
    itemClassName: string;
  }
> = {
  catalog: {
    dotClassName: "bg-text-muted",
    triggerClassName:
      "border-border-subtle bg-bg-elevated text-text-primary shadow-[var(--shadow-soft)]",
    contentClassName: "border-border-subtle bg-bg-elevated backdrop-blur-2xl",
    itemClassName:
      "data-[state=checked]:bg-bg-subtle data-[state=checked]:text-text-primary focus:bg-bg-subtle",
  },
  learning: {
    dotClassName: "bg-status-learning",
    triggerClassName:
      "border-status-learning/25 bg-status-learning-soft text-status-learning shadow-[var(--shadow-soft)]",
    contentClassName: "border-status-learning/25 bg-bg-elevated backdrop-blur-2xl",
    itemClassName:
      "focus:bg-status-learning-soft focus:text-status-learning data-[state=checked]:bg-status-learning-soft data-[state=checked]:text-status-learning",
  },
  review: {
    dotClassName: "bg-status-review",
    triggerClassName:
      "border-status-review/25 bg-status-review-soft text-status-review shadow-[var(--shadow-soft)]",
    contentClassName: "border-status-review/25 bg-bg-elevated backdrop-blur-2xl",
    itemClassName:
      "focus:bg-status-review-soft focus:text-status-review data-[state=checked]:bg-status-review-soft data-[state=checked]:text-status-review",
  },
};

type TrainingSubsetSelectProps = {
  value: TrainingSubsetSelectValue;
  onValueChange: (value: TrainingSubsetSelectValue) => void;
  className?: string;
  options?: TrainingSubsetSelectValue[];
  disabled?: boolean;
};

export function TrainingSubsetSelect({
  value,
  onValueChange,
  className,
  options = TRAINING_SUBSET_OPTIONS.map((option) => option.key),
  disabled = false,
}: TrainingSubsetSelectProps) {
  const activeTheme = TRAINING_SUBSET_THEME[value];
  const visibleOptions = TRAINING_SUBSET_OPTIONS.filter((option) =>
    options.includes(option.key)
  );

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center max-w-[140px] space-y-1",
        className
      )}
    >
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) => onValueChange(next as TrainingSubsetSelectValue)}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            "w-full rounded-xl backdrop-blur-lg transition-colors",
            activeTheme.triggerClassName
          )}
          aria-label="Фильтр тренировочных стихов"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={activeTheme.contentClassName}>
          {visibleOptions.map((option) => (
            <SelectItem
              key={option.key}
              value={option.key}
              className={cn(TRAINING_SUBSET_THEME[option.key].itemClassName)}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    TRAINING_SUBSET_THEME[option.key].dotClassName
                  )}
                />
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
