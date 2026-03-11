import type { LucideIcon } from "lucide-react";
import type { VerseStatus } from "@/shared/domain/verseStatus";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import type { TrainingModeId } from "@/shared/training/modeEngine";
import type { TrainingModeRendererKey } from "@/app/components/training-session/TrainingModeRenderer";
import type { Verse } from "@/app/App";
import type { VerseMutablePatch } from "@/app/types/verseSync";
import type { TrainingModeRating } from "@/app/components/training-session/modes/types";

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "error" | "warning";
export type PanelMode = "preview" | "training";
export type VerseGalleryLaunchMode = "preview" | "training";
export type Rating = TrainingModeRating;
export type TrainingSubsetFilter = "learning" | "review" | "catalog";
export type ModeId = TrainingModeId;

export type GalleryStatusAction = {
  nextStatus: VerseStatus;
  label: string;
  icon: LucideIcon;
  successMessage: string;
};

export type VersePreviewOverride = Partial<
  Pick<Verse, "status" | "masteryLevel" | "repetitions">
> & {
  lastReviewedAt?: string | Date | null;
  nextReviewAt?: string | Date | null;
};

export type TrainingModeMeta = {
  label: string;
  description: string;
  renderer: TrainingModeRendererKey;
  badgeClass: string;
};

export type TrainingVerseState = {
  raw: Verse;
  key: string;
  telegramId: string | null;
  externalVerseId: string;
  status: DisplayVerseStatus;
  rawMasteryLevel: number;
  stageMasteryLevel: number;
  repetitions: number;
  lastModeId: ModeId | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

export type VerseGalleryProps = {
  verses: Verse[];
  initialIndex: number;
  activeTagSlugs?: Iterable<string> | null;
  onClose: () => void;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<VerseMutablePatch | void>;
  onDelete: (verse: Verse) => Promise<{ xpLoss: number } | void>;
  /** Navigate to the Training section to train the given verse */
  onNavigateToTraining: (verse: Verse) => void;
  /** Whether the user has enough REVIEW + MASTERED verses to use anchor training */
  isAnchorEligible?: boolean;
  previewTotalCount?: number;
  previewHasMore?: boolean;
  previewIsLoadingMore?: boolean;
  onRequestMorePreviewVerses?: () => Promise<boolean>;
};
