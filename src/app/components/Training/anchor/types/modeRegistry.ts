import type { AnchorModeGroup } from "../../types";
import type { TrainerModeId, TrainerQuestion, TrainingVerse } from "./questions";

export type ModeCategory = "client" | "ai";
export type ModeInteraction = "choice" | "type" | "tap" | "drag";

export type ModeStrategy = {
  id: TrainerModeId;
  group: AnchorModeGroup;
  category: ModeCategory;
  interaction: ModeInteraction;
  hint: string;
  weight: number;
  requiresAI: boolean;
  canBuild: (
    verse: TrainingVerse,
    pool: TrainingVerse[],
    aiAvailable: boolean,
  ) => boolean;
  buildQuestion: (
    verse: TrainingVerse,
    pool: TrainingVerse[],
    order: number,
    aiData?: unknown,
  ) => TrainerQuestion | null;
};
