import type { BibleBook } from "@/app/types/bible";
import {
  HELLOAO_API_BASE_URL,
  fetchHelloaoJson,
  type HelloaoAvailableTranslationsPayload,
  type HelloaoBooksPayload,
  type HelloaoChapterContentItem,
  type HelloaoChapterPayload,
  type HelloaoCompletePayload,
  type HelloaoBookInfo,
  type HelloaoTranslationInfo,
} from "@/modules/verses/infrastructure/helloaoClient";

export { HELLOAO_API_BASE_URL } from "@/modules/verses/infrastructure/helloaoClient";
export type {
  HelloaoBookInfo,
  HelloaoTranslationInfo,
} from "@/modules/verses/infrastructure/helloaoClient";

export const DEFAULT_HELLOAO_TRANSLATION = "rus_syn";

const LEGACY_TRANSLATION_TO_HELLOAO: Record<string, string> = {
  RUS_SYN: DEFAULT_HELLOAO_TRANSLATION,
  SYNOD: DEFAULT_HELLOAO_TRANSLATION,
  NRT: DEFAULT_HELLOAO_TRANSLATION,
  RBS2: DEFAULT_HELLOAO_TRANSLATION,
  BTI: DEFAULT_HELLOAO_TRANSLATION,
};

const BOOKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const CHAPTER_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const COMPLETE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

type BooksCacheEntry = {
  expiresAt: number;
  books: HelloaoBookInfo[];
  byOrder: Map<number, string>;
};

type ChapterCacheEntry = {
  expiresAt: number;
  verses: Map<number, string>;
};

type SearchVerseIndexItem = {
  book: number;
  chapter: number;
  verse: number;
  text: string;
};

type CompleteCacheEntry = {
  expiresAt: number;
  verses: SearchVerseIndexItem[];
};

const booksCache = new Map<string, BooksCacheEntry>();
const booksInFlight = new Map<string, Promise<BooksCacheEntry>>();

const chapterCache = new Map<string, ChapterCacheEntry>();
const chapterInFlight = new Map<string, Promise<Map<number, string>>>();

const completeCache = new Map<string, CompleteCacheEntry>();
const completeInFlight = new Map<string, Promise<SearchVerseIndexItem[]>>();

export interface HelloaoVerse {
  pk: number;
  translation: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

export interface HelloaoSearchParams {
  translation?: string;
  query: string;
  matchCase?: boolean;
  matchWhole?: boolean;
  page?: number;
  limit?: number;
  book?: BibleBook | "ot" | "nt";
  signal?: AbortSignal;
}

export interface HelloaoSearchResponse {
  exact_matches: number;
  total: number;
  results: HelloaoVerse[];
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractTextFromHelloaoNode(node: unknown): string {
  if (typeof node === "string") {
    return node;
  }

  if (Array.isArray(node)) {
    return node
      .map((item) => extractTextFromHelloaoNode(item))
      .filter(Boolean)
      .join(" ");
  }

  if (!node || typeof node !== "object") {
    return "";
  }

  const record = node as Record<string, unknown>;
  const chunks: string[] = [];

  if (typeof record.text === "string") {
    chunks.push(record.text);
  }

  if (record.lineBreak === true) {
    chunks.push(" ");
  }

  if ("content" in record) {
    const nested = extractTextFromHelloaoNode(record.content);
    if (nested) {
      chunks.push(nested);
    }
  }

  return chunks.join(" ");
}

function normalizeTextContent(content: unknown): string {
  return normalizeWhitespace(extractTextFromHelloaoNode(content));
}

function normalizeChapterContentToMap(items: HelloaoChapterContentItem[] | undefined): Map<number, string> {
  const result = new Map<number, string>();
  if (!Array.isArray(items)) return result;

  items.forEach((item) => {
    if (item?.type !== "verse") return;
    const verse = Number(item.number);
    if (!Number.isFinite(verse) || verse <= 0) return;
    const text = normalizeTextContent(item.content);
    result.set(verse, text);
  });

  return result;
}

function normalizeTranslationInput(value?: string | null): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return DEFAULT_HELLOAO_TRANSLATION;
  if (raw.toLowerCase() === DEFAULT_HELLOAO_TRANSLATION) {
    return DEFAULT_HELLOAO_TRANSLATION;
  }
  const mapped = LEGACY_TRANSLATION_TO_HELLOAO[raw.toUpperCase()];
  return mapped ?? DEFAULT_HELLOAO_TRANSLATION;
}

export function normalizeHelloaoTranslation(value?: string | null): string {
  return normalizeTranslationInput(value);
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const result = await fetchHelloaoJson<T>({
    url,
    signal,
    resourceLabel: url,
  });

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

async function getBooksEntry(translationInput?: string): Promise<BooksCacheEntry> {
  const translation = normalizeTranslationInput(translationInput);
  const cached = booksCache.get(translation);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const inFlight = booksInFlight.get(translation);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    const url = `${HELLOAO_API_BASE_URL}/${encodeURIComponent(translation)}/books.json`;
    const payload = await fetchJson<HelloaoBooksPayload>(url);
    const books = Array.isArray(payload?.books) ? payload.books : [];
    if (books.length === 0) {
      throw new Error("No books were returned by helloao API");
    }

    const byOrder = new Map<number, string>();
    books.forEach((book) => {
      const order = Number(book?.order);
      if (Number.isFinite(order) && order > 0 && typeof book?.id === "string") {
        byOrder.set(order, book.id);
      }
    });

    const entry: BooksCacheEntry = {
      expiresAt: Date.now() + BOOKS_CACHE_TTL_MS,
      books,
      byOrder,
    };
    booksCache.set(translation, entry);
    return entry;
  })().finally(() => {
    booksInFlight.delete(translation);
  });

