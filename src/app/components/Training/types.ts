import type { Verse } from "@/app/domain/verse";
import type { VersePatchEvent } from "@/app/types/verseSync";
import type { TrainingBoxScope } from "@/app/types/textBox";

/** Training mode — what kind of exercises to run */
export type TrainingMode = "learning" | "review" | "anchor";
export type CoreTrainingMode = Exclude<TrainingMode, "anchor">;
export type TrainingScenario = "core" | "anchor";
/** Training order — how to sort verses before session start */
export type TrainingOrder = "updatedAt" | "bible" | "popularity";

/** Sub-scenario within the Игры tab */
export type AnchorSubScenario = "interactive" | "flashcard";

/** Flashcard mode — which side to hide */
export type FlashcardMode = "reference" | "verse";

export const FLASHCARD_MODE_LABELS: Record<FlashcardMode, string> = {
  reference: "Ссылка",
  verse: "Стих",
};

export const FLASHCARD_MODE_DESCRIPTIONS: Record<FlashcardMode, string> = {
  reference: "Текст → вспомни ссылку",
  verse: "Ссылка → вспомни текст",
};

export const ALL_FLASHCARD_MODES: FlashcardMode[] = ["reference", "verse"];

/** Internal view state machine for Training orchestrator */
export type TrainingView =
  | { mode: "hub"; scope: TrainingBoxScope }
  | { mode: "anchor"; anchorModes: AnchorModeGroup[]; scope: TrainingBoxScope }
  | { mode: "flashcard"; flashcardMode: FlashcardMode; scope: TrainingBoxScope }
  | {
      mode: "verse-session";
      verses: Verse[];
      trainingModes: CoreTrainingMode[];
      order: TrainingOrder;
      scope: TrainingBoxScope;
      initialVerseExternalId?: string | null;
    };

/** When navigating directly to Training from VerseGallery or Dashboard */
export type DirectLaunchReturnTarget =
  | { kind: "training-hub" }
  | {
      kind: "text-box";
      boxId: string;
      boxTitle: string;
    };

export interface DirectLaunchVerse {
  verse: Verse;
  scope: TrainingBoxScope;
  preferredMode?: TrainingMode;
  returnTarget?: DirectLaunchReturnTarget;
}

export interface TrainingProps {
  telegramId: string | null;
  boxScope: TrainingBoxScope | null;
  /** If set, skip the Hub and start a training session immediately for this verse */
  directLaunch?: DirectLaunchVerse | null;
  /** Called when the direct-launch session ends, so the parent can clear state or navigate away */
  onDirectLaunchExit?: (launch: DirectLaunchVerse) => void;
  onBoxScopeChange?: (scope: TrainingBoxScope | null) => void;
  onVersePatched: (event: VersePatchEvent) => void;
  onVerseMutationCommitted?: () => void;
  onSessionFullscreenChange?: (isFullscreen: boolean) => void;
}

export const TRAINING_MODE_LABELS: Record<TrainingMode, string> = {
  learning: "Изучение",
  review: "Повторение",
  anchor: "Закрепление",
};

export const TRAINING_SCENARIO_LABELS: Record<TrainingScenario, string> = {
  core: "Практика",
  anchor: "Игры",
};

/** Anchor mode groups — user-facing categories that map to TrainerModeId sets */
export type AnchorModeGroup =
  | "reference-v1"
  | "reference-v2"
  | "incipit"
  | "ending"
  | "context-v1"
  | "context-v2"
  | "broken-mirror"
  | "skeleton-verse"
  | "impostor-word";

export const ANCHOR_MODE_GROUP_LABELS: Record<AnchorModeGroup, string> = {
  "reference-v1": "Ссылка · выбор",
  "reference-v2": "Ссылка · ввод",
  incipit: "Начало стиха",
  ending: "Конец стиха",
  "context-v1": "Контекст · выбор",
  "context-v2": "Контекст · ввод",
  "broken-mirror": "Зеркало",
  "skeleton-verse": "Скелет",
  "impostor-word": "Самозванец",
};

export const ALL_ANCHOR_MODE_GROUPS: AnchorModeGroup[] = [
  "reference-v1",
  "reference-v2",
  "incipit",
  "ending",
  "context-v1",
  "context-v2",
  "broken-mirror",
  "skeleton-verse",
  "impostor-word",
];

export const TRAINING_ORDER_LABELS: Record<TrainingOrder, string> = {
  updatedAt: "По активности",
  bible: "По канону",
  popularity: "По популярности",
};

