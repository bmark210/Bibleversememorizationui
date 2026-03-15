import type { TrainingModeId, TrainingModeRating } from "@/shared/training/modeEngine";
import type { VerseDifficultyLevel } from "@/shared/verses/difficulty";

export type HintType = "context" | "firstWords" | "nextWord" | "surrender";

export type TrainingAttemptPhase = "learning" | "review";
export type TrainingAttemptStatus = "active" | "completed" | "surrendered";

export type ExerciseProgressKind =
  | "chunks-order"
  | "word-order"
  | "word-order-hinted"
  | "first-letters"
  | "first-letters-hinted"
  | "first-letters-typing"
  | "full-recall"
  | "voice-recall";

export interface ExerciseProgressSnapshot {
  kind: ExerciseProgressKind;
  expectedWordIndex: number | null;
  completedUnits: number;
  totalUnits: number;
  isCompleted: boolean;
}

export interface HintEvent {
  type: HintType;
  createdAt: string;
  progressBefore: ExerciseProgressSnapshot | null;
}

export interface HintRatingPolicy {
  allowedRatings: readonly TrainingModeRating[];
  maxRating: TrainingModeRating;
}

export interface HintContent {
  type: HintType;
  text: string;
}

export interface TrainingAttempt {
  key: string;
  modeId: TrainingModeId | null;
  phase: TrainingAttemptPhase;
  difficultyLevel: VerseDifficultyLevel | null;
  verseText: string;
  status: TrainingAttemptStatus;
  progress: ExerciseProgressSnapshot | null;
  usedHints: readonly HintType[];
  hintEvents: readonly HintEvent[];
  nextWordCount: number;
  ratingPolicy: HintRatingPolicy;
}

export type HintRequestRejectedReason =
  | "attempt-locked"
  | "hint-unavailable"
  | "budget-exhausted";

export type HintRequestResult =
  | {
      kind: "applied";
      attempt: TrainingAttempt;
      content: HintContent;
      tokensToConsume: 0 | 1;
    }
  | {
      kind: "rejected";
      reason: HintRequestRejectedReason;
    };
