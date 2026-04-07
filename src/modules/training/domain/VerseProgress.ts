export type DisplayStatus = "LEARNING" | "REVIEW" | "MASTERED";

// -1: забыл (forgot, learning only) | 0: сложно (hard/repeat) | 1: далее (continue)
export type RatingValue = -1 | 0 | 1;

export type VerseProgress = {
  masteryLevel: number;
  repetitions: number;
};
