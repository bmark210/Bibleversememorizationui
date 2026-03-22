import { OpenAPI } from "@/api/core/OpenAPI";
import type { TrainingVerse } from "../types";
import type { ImpostorWordData } from "../modes/builders/aiBuilders";

/** Cooldown after network/server errors (not per-request validation failures). */
let aiUnavailableUntil = 0;
let consecutiveFailures = 0;

function isAIAvailable(): boolean {
  return Date.now() >= aiUnavailableUntil;
}

/** Escalating cooldown: 10s → 30s → 60s on consecutive failures. */
function markAIUnavailable() {
  consecutiveFailures += 1;
  const cooldown =
    consecutiveFailures >= 3 ? 60_000 : consecutiveFailures >= 2 ? 30_000 : 10_000;
  aiUnavailableUntil = Date.now() + cooldown;
}

function markAISuccess() {
  consecutiveFailures = 0;
}

export function getAIAvailability(): boolean {
  return isAIAvailable();
}

export async function generateImpostorWord(
  verse: TrainingVerse,
): Promise<ImpostorWordData | null> {
  if (!isAIAvailable()) return null;

  try {
    const baseUrl = OpenAPI.BASE || "";
    const res = await fetch(`${baseUrl}/api/generate-exercise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "impostor-word",
        verseText: verse.text,
        verseReference: verse.reference,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      // 502 = all AI providers failed — cooldown; 4xx = bad request, don't cooldown
      if (res.status >= 500) markAIUnavailable();
      return null;
    }

    const { data } = (await res.json()) as { data: ImpostorWordData };
    markAISuccess();
    return data;
  } catch {
    // Network error / timeout — cooldown
    markAIUnavailable();
    return null;
  }
}
