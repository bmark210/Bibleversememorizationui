"use client";

import { Check, Eye, RotateCcw } from "lucide-react";
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import { cn } from "@/app/components/ui/utils";
import type { TrainingResultState } from "./trainingResultState";

type TrainingResultScreenProps = {
  result: TrainingResultState;
};

const RESULT_ICON_BY_KIND = {
  "exercise-success": Check,
  "exercise-revealed": Eye,
  "exercise-failure": RotateCcw,
} as const;

function resolveToneClasses(result: TrainingResultState) {
  if (result.tone === "positive") {
    return {
      iconWrap: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      status: "text-emerald-700 dark:text-emerald-300",
      chip:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      box: "border-emerald-500/25 bg-emerald-500/10",
    };
  }

  if (result.tone === "negative") {
    return {
      iconWrap: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
      status: "text-rose-700 dark:text-rose-300",
      chip:
        "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      box: "border-rose-500/25 bg-rose-500/10",
    };
  }

  return {
    iconWrap: "bg-muted/40 text-foreground/75",
    status: "text-foreground/75",
    chip: "border-border/50 bg-background/60 text-foreground/70",
    box: "border-border/50 bg-card/60",
  };
}

export function TrainingResultScreen({ result }: TrainingResultScreenProps) {
  const ResultIcon = RESULT_ICON_BY_KIND[result.kind] ?? Check;
  const toneClasses = resolveToneClasses(result);

  return (
    <ScrollShadowContainer
      className="flex-1 min-h-0 px-4"
      scrollClassName="flex justify-center"
      shadowSize={24}
    >
      <div className="mx-auto my-auto w-full max-w-xl space-y-5 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              toneClasses.iconWrap
            )}
          >
            <ResultIcon className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className={cn("text-base font-semibold", toneClasses.status)}>
              {result.statusLabel}
            </p>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground/90">
              {result.title}
            </h3>
          </div>
          <p className="max-w-lg text-sm leading-relaxed text-foreground/70">
            {result.description}
          </p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 px-5 py-4 shadow-sm backdrop-blur-sm">
          <p className="text-center font-serif text-2xl italic leading-relaxed text-primary/90 sm:text-3xl">
            {result.reference}
          </p>
        </div>

        {result.verseText ? (
          <div
            className={cn(
              "rounded-2xl border px-5 py-4 shadow-sm",
              toneClasses.box
            )}
          >
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
              Правильный текст
            </p>
            <p className="mt-3 whitespace-pre-line text-center text-sm leading-relaxed text-foreground/85 sm:text-base">
              {result.verseText}
            </p>
          </div>
        ) : null}

        {result.matchPercent !== null ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]",
                toneClasses.chip
              )}
            >
              {result.matchPercent}%
            </span>
          </div>
        ) : null}
      </div>
    </ScrollShadowContainer>
  );
}
