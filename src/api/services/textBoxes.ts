import { mapUserVerseToAppVerse } from "@/app/domain/verse";
import type {
  ImportToBoxRequest,
  ImportToBoxResult,
  RemoveTextFromBoxResult,
  TextBoxSummary,
  TextBoxVersesResponse,
  TextBoxVersesResponseRecord,
  VerseStatusMutationResult,
} from "@/app/types/textBox";
import { publicApiUrl } from "@/lib/publicApiBase";

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
      sourceKind: item.sourceKind,
      sourceKey: item.sourceKey,
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

export async function importIntoTextBox(
  telegramId: string,
  boxId: string,
  request: ImportToBoxRequest,
  translation?: string,
): Promise<ImportToBoxResult> {
  const response = await fetch(
    withTranslation(
      `/api/users/${encodeURIComponent(telegramId)}/text-boxes/${encodeURIComponent(boxId)}/import`,
      translation,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  return parseApiResponse<ImportToBoxResult>(response);
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

export async function patchVerseStatus(
  telegramId: string,
  externalVerseId: string,
  status: "LEARNING" | "STOPPED" | "MY",
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
