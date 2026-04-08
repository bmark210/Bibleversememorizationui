import {
  VerseDisplayStatus,
  VerseStatus,
  type VerseDisplayStatus as VerseDisplayStatusType,
} from "@/shared/domain/verseStatus";

export const VerseAction = {
  ADD_TO_MY: "add_to_my",
  START_LEARNING: "start_learning",
  TRAIN: "train",
  PAUSE: "pause",
  RESUME: "resume",
  ANCHOR: "anchor",
} as const;

export type VerseAction = (typeof VerseAction)[keyof typeof VerseAction];

export const VerseFlowCode = {
  CATALOG: "CATALOG",
  MY: "MY",
  QUEUE: "QUEUE",
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
  allowedActions: VerseAction[];
  remainingLearnings: number;
  remainingReviews: number;
  availableAt?: string | null;
  progressPercent: number;
};

const FLOW_CODES = new Set<VerseFlowCode>(Object.values(VerseFlowCode));
const FLOW_GROUPS = new Set<VerseFlow["group"]>([
  "catalog",
  "library",
  "active",
  "paused",
  "complete",
]);
const FLOW_PHASES = new Set<VerseFlow["phase"]>([
  "catalog",
  "my",
  "learning",
  "review",
  "mastered",
]);
const FLOW_AVAILABILITIES = new Set<VerseFlow["availability"]>([
  "READY",
  "WAITING",
  "PAUSED",
  "NONE",
]);
const FLOW_ACTIONS = new Set<VerseAction>(Object.values(VerseAction));

function isVerseFlowCode(value: unknown): value is VerseFlowCode {
  return typeof value === "string" && FLOW_CODES.has(value as VerseFlowCode);
}

export function normalizeVerseFlow(value: unknown): VerseFlow | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<VerseFlow> & { code?: unknown };
  if (!isVerseFlowCode(raw.code)) return null;

  return {
    code: raw.code,
    group:
      typeof raw.group === "string" && FLOW_GROUPS.has(raw.group as VerseFlow["group"])
        ? (raw.group as VerseFlow["group"])
        : "library",
    phase:
      typeof raw.phase === "string" && FLOW_PHASES.has(raw.phase as VerseFlow["phase"])
        ? (raw.phase as VerseFlow["phase"])
        : "my",
    availability:
      typeof raw.availability === "string" &&
      FLOW_AVAILABILITIES.has(raw.availability as VerseFlow["availability"])
        ? (raw.availability as VerseFlow["availability"])
        : "NONE",
    allowedActions: Array.isArray(raw.allowedActions)
      ? raw.allowedActions.filter(
          (item): item is VerseAction =>
            typeof item === "string" && FLOW_ACTIONS.has(item as VerseAction),
        )
      : [],
    remainingLearnings: Math.max(
      0,
      Math.round(Number(raw.remainingLearnings ?? 0)),
    ),
    remainingReviews: Math.max(
      0,
      Math.round(Number(raw.remainingReviews ?? 0)),
    ),
    availableAt:
      typeof raw.availableAt === "string" && raw.availableAt.trim()
        ? raw.availableAt
        : null,
    progressPercent: Math.max(
      0,
      Math.min(100, Math.round(Number(raw.progressPercent ?? 0))),
    ),
  };
}

export function getDisplayStatusFromFlow(
  flow: VerseFlow | null,
): VerseDisplayStatusType | null {
  if (!flow) return null;

  switch (flow.code) {
    case VerseFlowCode.CATALOG:
      return VerseDisplayStatus.CATALOG;
    case VerseFlowCode.MY:
      return VerseDisplayStatus.QUEUE;
    case VerseFlowCode.QUEUE:
      return VerseDisplayStatus.QUEUE;
    case VerseFlowCode.LEARNING:
      return VerseDisplayStatus.LEARNING;
    case VerseFlowCode.REVIEW_DUE:
    case VerseFlowCode.REVIEW_WAITING:
      return VerseDisplayStatus.REVIEW;
    case VerseFlowCode.MASTERED:
      return VerseDisplayStatus.MASTERED;
    case VerseFlowCode.PAUSED_LEARNING:
    case VerseFlowCode.PAUSED_REVIEW:
    case VerseFlowCode.PAUSED_MASTERED:
      return VerseStatus.STOPPED;
    default:
      return VerseDisplayStatus.QUEUE;
  }
}
