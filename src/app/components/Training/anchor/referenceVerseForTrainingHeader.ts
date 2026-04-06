import type { Verse } from "@/app/domain/verse";
import type { ReferenceVerse } from "./anchorTrainingTypes";

/** Минимальный адаптер под {@link TrainingExerciseModeHeader} и прогресс % */
export function referenceVerseToTrainingHeaderVerse(
  verse: ReferenceVerse
): Verse {
  return {
    externalVerseId: verse.externalVerseId,
    difficultyLevel: verse.difficultyLevel,
    status: verse.status,
    masteryLevel: verse.masteryLevel,
    repetitions: verse.repetitions,
    text: verse.text,
    reference: verse.reference,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}
