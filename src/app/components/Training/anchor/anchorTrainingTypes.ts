/**
 * Canonical types are now in ./types/.
 * This file re-exports everything so existing imports keep working.
 */

export type {
  TrainerModeId,
  TrainingVerse,
  TrainerQuestionBase,
  ChoiceQuestion,
  TypeQuestion,
  TapQuestionOption,
  TapQuestion,
  DragQuestion,
  TrainerQuestion,
  QuestionTerminalState,
  QuestionSessionState,
  TypeInputReadiness,
} from "./types";

export type { ModeStrategy } from "./types/modeRegistry";

/** @deprecated Use TrainingVerse instead */
export type { TrainingVerse as ReferenceVerse } from "./types";

export type QuestionResult = {
  modeId: import("./types").TrainerModeId;
  isCorrect: boolean;
};

export type TrackStat = {
  total: number;
  correct: number;
};
