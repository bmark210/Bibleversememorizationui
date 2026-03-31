import type { Verse } from "@/app/domain/verse";
import type { domain_UserDashboardStats } from "@/api/models/domain_UserDashboardStats";
import type { VersePatchEvent } from "@/app/types/verseSync";
import type { VerseListStatusFilter } from "@/app/components/verse-list/constants";

/** Training mode — what kind of exercises to run */
export type TrainingMode = "learning" | "review" | "anchor";
export type CoreTrainingMode = Exclude<TrainingMode, "anchor">;
export type TrainingScenario = "core" | "anchor" | "exam";
/** Training order — how to sort verses before session start */
export type TrainingOrder = "updatedAt" | "bible" | "popularity";

/** Internal view state machine for Training orchestrator */
export type TrainingView =
  | { mode: "hub" }
  | { mode: "anchor"; anchorModes: AnchorModeGroup[] }
  | { mode: "exam" }
  | {
      mode: "verse-session";
      verses: Verse[];
      trainingModes: CoreTrainingMode[];
      order: TrainingOrder;
      initialVerseExternalId?: string | null;
    };

/** When navigating directly to Training from VerseGallery or Dashboard */
export type DirectLaunchReturnTarget =
  | { kind: "training-hub" }
  | {
      kind: "verse-list";
      statusFilter: VerseListStatusFilter;
    };

export interface DirectLaunchVerse {
  verse: Verse;
  preferredMode?: TrainingMode;
  returnTarget?: DirectLaunchReturnTarget;
}

export interface TrainingProps {
  allVerses: Verse[];
  isLoadingVerses?: boolean;
  dashboardStats?: domain_UserDashboardStats | null;
  telegramId: string | null;
  selectionVerses?: Verse[];
  /** If set, skip the Hub and start a training session immediately for this verse */
  directLaunch?: DirectLaunchVerse | null;
  /** Called when the direct-launch session ends, so the parent can clear state or navigate away */
  onDirectLaunchExit?: (launch: DirectLaunchVerse) => void;
  onVersePatched: (event: VersePatchEvent) => void;
  onRequestVerseSelection: () => void;
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
  exam: "Экзамен",
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

