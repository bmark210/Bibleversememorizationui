import type { AppVerseApiRecord, Verse, VerseAnnotationData } from "@/app/domain/verse";

export type TextWorkspaceTab = "catalog" | "boxes";
export type TextBoxVisibility = "private" | "public";

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
  visibility: TextBoxVisibility;
  createdAt: string;
  updatedAt: string;
  stats: TextBoxStats;
};

export type PublicTextBoxOwner = {
  telegramId: string;
  name: string;
  nickname: string;
  avatarUrl: string | null;
};

export type PublicTextBoxSummary = {
  id: string;
  title: string;
  visibility: TextBoxVisibility;
  createdAt: string;
  updatedAt: string;
  stats: TextBoxStats;
  owner: PublicTextBoxOwner;
};

export type TextBoxVerseRecord = {
  verse: AppVerseApiRecord;
  annotation?: VerseAnnotationData | null;
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

export type PublicTextBoxDetailResponseRecord = {
  box: PublicTextBoxSummary;
  items: TextBoxVerseRecord[];
  totalCount: number;
};

export type PublicTextBoxDetailResponse = {
  box: PublicTextBoxSummary;
  items: TextBoxVerse[];
  totalCount: number;
};

export type PublicTextBoxesPageResponse = {
  items: PublicTextBoxSummary[];
  total: number;
  limit: number;
  offset: number;
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
