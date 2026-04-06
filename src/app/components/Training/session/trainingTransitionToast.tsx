"use client";

import type { ReactNode } from "react";
import {
  APP_TOASTER_ID,
} from "@/app/lib/toast";
import {
  showTrainingToneToast,
  type SemanticToastTone,
} from "@/app/lib/semanticToast";
import type { TrainingCommitToastPayload } from "./trainingResultState";

type ShowTrainingCommitToastOptions = {
  toasterId?: string;
  duration?: number;
};

function renderTrainingToastMeta(
  payload: TrainingCommitToastPayload,
): ReactNode | null {
  if (!payload.meta) {
    return null;
  }

  return (
    <div className="pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-75">
      {payload.meta}
    </div>
  );
}

export function showTrainingCommitToast(
  payload: TrainingCommitToastPayload,
  options?: ShowTrainingCommitToastOptions
) {
  const tone: SemanticToastTone =
    payload.kind === "mode-regressed" || payload.tone === "negative"
      ? "warning"
      : payload.kind === "review-waiting"
        ? "info"
        : "success";

  const kind =
    payload.kind === "mode-advanced"
      ? "advanced"
      : payload.kind === "mode-regressed"
        ? "regressed"
        : payload.kind === "review-waiting"
          ? "waiting"
          : payload.kind === "mastered"
            ? "mastered"
            : payload.tone === "negative"
              ? "negative"
              : payload.tone === "positive"
                ? "positive"
                : "neutral";

  return showTrainingToneToast({
    id: payload.id,
    toasterId: options?.toasterId ?? APP_TOASTER_ID,
    duration: options?.duration ?? 4200,
    tone,
    kind,
    title: payload.title,
    reference: payload.reference,
    meta: renderTrainingToastMeta(payload),
  });
}
