import type { ChoiceQuestion, TrainingVerse } from "../../types";
import { extractWordTokens } from "../../services/validation";

export type ImpostorWordData = {
  original: string;
  modified: string;
  changedWord: string;
  correctWord: string;
  wordIndex: number;
};

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
  if (!data?.modified || !data?.changedWord) return null;

  const words = extractWordTokens(data.modified);
  if (words.length < 3) return null;

  return {
    id: `impostor-word-${order}-${verse.externalVerseId}`,
    modeId: "impostor-word",
    modeHint: "Найдите слово, которое было заменено.",
    verse,
    prompt: `${verse.reference}\n${data.modified}`,
    answerLabel: data.correctWord,
    interaction: "choice",
    options: words,
    isCorrectOption: (value: string) =>
      value.toLowerCase() === data.changedWord.toLowerCase(),
  };
}
