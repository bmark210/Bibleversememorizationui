import type { Verse } from "@/app/domain/verse";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import {
  VerseAction,
  VerseFlowCode,
  getDisplayStatusFromFlow,
  normalizeVerseFlow,
  type VerseFlow,
} from "@/shared/domain/verseFlow";
import { VerseStatus } from "@/shared/domain/verseStatus";
import {
  REPEAT_THRESHOLD_FOR_MASTERED,
  TRAINING_STAGE_MASTERY_MAX,
} from "@/shared/training/constants";
import {
  computeVerseTotalCompletedUnits,
  computeVerseTotalProgressPercent,
} from "@/shared/training/verseTotalProgress";

export type VerseRulesSubject = Pick<
  Verse,
  "status" | "flow"
> &
  Partial<
    Pick<Verse, "masteryLevel" | "repetitions" | "nextReviewAt" | "nextReview">
  >;

export type VerseRulesListFilter =
  | "catalog"
  | "learning"
  | "review"
  | "mastered"
  | "stopped"
  | "my";

export type PausedVerseKind = "learning" | "review" | "mastered";
export type VerseJourneyPhase =
  | "catalog"
  | "my"
  | "queue"
  | "learning"
  | "review"
  | "mastered";

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function parseVerseRuleDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getVerseFlow(subject: { flow?: unknown } | null | undefined): VerseFlow | null {
  return normalizeVerseFlow(subject?.flow);
}

export function getVerseDisplayStatus(subject: VerseRulesSubject): DisplayVerseStatus {
  const flow = getVerseFlow(subject);
  return normalizeDisplayVerseStatus(
    getDisplayStatusFromFlow(flow) ?? subject.status,
  );
}

export function getVerseNextAvailabilityAt(subject: VerseRulesSubject): Date | null {
  const flow = getVerseFlow(subject);
  return parseVerseRuleDate(
    flow?.availableAt ?? subject.nextReviewAt ?? subject.nextReview,
  );
}

export function hasVerseAction(
  subject: { flow?: unknown } | null | undefined,
  action: (typeof VerseAction)[keyof typeof VerseAction],
): boolean {
  const flow = getVerseFlow(subject);
  return flow?.allowedActions.includes(action) ?? false;
}

export function resolvePausedVerseKind(subject: Pick<Verse, "flow" | "masteryLevel" | "repetitions">): PausedVerseKind {
  const flow = getVerseFlow(subject);
  if (flow?.code === VerseFlowCode.PAUSED_MASTERED) return "mastered";
  if (flow?.code === VerseFlowCode.PAUSED_REVIEW) return "review";
  if (flow?.code === VerseFlowCode.PAUSED_LEARNING) return "learning";

  const masteryLevel = Math.max(0, Number(subject.masteryLevel ?? 0));
  const repetitions = Math.max(0, Number(subject.repetitions ?? 0));

  if (masteryLevel < TRAINING_STAGE_MASTERY_MAX) return "learning";
  if (repetitions >= REPEAT_THRESHOLD_FOR_MASTERED) return "mastered";
  return "review";
}

export function resolveVerseJourneyPhase(subject: Pick<Verse, "status" | "flow" | "masteryLevel" | "repetitions">): VerseJourneyPhase {
  const flow = getVerseFlow(subject);
  switch (flow?.code) {
    case VerseFlowCode.CATALOG:
      return "catalog";
    case VerseFlowCode.MY:
      return "my";
    case VerseFlowCode.QUEUE:
      return "queue";
    case VerseFlowCode.LEARNING:
    case VerseFlowCode.PAUSED_LEARNING:
      return "learning";
    case VerseFlowCode.REVIEW_DUE:
    case VerseFlowCode.REVIEW_WAITING:
    case VerseFlowCode.PAUSED_REVIEW:
      return "review";
    case VerseFlowCode.MASTERED:
    case VerseFlowCode.PAUSED_MASTERED:
      return "mastered";
    default:
      break;
  }

  const status = getVerseDisplayStatus(subject);
  if (status === "CATALOG") return "catalog";
  if (status === VerseStatus.MY) return "my";
  if (status === VerseStatus.QUEUE) return "queue";
  if (status === VerseStatus.STOPPED) {
    return resolvePausedVerseKind(subject);
  }
  if (status === "REVIEW") return "review";
  if (status === "MASTERED") return "mastered";
  return "learning";
}

export function isVerseLearning(subject: VerseRulesSubject): boolean {
  const flow = getVerseFlow(subject);
  if (flow) return flow.code === VerseFlowCode.LEARNING;
  return getVerseDisplayStatus(subject) === VerseStatus.LEARNING;
}

export function isVerseReview(subject: VerseRulesSubject): boolean {
  const flow = getVerseFlow(subject);
  if (flow) {
    return (
      flow.code === VerseFlowCode.REVIEW_DUE ||
      flow.code === VerseFlowCode.REVIEW_WAITING
    );
  }
  return getVerseDisplayStatus(subject) === "REVIEW";
}

