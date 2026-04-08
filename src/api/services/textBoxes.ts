import { mapUserVerseToAppVerse } from "@/app/domain/verse";
import type {
  AddVerseToBoxRequest,
  AddVerseToBoxResult,
  RemoveTextFromBoxResult,
  ReplaceLearningVerseInBoxRequest,
  TextBoxSummary,
  TextBoxVersesResponse,
  TextBoxVersesResponseRecord,
  VerseStatusMutationResult,
} from "@/app/types/textBox";
import { publicApiUrl } from "@/lib/publicApiBase";

export type ReferenceTrainerVersePoolResponse = {
  verses: ReturnType<typeof mapUserVerseToAppVerse>[];
  totalCount: number;
  minRequired: number;
};

export type FlashcardVerseItem = {
  externalVerseId?: string;
  text?: string;
  reference?: string;
  masteryLevel?: number;
  repetitions?: number;
  status?: string;
  flow?: string;
  verse?: { externalVerseId?: string };
};

export type FlashcardVersesResponse = {
  verses: FlashcardVerseItem[];
  totalCount: number;
};

export type AnchorTrainingResult = {
  externalVerseId: string;
  modeId: string;
  outcome: string;
};

export type FlashcardResult = {
  externalVerseId: string;
  mode: string;
  remembered: boolean;
};

export type TrainingSessionXPResponse = {
  xpAwarded: number;
  newTotalXp: number;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = await response.json();
      if (payload && typeof payload.error === "string" && payload.error.trim()) {
        message = payload.error.trim();
      }
    } catch {
      // Ignore malformed error payloads and keep the status-based message.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function withTranslation(path: string, translation?: string) {
  const normalized = translation?.trim();
  if (!normalized) {
    return publicApiUrl(path);
  }
  const separator = path.includes("?") ? "&" : "?";
  return publicApiUrl(`${path}${separator}translation=${encodeURIComponent(normalized)}`);
}

function mapTextBoxVersesResponse(payload: TextBoxVersesResponseRecord): TextBoxVersesResponse {
  return {
    box: payload.box,
    totalCount: payload.totalCount ?? payload.items?.length ?? 0,
    items: (payload.items ?? []).map((item) => ({
      verse: mapUserVerseToAppVerse(item.verse),
    })),
  };
}

export async function fetchTextBoxes(
  telegramId: string,
  translation?: string,
): Promise<TextBoxSummary[]> {
  const response = await fetch(
    withTranslation(`/api/users/${encodeURIComponent(telegramId)}/text-boxes`, translation),
    { cache: "no-store" },
  );
  return parseApiResponse<TextBoxSummary[]>(response);
}

export async function createTextBox(
  telegramId: string,
  title: string,
  translation?: string,
): Promise<TextBoxSummary> {
  const response = await fetch(
    withTranslation(`/api/users/${encodeURIComponent(telegramId)}/text-boxes`, translation),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    },
  );
  return parseApiResponse<TextBoxSummary>(response);
}

export async function updateTextBox(
  telegramId: string,
  boxId: string,
  title: string,
  translation?: string,
): Promise<TextBoxSummary> {
  const response = await fetch(
    withTranslation(
      `/api/users/${encodeURIComponent(telegramId)}/text-boxes/${encodeURIComponent(boxId)}`,
      translation,
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    },
  );
  return parseApiResponse<TextBoxSummary>(response);
}

export async function deleteTextBox(
  telegramId: string,
  boxId: string,
): Promise<void> {
  const response = await fetch(
    publicApiUrl(`/api/users/${encodeURIComponent(telegramId)}/text-boxes/${encodeURIComponent(boxId)}`),
    { method: "DELETE" },
  );
  await parseApiResponse<{ ok: boolean }>(response);
}

export async function fetchTextBoxVerses(
  telegramId: string,
  boxId: string,
  translation?: string,
): Promise<TextBoxVersesResponse> {
  const response = await fetch(
    withTranslation(
      `/api/users/${encodeURIComponent(telegramId)}/text-boxes/${encodeURIComponent(boxId)}/verses`,
      translation,
    ),
    { cache: "no-store" },
  );
  const payload = await parseApiResponse<TextBoxVersesResponseRecord>(response);
  return mapTextBoxVersesResponse(payload);
}

