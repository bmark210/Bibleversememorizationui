"use client";

export type VerseSectionTutorialSource = "prompt" | "profile";

const PROMPT_SEEN_PREFIX = "bible-memory.verse-section-tutorial.prompt-seen.v1";
const COMPLETED_PREFIX = "bible-memory.verse-section-tutorial.completed.v1";

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

export function resolveVerseSectionTutorialIdentity(telegramId?: string | null) {
  const normalizedTelegramId = telegramId?.trim();
  if (normalizedTelegramId) return normalizedTelegramId;
  return readStoredTelegramId() ?? "anonymous";
}

export function getVerseSectionTutorialPromptSeenKey(telegramId?: string | null) {
  return `${PROMPT_SEEN_PREFIX}:${resolveVerseSectionTutorialIdentity(telegramId)}`;
}

export function getVerseSectionTutorialCompletedKey(telegramId?: string | null) {
  return `${COMPLETED_PREFIX}:${resolveVerseSectionTutorialIdentity(telegramId)}`;
}

export function readVerseSectionTutorialPromptSeen(telegramId?: string | null) {
  if (typeof window === "undefined") return false;

  try {
    return (
      window.localStorage.getItem(
        getVerseSectionTutorialPromptSeenKey(telegramId),
      ) === "1"
    );
  } catch {
    return false;
  }
}

export function writeVerseSectionTutorialPromptSeen(telegramId?: string | null) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getVerseSectionTutorialPromptSeenKey(telegramId),
      "1",
    );
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

export function clearVerseSectionTutorialPromptSeen(telegramId?: string | null) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(
      getVerseSectionTutorialPromptSeenKey(telegramId),
    );
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

export function readVerseSectionTutorialCompleted(telegramId?: string | null) {
  if (typeof window === "undefined") return false;

  try {
    return (
      window.localStorage.getItem(
        getVerseSectionTutorialCompletedKey(telegramId),
      ) === "1"
    );
  } catch {
    return false;
  }
}

export function writeVerseSectionTutorialCompleted(telegramId?: string | null) {
  if (typeof window === "undefined") return;

  try {
    writeVerseSectionTutorialPromptSeen(telegramId);
    window.localStorage.setItem(
      getVerseSectionTutorialCompletedKey(telegramId),
      "1",
    );
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

export function clearVerseSectionTutorialCompleted(telegramId?: string | null) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(
      getVerseSectionTutorialCompletedKey(telegramId),
    );
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}
