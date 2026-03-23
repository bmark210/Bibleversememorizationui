"use client";

import { Check, Clock3, Eye, RotateCcw, Trophy, TrendingUp } from "lucide-react";
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import { cn } from "@/app/components/ui/utils";
import {
  formatTrainingResultAvailability,
  type TrainingResultState,
} from "./trainingResultState";

type TrainingResultScreenProps = {
  result: TrainingResultState;
};

function formatXpDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} XP`;
}

const RESULT_ICON_BY_KIND = {
  "exercise-success": Check,
  "exercise-revealed": Eye,
  "exercise-failure": RotateCcw,
  "mode-advanced": TrendingUp,
  "mode-regressed": RotateCcw,
  "mastered": Trophy,
  "review-waiting": Clock3,
} as const;

function resolveToneClasses(result: TrainingResultState) {
  if (result.tone === "positive") {
    return {
      iconWrap: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      status: "text-emerald-700 dark:text-emerald-300",
      chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      box: "border-emerald-500/25 bg-emerald-500/10",
    };
  }

  if (result.tone === "negative") {
    return {
      iconWrap: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
      status: "text-rose-700 dark:text-rose-300",
      chip: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
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
  const ResultIcon = RESULT_ICON_BY_KIND[result.kind] ?? Clock3;
  const toneClasses = resolveToneClasses(result);
  const availabilityText = formatTrainingResultAvailability(result.nextReviewAt);

  return (
    <ScrollShadowContainer
      className="flex-1 min-h-0 px-4"
      scrollClassName="flex justify-center"
      shadowSize={24}
    >
      <div className="w-full max-w-xl mx-auto my-auto py-6 space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center",
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
          <p className="text-center font-serif italic leading-relaxed text-primary/90 text-2xl sm:text-3xl">
            {result.reference}
          </p>
        </div>

        {result.verseText ? (
          <div className={cn("rounded-2xl border px-5 py-4 shadow-sm", toneClasses.box)}>
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
              Правильный текст
            </p>
            <p className="mt-3 whitespace-pre-line text-center text-sm leading-relaxed text-foreground/85 sm:text-base">
              {result.verseText}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {result.targetModeLabel ? (
            <span className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]", toneClasses.chip)}>
              {result.targetModeLabel}
            </span>
          ) : null}

          {availabilityText ? (
            <span className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]", toneClasses.chip)}>
              {availabilityText}
            </span>
          ) : null}

          {result.matchPercent !== null ? (
            <span className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]", toneClasses.chip)}>
              {result.matchPercent}%
            </span>
          ) : null}

          {result.progressPopup?.stageLabel ? (
            <span className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]", toneClasses.chip)}>
              {result.progressPopup.stageLabel}
            </span>
          ) : null}

          {result.progressPopup && result.progressPopup.xpDelta !== 0 ? (
            <span className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]", toneClasses.chip)}>
              {formatXpDelta(result.progressPopup.xpDelta)}
            </span>
          ) : null}
        </div>
      </div>
    </ScrollShadowContainer>
  );
}
