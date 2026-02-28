"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../ui/utils";

export type TrainingSubsetSelectValue = "learning" | "review" | "catalog";

const TRAINING_SUBSET_OPTIONS: Array<{ key: TrainingSubsetSelectValue; label: string }> = [
  { key: "catalog", label: "Каталог" },
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
    dotClassName: "bg-foreground/45",
    triggerClassName:
      "border-border/60 bg-background/80 text-foreground shadow-sm",
    contentClassName: "border-border/60 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "data-[state=checked]:bg-muted/60 data-[state=checked]:text-foreground focus:bg-muted/40",
  },
  learning: {
    dotClassName: "bg-emerald-400",
    triggerClassName:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-[0_6px_18px_-12px_rgba(16,185,129,0.55)]",
    contentClassName: "border-emerald-500/20 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-emerald-500/8 focus:text-emerald-700 dark:focus:text-emerald-300 data-[state=checked]:bg-emerald-500/10 data-[state=checked]:text-emerald-700 dark:data-[state=checked]:text-emerald-300",
  },
  review: {
    dotClassName: "bg-violet-400",
    triggerClassName:
      "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300 shadow-[0_6px_18px_-12px_rgba(139,92,246,0.55)]",
    contentClassName: "border-violet-500/20 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-violet-500/8 focus:text-violet-700 dark:focus:text-violet-300 data-[state=checked]:bg-violet-500/10 data-[state=checked]:text-violet-700 dark:data-[state=checked]:text-violet-300",
  },
};

type TrainingSubsetSelectProps = {
  value: TrainingSubsetSelectValue;
  onValueChange: (value: TrainingSubsetSelectValue) => void;
  className?: string;
};

export function TrainingSubsetSelect({
  value,
  onValueChange,
  className,
}: TrainingSubsetSelectProps) {
  const activeTheme = TRAINING_SUBSET_THEME[value];

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center max-w-[140px] space-y-1",
        className
      )}
    >
      <Select value={value} onValueChange={(next) => onValueChange(next as TrainingSubsetSelectValue)}>
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
          {TRAINING_SUBSET_OPTIONS.map((option) => (
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

