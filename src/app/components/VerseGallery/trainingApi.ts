import { UserVersesService } from "@/api/services/UserVersesService";
import { VerseStatus } from "@/generated/prisma";
import type { TrainingVerseState } from "./types";

export function getTelegramId(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem("telegramId");
  if (fromStorage) return fromStorage;
  const tgUserId = (
    window as unknown as {
      Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: unknown } } } };
    }
  )?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return tgUserId ? String(tgUserId) : null;
}

function patchStatusForTrainingVerse(verse: TrainingVerseState): "LEARNING" | "STOPPED" | "MY" {
  if (verse.status === VerseStatus.STOPPED) return "STOPPED";
  return verse.rawMasteryLevel > 0 ? "LEARNING" : "MY";
}

export async function persistTrainingVerseProgress(
  verse: TrainingVerseState,
  options?: { includeRepetitions?: boolean }
): Promise<Record<string, unknown> | null> {
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
  return (response ?? null) as unknown as Record<string, unknown> | null;
}
