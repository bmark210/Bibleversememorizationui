import type { Verse } from "@/app/App";
import type { UserDashboardStats } from "@/api/services/userStats";
import type { VersePatchEvent } from "@/app/types/verseSync";

/** Training mode — what kind of exercises to run */
export type TrainingMode = "learning" | "review" | "anchor";

/** Training order — how to sort verses before session start */
export type TrainingOrder = "updatedAt" | "bible" | "popularity";

/** Internal view state machine for Training orchestrator */
export type TrainingView =
  | { mode: "hub" }
  | { mode: "anchor" }
  | {
      mode: "verse-session";
      verses: Verse[];
      trainingModes: TrainingMode[];
      order: TrainingOrder;
    };

/** When navigating directly to Training from VerseGallery or Dashboard */
export interface DirectLaunchVerse {
  verse: Verse;
}

export interface TrainingProps {
  allVerses: Verse[];
  dashboardStats?: UserDashboardStats | null;
  telegramId: string | null;
  selectionVerses?: Verse[];
  /** If set, skip the Hub and start a training session immediately for this verse */
  directLaunch?: DirectLaunchVerse | null;
  /** Called when the direct-launch session ends, so the parent can clear the state */
  onDirectLaunchConsumed?: () => void;
  onVersePatched: (event: VersePatchEvent) => void;
  onRequestVerseSelection: () => void;
  onVerseMutationCommitted?: () => void;
}

export const TRAINING_MODE_LABELS: Record<TrainingMode, string> = {
  learning: "Изучение",
  review: "Повторение",
  anchor: "Закрепление",
};

export const TRAINING_ORDER_LABELS: Record<TrainingOrder, string> = {
  updatedAt: "По активности",
  bible: "По канону",
  popularity: "По популярности",
};
