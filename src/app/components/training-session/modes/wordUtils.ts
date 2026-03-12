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

const MAX_CHOICES_CHARS = 75;

interface VisibleChoiceInput {
  displayText: string;
  normalized: string;
}

/**
 * Pick a subset of choices that fits within ~MAX_CHOICES_CHARS characters.
 * Always includes the correct answer. Fills remaining budget with others.
 */
export function pickVisibleChoices<T extends VisibleChoiceInput>(
  available: T[],
  correctNormalized: string | null,
): T[] {
  if (available.length === 0) return [];

  // Calculate total chars of all choices
  const totalChars = available.reduce((sum, c) => sum + c.displayText.length, 0);
  if (totalChars <= MAX_CHOICES_CHARS) return available;

  const result: T[] = [];
  let usedChars = 0;

  // Always add the correct answer first
  const correct = correctNormalized
    ? available.find((c) => c.normalized === correctNormalized)
    : null;
  if (correct) {
    result.push(correct);
    usedChars += correct.displayText.length;
  }

  // Fill with others
  for (const choice of available) {
    if (correct && choice.normalized === correct.normalized) continue;
    const nextChars = usedChars + choice.displayText.length;
    if (nextChars > MAX_CHOICES_CHARS) continue;
    result.push(choice);
    usedChars = nextChars;
  }

  return result;
}