  booksInFlight.set(translation, promise);
  return promise;
}

function chapterCacheKey(translation: string, bookId: string, chapter: number): string {
  return `${translation}|${bookId}|${chapter}`;
}

async function fetchChapterVerseMap(
  translationInput: string | undefined,
  bookId: string,
  chapter: number
): Promise<Map<number, string>> {
  const translation = normalizeTranslationInput(translationInput);
  const key = chapterCacheKey(translation, bookId, chapter);
  const cached = chapterCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return new Map(cached.verses);
  }

  const inFlight = chapterInFlight.get(key);
  if (inFlight) {
    const result = await inFlight;
    return new Map(result);
  }

  const promise = (async () => {
    const url = `${HELLOAO_API_BASE_URL}/${encodeURIComponent(translation)}/${encodeURIComponent(bookId)}/${chapter}.json`;
    const payload = await fetchJson<HelloaoChapterPayload>(url);
    const verses = normalizeChapterContentToMap(payload?.chapter?.content);

    chapterCache.set(key, {
      expiresAt: Date.now() + CHAPTER_CACHE_TTL_MS,
      verses,
    });

    return verses;
  })().finally(() => {
    chapterInFlight.delete(key);
  });

  chapterInFlight.set(key, promise);
  const result = await promise;
  return new Map(result);
}

export async function getHelloaoTranslations(signal?: AbortSignal): Promise<HelloaoTranslationInfo[]> {
  throwIfAborted(signal);
  const payload = await fetchJson<HelloaoAvailableTranslationsPayload>(
    `${HELLOAO_API_BASE_URL}/available_translations.json`,
    signal
  );
  const items = Array.isArray(payload?.translations) ? payload.translations : [];
  return items;
}

export async function getHelloaoBooks(translation?: string): Promise<HelloaoBookInfo[]> {
  const entry = await getBooksEntry(translation);
  return entry.books;
}

export async function resolveHelloaoBookIdByOrder(
  bookOrder: number,
  translation?: string
): Promise<string | null> {
  const entry = await getBooksEntry(translation);
  return entry.byOrder.get(bookOrder) ?? null;
}

export async function getHelloaoChapter(params: {
  translation?: string;
  book: BibleBook;
  chapter: number;
}): Promise<HelloaoVerse[]> {
  const translation = normalizeTranslationInput(params.translation);
  const bookOrder = Number(params.book);
  const chapter = Number(params.chapter);
  if (!Number.isFinite(bookOrder) || bookOrder <= 0 || !Number.isFinite(chapter) || chapter <= 0) {
    throw new Error("Invalid book or chapter");
  }

  const bookId = await resolveHelloaoBookIdByOrder(bookOrder, translation);
  if (!bookId) {
    throw new Error(`Book ${bookOrder} is unavailable for translation ${translation}`);
  }

  const verseMap = await fetchChapterVerseMap(translation, bookId, chapter);
  return Array.from(verseMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([verse, text], index) => ({
      pk: index + 1,
      translation,
      book: bookOrder,
      chapter,
      verse,
      text,
    }));
}

export async function getHelloaoVerse(params: {
  translation?: string;
  book: BibleBook;
  chapter: number;
  verse: number;
}): Promise<HelloaoVerse> {
  const chapterVerses = await getHelloaoChapter({
    translation: params.translation,
    book: params.book,
    chapter: params.chapter,
  });
  const verse = chapterVerses.find((item) => item.verse === Number(params.verse));
  if (!verse) {
    throw new Error("Verse not found");
  }
  return verse;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesQuery(text: string, query: string, matchCase: boolean, matchWhole: boolean): boolean {
  if (query.length === 0) return true;

  if (!matchWhole) {
    return matchCase ? text.includes(query) : text.toLowerCase().includes(query.toLowerCase());
  }

  const escaped = escapeRegExp(query);
  const flags = `${matchCase ? "" : "i"}u`;
  try {
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, flags);
    return regex.test(text);
  } catch {
    return matchCase ? text.includes(query) : text.toLowerCase().includes(query.toLowerCase());
  }
}

