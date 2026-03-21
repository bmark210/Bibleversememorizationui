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
    return "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20";
  }
  if (params.optionIsSelected) {
    return "border-rose-500/30 bg-rose-500/[0.08] text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/20";
  }
  return "border-border/40 bg-muted/20 text-foreground/50";
}
