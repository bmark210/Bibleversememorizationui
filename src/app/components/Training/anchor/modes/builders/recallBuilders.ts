import type { DragQuestion, TrainingVerse, TypeQuestion } from "../../types";
import { shuffle, MAX_TYPING_ATTEMPTS } from "./builderUtils";
import { extractWordTokens } from "../../services/validation";
import { matchesIncipitWithTolerance } from "../../services/validation";

/**
 * Broken Mirror: verse text split into fragments, user reorders them.
 * Requires at least 8 words in the verse.
 */
export function buildBrokenMirrorQuestion(
  verse: TrainingVerse,
  _pool: TrainingVerse[],
  order: number,
): DragQuestion | null {
  const words = extractWordTokens(verse.text);
  if (words.length < 8) return null;

  // Split into 4-6 fragments of 2-4 words each
  const fragmentCount = words.length >= 16 ? 6 : words.length >= 12 ? 5 : 4;
  const wordsPerFragment = Math.ceil(words.length / fragmentCount);

  const fragments: { id: string; text: string }[] = [];
  for (let i = 0; i < words.length; i += wordsPerFragment) {
    const slice = words.slice(i, i + wordsPerFragment);
    fragments.push({
      id: `frag-${order}-${fragments.length}`,
      text: slice.join(" "),
    });
  }

  if (fragments.length < 3) return null;

  const correctOrder = fragments.map((f) => f.id);

  return {
    id: `broken-mirror-${order}-${verse.externalVerseId}`,
    modeId: "broken-mirror",
    modeHint: "Расположите фрагменты стиха в правильном порядке.",
    verse,
    prompt: verse.reference,
    answerLabel: verse.text,
    interaction: "drag",
    fragments: shuffle(fragments),
    correctOrder,
  };
}

/**
 * Skeleton Verse: show first letter of each word, user types full text.
 * Requires at least 4 words.
 */
export function buildSkeletonVerseQuestion(
  verse: TrainingVerse,
  _pool: TrainingVerse[],
  order: number,
): TypeQuestion | null {
  const words = extractWordTokens(verse.text);
  if (words.length < 4) return null;

  const skeleton = words
    .map((word) => {
      const chars = Array.from(word);
      return chars[0]?.toUpperCase() ?? "";
    })
    .filter(Boolean)
    .join(" ");

  if (!skeleton) return null;

  return {
    id: `skeleton-verse-${order}-${verse.externalVerseId}`,
    modeId: "skeleton-verse",
    modeHint: "Восстановите текст стиха по первым буквам слов.",
    verse,
    prompt: `${verse.reference}\n${skeleton}`,
    answerLabel: verse.text,
    interaction: "type",
    placeholder: "Введите полный текст стиха",
    maxAttempts: MAX_TYPING_ATTEMPTS,
    retryHint: skeleton,
    isCorrectInput: (value: string) =>
      matchesIncipitWithTolerance(value, verse.text),
  };
}
