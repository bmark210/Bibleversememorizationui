import type { bible_memory_db_internal_domain_AnchorTrainingSessionInput } from "@/api/models/bible_memory_db_internal_domain_AnchorTrainingSessionInput";
import type { bible_memory_db_internal_domain_AnchorTrainingResult } from "@/api/models/bible_memory_db_internal_domain_AnchorTrainingResult";
import type { bible_memory_db_internal_domain_FlashcardSessionInput } from "@/api/models/bible_memory_db_internal_domain_FlashcardSessionInput";
import type { bible_memory_db_internal_domain_FlashcardSessionResult } from "@/api/models/bible_memory_db_internal_domain_FlashcardSessionResult";
import type { internal_api_FlashcardResponse } from "@/api/models/internal_api_FlashcardResponse";
import type { internal_api_FlashcardSessionResponse } from "@/api/models/internal_api_FlashcardSessionResponse";
import type { internal_api_ReferenceTrainerResponse } from "@/api/models/internal_api_ReferenceTrainerResponse";
import type { internal_api_ReplaceLearningVerseResponse } from "@/api/models/internal_api_ReplaceLearningVerseResponse";
import { OpenAPI } from "@/api/core/OpenAPI";
import { request } from "@/api/core/request";
import { UserVersesService } from "@/api/services/UserVersesService";
import type {
  AddVerseToBoxRequest,
  AddVerseToBoxResult,
  PublicTextBoxDetailResponse,
  PublicTextBoxesPageResponse,
  RemoveTextFromBoxResult,
  ReplaceLearningVerseInBoxRequest,
  TextBoxSummary,
  TextBoxVersesResponse,
  TextBoxVisibility,
} from "@/app/types/textBox";

function translationQuery(translation?: string): Record<string, string> | undefined {
  if (!translation) return undefined;
  return { translation };
}

export async function fetchTextBoxes(
  telegramId: string,
  translation?: string,
): Promise<TextBoxSummary[]> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/users/{telegramId}/text-boxes",
    path: { telegramId },
    query: translationQuery(translation),
  });
}

export async function createTextBox(
  telegramId: string,
  title: string,
  translation?: string,
): Promise<TextBoxSummary> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/users/{telegramId}/text-boxes",
    path: { telegramId },
    query: translationQuery(translation),
    body: {
      title,
      visibility: "private" satisfies TextBoxVisibility,
    },
  });
}

export async function updateTextBox(
  telegramId: string,
  boxId: string,
  patch: { title?: string; visibility?: TextBoxVisibility },
  translation?: string,
): Promise<TextBoxSummary> {
  return request(OpenAPI, {
    method: "PATCH",
    url: "/api/users/{telegramId}/text-boxes/{boxId}",
    path: { telegramId, boxId },
    query: translationQuery(translation),
    body: patch,
  });
}

export async function deleteTextBox(
  telegramId: string,
  boxId: string,
): Promise<void> {
  await request(OpenAPI, {
    method: "DELETE",
    url: "/api/users/{telegramId}/text-boxes/{boxId}",
    path: { telegramId, boxId },
  });
}

export async function importPublicTextBox(
  telegramId: string,
  sourceBoxId: string,
  translation?: string,
): Promise<TextBoxSummary> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/users/{telegramId}/text-boxes/import-public/{boxId}",
    path: { telegramId, boxId: sourceBoxId },
    query: translationQuery(translation),
  });
}

export async function fetchPublicTextBoxes(params: {
  translation?: string;
  limit: number;
  offset: number;
}): Promise<PublicTextBoxesPageResponse> {
  const { translation, limit, offset } = params;
  return request(OpenAPI, {
    method: "GET",
    url: "/api/text-boxes/public",
    query: {
      limit,
      offset,
      ...translationQuery(translation),
    },
  });
}

export async function fetchPublicTextBoxDetail(
  boxId: string,
  translation?: string,
): Promise<PublicTextBoxDetailResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/text-boxes/public/{boxId}",
    path: { boxId },
    query: translationQuery(translation),
  });
}

