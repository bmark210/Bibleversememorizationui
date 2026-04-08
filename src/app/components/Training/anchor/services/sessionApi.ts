import {
  fetchTextBoxReferenceTrainer,
  submitTextBoxReferenceTrainerSession,
  type AnchorTrainingResult,
  type TrainingSessionXPResponse,
} from "@/api/services/textBoxes";

export interface FetchVersesPoolParams {
  telegramId: string;
  boxId: string;
  limit?: number;
  translation?: "NRT" | "SYNOD" | "RBS2" | "BTI";
}

export async function fetchAnchorVersesPool(params: FetchVersesPoolParams) {
  return fetchTextBoxReferenceTrainer(
    params.telegramId,
    params.boxId,
    params.limit ?? 12,
    params.translation,
  );
}

export async function submitAnchorSession(params: {
  telegramId: string;
  boxId: string;
  results: AnchorTrainingResult[];
}): Promise<TrainingSessionXPResponse> {
  return submitTextBoxReferenceTrainerSession(params);
}

export type { AnchorTrainingResult, TrainingSessionXPResponse as AnchorSessionXPResponse };
