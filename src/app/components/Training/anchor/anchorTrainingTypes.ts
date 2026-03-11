import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import type { AnchorTrainingTrack } from "../types";

export type SessionTrack = AnchorTrainingTrack;
export type SkillTrack = Exclude<AnchorTrainingTrack, "mixed">;

export type TrainerModeId =
  | "reference-choice"
  | "book-choice"
  | "reference-type"
  | "incipit-choice"
  | "incipit-tap"
  | "incipit-type"
  | "context-incipit-type"
  | "context-incipit-tap"
  | "context-prefix-type";

export type ReferenceVerse = {
  externalVerseId: string;
  text: string;
  reference: string;
  status: DisplayVerseStatus;
  masteryLevel: number;
  repetitions: number;
  bookName: string;
  chapterVerse: string;
  incipit: string;
  incipitWords: string[];
  referenceScore: number;
  incipitScore: number;
  contextScore: number;
  contextPromptText: string;
  contextPromptReference: string;
};

export type TrainerQuestionBase = {
  id: string;
  modeId: TrainerModeId;
  track: SkillTrack;
  modeHint: string;
  verse: ReferenceVerse;
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

export type TrainerQuestion = ChoiceQuestion | TypeQuestion | TapQuestion;

export type QuestionTerminalState = "correct" | "wrong" | "forgotten";

export type QuestionSessionState = {
  questionId: string;
  status: "pending" | QuestionTerminalState;
  outcome: "correct_first" | "correct_retry" | "wrong" | null;
};

export type QuestionResult = {
  track: SkillTrack;
  modeId: TrainerModeId;
  isCorrect: boolean;
};

export type TrackStat = {
  total: number;
  correct: number;
};

export type TypeInputReadiness = {
  canSubmit: boolean;
  remainingChars: number;
};

export type ModeStrategy = {
  id: TrainerModeId;
  track: SkillTrack;
  hint: string;
  weight: number;
  canBuild: (verse: ReferenceVerse, pool: ReferenceVerse[]) => boolean;
  buildQuestion: (
    verse: ReferenceVerse,
    pool: ReferenceVerse[],
    order: number
  ) => TrainerQuestion | null;
};
