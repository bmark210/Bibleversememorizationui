/**
 * AnchorSessionAPI Service
 * Isolated API calls for anchor training sessions
 * Provides type-safe interface to backend endpoints
 */

import type { api_ReferenceTrainerResponse } from "@/api/models/api_ReferenceTrainerResponse";
import type { api_ReferenceTrainerSessionResponse } from "@/api/models/api_ReferenceTrainerSessionResponse";
import type { domain_ReferenceTrainerSessionInput } from "@/api/models/domain_ReferenceTrainerSessionInput";
import { UserVersesService } from "@/api/services/UserVersesService";
import type { ReferenceTrainerSessionTrack } from "@/modules/reference-trainer/domain/ReferenceTrainerTypes";

export interface FetchVersesPoolParams {
  telegramId: string;
  limit?: number;
  translation?: "NRT" | "SYNOD" | "RBS2" | "BTI";
}

export interface SubmitSessionParams {
  telegramId: string;
  sessionTrack: ReferenceTrainerSessionTrack;
  updates: Array<{
    externalVerseId: string;
    track: "reference" | "incipit" | "ending" | "context";
    outcome: "correct_first" | "correct_retry" | "wrong";
  }>;
}

/**
 * Fetches the verse pool for anchor training
 * @throws Error if request fails
 */
export async function fetchAnchorVersesPool(
  params: FetchVersesPoolParams
): Promise<api_ReferenceTrainerResponse> {
  return UserVersesService.getReferenceTrainer(
    params.telegramId,
    params.limit ?? 12,
    params.translation
  );
}

/**
 * Submits anchor training session results
 * Updates verse skill scores based on session performance
 * @throws Error if request fails
 */
export async function submitAnchorSession(
  params: SubmitSessionParams
): Promise<api_ReferenceTrainerSessionResponse> {
  const body: domain_ReferenceTrainerSessionInput = {
    sessionTrack: params.sessionTrack,
    updates: params.updates.map((u) => ({
      externalVerseId: u.externalVerseId,
      track: u.track,
      outcome: u.outcome,
    })),
  };

  return UserVersesService.saveReferenceTrainerSession(
    params.telegramId,
    body
  );
}
