import { tokenizeWords, getComparableFirstLetter } from './wordUtils';

export type HintLevel = 0 | 1 | 2 | 3;

export const HINT_LEVEL_MAX: HintLevel = 3;

export function generateHintText(
  verseText: string,
  level: HintLevel,
): string {
  if (level === 0) return '';

  const words = tokenizeWords(verseText);

  if (level === 1) {
    return words
      .map((w) => getComparableFirstLetter(w).toUpperCase())
      .join(' ');
  }

  if (level === 2) {
    const count = Math.min(4, Math.max(2, Math.ceil(words.length * 0.2)));
    return words.slice(0, count).join(' ') + '\u2026';
  }

  return verseText;
}

export function getMaxRatingForHintLevel(level: HintLevel): 0 | 1 | 2 {
  if (level >= 3) return 0;
  if (level >= 1) return 1;
  return 2;
}