function highlightQuery(text: string, query: string, matchCase: boolean, matchWhole: boolean): string {
  if (!query) return text;

  const escaped = escapeRegExp(query);
  if (matchWhole) {
    const flags = `${matchCase ? "g" : "gi"}u`;
    try {
      const regex = new RegExp(
        `(^|[^\\p{L}\\p{N}])(${escaped})(?=$|[^\\p{L}\\p{N}])`,
        flags
      );
      return text.replace(regex, "$1<mark>$2</mark>");
    } catch {
      // Fallback to non-whole-word highlight if unicode classes are unsupported.
    }
  }

  const flags = matchCase ? "g" : "gi";
  return text.replace(new RegExp(escaped, flags), "<mark>$&</mark>");
}

function filterByTestament(item: SearchVerseIndexItem, bookFilter: BibleBook | "ot" | "nt" | undefined): boolean {
  if (!bookFilter) return true;
  if (bookFilter === "ot") return item.book >= 1 && item.book <= 39;
  if (bookFilter === "nt") return item.book >= 40 && item.book <= 66;
  return item.book === Number(bookFilter);
}

async function getSearchIndex(translationInput?: string): Promise<SearchVerseIndexItem[]> {
  const translation = normalizeTranslationInput(translationInput);
  const cached = completeCache.get(translation);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.verses;
  }

  const inFlight = completeInFlight.get(translation);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    const url = `${HELLOAO_API_BASE_URL}/${encodeURIComponent(translation)}/complete.json`;
    const payload = await fetchJson<HelloaoCompletePayload>(url);
    const books = Array.isArray(payload?.books) ? payload.books : [];

    const verses: SearchVerseIndexItem[] = [];
    books.forEach((book) => {
      const bookOrder = Number(book?.order);
      if (!Number.isFinite(bookOrder) || bookOrder <= 0) return;

      const chapters = Array.isArray(book?.chapters) ? book.chapters : [];
      chapters.forEach((chapterEntry) => {
        const chapterNumber = Number(chapterEntry?.chapter?.number);
        if (!Number.isFinite(chapterNumber) || chapterNumber <= 0) return;

        const content = chapterEntry?.chapter?.content;
        if (!Array.isArray(content)) return;

        content.forEach((item) => {
          if (item?.type !== "verse") return;
          const verse = Number(item.number);
          if (!Number.isFinite(verse) || verse <= 0) return;
          const text = normalizeTextContent(item.content);
          verses.push({
            book: bookOrder,
            chapter: chapterNumber,
            verse,
            text,
          });
        });
      });
    });

    completeCache.set(translation, {
      expiresAt: Date.now() + COMPLETE_CACHE_TTL_MS,
      verses,
    });

    return verses;
  })().finally(() => {
    completeInFlight.delete(translation);
  });

  completeInFlight.set(translation, promise);
  return promise;
}

export async function searchHelloaoVerses(params: HelloaoSearchParams): Promise<HelloaoSearchResponse> {
  const query = String(params.query ?? "").trim();
  if (!query) {
    return { exact_matches: 0, total: 0, results: [] };
  }

  const translation = normalizeTranslationInput(params.translation);
  const limit = Math.max(1, Math.min(100, Math.floor(params.limit ?? 20)));
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const matchCase = Boolean(params.matchCase);
  const matchWhole = Boolean(params.matchWhole);

  throwIfAborted(params.signal);
  const source = await getSearchIndex(translation);
  throwIfAborted(params.signal);

  const filtered = source.filter((item) => {
    if (!filterByTestament(item, params.book)) return false;
    return matchesQuery(item.text, query, matchCase, matchWhole);
  });

  const total = filtered.length;
  const start = (page - 1) * limit;
  const pageItems = filtered.slice(start, start + limit);

  const results: HelloaoVerse[] = pageItems.map((item, index) => ({
    pk: start + index + 1,
    translation,
    book: item.book,
    chapter: item.chapter,
    verse: item.verse,
    text: highlightQuery(item.text, query, matchCase, matchWhole),
  }));

  return {
    exact_matches: total,
    total,
    results,
  };
}

export async function getHelloaoChapterVerseMap(params: {
  translation?: string;
  book: number;
  chapter: number;
}): Promise<Map<number, string>> {
  const translation = normalizeTranslationInput(params.translation);
  const book = Number(params.book);
  const chapter = Number(params.chapter);
  if (!Number.isFinite(book) || book <= 0 || !Number.isFinite(chapter) || chapter <= 0) {
    return new Map();
  }

  try {
    const bookId = await resolveHelloaoBookIdByOrder(book, translation);
    if (!bookId) return new Map();
    return await fetchChapterVerseMap(translation, bookId, chapter);
  } catch {
    return new Map();
  }
}
