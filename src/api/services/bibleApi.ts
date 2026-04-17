import { OpenAPI } from "@/api/core/OpenAPI";

function baseUrl() {
  return OpenAPI.BASE || "";
}

export interface BibleVerseItem {
  externalVerseId: string;
  bookNumber: number;
  chapter: number;
  verseNumber: number;
  text: string;
  reference: string;
}

export interface BibleChapterResponse {
  items: BibleVerseItem[];
  total: number;
}

export interface BibleVersesPageResponse {
  items: BibleVerseItem[];
  total: number;
  limit: number;
  offset: number;
}

async function apiFetch<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${baseUrl()}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Bible API error: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchBibleChapter(params: {
  bookNumber: number;
  chapter: number;
  translation?: string;
}): Promise<BibleChapterResponse> {
  return apiFetch<BibleChapterResponse>("/api/bible/chapter", {
    bookNumber: params.bookNumber,
    chapter: params.chapter,
    translation: params.translation,
  });
}

export async function fetchBibleVerses(params: {
  translation?: string;
  bookNumber?: number;
  limit?: number;
  offset?: number;
}): Promise<BibleVersesPageResponse> {
  return apiFetch<BibleVersesPageResponse>("/api/bible/verses", {
    translation: params.translation,
    bookNumber: params.bookNumber,
    limit: params.limit,
    offset: params.offset,
  });
}

export async function searchBibleVerses(params: {
  q: string;
  translation?: string;
  bookNumber?: number;
  limit?: number;
  offset?: number;
}): Promise<BibleVersesPageResponse> {
  return apiFetch<BibleVersesPageResponse>("/api/bible/search", {
    q: params.q,
    translation: params.translation,
    bookNumber: params.bookNumber,
    limit: params.limit,
    offset: params.offset,
  });
}
