import type {
  DailyGoalEventAction,
  DailyGoalProgressEvent,
  DailyGoalReadinessResponse,
  DailyGoalResumeMode,
  DailyGoalServerStateV2,
  DailyGoalTargetKind,
} from "@/app/features/daily-goal/types";
import { computeDailyGoalPhase } from "@/app/features/daily-goal/projection";

function uniqueList(list: Iterable<string>) {
  return Array.from(new Set(Array.from(list).filter(Boolean)));
}

function toUniqueSet(list: string[] | undefined): Set<string> {
  return new Set((list ?? []).filter(Boolean));
}

function normalizeGoalStatus(value: unknown): string {
  return String(value ?? "").toUpperCase();
}

function normalizeIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizePreferredResumeMode(value: unknown): DailyGoalResumeMode | null {
  if (value === "learning" || value === "review") return value;
  return null;
}

function normalizeProgressValue(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function applyProgressEvent(params: {
  state: DailyGoalServerStateV2;
  event: DailyGoalProgressEvent;
  nowIso: string;
}): {
  nextState: DailyGoalServerStateV2;
  applied: boolean;
} {
  const { state, event, nowIso } = params;
  if (!event.saved) return { nextState: state, applied: false };

  const targetId = String(event.externalVerseId ?? "");
  if (!targetId) return { nextState: state, applied: false };

  const beforeStatus = normalizeGoalStatus(event.before.status);
  const afterStatus = normalizeGoalStatus(event.after.status);
  const isLearningLike = beforeStatus === "LEARNING" || afterStatus === "LEARNING";
  const isReviewLike =
    beforeStatus === "REVIEW" ||
    afterStatus === "REVIEW" ||
    beforeStatus === "MASTERED" ||
    afterStatus === "MASTERED";

  let targetKind: DailyGoalTargetKind | null = null;
  if (isReviewLike && !isLearningLike) {
    targetKind = "review";
  } else if (isLearningLike) {
    targetKind = "my";
  } else if (isReviewLike) {
    targetKind = "review";
  }
  if (!targetKind) return { nextState: state, applied: false };

  if (targetKind === "my") {
    if (!(Number(event.after.masteryLevel ?? 0) >= 7)) {
      return { nextState: state, applied: false };
    }
  } else {
    const beforeRepetitions = normalizeProgressValue(event.before.repetitions);
    const afterRepetitions = normalizeProgressValue(event.after.repetitions);
    const reviewWasSuccessful = afterRepetitions > beforeRepetitions;
    if (!reviewWasSuccessful) {
      return { nextState: state, applied: false };
    }
  }

  const completedNew = toUniqueSet(state.progress.completedVerseIds.new);
  const completedReview = toUniqueSet(state.progress.completedVerseIds.review);
  const skippedNew = toUniqueSet(state.progress.skippedVerseIds.new);
  const skippedReview = toUniqueSet(state.progress.skippedVerseIds.review);

  const alreadyDone =
    targetKind === "my" ? completedNew.has(targetId) : completedReview.has(targetId);
  if (alreadyDone) return { nextState: state, applied: false };

  if (targetKind === "my") {
    completedNew.add(targetId);
    skippedNew.delete(targetId);
  } else {
    completedReview.add(targetId);
    skippedReview.delete(targetId);
  }

  return {
    nextState: {
      ...state,
      progress: {
        ...state.progress,
        startedAt:
          state.progress.startedAt ??
          normalizeIso(event.occurredAt) ??
          nowIso,
        completedVerseIds: {
          new: uniqueList(completedNew),
          review: uniqueList(completedReview),
        },
        skippedVerseIds: {
          new: uniqueList(skippedNew),
          review: uniqueList(skippedReview),
        },
      },
    },
    applied: true,
  };
}

function applyMarkStarted(params: {
  state: DailyGoalServerStateV2;
  startedAt?: string | null;
  nowIso: string;
}): {
  nextState: DailyGoalServerStateV2;
  applied: boolean;
} {
  const { state, startedAt, nowIso } = params;
  if (state.progress.startedAt) return { nextState: state, applied: false };
  return {
    nextState: {
      ...state,
      progress: {
        ...state.progress,
        startedAt: normalizeIso(startedAt) ?? nowIso,
      },
    },
    applied: true,
  };
}

function applyPreferredResumeMode(params: {
  state: DailyGoalServerStateV2;
  mode: DailyGoalResumeMode | null;
}): {
  nextState: DailyGoalServerStateV2;
  applied: boolean;
} {
  const { state, mode } = params;
  const nextMode = normalizePreferredResumeMode(mode);
  if (state.progress.preferredResumeMode === nextMode) {
    return { nextState: state, applied: false };
  }
  return {
    nextState: {
      ...state,
      progress: {
        ...state.progress,
        preferredResumeMode: nextMode,
      },
    },
    applied: true,
  };
}

function applyMarkCompleted(params: {
  state: DailyGoalServerStateV2;
  completedAt?: string | null;
  nowIso: string;
}): {
  nextState: DailyGoalServerStateV2;
  applied: boolean;
} {
  const { state, completedAt, nowIso } = params;
  if (state.progress.completedAt) return { nextState: state, applied: false };
  return {
    nextState: {
      ...state,
      progress: {
        ...state.progress,
        completedAt: normalizeIso(completedAt) ?? nowIso,
      },
    },
    applied: true,
  };
}

export function applyDailyGoalEventAction(params: {
  state: DailyGoalServerStateV2;
  action: DailyGoalEventAction;
  nowIso?: string;
}): {
  state: DailyGoalServerStateV2;
  applied: boolean;
} {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const { action, state } = params;

  if (action.kind === "progress_event") {
    const result = applyProgressEvent({ state, event: action.event, nowIso });
    return { state: result.nextState, applied: result.applied };
  }
  if (action.kind === "mark_started") {
    const result = applyMarkStarted({
      state,
      startedAt: action.startedAt,
      nowIso,
    });
    return { state: result.nextState, applied: result.applied };
  }
  if (action.kind === "set_preferred_resume_mode") {
    const result = applyPreferredResumeMode({
      state,
      mode: action.mode,
    });
    return { state: result.nextState, applied: result.applied };
  }

  const result = applyMarkCompleted({
    state,
    completedAt: action.completedAt,
    nowIso,
  });
  return { state: result.nextState, applied: result.applied };
}

export function applyDailyGoalSkipAction(params: {
  state: DailyGoalServerStateV2;
  externalVerseId: string;
  targetKind: DailyGoalTargetKind;
}): {
  state: DailyGoalServerStateV2;
  applied: boolean;
} {
  const targetId = String(params.externalVerseId ?? "").trim();
  if (!targetId) return { state: params.state, applied: false };

  const skippedNew = toUniqueSet(params.state.progress.skippedVerseIds.new);
  const skippedReview = toUniqueSet(params.state.progress.skippedVerseIds.review);

  const alreadySkipped =
    params.targetKind === "my"
      ? skippedNew.has(targetId)
      : skippedReview.has(targetId);
  if (alreadySkipped) return { state: params.state, applied: false };

  if (params.targetKind === "my") skippedNew.add(targetId);
  else skippedReview.add(targetId);

  return {
    state: {
      ...params.state,
      progress: {
        ...params.state.progress,
        skippedVerseIds: {
          new: uniqueList(skippedNew),
          review: uniqueList(skippedReview),
        },
      },
    },
    applied: true,
  };
}

function dayDiffUtc(fromDayKey: string, toDayKey: string): number | null {
  const parse = (dayKey: string) => {
    const [y, m, d] = dayKey.split("-").map((part) => Number(part));
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
    return Date.UTC(y, m - 1, d);
  };
  const from = parse(fromDayKey);
  const to = parse(toDayKey);
  if (from == null || to == null) return null;
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export function computeNextDailyStreak(params: {
  previousDayKey: string | null;
  currentDayKey: string;
  previousStreak: number;
}): number {
  const previousStreak = Math.max(0, Math.round(params.previousStreak || 0));
  if (!params.previousDayKey) return 1;
  if (params.previousDayKey === params.currentDayKey) return previousStreak;
  const diff = dayDiffUtc(params.previousDayKey, params.currentDayKey);
  if (diff === 1) return Math.max(1, previousStreak) + 1;
  return 1;
}

export function finalizeDailyGoalState(params: {
  state: DailyGoalServerStateV2;
  readiness: DailyGoalReadinessResponse;
  userLastCompletedDay: string | null;
  userDailyStreak: number;
  nowIso?: string;
}): {
  state: DailyGoalServerStateV2;
  changed: boolean;
  completedNow: boolean;
  completionCounterIncremented: boolean;
  nextLastCompletedDay: string | null;
  nextDailyStreak: number;
} {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const phase = computeDailyGoalPhase({
    state: params.state,
    readiness: params.readiness,
  });
  const current = params.state;

  let changed = false;
  let completedNow = false;

  let nextProgress = current.progress;
  if (current.progress.lastActivePhase !== phase) {
    nextProgress = { ...nextProgress, lastActivePhase: phase };
    changed = true;
  }

  if (phase === "completed" && current.progress.completedAt == null) {
    nextProgress = { ...nextProgress, completedAt: nowIso };
    completedNow = true;
    changed = true;
  }

  const completionCounterIncremented =
    phase === "completed" && params.userLastCompletedDay !== current.dayKey;

  const nextLastCompletedDay = completionCounterIncremented
    ? current.dayKey
    : params.userLastCompletedDay;
  const nextDailyStreak = completionCounterIncremented
    ? computeNextDailyStreak({
        previousDayKey: params.userLastCompletedDay,
        currentDayKey: current.dayKey,
        previousStreak: params.userDailyStreak,
      })
    : Math.max(0, Math.round(params.userDailyStreak || 0));

  const nextState: DailyGoalServerStateV2 = {
    ...current,
    progress: nextProgress,
    meta: {
      updatedAt: nowIso,
    },
  };
  if (nextState.meta.updatedAt !== current.meta.updatedAt) {
    changed = true;
  }

  return {
    state: nextState,
    changed,
    completedNow,
    completionCounterIncremented,
    nextLastCompletedDay,
    nextDailyStreak,
  };
}
