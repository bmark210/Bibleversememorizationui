export const MAX_EXTERNAL_VERSE_RANGE_SIZE = 5;

export type ParsedExternalVerseId = {
  book: number;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};

type ParseExternalVerseIdOptions = {
  maxRangeSize?: number;
  allowRange?: boolean;
};

function toPositiveInteger(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function parseExternalVerseId(
  value: string | null | undefined,
  options?: ParseExternalVerseIdOptions
): ParsedExternalVerseId | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;

  const rawParts = normalized.split("-");
  if (rawParts.length !== 3 && rawParts.length !== 4) return null;

  const parts = rawParts.map(toPositiveInteger);
  if (parts.some((part) => part === null)) return null;

  const [book, chapter, verseStartRaw, verseEndRaw] = parts as [
    number,
    number,
    number,
    number | undefined,
  ];
  const verseStart = verseStartRaw;
  const verseEnd = verseEndRaw ?? verseStartRaw;

  if (verseStart > verseEnd) return null;
  if (options?.allowRange === false && verseStart !== verseEnd) return null;

  const maxRangeSize = options?.maxRangeSize ?? MAX_EXTERNAL_VERSE_RANGE_SIZE;
  const rangeSize = verseEnd - verseStart + 1;
  if (rangeSize > maxRangeSize) return null;

  return {
    book,
    chapter,
    verseStart,
    verseEnd,
  };
}

export function isExternalVerseRange(parsed: ParsedExternalVerseId): boolean {
  return parsed.verseStart !== parsed.verseEnd;
}

export function getExternalVerseRangeSize(parsed: ParsedExternalVerseId): number {
  return parsed.verseEnd - parsed.verseStart + 1;
}

export function toCanonicalExternalVerseId(parsed: ParsedExternalVerseId): string {
  if (parsed.verseStart === parsed.verseEnd) {
    return `${parsed.book}-${parsed.chapter}-${parsed.verseStart}`;
  }
  return `${parsed.book}-${parsed.chapter}-${parsed.verseStart}-${parsed.verseEnd}`;
}

export function canonicalizeExternalVerseId(
  value: string | null | undefined,
  options?: ParseExternalVerseIdOptions
): string | null {
  const parsed = parseExternalVerseId(value, options);
  if (!parsed) return null;
  return toCanonicalExternalVerseId(parsed);
}

export function expandParsedExternalVerseNumbers(
  parsed: ParsedExternalVerseId
): number[] {
  const verses: number[] = [];
  for (let verse = parsed.verseStart; verse <= parsed.verseEnd; verse += 1) {
    verses.push(verse);
  }
  return verses;
}

export function formatParsedExternalVerseReference(
  parsed: ParsedExternalVerseId,
  bookName: string
): string {
  if (parsed.verseStart === parsed.verseEnd) {
    return `${bookName} ${parsed.chapter}:${parsed.verseStart}`;
  }
  return `${bookName} ${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}`;
}