export function isVerseMastered(subject: VerseRulesSubject): boolean {
  const flow = getVerseFlow(subject);
  if (flow) return flow.code === VerseFlowCode.MASTERED;
  return getVerseDisplayStatus(subject) === "MASTERED";
}

export function isVersePaused(subject: VerseRulesSubject): boolean {
  const flow = getVerseFlow(subject);
  if (flow) {
    return (
      flow.code === VerseFlowCode.PAUSED_LEARNING ||
      flow.code === VerseFlowCode.PAUSED_REVIEW ||
      flow.code === VerseFlowCode.PAUSED_MASTERED
    );
  }
  return getVerseDisplayStatus(subject) === VerseStatus.STOPPED;
}

export function isVerseWaitingReview(
  subject: VerseRulesSubject,
  now = new Date(),
): boolean {
  const flow = getVerseFlow(subject);
  if (flow?.code === VerseFlowCode.REVIEW_WAITING) return true;
  if (flow?.code === VerseFlowCode.REVIEW_DUE) return false;
  if (getVerseDisplayStatus(subject) !== "REVIEW") return false;

  const nextAvailabilityAt = getVerseNextAvailabilityAt(subject);
  return nextAvailabilityAt != null && nextAvailabilityAt.getTime() > now.getTime();
}

export function isVerseDueForTraining(
  subject: VerseRulesSubject,
  now = new Date(),
): boolean {
  if (isVerseLearning(subject)) return true;
  if (!isVerseReview(subject)) return false;
  return !isVerseWaitingReview(subject, now);
}

export function isVerseAnchorEligible(subject: VerseRulesSubject): boolean {
  const flow = getVerseFlow(subject);
  if (flow) {
    return (
      flow.code === VerseFlowCode.REVIEW_DUE ||
      flow.code === VerseFlowCode.REVIEW_WAITING ||
      flow.code === VerseFlowCode.MASTERED ||
      hasVerseAction(subject, VerseAction.ANCHOR)
    );
  }

  const status = getVerseDisplayStatus(subject);
  return status === "REVIEW" || status === "MASTERED";
}

export function getVerseProgressPercent(
  subject: Pick<Verse, "flow" | "masteryLevel" | "repetitions">,
): number {
  const flow = getVerseFlow(subject);
  if (flow) return clampPercent(flow.progressPercent);
  return clampPercent(
    computeVerseTotalProgressPercent(subject.masteryLevel, subject.repetitions),
  );
}

export function getVerseResolvedProgress(
  subject: Pick<Verse, "flow" | "masteryLevel" | "repetitions">,
): {
  totalCompleted: number;
  totalRemaining: number;
  remainingLearnings: number;
  remainingRepeats: number;
  progressPercent: number;
} {
  const flow = getVerseFlow(subject);
  const totalCompleted = computeVerseTotalCompletedUnits(
    subject.masteryLevel,
    subject.repetitions,
  );
  const fallbackRemainingLearnings = Math.max(
    0,
    TRAINING_STAGE_MASTERY_MAX - Math.max(0, Math.round(Number(subject.masteryLevel ?? 0))),
  );
  const fallbackRemainingRepeats =
    Math.max(0, Math.round(Number(subject.masteryLevel ?? 0))) >=
    TRAINING_STAGE_MASTERY_MAX
      ? Math.max(
          0,
          REPEAT_THRESHOLD_FOR_MASTERED -
            Math.min(
              Math.max(0, Math.round(Number(subject.repetitions ?? 0))),
              REPEAT_THRESHOLD_FOR_MASTERED,
            ),
        )
      : REPEAT_THRESHOLD_FOR_MASTERED;
  const remainingLearnings = Math.max(
    0,
    Math.round(flow?.remainingLearnings ?? fallbackRemainingLearnings),
  );
  const remainingRepeats = Math.max(
    0,
    Math.round(flow?.remainingReviews ?? fallbackRemainingRepeats),
  );

  return {
    totalCompleted,
    totalRemaining: remainingLearnings + remainingRepeats,
    remainingLearnings,
    remainingRepeats,
    progressPercent: getVerseProgressPercent(subject),
  };
}

export function matchesVerseListFilter(
  subject: Pick<Verse, "status" | "flow" | "masteryLevel" | "repetitions">,
  filter: VerseRulesListFilter,
): boolean {
  if (filter === "catalog") return getVerseDisplayStatus(subject) === "CATALOG";
  if (filter === "learning") return isVerseLearning(subject);
  if (filter === "review") return isVerseReview(subject);
  if (filter === "mastered") return isVerseMastered(subject);
  if (filter === "stopped") return isVersePaused(subject);
  if (filter === "my") return getVerseDisplayStatus(subject) !== "CATALOG";
  return true;
}
