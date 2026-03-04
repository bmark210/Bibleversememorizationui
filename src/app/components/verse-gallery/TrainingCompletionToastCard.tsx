"use client";

import { toast } from "@/app/lib/toast";

export type TrainingContactToastPayload = {
  id: number;
  reference: string;
  tone: "positive" | "negative" | "neutral";
  message: string;
  hint?: string;
};

export type TrainingCompletionToastCardPayload = {
  id: number;
  reference: string;
  status: "LEARNING" | "REVIEW" | "MASTERED";
  milestoneKind:
    | "learning_start"
    | "learning_to_review"
    | "review_progress"
    | "review_to_mastered";
  nextReviewHint: string | null;
  beforeProgressPercent: number;
  afterProgressPercent: number;
  masteryLevel: number;
  repetitions: number;
};

type ToastOptions = {
  durationMs?: number;
  toasterId?: string;
};

export function showTrainingContactToast(
  payload: TrainingContactToastPayload,
  options?: ToastOptions,
) {
  const method =
    payload.tone === "negative"
      ? toast.error
      : payload.tone === "positive"
        ? toast.success
        : toast.info;
  method(payload.message, {
    description: payload.hint ?? payload.reference,
    duration: options?.durationMs ?? 3200,
    toasterId: options?.toasterId,
    id: `training-contact-${payload.id}`,
  });
}

export function showTrainingMilestoneToast(
  payload: TrainingCompletionToastCardPayload,
  options?: ToastOptions,
) {
  const title =
    payload.milestoneKind === "review_to_mastered"
      ? "Стих выучен полностью"
      : payload.milestoneKind === "learning_to_review"
        ? "Переход к повторению"
        : payload.milestoneKind === "review_progress"
          ? "Повтор засчитан"
          : "Этап изучения";
  const description =
    payload.milestoneKind === "review_to_mastered"
      ? "Этап повторения завершён."
      : payload.nextReviewHint
        ? payload.nextReviewHint
        : payload.reference;

  toast.success(title, {
    description,
    duration: options?.durationMs ?? 10000,
    toasterId: options?.toasterId,
    id: `training-milestone-${payload.id}`,
  });
}
