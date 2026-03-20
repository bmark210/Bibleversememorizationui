/** Body for POST .../verses/{externalVerseId}/training-step (matches bible-memory-db). */
export type TrainingStepHTTPRequest = {
  phase: "learning" | "review";
  trainingModeId: number;
  rating: number;
  isLearningVerse: boolean;
};
