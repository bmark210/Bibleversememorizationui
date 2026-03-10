"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { cn } from "../../ui/utils";
import type { TrainingOrder } from "../types";
import { TRAINING_ORDER_LABELS } from "../types";

const ORDER_OPTIONS: TrainingOrder[] = ["updatedAt", "bible", "popularity"];

const ORDER_THEME: Record<
  TrainingOrder,
  {
    dotClassName: string;
    triggerClassName: string;
    contentClassName: string;
    itemClassName: string;
  }
> = {
  updatedAt: {
    dotClassName: "bg-amber-400",
    triggerClassName:
      "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300 shadow-[0_6px_18px_-12px_rgba(245,158,11,0.55)]",
    contentClassName: "border-amber-500/20 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-amber-500/8 focus:text-amber-800 dark:focus:text-amber-300 data-[state=checked]:bg-amber-500/10 data-[state=checked]:text-amber-800 dark:data-[state=checked]:text-amber-300",
  },
  bible: {
    dotClassName: "bg-sky-400",
    triggerClassName:
      "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300 shadow-[0_6px_18px_-12px_rgba(14,165,233,0.5)]",
    contentClassName: "border-sky-500/20 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-sky-500/8 focus:text-sky-700 dark:focus:text-sky-300 data-[state=checked]:bg-sky-500/10 data-[state=checked]:text-sky-700 dark:data-[state=checked]:text-sky-300",
  },
  popularity: {
    dotClassName: "bg-rose-400",
    triggerClassName:
      "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-[0_6px_18px_-12px_rgba(244,63,94,0.5)]",
    contentClassName: "border-rose-500/20 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-rose-500/8 focus:text-rose-700 dark:focus:text-rose-300 data-[state=checked]:bg-rose-500/10 data-[state=checked]:text-rose-700 dark:data-[state=checked]:text-rose-300",
  },
};

type TrainingOrderSelectProps = {
  value: TrainingOrder;
  onValueChange: (value: TrainingOrder) => void;
  className?: string;
  disabled?: boolean;
};

export function TrainingOrderSelect({
  value,
  onValueChange,
  className,
  disabled = false,
}: TrainingOrderSelectProps) {
  const activeTheme = ORDER_THEME[value];

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center max-w-[152px] space-y-1",
        className
      )}
    >
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) => onValueChange(next as TrainingOrder)}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            "w-full rounded-xl backdrop-blur-lg transition-colors",
            activeTheme.triggerClassName
          )}
          aria-label="Порядок карточек"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={activeTheme.contentClassName}>
          {ORDER_OPTIONS.map((option) => (
            <SelectItem
              key={option}
              value={option}
              className={cn(ORDER_THEME[option].itemClassName)}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    ORDER_THEME[option].dotClassName
                  )}
                />
                {TRAINING_ORDER_LABELS[option]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
