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
import {
  SESSION_TRACK_LABELS,
  TRACK_OPTIONS,
  TRACK_THEME,
} from "./anchorTrainingTrackMeta";

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
                {SESSION_TRACK_LABELS[option]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
