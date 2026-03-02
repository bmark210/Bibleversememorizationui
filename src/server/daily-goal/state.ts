import type { DailyGoalPhase, DailyGoalResumeMode, DailyGoalServerStateV2 } from "@/app/features/daily-goal/types";

type RequestedCounts = {
  new: number;
  review: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeTimestamp(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function uniqueStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const set = new Set<string>();
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      set.add(item);
    }
  }
  return Array.from(set);
}

function normalizePhase(value: unknown): DailyGoalPhase {
  if (value === "learning" || value === "review" || value === "completed" || value === "empty") {
    return value;
  }
  return "empty";
}

function normalizePreferredResumeMode(value: unknown): DailyGoalResumeMode | null {
  if (value === "learning" || value === "review") return value;
  return null;
}

function normalizeCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function createEmptyProgress() {
  return {
    completedVerseIds: { new: [] as string[], review: [] as string[] },
    skippedVerseIds: { new: [] as string[], review: [] as string[] },
    startedAt: null as string | null,
    completedAt: null as string | null,
    lastActivePhase: "empty" as DailyGoalPhase,
    preferredResumeMode: null as DailyGoalResumeMode | null,
  };
}

export function createDailyGoalServerStateV2(params: {
  dayKey: string;
  timezone: string;
  requestedCounts: RequestedCounts;
  nowIso?: string;
}): DailyGoalServerStateV2 {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const requestedCounts = {
    new: normalizeCount(params.requestedCounts.new),
    review: normalizeCount(params.requestedCounts.review),
  };
  return {
    version: 2,
    dayKey: params.dayKey,
    timezone: params.timezone,
    plan: {
      requestedCounts,
    },
    progress: createEmptyProgress(),
    meta: {
      updatedAt: nowIso,
    },
  };
}

export function parseDailyGoalServerStateV2(value: unknown): DailyGoalServerStateV2 | null {
  if (!isRecord(value)) return null;
  if (value.version !== 2) return null;
  if (typeof value.dayKey !== "string" || typeof value.timezone !== "string") return null;

  const plan = isRecord(value.plan) ? value.plan : {};
  const requestedCounts = isRecord(plan.requestedCounts) ? plan.requestedCounts : {};
  const progress = isRecord(value.progress) ? value.progress : {};
  const completed = isRecord(progress.completedVerseIds) ? progress.completedVerseIds : {};
  const skipped = isRecord(progress.skippedVerseIds) ? progress.skippedVerseIds : {};
  const meta = isRecord(value.meta) ? value.meta : {};

  return {
    version: 2,
    dayKey: value.dayKey,
    timezone: value.timezone,
    plan: {
      requestedCounts: {
        new: normalizeCount(requestedCounts.new),
        review: normalizeCount(requestedCounts.review),
      },
    },
    progress: {
      completedVerseIds: {
        new: uniqueStringList(completed.new),
        review: uniqueStringList(completed.review),
      },
      skippedVerseIds: {
        new: uniqueStringList(skipped.new),
        review: uniqueStringList(skipped.review),
      },
      startedAt: normalizeTimestamp(progress.startedAt),
      completedAt: normalizeTimestamp(progress.completedAt),
      lastActivePhase: normalizePhase(progress.lastActivePhase),
      preferredResumeMode: normalizePreferredResumeMode(progress.preferredResumeMode),
    },
    meta: {
      updatedAt: normalizeTimestamp(meta.updatedAt) ?? new Date().toISOString(),
    },
  };
}

export function reconcileDailyGoalServerStateV2(params: {
  currentState: unknown;
  dayKey: string;
  timezone: string;
  requestedCounts: RequestedCounts;
  nowIso?: string;
}): {
  state: DailyGoalServerStateV2;
  changed: boolean;
  reason: "missing_or_invalid" | "day_changed" | "request_changed" | "timezone_changed" | "unchanged";
} {
  const nowIso = params.nowIso ?? new Date().toISOString();
  const normalizedRequestedCounts = {
    new: normalizeCount(params.requestedCounts.new),
    review: normalizeCount(params.requestedCounts.review),
  };
  const parsed = parseDailyGoalServerStateV2(params.currentState);

  if (!parsed) {
    return {
      state: createDailyGoalServerStateV2({
        dayKey: params.dayKey,
        timezone: params.timezone,
        requestedCounts: normalizedRequestedCounts,
        nowIso,
      }),
      changed: true,
      reason: "missing_or_invalid",
    };
  }

  if (parsed.dayKey !== params.dayKey) {
    return {
      state: createDailyGoalServerStateV2({
        dayKey: params.dayKey,
        timezone: params.timezone,
        requestedCounts: normalizedRequestedCounts,
        nowIso,
      }),
      changed: true,
      reason: "day_changed",
    };
  }

  const requestChanged =
    parsed.plan.requestedCounts.new !== normalizedRequestedCounts.new ||
    parsed.plan.requestedCounts.review !== normalizedRequestedCounts.review;
  const timezoneChanged = parsed.timezone !== params.timezone;

  if (!requestChanged && !timezoneChanged) {
    return { state: parsed, changed: false, reason: "unchanged" };
  }

  return {
    state: {
      ...parsed,
      timezone: params.timezone,
      plan: {
        ...parsed.plan,
        requestedCounts: normalizedRequestedCounts,
      },
      meta: {
        updatedAt: nowIso,
      },
    },
    changed: true,
    reason: requestChanged ? "request_changed" : "timezone_changed",
  };
}
