import type { domain_ReferenceTrainerSessionInput } from "@/api/models/domain_ReferenceTrainerSessionInput";
import type { domain_ReferenceTrainerSessionUpdate } from "@/api/models/domain_ReferenceTrainerSessionUpdate";
import type { domain_UserVerse } from "@/api/models/domain_UserVerse";
import { UserVersesService } from "@/api/services/UserVersesService";
import type {
  ReferenceTrainerOutcome,
  ReferenceTrainerSessionTrack,
  ReferenceTrainerSessionUpdate,
} from "@/modules/reference-trainer/domain/ReferenceTrainerTypes";

export type ReferenceTrainerSessionOutcome = ReferenceTrainerOutcome;

export type { ReferenceTrainerSessionTrack, ReferenceTrainerSessionUpdate };

function externalIdFromUserVerse(row: domain_UserVerse): string {
  return String(row.verse?.externalVerseId ?? row.verseId ?? "");
}

function mapUpdatedScores(
  rows: Array<domain_UserVerse> | undefined
): Array<{
  externalVerseId: string;
  referenceScore: number;
  incipitScore: number;
  contextScore: number;
}> {
  return (rows ?? [])
    .map((row) => {
      const externalVerseId = externalIdFromUserVerse(row);
      if (!externalVerseId) return null;
      return {
        externalVerseId,
        referenceScore: Math.max(0, Math.round(row.referenceScore ?? 0)),
        incipitScore: Math.max(0, Math.round(row.incipitScore ?? 0)),
        contextScore: Math.max(0, Math.round(row.contextScore ?? 0)),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

export async function fetchReferenceTrainerVerses(
  telegramId: string,
  params?: { limit?: number }
): Promise<{
  verses: Array<domain_UserVerse>;
  totalCount: number;
  minRequired: number;
}> {
  const raw = await UserVersesService.getReferenceTrainer(
    telegramId,
    params?.limit ?? 12
  );
  const verses = raw.verses ?? [];
  return {
    verses,
    totalCount: Math.max(0, Math.round(raw.totalCount ?? verses.length)),
    minRequired: Math.max(0, Math.round(raw.minRequired ?? 0)),
  };
}

export async function submitReferenceTrainerSession(params: {
  telegramId: string;
  sessionTrack: ReferenceTrainerSessionTrack;
  updates: Array<ReferenceTrainerSessionUpdate>;
}): Promise<{
  updated: Array<{
    externalVerseId: string;
    referenceScore: number;
    incipitScore: number;
    contextScore: number;
  }>;
}> {
  const updates: Array<domain_ReferenceTrainerSessionUpdate> = params.updates.map(
    (u) => ({
      externalVerseId: u.externalVerseId,
      outcome: u.outcome,
      track: u.track,
    })
  );

  const body: domain_ReferenceTrainerSessionInput = {
    sessionTrack: params.sessionTrack,
    updates,
  };

  const response = await UserVersesService.saveReferenceTrainerSession(
    params.telegramId,
    body
  );

  return {
    updated: mapUpdatedScores(response.updated),
  };
}
