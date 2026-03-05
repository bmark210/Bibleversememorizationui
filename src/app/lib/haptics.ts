"use client";

export type HapticStyle =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "error"
  | "warning";

type TelegramWebAppHapticFeedback = {
  impactOccurred: (style: "light" | "medium" | "heavy") => void;
  notificationOccurred: (style: "success" | "error" | "warning") => void;
};

type TelegramWebAppLike = {
  version?: string;
  HapticFeedback?: TelegramWebAppHapticFeedback;
};

function isAtLeastVersion(current: string | undefined, minimum: string): boolean {
  if (!current) return false;
  const currentParts = current.split(".").map((part) => Number.parseInt(part, 10));
  const minimumParts = minimum.split(".").map((part) => Number.parseInt(part, 10));
  const maxLength = Math.max(currentParts.length, minimumParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = Number.isFinite(currentParts[index]) ? currentParts[index] : 0;
    const minimumPart = Number.isFinite(minimumParts[index]) ? minimumParts[index] : 0;
    if (currentPart > minimumPart) return true;
    if (currentPart < minimumPart) return false;
  }

  return true;
}

function getTelegramWebApp(): TelegramWebAppLike | null {
  if (typeof window === "undefined") return null;
  const webApp = (
    window as unknown as {
      Telegram?: { WebApp?: TelegramWebAppLike };
    }
  ).Telegram?.WebApp;
  return webApp ?? null;
}

export function triggerHaptic(style: HapticStyle = "light"): boolean {
  try {
    const webApp = getTelegramWebApp();
    if (!webApp || !isAtLeastVersion(webApp.version, "6.1")) return false;
    const haptic = webApp.HapticFeedback;
    if (!haptic) return false;

    if (style === "success" || style === "error" || style === "warning") {
      haptic.notificationOccurred(style);
      return true;
    }

    haptic.impactOccurred(style);
    return true;
  } catch {
    return false;
  }
}

export const haptic = triggerHaptic;

