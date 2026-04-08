import type { AppVerseApiRecord, Verse } from "@/app/domain/verse";

export type TextWorkspaceTab = "catalog" | "boxes";

export type TextBoxStats = {
  totalCount: number;
  learningCount: number;
  dueReviewCount: number;
  waitingReviewCount: number;
  masteredCount: number;
  pausedCount: number;
  queueCount: number;
};

export type TextBoxSummary = {
  id: string;
  telegramId: string;
  title: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  stats: TextBoxStats;
};

export type TextBoxVerseRecord = {
  verse: AppVerseApiRecord;
};

export type TextBoxVerse = {
  verse: Verse;
};

export type TextBoxVersesResponseRecord = {
  box: TextBoxSummary;
  items: TextBoxVerseRecord[];
  totalCount: number;
};

export type TextBoxVersesResponse = {
  box: TextBoxSummary;
  items: TextBoxVerse[];
  totalCount: number;
};

export type AddVerseToBoxRequest = {
  externalVerseId: string;
};

export type ReplaceLearningVerseInBoxRequest = {
  activateExternalVerseId: string;
  pauseExternalVerseId: string;
};

export type AddVerseToBoxResult = {
  addedCount: number;
  skippedCount: number;
};

export type RemoveTextFromBoxResult = {
  archivedUserVerse: boolean;
  freedLearningSlot: boolean;
  promotedVerseIds?: string[];
};

export type VerseStatusMutationResult = {
  promotedVerseIds?: string[];
};

export type TrainingBoxScope = {
  boxId: string;
  boxTitle: string;
};

export type TrainingSelectionPayload = {
  scope: TrainingBoxScope;
  verses: Verse[];
};
