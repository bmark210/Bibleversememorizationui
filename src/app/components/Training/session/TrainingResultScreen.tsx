"use client";

import { Check, Eye, RotateCcw } from "lucide-react";
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import { cn } from "@/app/components/ui/utils";
import type { TrainingResultState } from "./trainingResultState";
import {
  TRAINING_SECTION_SPACING_LG,
  TRAINING_SECTION_SPACING_SM,
  TRAINING_STACK_GAP_MD,
  TRAINING_STACK_GAP_SM,
} from "@/app/components/training-session/trainingActionTokens";

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
      iconWrap: "bg-status-learning-soft text-status-learning",
      status: "text-status-learning",
      chip: "border-status-learning/25 bg-status-learning-soft text-status-learning",
      box: "border-status-learning/25 bg-status-learning-soft",
    };
  }

  if (result.tone === "negative") {
    return {
      iconWrap: "bg-status-paused-soft text-status-paused",
      status: "text-status-paused",
      chip: "border-status-paused/25 bg-status-paused-soft text-status-paused",
      box: "border-status-paused/25 bg-status-paused-soft",
    };
  }

  return {
    iconWrap: "bg-bg-subtle text-text-secondary",
    status: "text-text-secondary",
    chip: "border-border-subtle bg-bg-subtle text-text-secondary",
    box: "border-border-subtle bg-bg-subtle",
  };
}

export function TrainingResultScreen({ result }: TrainingResultScreenProps) {
  const ResultIcon = RESULT_ICON_BY_KIND[result.kind] ?? Check;
  const toneClasses = resolveToneClasses(result);

  return (
    <ScrollShadowContainer
      className="flex-1 min-h-0 px-4"
      scrollClassName="flex justify-center"
      showShadows={false}
      shadowSize={24}
    >
      <div className={`mx-auto my-auto w-full max-w-xl py-8 ${TRAINING_SECTION_SPACING_LG}`}>
        <div className={`flex flex-col items-center text-center ${TRAINING_STACK_GAP_MD}`}>
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              toneClasses.iconWrap
            )}
          >
            <ResultIcon className="h-8 w-8" />
          </div>
          <div className={TRAINING_SECTION_SPACING_SM}>
            <p className={cn("text-base sm:text-lg font-semibold", toneClasses.status)}>
              {result.statusLabel}
            </p>
            <h3 className="[font-family:var(--font-heading)] text-2xl font-semibold tracking-tight text-text-primary">
              {result.title}
            </h3>
          </div>
          <p className="max-w-lg text-base leading-relaxed text-text-secondary">
            {result.description}
          </p>
        </div>

        <div className="rounded-[1.6rem] border border-border-subtle bg-bg-elevated px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur-sm">
          <p className="text-center [font-family:var(--font-heading)] text-2xl italic leading-relaxed text-brand-primary sm:text-3xl">
            {result.reference}
          </p>
        </div>

        {result.verseText ? (
          <div
            className={cn(
              "rounded-[1.55rem] border px-5 py-4 shadow-[var(--shadow-soft)]",
              toneClasses.box
            )}
          >
            <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
              Правильный текст
            </p>
            <p className="mt-3 whitespace-pre-line text-center text-base leading-relaxed text-text-primary">
              {result.verseText}
            </p>
          </div>
        ) : null}

        {result.matchPercent !== null ? (
          <div className={`flex flex-wrap items-center justify-center ${TRAINING_STACK_GAP_SM}`}>
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
