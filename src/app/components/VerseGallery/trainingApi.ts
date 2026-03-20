import type { bible_memory_db_internal_domain_VerseListItem } from "@/api/models/bible_memory_db_internal_domain_VerseListItem";
import type { UserVerse } from "@/api/models/UserVerse";
import { fetchUserVersesPage } from "@/api/services/userVersesPagination";
import { UserVersesService } from "@/api/services/UserVersesService";
import type { TrainingStepHTTPRequest } from "@/api/models/TrainingStepHTTPRequest";
import type { TrainingStepHTTPResponse } from "@/api/models/TrainingStepHTTPResponse";
import type { internal_api_PatchUserVerseRequest } from "@/api/models/internal_api_PatchUserVerseRequest";
import { getTelegramUserId } from "@/app/lib/telegramWebApp";
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
  const body: internal_api_PatchUserVerseRequest = {
    masteryLevel: verse.rawMasteryLevel,
    ...(options?.includeRepetitions ? { repetitions: verse.repetitions } : {}),
    reviewLapseStreak: verse.reviewLapseStreak,
    lastReviewedAt: verse.lastReviewedAt?.toISOString(),
    nextReviewAt: verse.nextReviewAt?.toISOString(),
    status: patchStatusForTrainingVerse(verse),
    ...(verse.lastModeId != null ? { lastTrainingModeId: verse.lastModeId } : {}),
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
  body: TrainingStepHTTPRequest
): Promise<TrainingStepHTTPResponse | null> {
  return UserVersesService.postUserVerseTrainingStep(
    telegramId,
    externalVerseId,
    body
  );
}

export async function fetchTrainingVerseSnapshot(
  externalVerseId: string,
  telegramIdOverride?: string | null
): Promise<bible_memory_db_internal_domain_VerseListItem | null> {
  const telegramId = telegramIdOverride ?? getTelegramId();
  if (!telegramId) return null;

  const response = await fetchUserVersesPage({
    telegramId,
    filter: "my",
    search: externalVerseId,
    limit: 50,
  });

  return (
    response.items.find(
      (v) => String(v.externalVerseId ?? "").trim() === externalVerseId
    ) ?? null
  );
}
