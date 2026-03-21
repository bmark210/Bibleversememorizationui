import { OpenAPI } from "@/api/core/OpenAPI";
import type { TrainingVerse } from "../types";
import type { ImpostorWordData } from "../modes/builders/aiBuilders";

let aiUnavailableUntil = 0;

function isAIAvailable(): boolean {
  return Date.now() >= aiUnavailableUntil;
}

function markAIUnavailable() {
  aiUnavailableUntil = Date.now() + 60_000;
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
      markAIUnavailable();
      return null;
    }

    const { data } = (await res.json()) as { data: ImpostorWordData };
    return data;
  } catch {
    markAIUnavailable();
    return null;
  }
}
