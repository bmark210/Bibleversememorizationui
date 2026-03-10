import type { UserVerse } from "@/api/models/UserVerse";
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

function patchStatusForTrainingVerse(verse: TrainingVerseState): "LEARNING" | "STOPPED" | "MY" {
  if (verse.status === VerseStatus.STOPPED) return "STOPPED";
  return verse.rawMasteryLevel > 0 ? "LEARNING" : "MY";
}

export async function persistTrainingVerseProgress(
  verse: TrainingVerseState,
  options?: { includeRepetitions?: boolean }
): Promise<UserVerse | null> {
  const telegramId = verse.telegramId ?? getTelegramId();
  if (!telegramId) return null;
  const response = await UserVersesService.patchApiUsersVerses(
    telegramId,
    verse.externalVerseId,
    {
      masteryLevel: verse.rawMasteryLevel,
      ...(options?.includeRepetitions ? { repetitions: verse.repetitions } : {}),
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
