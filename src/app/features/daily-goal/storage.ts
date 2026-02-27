import type { DailyGoalOnboardingSeen, DailyGoalSession } from './types';

export const DAILY_GOAL_SESSION_STORAGE_KEY = 'bible-memory.daily-goal-session.v1';
export const DAILY_GOAL_ONBOARDING_STORAGE_KEY = 'bible-memory.daily-goal-onboarding.v1';

export function getLocalDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

const VALID_PHASES = ['learning', 'review', 'completed', 'empty'] as const;

function isValidPlan(plan: Record<string, unknown>): boolean {
  return (
    typeof plan.dayKey === 'string' &&
    isRecord(plan.prefsSnapshot) &&
    typeof (plan.prefsSnapshot as Record<string, unknown>).newVersesCount === 'number' &&
    typeof (plan.prefsSnapshot as Record<string, unknown>).reviewVersesCount === 'number' &&
    isRecord(plan.shortages) &&
    typeof (plan.shortages as Record<string, unknown>).new === 'number' &&
    typeof (plan.shortages as Record<string, unknown>).review === 'number'
  );
}

function isValidProgress(progress: Record<string, unknown>): boolean {
  return (
    isRecord(progress.completedVerseIds) &&
    isStringArray((progress.completedVerseIds as Record<string, unknown>).new) &&
    isStringArray((progress.completedVerseIds as Record<string, unknown>).review) &&
    (progress.startedAt === null || typeof progress.startedAt === 'string') &&
    (progress.completedAt === null || typeof progress.completedAt === 'string') &&
    VALID_PHASES.includes(progress.lastActivePhase as (typeof VALID_PHASES)[number])
  );
}

export function readDailyGoalSession(): DailyGoalSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DAILY_GOAL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    if (parsed.version !== 1) return null;
    if (typeof parsed.telegramId !== 'string' || typeof parsed.dayKey !== 'string') return null;
    if (!isRecord(parsed.plan) || !isRecord(parsed.progress)) return null;
    if (!isValidPlan(parsed.plan)) return null;
    if (!isValidProgress(parsed.progress)) return null;
    return parsed as unknown as DailyGoalSession;
  } catch (e) {
    console.warn('[DailyGoal] Failed to read session from localStorage:', e);
    return null;
  }
}

export function writeDailyGoalSession(value: DailyGoalSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!value) {
      window.localStorage.removeItem(DAILY_GOAL_SESSION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(DAILY_GOAL_SESSION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function readDailyGoalOnboardingSeen(): DailyGoalOnboardingSeen {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(DAILY_GOAL_ONBOARDING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? (parsed as DailyGoalOnboardingSeen) : {};
  } catch {
    return {};
  }
}

export function writeDailyGoalOnboardingSeen(value: DailyGoalOnboardingSeen) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DAILY_GOAL_ONBOARDING_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}
