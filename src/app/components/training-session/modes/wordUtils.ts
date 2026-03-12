const SACRED_STEMS = [
  'бог', 'бож', 'господ', 'христ', 'иисус', 'дух',
  'всевышн', 'создател', 'творц', 'творец', 'спасител',
  'мессия', 'утешител', 'вседержител', 'саваоф', 'яхве', 'иегов',
  'сын', 'отц', 'отец', 'отч',
];

export function stripPunctuation(word: string): string {
  const stripped = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return stripped || word;
}

export function isPunctuationOnly(word: string): boolean {
  return !/[\p{L}\p{N}]/u.test(word);
}

export function isSacredWord(word: string): boolean {
  const lower = stripPunctuation(word).toLowerCase();
  return SACRED_STEMS.some((stem) => lower.startsWith(stem));
}

export function cleanWordForDisplay(word: string): string {
  const stripped = stripPunctuation(word);
  if (isSacredWord(stripped)) return stripped;
  return stripped.toLowerCase();
}

export function normalizeWord(word: string): string {
  const stripped = stripPunctuation(word).toLowerCase();
  return stripped || word.toLowerCase();
}

export function tokenizeWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !isPunctuationOnly(w));
}

export function getMaxMistakes(totalWords: number): number {
  return Math.max(5, Math.floor(totalWords * 0.3));
}
