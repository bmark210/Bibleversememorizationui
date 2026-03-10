"use client";

import type { ReactNode } from "react";
import { cn } from "@/app/components/ui/utils";

export function QuestionBadge({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium",
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
        "rounded-[1.7rem] border border-border/60 bg-background/82",
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
    return "border-border/60 bg-background/88 text-foreground/86 hover:bg-muted/35";
  }
  if (params.optionIsCorrect) {
    return "border-emerald-500/24 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-300";
  }
  if (params.optionIsSelected) {
    return "border-rose-500/24 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300";
  }
  return "border-border/55 bg-muted/25 text-foreground/62";
}
