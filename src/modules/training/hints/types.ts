import type { TrainingModeId, TrainingModeRating } from "@/shared/training/modeEngine";
import type { VerseDifficultyLevel } from "@/shared/verses/difficulty";

export type TrainingAttemptFlowState =
  | "active"
  | "awaiting_rating"
  | "finalized";

export type AssistKind =
  | "semantic_nudge"
  | "structure_cue"
  | "content_reveal"
  | "full_reveal";

export type AssistVariant =
  | "context"
  | "first_letters"
  | "incipit"
  | "next_word"
  | "full_text"
  | "full_text_preview";


export type TrainingAttemptPhase = "learning" | "review";
export type TrainingAttemptStatus =
  | "active"
  | "completed"
  | "surrendered"
  | "abandoned";

export type ExerciseProgressKind =
  | "chunks-order"
  | "word-order"
  | "word-order-hinted"
  | "first-letters"
  | "first-letters-hinted"
  | "first-letters-typing"
  | "full-recall"
  | "voice-recall";

export type ExerciseUnitType =
  | "chunk"
  | "word"
  | "letter"
  | "typed-word"
  | "spoken-word";

export interface ExerciseProgressSnapshot {
  kind: ExerciseProgressKind;
  unitType: ExerciseUnitType;
  expectedIndex: number | null;
  completedCount: number;
  totalCount: number;
  mistakeCount: number;
  accuracy: number | null;
  stallMs: number;
  isCompleted: boolean;
  // Backward-compatible aliases for pre-refactor mode code.
  expectedWordIndex: number | null;
  completedUnits: number;
  totalUnits: number;
}

export interface AssistEvent {
  kind: AssistKind;
  variant: AssistVariant;
  createdAt: string;
  progressBefore: ExerciseProgressSnapshot | null;
  content: AssistContent;
}

export interface HintRatingPolicy {
  allowedRatings: readonly TrainingModeRating[];
  maxRating: TrainingModeRating;
  assisted: boolean;
}

export interface AssistContent {
  kind: AssistKind;
  variant: AssistVariant;
  title: string;
  text: string;
  durationSeconds?: number;
}

export interface TrainingAttempt {
  key: string;
  modeId: TrainingModeId | null;
  phase: TrainingAttemptPhase;
  difficultyLevel: VerseDifficultyLevel | null;
  verseText: string;
  status: TrainingAttemptStatus;
  flowState: TrainingAttemptFlowState;
  progress: ExerciseProgressSnapshot | null;
  assistStage: number;
  assisted: boolean;
  assistHistory: readonly AssistEvent[];
  activeAssist: AssistContent | null;
  ratingPolicy: HintRatingPolicy;
}

export type HintRequestRejectedReason =
  | "attempt-locked"
  | "hint-unavailable";

export type HintRequestResult =
  | {
      kind: "applied";
      attempt: TrainingAttempt;
      content: AssistContent;
    }
  | {
      kind: "rejected";
      reason: HintRequestRejectedReason;
    };

export interface AssistDecision {
  kind: AssistKind;
  variant: AssistVariant;
  stage: number;
  content: AssistContent;
  locksInput: boolean;
}

export interface AssistSuggestionState {
  shouldSuggest: boolean;
  label: string;
}
