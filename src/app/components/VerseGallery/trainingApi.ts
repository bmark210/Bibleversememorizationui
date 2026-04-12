import type { api_PatchUserVerseRequest } from "@/api/models/api_PatchUserVerseRequest";
import type { domain_TrainingStepHTTPRequest } from "@/api/models/domain_TrainingStepHTTPRequest";
import type { domain_TrainingStepHTTPResponse } from "@/api/models/domain_TrainingStepHTTPResponse";
import type { domain_UserVerse } from "@/api/models/domain_UserVerse";
import type { domain_VerseListItem } from "@/api/models/domain_VerseListItem";
import { fetchUserVersesPage } from "@/api/services/userVersesPagination";
import { UserVersesService } from "@/api/services/UserVersesService";
import { getTelegramUserId } from "@/app/lib/telegramWebApp";
import { VerseStatus } from "@/shared/domain/verseStatus";
import type { TrainingVerseState } from "./types";

export function getTelegramId(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem("telegramId");
  if (fromStorage) return fromStorage;
  return getTelegramUserId();
}

function patchStatusForTrainingVerse(verse: TrainingVerseState): "LEARNING" | "STOPPED" | "QUEUE" {
  if (verse.status === VerseStatus.STOPPED) return "STOPPED";
  return verse.rawMasteryLevel > 0 ? "LEARNING" : "QUEUE";
}

export async function persistTrainingVerseProgress(
  verse: TrainingVerseState,
  options?: {
    includeRepetitions?: boolean;
  }
): Promise<domain_UserVerse | null> {
  const telegramId = verse.telegramId ?? getTelegramId();
  if (!telegramId) return null;
  const body: api_PatchUserVerseRequest = {
    masteryLevel: verse.rawMasteryLevel,
    ...(options?.includeRepetitions ? { repetitions: verse.repetitions } : {}),
    reviewLapseStreak: verse.reviewLapseStreak,
    lastReviewedAt: verse.lastReviewedAt?.toISOString(),
    nextReviewAt: verse.nextReviewAt?.toISOString(),
    status: patchStatusForTrainingVerse(verse),
  };
  const response = await UserVersesService.patchUserVerse(
    telegramId,
    verse.externalVerseId,
    body
  );
  return response ?? null;
}

/** Applies one training rating; server is SSOT for progress and next mode. */
export async function postTrainingVerseStep(
  telegramId: string,
  externalVerseId: string,
  body: domain_TrainingStepHTTPRequest
): Promise<domain_TrainingStepHTTPResponse | null> {
  return UserVersesService.postUserVerseTrainingStep(
    telegramId,
    externalVerseId,
    body
  );
}

export async function fetchTrainingVerseSnapshot(
  externalVerseId: string,
  telegramIdOverride?: string | null
): Promise<domain_VerseListItem | null> {
  const telegramId = telegramIdOverride ?? getTelegramId();
  if (!telegramId) return null;

  const response = await fetchUserVersesPage({
    telegramId,
    filter: "my",
    search: externalVerseId,
    limit: 50,
  });

  const items = response.items ?? [];
  return (
    items.find(
      (v) => String(v.externalVerseId ?? "").trim() === externalVerseId
    ) ?? null
  );
}
