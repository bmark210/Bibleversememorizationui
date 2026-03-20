import type { UserVerse } from "../models/UserVerse";
import { UserVersesService } from "./UserVersesService";

export type ReferenceTrainerSessionTrack =
  | "reference"
  | "incipit"
  | "ending"
  | "context"
  | "mixed";
export type ReferenceTrainerSkillTrack =
  | "reference"
  | "incipit"
  | "ending"
  | "context";
export type ReferenceTrainerSessionOutcome =
  | "correct_first"
  | "correct_retry"
  | "wrong";

export type ReferenceTrainerSessionUpdate = {
  externalVerseId: string;
  track: ReferenceTrainerSkillTrack;
  outcome: ReferenceTrainerSessionOutcome;
};

export type ReferenceTrainerSessionResponse = {
  updated: Array<{
    externalVerseId: string;
    referenceScore: number;
    incipitScore: number;
    contextScore: number;
  }>;
};

export type ReferenceTrainerVersesResponse = {
  verses: Array<UserVerse>;
  totalCount: number;
  minRequired: number;
};

export async function fetchReferenceTrainerVerses(
  telegramId: string,
  options?: {
    limit?: number;
  }
): Promise<ReferenceTrainerVersesResponse> {
  const limit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.round(options.limit))
      : 12;

  const data = await UserVersesService.getReferenceTrainer(telegramId, limit);
  const verses = data.verses ?? [];
  return {
    verses,
    totalCount: data.totalCount ?? verses.length,
    minRequired: data.minRequired ?? 10,
  };
}

export async function submitReferenceTrainerSession(params: {
  telegramId: string;
  sessionTrack: ReferenceTrainerSessionTrack;
  updates: ReferenceTrainerSessionUpdate[];
}): Promise<ReferenceTrainerSessionResponse> {
  const raw = await UserVersesService.saveReferenceTrainerSession(params.telegramId, {
    sessionTrack: params.sessionTrack,
    updates: params.updates,
  });

  const rows = Array.isArray(raw.updated) ? raw.updated : [];
  const updated = rows.map((row) => {
    const ext =
      row?.verse?.externalVerseId != null && String(row.verse.externalVerseId).trim()
        ? String(row.verse.externalVerseId)
        : String((row as { externalVerseId?: string }).externalVerseId ?? "");
    return {
      externalVerseId: ext,
      referenceScore: Number(row?.referenceScore ?? 0),
      incipitScore: Number(row?.incipitScore ?? 0),
      contextScore: Number(row?.contextScore ?? 0),
    };
  });
  return { updated };
}
