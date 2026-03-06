export type ReferenceTrainerSessionTrack =
  | "reference"
  | "incipit"
  | "context"
  | "mixed";

export type ReferenceTrainerSkillTrack =
  | "reference"
  | "incipit"
  | "context";

export type ReferenceTrainerOutcome =
  | "correct_first"
  | "correct_retry"
  | "wrong";

export type ReferenceTrainerSessionUpdate = {
  externalVerseId: string;
  track: ReferenceTrainerSkillTrack;
  outcome: ReferenceTrainerOutcome;
};

export type ReferenceTrainerScoreRow = {
  id: number;
  externalVerseId: string;
  referenceScore: number;
  incipitScore: number;
  contextScore: number;
};

export type ReferenceTrainerLearningRow = {
  externalVerseId: string;
  status: "LEARNING";
  masteryLevel: number;
  repetitions: number;
  referenceScore: number;
  incipitScore: number;
  contextScore: number;
  lastTrainingModeId: number | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};
