import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import type { VerseDifficultyLevel } from "@/shared/verses/difficulty";

export type TrainerModeId =
  | "reference-choice"
  | "book-choice"
  | "reference-type"
  | "incipit-choice"
  | "incipit-tap"
  | "incipit-type"
  | "ending-choice"
  | "context-reference-choice"
  | "context-reference-type"
  | "broken-mirror"
  | "skeleton-verse"
  | "impostor-word";

export type TrainingVerse = {
  externalVerseId: string;
  text: string;
  reference: string;
  status: DisplayVerseStatus;
  difficultyLevel: VerseDifficultyLevel;
  masteryLevel: number;
  repetitions: number;
  bookName: string;
  chapterVerse: string;
  incipit: string;
  incipitWords: string[];
  ending: string;
  endingWords: string[];
  contextPromptText: string;
  contextPromptReference: string;
};

export type TrainerQuestionBase = {
  id: string;
  modeId: TrainerModeId;
  modeHint: string;
  verse: TrainingVerse;
  prompt: string;
  answerLabel: string;
};

export type ChoiceQuestion = TrainerQuestionBase & {
  interaction: "choice";
  options: string[];
  isCorrectOption: (value: string) => boolean;
};

export type TypeQuestion = TrainerQuestionBase & {
  interaction: "type";
  placeholder: string;
  maxAttempts: number;
  retryHint?: string;
  isCorrectInput: (value: string) => boolean;
};

export type TapQuestionOption = {
  id: string;
  label: string;
  normalized: string;
};

export type TapQuestion = TrainerQuestionBase & {
  interaction: "tap";
  options: TapQuestionOption[];
  expectedNormalized: string[];
};

export type DragQuestion = TrainerQuestionBase & {
  interaction: "drag";
  fragments: { id: string; text: string }[];
  correctOrder: string[];
};

export type TrainerQuestion =
  | ChoiceQuestion
  | TypeQuestion
  | TapQuestion
  | DragQuestion;

export type QuestionTerminalState = "correct" | "wrong" | "forgotten";

export type QuestionSessionState = {
  questionId: string;
  status: "pending" | QuestionTerminalState;
  outcome: "correct_first" | "correct_retry" | "wrong" | null;
};

export type TypeInputReadiness = {
  canSubmit: boolean;
  remainingChars: number;
};
