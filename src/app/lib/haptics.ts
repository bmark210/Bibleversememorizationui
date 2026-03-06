"use client";

import { getTelegramWebApp } from "@/app/lib/telegramWebApp";

export type HapticStyle =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "error"
  | "warning";

function isAtLeastVersion(current: string | undefined, minimum: string): boolean {
  if (!current) return false;
  const currentParts = current.split(".").map((part) => Number.parseInt(part, 10));
  const minimumParts = minimum.split(".").map((part) => Number.parseInt(part, 10));
  const maxLength = Math.max(currentParts.length, minimumParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const currentValue = currentParts[index];
    const minimumValue = minimumParts[index];
    const currentPart =
      typeof currentValue === "number" && Number.isFinite(currentValue)
        ? currentValue
        : 0;
    const minimumPart =
      typeof minimumValue === "number" && Number.isFinite(minimumValue)
        ? minimumValue
        : 0;
    if (currentPart > minimumPart) return true;
    if (currentPart < minimumPart) return false;
  }

  return true;
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