export async function fetchTextBoxVerses(
  telegramId: string,
  boxId: string,
  translation?: string,
): Promise<TextBoxVersesResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/users/{telegramId}/text-boxes/{boxId}/verses",
    path: { telegramId, boxId },
    query: translationQuery(translation),
  });
}

export async function addVerseToTextBox(
  telegramId: string,
  boxId: string,
  body: AddVerseToBoxRequest,
): Promise<AddVerseToBoxResult> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/users/{telegramId}/text-boxes/{boxId}/verses",
    path: { telegramId, boxId },
    body,
  });
}

export async function replaceLearningVerseInTextBox(
  telegramId: string,
  boxId: string,
  body: ReplaceLearningVerseInBoxRequest,
): Promise<internal_api_ReplaceLearningVerseResponse> {
  return request(OpenAPI, {
    method: "POST",
    url: "/api/users/{telegramId}/text-boxes/{boxId}/replace-learning",
    path: { telegramId, boxId },
    body,
  });
}

export async function removeTextFromBox(
  telegramId: string,
  boxId: string,
  externalVerseId: string,
): Promise<RemoveTextFromBoxResult> {
  return request(OpenAPI, {
    method: "DELETE",
    url: "/api/users/{telegramId}/text-boxes/{boxId}/verses/{externalVerseId}",
    path: { telegramId, boxId, externalVerseId },
  });
}

export async function patchVerseStatus(
  telegramId: string,
  externalVerseId: string,
  status: "LEARNING" | "STOPPED" | "QUEUE",
) {
  return UserVersesService.patchUserVerse(telegramId, externalVerseId, {
    status,
  });
}

export type FlashcardResult = bible_memory_db_internal_domain_FlashcardSessionResult;
export type FlashcardVersesResponse = internal_api_FlashcardResponse;
export type TrainingSessionXPResponse = internal_api_FlashcardSessionResponse;

export async function fetchTextBoxFlashcardVerses(params: {
  telegramId: string;
  boxId: string;
  limit?: number;
  translation?: string;
}): Promise<FlashcardVersesResponse> {
  const { telegramId, boxId, limit, translation } = params;
  return request(OpenAPI, {
    method: "GET",
    url: "/api/users/{telegramId}/text-boxes/{boxId}/training/flashcard",
    path: { telegramId, boxId },
    query: {
      ...(limit != null ? { limit } : {}),
      ...translationQuery(translation),
    },
  });
}

export async function submitTextBoxFlashcardSession(params: {
  telegramId: string;
  boxId: string;
  results: FlashcardResult[];
}): Promise<TrainingSessionXPResponse> {
  const body: bible_memory_db_internal_domain_FlashcardSessionInput = {
    results: params.results,
  };
  return request(OpenAPI, {
    method: "POST",
    url: "/api/users/{telegramId}/text-boxes/{boxId}/training/flashcard/session",
    path: { telegramId: params.telegramId, boxId: params.boxId },
    body,
  });
}

export type AnchorTrainingResult = bible_memory_db_internal_domain_AnchorTrainingResult;

export async function fetchTextBoxReferenceTrainer(
  telegramId: string,
  boxId: string,
  limit?: number,
  translation?: "NRT" | "SYNOD" | "RBS2" | "BTI",
): Promise<internal_api_ReferenceTrainerResponse> {
  return request(OpenAPI, {
    method: "GET",
    url: "/api/users/{telegramId}/text-boxes/{boxId}/training/reference-trainer",
    path: { telegramId, boxId },
    query: {
      ...(limit != null ? { limit } : {}),
      ...translationQuery(translation),
    },
  });
}

export async function submitTextBoxReferenceTrainerSession(params: {
  telegramId: string;
  boxId: string;
  results: AnchorTrainingResult[];
}): Promise<TrainingSessionXPResponse> {
  const body: bible_memory_db_internal_domain_AnchorTrainingSessionInput = {
    results: params.results,
  };
  return request(OpenAPI, {
    method: "POST",
    url: "/api/users/{telegramId}/text-boxes/{boxId}/training/reference-trainer/session",
    path: { telegramId: params.telegramId, boxId: params.boxId },
    body,
  });
}