export async function addVerseToTextBox(
  telegramId: string,
  boxId: string,
  request: AddVerseToBoxRequest,
  translation?: string,
): Promise<AddVerseToBoxResult> {
  const response = await fetch(
    withTranslation(
      `/api/users/${encodeURIComponent(telegramId)}/text-boxes/${encodeURIComponent(boxId)}/verses`,
      translation,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  return parseApiResponse<AddVerseToBoxResult>(response);
}

export async function removeTextFromBox(
  telegramId: string,
  boxId: string,
  externalVerseId: string,
): Promise<RemoveTextFromBoxResult> {
  const response = await fetch(
    publicApiUrl(
      `/api/users/${encodeURIComponent(telegramId)}/text-boxes/${encodeURIComponent(boxId)}/verses/${encodeURIComponent(externalVerseId)}`,
    ),
    { method: "DELETE" },
  );
  return parseApiResponse<RemoveTextFromBoxResult>(response);
}

export async function replaceLearningVerseInTextBox(
  telegramId: string,
  boxId: string,
  request: ReplaceLearningVerseInBoxRequest,
): Promise<void> {
  const response = await fetch(
    publicApiUrl(
      `/api/users/${encodeURIComponent(telegramId)}/text-boxes/${encodeURIComponent(boxId)}/replace-learning`,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  await parseApiResponse<unknown>(response);
}

export async function fetchTextBoxReferenceTrainer(
  telegramId: string,
  boxId: string,
  limit = 12,
  translation?: string,
): Promise<ReferenceTrainerVersePoolResponse> {
  const response = await fetch(
    withTranslation(
      `/api/users/${encodeURIComponent(telegramId)}/text-boxes/${encodeURIComponent(boxId)}/training/reference-trainer?limit=${limit}`,
      translation,
    ),
    { cache: "no-store" },
  );
  const payload = await parseApiResponse<{
    verses: Parameters<typeof mapUserVerseToAppVerse>[0][];
    totalCount: number;
    minRequired: number;
  }>(response);

  return {
    verses: (payload.verses ?? []).map((verse) => mapUserVerseToAppVerse(verse)),
    totalCount: payload.totalCount ?? payload.verses?.length ?? 0,
    minRequired: payload.minRequired ?? 1,
  };
}

export async function submitTextBoxReferenceTrainerSession(params: {
  telegramId: string;
  boxId: string;
  results: AnchorTrainingResult[];
}): Promise<TrainingSessionXPResponse> {
  const response = await fetch(
    publicApiUrl(
      `/api/users/${encodeURIComponent(params.telegramId)}/text-boxes/${encodeURIComponent(params.boxId)}/training/reference-trainer/session`,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: params.results }),
    },
  );
  return parseApiResponse<TrainingSessionXPResponse>(response);
}

export async function fetchTextBoxFlashcardVerses(params: {
  telegramId: string;
  boxId: string;
  limit?: number;
  translation?: string;
}): Promise<FlashcardVersesResponse> {
  const limit = params.limit ?? 20;
  const response = await fetch(
    withTranslation(
      `/api/users/${encodeURIComponent(params.telegramId)}/text-boxes/${encodeURIComponent(params.boxId)}/training/flashcard?limit=${limit}`,
      params.translation,
    ),
    { cache: "no-store" },
  );
  return parseApiResponse<FlashcardVersesResponse>(response);
}

export async function submitTextBoxFlashcardSession(params: {
  telegramId: string;
  boxId: string;
  results: FlashcardResult[];
}): Promise<TrainingSessionXPResponse> {
  const response = await fetch(
    publicApiUrl(
      `/api/users/${encodeURIComponent(params.telegramId)}/text-boxes/${encodeURIComponent(params.boxId)}/training/flashcard/session`,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: params.results }),
    },
  );
  return parseApiResponse<TrainingSessionXPResponse>(response);
}

export async function patchVerseStatus(
  telegramId: string,
  externalVerseId: string,
  status: "LEARNING" | "STOPPED" | "QUEUE",
): Promise<VerseStatusMutationResult> {
  const response = await fetch(
    publicApiUrl(`/api/users/${encodeURIComponent(telegramId)}/verses/${encodeURIComponent(externalVerseId)}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  return parseApiResponse<VerseStatusMutationResult>(response);
}
