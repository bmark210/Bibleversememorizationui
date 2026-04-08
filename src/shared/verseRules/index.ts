import type { Verse } from "@/app/domain/verse";
import {
  VerseDisplayStatus,
  normalizeDisplayVerseStatus,
  type VerseDisplayStatus as VerseDisplayStatusType,
} from "@/shared/domain/verseStatus";
import {
  VerseAction,
  VerseFlowCode,
  getDisplayStatusFromFlow,
  normalizeVerseFlow,
  type VerseFlow,
} from "@/shared/domain/verseFlow";
import {
  REPEAT_THRESHOLD_FOR_MASTERED,
  TRAINING_STAGE_MASTERY_MAX,
} from "@/shared/training/constants";
import {
  computeVerseTotalCompletedUnits,
  computeVerseTotalProgressPercent,
} from "@/shared/training/verseTotalProgress";

export type VerseRulesSubject = Pick<Verse, "status" | "flow"> &
  Partial<
    Pick<
      Verse,
      "masteryLevel" | "repetitions" | "nextReviewAt" | "nextReview"
    >
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

export type VerseTrainingLaunchMode = "learning" | "review" | "anchor";

export type ResolvedVerseState = {
  flow: VerseFlow | null;
  displayStatus: VerseDisplayStatusType;
  nextAvailabilityAt: Date | null;
  journeyPhase: VerseJourneyPhase;
  pausedKind: PausedVerseKind | null;
  progress: {
    totalCompleted: number;
    totalRemaining: number;
    remainingLearnings: number;
    remainingRepeats: number;
    progressPercent: number;
  };
  allowedActions: ReadonlySet<VerseAction>;
  isCatalog: boolean;
  isMy: boolean;
  isQueued: boolean;
  isLearning: boolean;
  isReview: boolean;
  isMastered: boolean;
  isPaused: boolean;
  isWaitingReview: boolean;
  isDueForTraining: boolean;
  isAnchorEligible: boolean;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampCount(value: unknown) {
  return Math.max(0, Math.round(Number(value ?? 0)));
}

export function parseVerseRuleDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getVerseFlow(
  subject: { flow?: unknown } | null | undefined,
): VerseFlow | null {
  return normalizeVerseFlow(subject?.flow);
}

function resolvePausedVerseKindFromValues(
  flow: VerseFlow | null,
  masteryLevel: number,
  repetitions: number,
): PausedVerseKind {
  if (flow?.code === VerseFlowCode.PAUSED_MASTERED) return "mastered";
  if (flow?.code === VerseFlowCode.PAUSED_REVIEW) return "review";
  if (flow?.code === VerseFlowCode.PAUSED_LEARNING) return "learning";

  if (masteryLevel < TRAINING_STAGE_MASTERY_MAX) return "learning";
  if (repetitions >= REPEAT_THRESHOLD_FOR_MASTERED) return "mastered";
  return "review";
}

function resolveJourneyPhaseFromValues(
  flow: VerseFlow | null,
  displayStatus: VerseDisplayStatusType,
  pausedKind: PausedVerseKind,
): VerseJourneyPhase {
  switch (flow?.code) {
    case VerseFlowCode.CATALOG:
      return "catalog";
    case VerseFlowCode.MY:
      return "queue";
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

  if (displayStatus === VerseDisplayStatus.CATALOG) return "catalog";
  if (displayStatus === VerseDisplayStatus.MY) return "queue";
  if (displayStatus === VerseDisplayStatus.QUEUE) return "queue";
  if (displayStatus === VerseDisplayStatus.STOPPED) return pausedKind;
  if (displayStatus === VerseDisplayStatus.REVIEW) return "review";
  if (displayStatus === VerseDisplayStatus.MASTERED) return "mastered";
  return "learning";
}

function resolveProgress(flow: VerseFlow | null, masteryLevel: number, repetitions: number) {
  const totalCompleted = computeVerseTotalCompletedUnits(masteryLevel, repetitions);
  const fallbackRemainingLearnings = Math.max(
    0,
    TRAINING_STAGE_MASTERY_MAX - masteryLevel,
  );
  const fallbackRemainingRepeats =
    masteryLevel >= TRAINING_STAGE_MASTERY_MAX
      ? Math.max(
          0,
          REPEAT_THRESHOLD_FOR_MASTERED -
            Math.min(repetitions, REPEAT_THRESHOLD_FOR_MASTERED),
        )
      : REPEAT_THRESHOLD_FOR_MASTERED;
  const remainingLearnings = clampCount(
    flow?.remainingLearnings ?? fallbackRemainingLearnings,
  );
  const remainingRepeats = clampCount(
    flow?.remainingReviews ?? fallbackRemainingRepeats,
  );

  return {
    totalCompleted,
    totalRemaining: remainingLearnings + remainingRepeats,
    remainingLearnings,
    remainingRepeats,
    progressPercent: flow
      ? clampPercent(flow.progressPercent)
      : clampPercent(
          computeVerseTotalProgressPercent(masteryLevel, repetitions),
        ),
  };
}

export function resolveVerseState(
  subject: VerseRulesSubject,
  now = new Date(),
): ResolvedVerseState {
  const flow = getVerseFlow(subject);
  const masteryLevel = clampCount(subject.masteryLevel);
  const repetitions = clampCount(subject.repetitions);
  const displayStatus = normalizeDisplayVerseStatus(
    getDisplayStatusFromFlow(flow) ?? subject.status,
  );
  const nextAvailabilityAt = parseVerseRuleDate(
    flow?.availableAt ?? subject.nextReviewAt ?? subject.nextReview,
  );
  const pausedKind = resolvePausedVerseKindFromValues(
    flow,
    masteryLevel,
    repetitions,
  );
  const journeyPhase = resolveJourneyPhaseFromValues(
    flow,
    displayStatus,
    pausedKind,
  );
  const isWaitingReview =
    flow?.code === VerseFlowCode.REVIEW_WAITING
      ? true
      : flow?.code === VerseFlowCode.REVIEW_DUE
        ? false
        : displayStatus === VerseDisplayStatus.REVIEW &&
          nextAvailabilityAt != null &&
          nextAvailabilityAt.getTime() > now.getTime();
  const isReview =
    flow != null
      ? flow.code === VerseFlowCode.REVIEW_DUE ||
        flow.code === VerseFlowCode.REVIEW_WAITING
      : displayStatus === VerseDisplayStatus.REVIEW;
  const isLearning =
    flow != null
      ? flow.code === VerseFlowCode.LEARNING
      : displayStatus === VerseDisplayStatus.LEARNING;
  const isMastered =
    flow != null
      ? flow.code === VerseFlowCode.MASTERED
      : displayStatus === VerseDisplayStatus.MASTERED;
  const isQueued =
    flow != null
      ? flow.code === VerseFlowCode.QUEUE
      : displayStatus === VerseDisplayStatus.QUEUE;
  const isPaused =
    flow != null
      ? flow.code === VerseFlowCode.PAUSED_LEARNING ||
        flow.code === VerseFlowCode.PAUSED_REVIEW ||
        flow.code === VerseFlowCode.PAUSED_MASTERED
      : displayStatus === VerseDisplayStatus.STOPPED;
  const allowedActions = new Set<VerseAction>(flow?.allowedActions ?? []);
  const isAnchorEligible =
    flow != null
      ? allowedActions.has(VerseAction.ANCHOR) ||
        flow.code === VerseFlowCode.REVIEW_DUE ||
        flow.code === VerseFlowCode.REVIEW_WAITING ||
        flow.code === VerseFlowCode.MASTERED
      : displayStatus === VerseDisplayStatus.REVIEW ||
        displayStatus === VerseDisplayStatus.MASTERED;

  return {
    flow,
    displayStatus,
    nextAvailabilityAt,
    journeyPhase,
    pausedKind: isPaused ? pausedKind : null,
    progress: resolveProgress(flow, masteryLevel, repetitions),
    allowedActions,
    isCatalog: displayStatus === VerseDisplayStatus.CATALOG,
    isMy: false,
    isQueued,
    isLearning,
    isReview,
    isMastered,
    isPaused,
    isWaitingReview,
    isDueForTraining: isLearning || (isReview && !isWaitingReview),
    isAnchorEligible,
  };
}

export function getVerseDisplayStatus(
  subject: VerseRulesSubject,
): VerseDisplayStatusType {
  return resolveVerseState(subject).displayStatus;
}

export function getVerseNextAvailabilityAt(
  subject: VerseRulesSubject,
): Date | null {
  return resolveVerseState(subject).nextAvailabilityAt;
}

export function hasVerseAction(
  subject: { flow?: unknown } | null | undefined,
  action: VerseAction,
): boolean {
  return resolveVerseState({
    status: VerseDisplayStatus.QUEUE,
    flow: getVerseFlow(subject),
    masteryLevel: 0,
    repetitions: 0,
  }).allowedActions.has(action);
}

export function resolvePausedVerseKind(
  subject: Pick<Verse, "flow" | "masteryLevel" | "repetitions">,
): PausedVerseKind {
  return resolvePausedVerseKindFromValues(
    getVerseFlow(subject),
    clampCount(subject.masteryLevel),
    clampCount(subject.repetitions),
  );
}

export function resolveVerseJourneyPhase(
  subject: Pick<Verse, "status" | "flow" | "masteryLevel" | "repetitions">,
): VerseJourneyPhase {
  return resolveVerseState(subject).journeyPhase;
}

export function isVerseLearning(subject: VerseRulesSubject): boolean {
  return resolveVerseState(subject).isLearning;
}

export function isVerseReview(subject: VerseRulesSubject): boolean {
  return resolveVerseState(subject).isReview;
}

export function isVerseMastered(subject: VerseRulesSubject): boolean {
  return resolveVerseState(subject).isMastered;
}

export function isVerseQueued(subject: VerseRulesSubject): boolean {
  return resolveVerseState(subject).isQueued;
}

export function isVersePaused(subject: VerseRulesSubject): boolean {
  return resolveVerseState(subject).isPaused;
}

export function isVerseWaitingReview(
  subject: VerseRulesSubject,
  now = new Date(),
): boolean {
  return resolveVerseState(subject, now).isWaitingReview;
}

export function isVerseDueForTraining(
  subject: VerseRulesSubject,
  now = new Date(),
): boolean {
  return resolveVerseState(subject, now).isDueForTraining;
}

export function isVerseAnchorEligible(subject: VerseRulesSubject): boolean {
  return resolveVerseState(subject).isAnchorEligible;
}

export function getVerseProgressPercent(
  subject: Pick<Verse, "flow" | "masteryLevel" | "repetitions">,
): number {
  return resolveVerseState({
    status: VerseDisplayStatus.QUEUE,
    flow: subject.flow,
    masteryLevel: subject.masteryLevel,
    repetitions: subject.repetitions,
  }).progress.progressPercent;
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
  return resolveVerseState({
    status: VerseDisplayStatus.QUEUE,
    flow: subject.flow,
    masteryLevel: subject.masteryLevel,
    repetitions: subject.repetitions,
  }).progress;
}

export function matchesVerseListFilter(
  subject: Pick<Verse, "status" | "flow" | "masteryLevel" | "repetitions">,
  filter: VerseRulesListFilter,
): boolean {
  const resolved = resolveVerseState(subject);
  if (filter === "catalog") return resolved.isCatalog;
  if (filter === "learning") return resolved.isLearning;
  if (filter === "review") return resolved.isReview;
  if (filter === "mastered") return resolved.isMastered;
  if (filter === "stopped") return resolved.isPaused;
  if (filter === "my") return !resolved.isCatalog;
  return true;
}

export function getVerseTrainingLaunchMode(
  subject: VerseRulesSubject,
  now = new Date(),
): VerseTrainingLaunchMode | null {
  const resolved = resolveVerseState(subject, now);
  if (resolved.isMastered) return "anchor";
  if (resolved.isReview) return resolved.isDueForTraining ? "review" : null;
  if (resolved.isLearning) return "learning";
  return null;
}
