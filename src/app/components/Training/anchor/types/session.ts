import type { TrainerModeId } from "./questions";

export type AnchorTrainingOutcome = "correct_first" | "correct_retry" | "wrong";

export type AnchorTrainingResult = {
  externalVerseId: string;
  modeId: TrainerModeId;
  outcome: AnchorTrainingOutcome;
};

export type AnchorSessionXPResponse = {
  xpAwarded: number;
  newTotalXp: number;
};

export type QuestionResult = {
  modeId: TrainerModeId;
  isCorrect: boolean;
};

export type ModeStat = {
  total: number;
  correct: number;
};
