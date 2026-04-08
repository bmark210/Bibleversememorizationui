import {
  fetchTextBoxFlashcardVerses,
  submitTextBoxFlashcardSession,
  type FlashcardResult,
  type FlashcardVersesResponse,
  type TrainingSessionXPResponse,
} from "@/api/services/textBoxes";

export interface FetchFlashcardVersesParams {
  telegramId: string;
  boxId: string;
  limit?: number;
  translation?: string;
}

export interface FlashcardVerseItem {
  externalVerseId?: string;
  text?: string;
  reference?: string;
  masteryLevel?: number;
  repetitions?: number;
  status?: string;
  flow?: string;
  verse?: { externalVerseId?: string };
}

export async function fetchFlashcardVerses(
  params: FetchFlashcardVersesParams,
): Promise<FlashcardVersesResponse> {
  return fetchTextBoxFlashcardVerses(params);
}

export async function submitFlashcardSession(params: {
  telegramId: string;
  boxId: string;
  results: FlashcardResult[];
}): Promise<TrainingSessionXPResponse> {
  return submitTextBoxFlashcardSession(params);
}

export type { FlashcardResult, FlashcardVersesResponse, TrainingSessionXPResponse as FlashcardSessionXPResponse };
