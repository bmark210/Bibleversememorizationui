"use client";

import type { ReactNode } from "react";
import {
  Check,
  Clock3,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { APP_TOASTER_ID, toast } from "./toast";

export type SemanticToastTone = "success" | "warning" | "error" | "info";
export type VerseActionToastKind =
  | "add-to-my"
  | "start-learning"
  | "resume"
  | "pause"
  | "delete";
export type TrainingToneToastKind =
  | "advanced"
  | "regressed"
  | "waiting"
  | "mastered"
  | "positive"
  | "negative"
  | "neutral";

export type SemanticToastPayload = {
  title: string;
  tone: SemanticToastTone;
  icon: LucideIcon;
  reference?: string | null;
  meta?: ReactNode;
  toasterId?: string;
  duration?: number;
  id?: string | number;
};

function renderReference(reference?: string | null): ReactNode | undefined {
  const normalized = String(reference ?? "").trim();
  if (!normalized) return undefined;

  return (
    <span className="font-serif text-[0.98rem] italic tracking-[0.01em]">
      {normalized}
    </span>
  );
}

function renderIcon(Icon: LucideIcon) {
  return <Icon className="h-[18px] w-[18px]" strokeWidth={2.35} />;
}

export function formatToastXpDelta(xpDelta: number): string | null {
  if (!Number.isFinite(xpDelta)) return null;
  const rounded = Math.round(xpDelta);
  if (rounded === 0) return null;
  return `${rounded > 0 ? "+" : ""}${rounded} XP`;
}

export function joinToastMeta(
  parts: Array<string | null | undefined>
): string | null {
  const normalized = parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized.join(" · ") : null;
}

export function showSemanticToast(payload: SemanticToastPayload) {
  return toast[payload.tone](payload.title, {
    id: payload.id,
    toasterId: payload.toasterId ?? APP_TOASTER_ID,
    duration: payload.duration,
    icon: renderIcon(payload.icon),
    description: renderReference(payload.reference),
    meta: payload.meta ?? undefined,
    richColors: true,
  });
}

export function resolveVerseActionToastKind(
  previousStatusInput: string,
  nextStatus: VerseStatus
): VerseActionToastKind | null {
  const previousStatus = normalizeDisplayVerseStatus(previousStatusInput);

  if (previousStatus === "CATALOG" && nextStatus === VerseStatus.MY) {
    return "add-to-my";
  }

  if (previousStatus === VerseStatus.MY && nextStatus === VerseStatus.LEARNING) {
    return "start-learning";
  }

  if (
    previousStatus === VerseStatus.STOPPED &&
    nextStatus === VerseStatus.LEARNING
  ) {
    return "resume";
  }

  if (
    (previousStatus === VerseStatus.LEARNING ||
      previousStatus === "REVIEW" ||
      previousStatus === "MASTERED") &&
    nextStatus === VerseStatus.STOPPED
  ) {
    return "pause";
  }

  return null;
}

export function showVerseActionToast(params: {
  kind: VerseActionToastKind;
  reference?: string | null;
  meta?: string | null;
  toasterId?: string;
  duration?: number;
  id?: string | number;
}) {
  switch (params.kind) {
    case "add-to-my":
      return showSemanticToast({
        id: params.id,
        toasterId: params.toasterId,
        duration: params.duration,
        tone: "info",
        icon: Plus,
        title: "Добавлено в мои стихи",
        reference: params.reference,
        meta: params.meta,
      });
    case "start-learning":
      return showSemanticToast({
        id: params.id,
        toasterId: params.toasterId,
        duration: params.duration,
        tone: "success",
        icon: TrendingUp,
        title: "Добавлено в изучение",
        reference: params.reference,
        meta: params.meta,
      });
    case "resume":
      return showSemanticToast({
        id: params.id,
        toasterId: params.toasterId,
        duration: params.duration,
        tone: "success",
        icon: Play,
        title: "Изучение возобновлено",
        reference: params.reference,
        meta: params.meta,
      });
    case "pause":
      return showSemanticToast({
        id: params.id,
        toasterId: params.toasterId,
        duration: params.duration,
        tone: "warning",
        icon: Pause,
        title: "Стих на паузе",
        reference: params.reference,
        meta: params.meta,
      });
    case "delete":
      return showSemanticToast({
        id: params.id,
        toasterId: params.toasterId,
        duration: params.duration,
        tone: "error",
        icon: Trash2,
        title: "Стих удалён",
        reference: params.reference,
        meta: params.meta,
      });
    default: {
      const exhaustiveKind: never = params.kind;
      return exhaustiveKind;
    }
  }
}

export function showTrainingToneToast(params: {
  title: string;
  reference: string;
  tone: SemanticToastTone;
  meta?: ReactNode;
  kind: TrainingToneToastKind;
  toasterId?: string;
  duration?: number;
  id?: string | number;
}) {
  const iconByKind: Record<TrainingToneToastKind, LucideIcon> = {
    advanced: TrendingUp,
    regressed: RotateCcw,
    waiting: Clock3,
    mastered: Trophy,
    positive: TrendingUp,
    negative: TrendingDown,
    neutral: Check,
  };

  return showSemanticToast({
    id: params.id,
    toasterId: params.toasterId,
    duration: params.duration,
    tone: params.tone,
    icon: iconByKind[params.kind],
    title: params.title,
    reference: params.reference,
    meta: params.meta,
  });
}
