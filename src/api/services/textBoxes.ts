import type { domain_AnchorTrainingResult } from "@/api/models/domain_AnchorTrainingResult";
import type { domain_AnchorTrainingSessionInput } from "@/api/models/domain_AnchorTrainingSessionInput";
import type { domain_FlashcardSessionInput } from "@/api/models/domain_FlashcardSessionInput";
import type { domain_FlashcardSessionResult } from "@/api/models/domain_FlashcardSessionResult";
import { TextBoxesService } from "@/api/services/TextBoxesService";
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

// ── Text Box CRUD ─────────────────────────────────────────────────────────────

export async function fetchTextBoxes(
  telegramId: string,
  translation?: string,
): Promise<TextBoxSummary[]> {
  return TextBoxesService.listTextBoxes(telegramId, translation) as Promise<TextBoxSummary[]>;
}

export async function createTextBox(
  telegramId: string,
  title: string,
  visibility: TextBoxVisibility = "private",
  translation?: string,
): Promise<TextBoxSummary> {
  return TextBoxesService.createTextBox(
    telegramId,
    { title, visibility },
    translation,
  ) as Promise<TextBoxSummary>;
}

export async function updateTextBox(
  telegramId: string,
  boxId: string,
  patch: { title?: string; visibility?: TextBoxVisibility },
  translation?: string,
): Promise<TextBoxSummary> {
  return TextBoxesService.updateTextBox(
    telegramId,
    boxId,
    patch,
    translation,
  ) as Promise<TextBoxSummary>;
}

export async function deleteTextBox(
  telegramId: string,
  boxId: string,
): Promise<void> {
  await TextBoxesService.deleteTextBox(telegramId, boxId);
}

export async function importPublicTextBox(
  telegramId: string,
  sourceBoxId: string,
  translation?: string,
): Promise<TextBoxSummary> {
  return TextBoxesService.importPublicTextBox(
    telegramId,
    sourceBoxId,
    translation,
  ) as Promise<TextBoxSummary>;
}

// ── Public Boxes ──────────────────────────────────────────────────────────────

export async function fetchPublicTextBoxes(params: {
  translation?: string;
  limit: number;
  offset: number;
}): Promise<PublicTextBoxesPageResponse> {
  return TextBoxesService.listPublicTextBoxes(
    params.translation,
    params.limit,
    params.offset,
  ) as Promise<PublicTextBoxesPageResponse>;
}

export async function fetchFriendTextBoxes(params: {
  telegramId: string;
  translation?: string;
  limit: number;
  offset: number;
}): Promise<PublicTextBoxesPageResponse> {
  return TextBoxesService.listFriendTextBoxes(
    params.telegramId,
    params.translation,
    params.limit,
    params.offset,
  ) as Promise<PublicTextBoxesPageResponse>;
}

export async function fetchPublicTextBoxDetail(
  boxId: string,
  telegramId?: string,
  translation?: string,
): Promise<PublicTextBoxDetailResponse> {
  return TextBoxesService.getPublicTextBox(
    boxId,
    telegramId,
    translation,
  ) as Promise<PublicTextBoxDetailResponse>;
}

// ── Box Verses ────────────────────────────────────────────────────────────────

export async function fetchTextBoxVerses(
  telegramId: string,
  boxId: string,
  translation?: string,
): Promise<TextBoxVersesResponse> {
  return TextBoxesService.listTextBoxVerses(
    telegramId,
    boxId,
    translation,
  ) as Promise<TextBoxVersesResponse>;
}

export async function addVerseToTextBox(
  telegramId: string,
  boxId: string,
  body: AddVerseToBoxRequest,
  translation?: string,
): Promise<AddVerseToBoxResult> {
  return TextBoxesService.addVerseToTextBox(
    telegramId,
    boxId,
    { externalVerseId: body.externalVerseId },
    translation,
  ) as Promise<AddVerseToBoxResult>;
}

export async function replaceLearningVerseInTextBox(
  telegramId: string,
  boxId: string,
  body: ReplaceLearningVerseInBoxRequest,
) {
  return TextBoxesService.replaceLearningVerseInTextBox(telegramId, boxId, body);
}

export async function removeTextFromBox(
  telegramId: string,
  boxId: string,
  externalVerseId: string,
): Promise<RemoveTextFromBoxResult> {
  return TextBoxesService.removeVerseFromTextBox(
    telegramId,
    boxId,
    externalVerseId,
  ) as Promise<RemoveTextFromBoxResult>;
}

// ── Verse Status ──────────────────────────────────────────────────────────────

export async function patchVerseStatus(
  telegramId: string,
  externalVerseId: string,
  status: "LEARNING" | "STOPPED" | "QUEUE",
) {
  return UserVersesService.patchUserVerse(telegramId, externalVerseId, {
    status,
  });
}

// ── Flashcard Training ────────────────────────────────────────────────────────

export type FlashcardResult = domain_FlashcardSessionResult;
export type FlashcardVersesResponse = Awaited<
  ReturnType<typeof TextBoxesService.getTextBoxFlashcard>
>;
export type TrainingSessionXPResponse = Awaited<
  ReturnType<typeof TextBoxesService.textBoxFlashcardSession>
>;

export async function fetchTextBoxFlashcardVerses(params: {
  telegramId: string;
  boxId: string;
  limit?: number;
  translation?: string;
}): Promise<FlashcardVersesResponse> {
  return TextBoxesService.getTextBoxFlashcard(
    params.telegramId,
    params.boxId,
    params.limit,
    params.translation,
  );
}

export async function submitTextBoxFlashcardSession(params: {
  telegramId: string;
  boxId: string;
  results: domain_FlashcardSessionResult[];
}): Promise<TrainingSessionXPResponse> {
  const body: domain_FlashcardSessionInput = { results: params.results };
  return TextBoxesService.textBoxFlashcardSession(
    params.telegramId,
    params.boxId,
    body,
  );
}

// ── Reference Trainer ─────────────────────────────────────────────────────────

export type AnchorTrainingResult = domain_AnchorTrainingResult;

export async function fetchTextBoxReferenceTrainer(
  telegramId: string,
  boxId: string,
  limit?: number,
  translation?: "NRT" | "SYNOD" | "RBS2" | "BTI",
) {
  return TextBoxesService.getTextBoxReferenceTrainer(
    telegramId,
    boxId,
    limit,
    translation,
  );
}

export async function submitTextBoxReferenceTrainerSession(params: {
  telegramId: string;
  boxId: string;
  results: domain_AnchorTrainingResult[];
}) {
  const body: domain_AnchorTrainingSessionInput = { results: params.results };
  return TextBoxesService.textBoxReferenceTrainerSession(
    params.telegramId,
    params.boxId,
    body,
  );
}
