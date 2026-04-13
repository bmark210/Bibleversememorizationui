"use client";

import { cn } from "@/app/components/ui/utils";
import type { TextBoxVisibility } from "@/app/types/textBox";
import {
  DEFAULT_TEXT_BOX_VISIBILITY,
  TEXT_BOX_VISIBILITY_OPTIONS,
} from "./textBoxVisibilityMeta";

type TextBoxVisibilitySelectorProps = {
  value?: TextBoxVisibility | null;
  disabled?: boolean;
  className?: string;
  onChange: (visibility: TextBoxVisibility) => void;
};

export function TextBoxVisibilitySelector({
  value,
  disabled = false,
  className,
  onChange,
}: TextBoxVisibilitySelectorProps) {
  const currentValue = value ?? DEFAULT_TEXT_BOX_VISIBILITY;

  return (
    <div className={cn("grid grid-cols-2 gap-2.5", className)}>
      {TEXT_BOX_VISIBILITY_OPTIONS.map((option) => {
        const active = option.value === currentValue;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[1.35rem] border px-3.5 py-3 text-left transition-colors",
              active
                ? "border-brand-primary/28 bg-brand-primary/10 text-text-primary shadow-[var(--shadow-soft)]"
                : "border-border-default/55 bg-bg-elevated text-text-primary hover:bg-bg-surface",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <div className="text-sm font-semibold tracking-tight">
              {option.shortLabel}
            </div>
            <p
              className={cn(
                "mt-1.5 text-xs leading-relaxed",
                active ? "text-text-secondary" : "text-text-muted",
              )}
            >
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
