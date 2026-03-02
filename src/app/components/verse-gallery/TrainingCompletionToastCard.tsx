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
  status: "REVIEW" | "MASTERED";
  title: string;
  description: string;
  outcome: "success" | "neutral";
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
  options?: ToastOptions
) {
  const method =
    payload.tone === "negative" ? toast.error : payload.tone === "positive" ? toast.success : toast.info;
  method(payload.message, {
    description: payload.hint ?? payload.reference,
    duration: options?.durationMs ?? 3200,
    toasterId: options?.toasterId,
    id: `training-contact-${payload.id}`,
  });
}

export function showTrainingMilestoneToast(
  payload: TrainingCompletionToastCardPayload,
  options?: ToastOptions
) {
  toast.success(payload.title, {
    description: payload.description,
    duration: options?.durationMs ?? 10000,
    toasterId: options?.toasterId,
    id: `training-milestone-${payload.id}`,
  });
}
