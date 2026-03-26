"use client";

import type { ReactNode } from "react";
import { cn } from "@/app/components/ui/utils";

export function QuestionBadge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SurfacePanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function getChoiceStateClass(params: {
  isAnswered: boolean;
  optionIsCorrect: boolean;
  optionIsSelected: boolean;
}) {
  if (!params.isAnswered) {
    return "border-border/50 bg-card/60 text-foreground/88 hover:bg-card/80 active:bg-card/90";
    }
    if (params.optionIsCorrect) {
      return "border-status-learning/25 bg-status-learning-soft text-status-learning ring-1 ring-status-learning/20";
    }
    if (params.optionIsSelected) {
      return "border-status-paused/25 bg-status-paused-soft text-status-paused ring-1 ring-status-paused/20";
    }
    return "border-border-subtle bg-bg-subtle text-text-muted";
}
