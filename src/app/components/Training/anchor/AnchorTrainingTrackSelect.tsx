"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/components/ui/utils";
import type { AnchorTrainingTrack } from "../types";

const TRACK_OPTIONS: AnchorTrainingTrack[] = [
  "incipit",
  "context",
  "reference",
  "mixed",
];

const TRACK_LABELS: Record<AnchorTrainingTrack, string> = {
  incipit: "Начала",
  context: "Контекст",
  reference: "Ссылка",
  mixed: "Смешанный",
};

const TRACK_THEME: Record<
  AnchorTrainingTrack,
  {
    dotClassName: string;
    triggerClassName: string;
    contentClassName: string;
    itemClassName: string;
  }
> = {
  incipit: {
    dotClassName: "bg-rose-500",
    triggerClassName:
      "border-rose-500/18 bg-gradient-to-r from-rose-500/[0.08] via-background/94 to-background text-foreground shadow-[0_12px_28px_-24px_rgba(244,63,94,0.65)]",
    contentClassName: "border-border/60 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-rose-500/[0.08] focus:text-rose-700 dark:focus:text-rose-300 data-[state=checked]:bg-rose-500/[0.10] data-[state=checked]:text-rose-700 dark:data-[state=checked]:text-rose-300",
  },
  context: {
    dotClassName: "bg-teal-500",
    triggerClassName:
      "border-teal-500/18 bg-gradient-to-r from-teal-500/[0.08] via-background/94 to-background text-foreground shadow-[0_12px_28px_-24px_rgba(20,184,166,0.65)]",
    contentClassName: "border-border/60 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-teal-500/[0.08] focus:text-teal-700 dark:focus:text-teal-300 data-[state=checked]:bg-teal-500/[0.10] data-[state=checked]:text-teal-700 dark:data-[state=checked]:text-teal-300",
  },
  reference: {
    dotClassName: "bg-sky-500",
    triggerClassName:
      "border-sky-500/18 bg-gradient-to-r from-sky-500/[0.08] via-background/94 to-background text-foreground shadow-[0_12px_28px_-24px_rgba(14,165,233,0.65)]",
    contentClassName: "border-border/60 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-sky-500/[0.08] focus:text-sky-700 dark:focus:text-sky-300 data-[state=checked]:bg-sky-500/[0.10] data-[state=checked]:text-sky-700 dark:data-[state=checked]:text-sky-300",
  },
  mixed: {
    dotClassName: "bg-primary",
    triggerClassName:
      "border-primary/18 bg-gradient-to-r from-primary/[0.08] via-background/94 to-background text-foreground shadow-[0_12px_28px_-24px_rgba(0,0,0,0.34)]",
    contentClassName: "border-border/60 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-primary/[0.08] focus:text-primary data-[state=checked]:bg-primary/[0.10] data-[state=checked]:text-primary",
  },
};

type AnchorTrainingTrackSelectProps = {
  value: AnchorTrainingTrack;
  onValueChange: (value: AnchorTrainingTrack) => void;
  className?: string;
  disabled?: boolean;
};

export function AnchorTrainingTrackSelect({
  value,
  onValueChange,
  className,
  disabled = false,
}: AnchorTrainingTrackSelectProps) {
  const activeTheme = TRACK_THEME[value];

  return (
    <div className={cn("w-full", className)}>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) => onValueChange(next as AnchorTrainingTrack)}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            "w-full rounded-2xl backdrop-blur-lg transition-colors text-foreground/90",
            activeTheme.triggerClassName
          )}
          aria-label="Режим закрепления"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={activeTheme.contentClassName}>
          {TRACK_OPTIONS.map((option) => (
            <SelectItem
              key={option}
              value={option}
              className={cn(TRACK_THEME[option].itemClassName)}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    TRACK_THEME[option].dotClassName
                  )}
                />
                {TRACK_LABELS[option]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
