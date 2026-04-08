import { publicApiUrl } from "@/lib/publicApiBase";
import type {
  ChapterProgressResponse,
} from "@/app/types/chapter";

/**
 * GET /api/users/{telegramId}/chapter-progress?bookId=N
 * Returns per-chapter verse counts for a user within a Bible book.
 */
export async function fetchChapterProgress(
  telegramId: string,
  bookId: number,
): Promise<ChapterProgressResponse> {
  const url = publicApiUrl(
    `/api/users/${encodeURIComponent(telegramId)}/chapter-progress?bookId=${bookId}`,
  );
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetchChapterProgress: ${res.status}`);
  }
  const data = await res.json();
  return {
    bookId: data.bookId ?? bookId,
    items: data.items ?? [],
  };
}

/**
 * GET /api/verses/chapter-counts?bookId=N
 * Returns a map of { [chapterNo]: verseCount } from the global catalog.
 */
export async function fetchCatalogChapterCounts(
  bookId: number,
): Promise<Record<number, number>> {
  const url = publicApiUrl(`/api/verses/chapter-counts?bookId=${bookId}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetchCatalogChapterCounts: ${res.status}`);
  }
  const data = await res.json();
  // The backend returns a JSON object; keys may come as strings
  const result: Record<number, number> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    result[Number(k)] = v as number;
  }
  return result;
}
