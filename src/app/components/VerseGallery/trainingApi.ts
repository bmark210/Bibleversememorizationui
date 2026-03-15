import type { UserVerse } from "@/api/models/UserVerse";
import { fetchUserVersesPage } from "@/api/services/userVersesPagination";
import { UserVersesService } from "@/api/services/UserVersesService";
import { getTelegramUserId } from "@/app/lib/telegramWebApp";
import type { TrainingModeRating } from "@/shared/training/modeEngine";
import type { TrainingAttemptPhase } from "@/modules/training/hints/types";
import { VerseStatus } from "@/shared/domain/verseStatus";
import type { TrainingVerseState } from "./types";

export function getTelegramId(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem("telegramId");
  if (fromStorage) return fromStorage;
  return getTelegramUserId();
}

function patchStatusForTrainingVerse(verse: TrainingVerseState): "LEARNING" | "STOPPED" | "MY" {
  if (verse.status === VerseStatus.STOPPED) return "STOPPED";
  return verse.rawMasteryLevel > 0 ? "LEARNING" : "MY";
}

export async function persistTrainingVerseProgress(
  verse: TrainingVerseState,
  options?: {
    includeRepetitions?: boolean;
    reviewRating?: 0 | 1 | 2 | 3;
  }
): Promise<UserVerse | null> {
  const telegramId = verse.telegramId ?? getTelegramId();
  if (!telegramId) return null;
  const response = await UserVersesService.patchApiUsersVerses(
    telegramId,
    verse.externalVerseId,
    {
      masteryLevel: verse.rawMasteryLevel,
      ...(options?.includeRepetitions ? { repetitions: verse.repetitions } : {}),
      reviewLapseStreak: verse.reviewLapseStreak,
      ...(options?.reviewRating !== undefined
        ? { reviewRating: options.reviewRating }
        : {}),
      lastReviewedAt: verse.lastReviewedAt?.toISOString(),
      nextReviewAt: verse.nextReviewAt?.toISOString(),
      lastTrainingModeId: verse.lastModeId ?? null,
      status: patchStatusForTrainingVerse(verse),
    }
  );
  return response ?? null;
}

export async function fetchTrainingVerseSnapshot(
  externalVerseId: string,
  telegramIdOverride?: string | null
): Promise<UserVerse | null> {
  const telegramId = telegramIdOverride ?? getTelegramId();
  if (!telegramId) return null;

  const response = await fetchUserVersesPage({
    telegramId,
    filter: "my",
    search: externalVerseId,
    limit: 50,
  });

  return (
    response.items.find((verse) => verse.externalVerseId === externalVerseId) ?? null
  );
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface CompleteTrainingInput {
  telegramId?: string | null;
  externalVerseId: string;
  modeId: number;
  phase: TrainingAttemptPhase;
  requestedRating: TrainingModeRating;
  ratingCap: TrainingModeRating;
}

export interface CompleteTrainingResponse {
  appliedRating: TrainingModeRating;
  verse: Record<string, unknown>;
}

export async function completeTraining(
  input: CompleteTrainingInput
): Promise<CompleteTrainingResponse> {
  const telegramId = input.telegramId ?? getTelegramId();
  if (!telegramId) {
    throw new Error("No telegramId available");
  }

  return postJson<CompleteTrainingResponse>("/api/training/complete", {
    telegramId,
    externalVerseId: input.externalVerseId,
    modeId: input.modeId,
    phase: input.phase,
    requestedRating: input.requestedRating,
    ratingCap: input.ratingCap,
  });
}
