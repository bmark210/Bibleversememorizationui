import type { domain_ReferenceTrainerSessionInput } from "@/api/models/domain_ReferenceTrainerSessionInput";
import type { domain_ReferenceTrainerSessionUpdate } from "@/api/models/domain_ReferenceTrainerSessionUpdate";
import type { api_ReferenceTrainerResponse } from "@/api/models/api_ReferenceTrainerResponse";
import type { api_ReferenceTrainerSessionResponse } from "@/api/models/api_ReferenceTrainerSessionResponse";
import { UserVersesService } from "@/api/services/UserVersesService";
import type {
  ReferenceTrainerSessionTrack,
  ReferenceTrainerSessionUpdate,
} from "@/modules/reference-trainer/domain/ReferenceTrainerTypes";

export async function fetchReferenceTrainerVerses(
  telegramId: string,
  params?: { limit?: number }
): Promise<api_ReferenceTrainerResponse> {
  return UserVersesService.getReferenceTrainer(
    telegramId,
    params?.limit ?? 12
  );
}

export async function submitReferenceTrainerSession(params: {
  telegramId: string;
  sessionTrack: ReferenceTrainerSessionTrack;
  updates: Array<ReferenceTrainerSessionUpdate>;
}): Promise<api_ReferenceTrainerSessionResponse> {
  const updates: Array<domain_ReferenceTrainerSessionUpdate> =
    params.updates.map((u) => ({
      externalVerseId: u.externalVerseId,
      outcome: u.outcome,
      track: u.track,
    }));

  const body: domain_ReferenceTrainerSessionInput = {
    sessionTrack: params.sessionTrack,
    updates,
  };

  return UserVersesService.saveReferenceTrainerSession(
    params.telegramId,
    body
  );
}
