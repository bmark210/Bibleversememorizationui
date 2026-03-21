/**
 * Ending-track question builders:
 * - buildEndingChoiceQuestion
 */

import type { ChoiceQuestion, TrainingVerse } from "../../types";
import { normalizeIncipitText } from "../../services/validation";
import { CONFIG, shuffle } from "./builderUtils";

// ---------------------------------------------------------------------------
// ending-choice
// ---------------------------------------------------------------------------

export function buildEndingChoiceQuestion(
  verse: TrainingVerse,
  pool: TrainingVerse[],
  order: number,
): ChoiceQuestion | null {
  if (verse.endingWords.length < 2) return null;
  const normalizedCorrect = normalizeIncipitText(verse.ending);

  const distractors = shuffle(
    pool
      .map((item) => item.ending)
      .filter((candidate) => candidate.trim().length > 0)
      .filter(
        (candidate) =>
          normalizeIncipitText(candidate) !== normalizedCorrect,
      ),
  );

  if (distractors.length < CONFIG.INCIPIT_OPTIONS_COUNT - 1) return null;

  return {
    id: `ending-choice-${order}-${verse.externalVerseId}`,
    modeId: "ending-choice",
    modeHint: "Выберите правильный конец стиха.",
    verse,
    prompt: verse.reference,
    answerLabel: verse.ending,
    interaction: "choice",
    options: shuffle([
      verse.ending,
      ...distractors.slice(0, CONFIG.INCIPIT_OPTIONS_COUNT - 1),
    ]),
    isCorrectOption: (value: string) =>
      normalizeIncipitText(value) === normalizedCorrect,
  };
}
