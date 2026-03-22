import type { ChoiceQuestion, TrainingVerse } from "../../types";
import { extractWordTokens } from "../../services/validation";

export type ImpostorWordData = {
  changedWord: string;
  correctWord: string;
  wordIndex: number;
};

/**
 * Reconstruct modified text by replacing the word at wordIndex.
 */
function buildModifiedText(
  originalText: string,
  data: ImpostorWordData,
): string | null {
  const words = extractWordTokens(originalText);
  if (data.wordIndex < 0 || data.wordIndex >= words.length) return null;
  words[data.wordIndex] = data.changedWord;
  return words.join(" ");
}

/**
 * Impostor Word: AI replaces one word, user identifies the fake.
 * Requires AI data from the generate-exercise API route.
 */
export function buildImpostorWordQuestion(
  verse: TrainingVerse,
  _pool: TrainingVerse[],
  order: number,
  aiData?: unknown,
): ChoiceQuestion | null {
  const data = aiData as ImpostorWordData | undefined;
  if (!data?.changedWord || !data?.correctWord || data.wordIndex == null) return null;

  // Если AI вернул то же слово — отбрасываем (защита от кэшированных невалидных ответов)
  if (data.changedWord.toLowerCase() === data.correctWord.toLowerCase()) return null;

  const modified = buildModifiedText(verse.text, data);
  if (!modified) return null;

  const words = extractWordTokens(modified);
  if (words.length < 3) return null;

  return {
    id: `impostor-word-${order}-${verse.externalVerseId}`,
    modeId: "impostor-word",
    modeHint: "Найдите слово, которое было заменено.",
    verse,
    prompt: `${verse.reference}\n${modified}`,
    answerLabel: data.correctWord,
    interaction: "choice",
    options: words,
    isCorrectOption: (value: string) =>
      value.toLowerCase() === data.changedWord.toLowerCase(),
  };
}
