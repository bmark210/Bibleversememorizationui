"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import type { TextBoxVisibility } from "@/app/types/textBox";
import { TextBoxVisibilitySelector } from "./TextBoxVisibilitySelector";
import {
  getTextBoxVisibilityDescription,
  getTextBoxVisibilityLabel,
} from "./textBoxVisibilityMeta";

type TextBoxVisibilityDisclosureProps = {
  open: boolean;
  value?: TextBoxVisibility | null;
  disabled?: boolean;
  onToggle: () => void;
  onChange: (visibility: TextBoxVisibility) => void;
};

export function TextBoxVisibilityDisclosure({
  open,
  value,
  disabled = false,
  onToggle,
  onChange,
}: TextBoxVisibilityDisclosureProps) {
  return (
    <div className="rounded-[1.5rem] border border-border-default/55 bg-bg-elevated px-4 py-3 shadow-[var(--shadow-soft)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight text-text-primary">
            Доп. настройки
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Видимость коробки: {getTextBoxVisibilityLabel(value)}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border-subtle/70 pt-3">
            <div className="text-sm font-medium text-text-primary">
              Видимость коробки
            </div>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {getTextBoxVisibilityDescription(value)}
            </p>
            <TextBoxVisibilitySelector
              value={value}
              disabled={disabled}
              className="mt-3"
              onChange={onChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
