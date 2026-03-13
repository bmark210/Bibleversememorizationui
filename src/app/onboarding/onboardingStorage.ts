"use client";

export type OnboardingSource = "auto" | "profile";

type OnboardingReplayState = {
  source: OnboardingSource;
  startedAt: string;
};

const ONBOARDING_COMPLETION_PREFIX = "bible-memory.onboarding.v1";
const ONBOARDING_REPLAY_STATE_KEY = "bible-memory.onboarding.session.v1";

function readStoredTelegramId() {
  if (typeof window === "undefined") return null;

  try {
    const rawTelegramId = window.localStorage.getItem("telegramId") ?? "";
    const telegramId = rawTelegramId.trim();
    return telegramId.length > 0 ? telegramId : null;
  } catch {
    return null;
  }
}

export function resolveOnboardingIdentity(telegramId?: string | null) {
  const normalizedTelegramId = telegramId?.trim();
  if (normalizedTelegramId) return normalizedTelegramId;
  return readStoredTelegramId() ?? "anonymous";
}

export function getOnboardingCompletionKey(telegramId?: string | null) {
  return `${ONBOARDING_COMPLETION_PREFIX}:${resolveOnboardingIdentity(telegramId)}`;
}

export function readOnboardingCompletion(telegramId?: string | null) {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(getOnboardingCompletionKey(telegramId)) === "1";
  } catch {
    return false;
  }
}

export function writeOnboardingCompletion(telegramId?: string | null) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getOnboardingCompletionKey(telegramId), "1");
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

export function clearOnboardingCompletion(telegramId?: string | null) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(getOnboardingCompletionKey(telegramId));
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

export function readOnboardingReplayState(): OnboardingReplayState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(ONBOARDING_REPLAY_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<OnboardingReplayState>;
    if (
      parsed?.source !== "auto" &&
      parsed?.source !== "profile"
    ) {
      return null;
    }

    return {
      source: parsed.source,
      startedAt:
        typeof parsed.startedAt === "string" ? parsed.startedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeOnboardingReplayState(source: OnboardingSource) {
  if (typeof window === "undefined") return;

  try {
    const value: OnboardingReplayState = {
      source,
      startedAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(ONBOARDING_REPLAY_STATE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

export function clearOnboardingReplayState() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(ONBOARDING_REPLAY_STATE_KEY);
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}
