import { VerseStatus } from "@/shared/domain/verseStatus";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";

export const VerseFlowCode = {
  CATALOG: "CATALOG",
  MY: "MY",
  LEARNING: "LEARNING",
  REVIEW_DUE: "REVIEW_DUE",
  REVIEW_WAITING: "REVIEW_WAITING",
  MASTERED: "MASTERED",
  PAUSED_LEARNING: "PAUSED_LEARNING",
  PAUSED_REVIEW: "PAUSED_REVIEW",
  PAUSED_MASTERED: "PAUSED_MASTERED",
} as const;

export type VerseFlowCode = (typeof VerseFlowCode)[keyof typeof VerseFlowCode];

export type VerseFlow = {
  code: VerseFlowCode;
  group: "catalog" | "library" | "active" | "paused" | "complete";
  phase: "catalog" | "my" | "learning" | "review" | "mastered";
  availability: "READY" | "WAITING" | "PAUSED" | "NONE";
  allowedActions: string[];
  remainingLearnings: number;
  remainingReviews: number;
  availableAt?: string | null;
  progressPercent: number;
};

export function normalizeVerseFlow(value: unknown): VerseFlow | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<VerseFlow> & { code?: unknown };
  if (typeof raw.code !== "string") return null;

  return {
    code: raw.code as VerseFlowCode,
    group:
      raw.group === "catalog" ||
      raw.group === "library" ||
      raw.group === "active" ||
      raw.group === "paused" ||
      raw.group === "complete"
        ? raw.group
        : "library",
    phase:
      raw.phase === "catalog" ||
      raw.phase === "my" ||
      raw.phase === "learning" ||
      raw.phase === "review" ||
      raw.phase === "mastered"
        ? raw.phase
        : "my",
    availability:
      raw.availability === "READY" ||
      raw.availability === "WAITING" ||
      raw.availability === "PAUSED" ||
      raw.availability === "NONE"
        ? raw.availability
        : "NONE",
    allowedActions: Array.isArray(raw.allowedActions)
      ? raw.allowedActions.filter((item): item is string => typeof item === "string")
      : [],
    remainingLearnings: Math.max(0, Math.round(Number(raw.remainingLearnings ?? 0))),
    remainingReviews: Math.max(0, Math.round(Number(raw.remainingReviews ?? 0))),
    availableAt:
      typeof raw.availableAt === "string" && raw.availableAt.trim()
        ? raw.availableAt
        : null,
    progressPercent: Math.max(0, Math.min(100, Math.round(Number(raw.progressPercent ?? 0)))),
  };
}

export function getDisplayStatusFromFlow(flow: VerseFlow | null): DisplayVerseStatus | null {
  if (!flow) return null;

  switch (flow.code) {
    case VerseFlowCode.CATALOG:
      return "CATALOG";
    case VerseFlowCode.MY:
      return VerseStatus.MY;
    case VerseFlowCode.LEARNING:
      return VerseStatus.LEARNING;
    case VerseFlowCode.REVIEW_DUE:
    case VerseFlowCode.REVIEW_WAITING:
      return "REVIEW";
    case VerseFlowCode.MASTERED:
      return "MASTERED";
    case VerseFlowCode.PAUSED_LEARNING:
    case VerseFlowCode.PAUSED_REVIEW:
    case VerseFlowCode.PAUSED_MASTERED:
      return VerseStatus.STOPPED;
    default:
      return VerseStatus.MY;
  }
}
