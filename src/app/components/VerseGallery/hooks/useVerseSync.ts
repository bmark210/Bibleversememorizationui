import { useCallback } from "react";
import type { UserVerse } from "@/api/models/UserVerse";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { computeDisplayStatus } from "@/modules/training/application/computeDisplayStatus";
import type { Verse } from "@/app/App";
import {
  normalizeRawMasteryLevel,
  normalizeVerseStatus,
  parseDate,
  toStageMasteryLevel,
} from "../utils";
import type { ModeId, TrainingVerseState } from "../types";

type PersistedTrainingVerse = Partial<UserVerse> | null;

type UseVerseSyncParams = {
  onDesync: (externalVerseId: string) => Promise<TrainingVerseState | null>;
};

function normalizeLastModeId(
  rawLastModeId: number | null | undefined,
  fallback: ModeId | null
): ModeId | null {
  return typeof rawLastModeId === "number" && rawLastModeId >= 1 && rawLastModeId <= 8
    ? (rawLastModeId as ModeId)
    : fallback;
}

function toTimestamp(value: Date | null): number | null {
  return value ? value.getTime() : null;
}

function didTrainingVerseDesync(
  optimistic: TrainingVerseState,
  persisted: TrainingVerseState
): boolean {
  return (
    optimistic.status !== persisted.status ||
    optimistic.rawMasteryLevel !== persisted.rawMasteryLevel ||
    optimistic.repetitions !== persisted.repetitions ||
    optimistic.reviewLapseStreak !== persisted.reviewLapseStreak ||
    optimistic.lastModeId !== persisted.lastModeId ||
    toTimestamp(optimistic.lastReviewedAt) !== toTimestamp(persisted.lastReviewedAt) ||
    toTimestamp(optimistic.nextReviewAt) !== toTimestamp(persisted.nextReviewAt)
  );
}

export function normalizePersistedTrainingVerseState(
  currentVerse: TrainingVerseState,
  persistedResponse: PersistedTrainingVerse
): TrainingVerseState {
  const persistedStatus = normalizeVerseStatus(
    (persistedResponse?.status as Verse["status"] | undefined) ?? currentVerse.status
  );
  const persistedMasteryLevel = normalizeRawMasteryLevel(
    persistedResponse?.masteryLevel ?? currentVerse.rawMasteryLevel
  );
  const persistedRepetitions = Math.max(
    0,
    Math.round(Number(persistedResponse?.repetitions ?? currentVerse.repetitions))
  );
  const persistedReviewLapseStreak = Math.max(
    0,
    Math.round(
      Number(
        persistedResponse?.reviewLapseStreak ?? currentVerse.reviewLapseStreak
      )
    )
  );
  const persistedLastReviewedAt =
    parseDate(persistedResponse?.lastReviewedAt ?? currentVerse.lastReviewedAt) ??
    currentVerse.lastReviewedAt;
  const persistedNextReviewAt =
    parseDate(persistedResponse?.nextReviewAt ?? currentVerse.nextReviewAt) ?? null;
  const persistedDisplayStatus =
    persistedStatus === VerseStatus.LEARNING
      ? computeDisplayStatus(persistedMasteryLevel, persistedRepetitions)
      : persistedStatus;
  const persistedLastModeId = normalizeLastModeId(
    persistedResponse?.lastTrainingModeId,
    currentVerse.lastModeId
  );

  return {
    ...currentVerse,
    raw: {
      ...currentVerse.raw,
      ...(persistedResponse?.text ? { text: persistedResponse.text } : {}),
      ...(persistedResponse?.reference ? { reference: persistedResponse.reference } : {}),
      ...(persistedResponse?.tags ? { tags: persistedResponse.tags } : {}),
      ...(persistedResponse?.difficultyLevel
        ? { difficultyLevel: persistedResponse.difficultyLevel }
        : {}),
      externalVerseId:
        persistedResponse?.externalVerseId ?? currentVerse.raw.externalVerseId,
      status: persistedDisplayStatus,
      masteryLevel: persistedMasteryLevel,
      repetitions: persistedRepetitions,
      reviewLapseStreak: persistedReviewLapseStreak,
      lastTrainingModeId: persistedLastModeId,
      lastReviewedAt: persistedLastReviewedAt
        ? persistedLastReviewedAt.toISOString()
        : null,
      nextReviewAt: persistedNextReviewAt ? persistedNextReviewAt.toISOString() : null,
      nextReview: persistedNextReviewAt ? persistedNextReviewAt.toISOString() : null,
    } as Verse,
    status: persistedDisplayStatus,
    rawMasteryLevel: persistedMasteryLevel,
    stageMasteryLevel: toStageMasteryLevel(persistedMasteryLevel),
    repetitions: persistedRepetitions,
    reviewLapseStreak: persistedReviewLapseStreak,
    lastModeId: persistedLastModeId,
    lastReviewedAt: persistedLastReviewedAt,
    nextReviewAt: persistedNextReviewAt,
  };
}

export function useVerseSync({ onDesync }: UseVerseSyncParams) {
  const reconcile = useCallback(
    async (params: {
      optimistic: TrainingVerseState;
      persistedResponse: PersistedTrainingVerse;
    }): Promise<TrainingVerseState> => {
      const persistedVerse = normalizePersistedTrainingVerseState(
        params.optimistic,
        params.persistedResponse
      );

      if (!didTrainingVerseDesync(params.optimistic, persistedVerse)) {
        return persistedVerse;
      }

      const refetchedVerse = await onDesync(params.optimistic.externalVerseId);
      return refetchedVerse ?? persistedVerse;
    },
    [onDesync]
  );

  const recoverFromPatchFailure = useCallback(
    async (externalVerseId: string): Promise<TrainingVerseState | null> =>
      onDesync(externalVerseId),
    [onDesync]
  );

  return {
    reconcile,
    recoverFromPatchFailure,
  };
}
