import { OpenAPI } from "@/api/core/OpenAPI";

export interface FetchFlashcardVersesParams {
  telegramId: string;
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

export interface FlashcardVersesResponse {
  verses: FlashcardVerseItem[];
  totalCount: number;
}

export interface FlashcardResult {
  externalVerseId: string;
  mode: string;
  remembered: boolean;
}

export interface FlashcardSessionXPResponse {
  xpAwarded: number;
  newTotalXp: number;
}

export async function fetchFlashcardVerses(
  params: FetchFlashcardVersesParams,
): Promise<FlashcardVersesResponse> {
  const baseUrl = OpenAPI.BASE || "";
  const url = new URL(`${baseUrl}/api/users/${params.telegramId}/verses/flashcard`);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.translation) url.searchParams.set("translation", params.translation);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Fetch flashcard verses failed: ${res.status}`);
  return res.json();
}

export async function submitFlashcardSession(params: {
  telegramId: string;
  results: FlashcardResult[];
}): Promise<FlashcardSessionXPResponse> {
  const baseUrl = OpenAPI.BASE || "";
  const res = await fetch(
    `${baseUrl}/api/users/${params.telegramId}/verses/flashcard/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: params.results }),
    },
  );
  if (!res.ok) throw new Error(`Submit flashcard session failed: ${res.status}`);
  return res.json();
}
