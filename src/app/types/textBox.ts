import type { AppVerseApiRecord, Verse } from "@/app/domain/verse";

export type TextCatalogUnit = "verses" | "chapters";
export type TextWorkspaceTab = "catalog" | "boxes";

export type TextBoxStats = {
  totalCount: number;
  myCount: number;
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
  sourceKind: "verse" | "chapter";
  sourceKey: string;
  verse: AppVerseApiRecord;
};

export type TextBoxVerse = {
  sourceKind: "verse" | "chapter";
  sourceKey: string;
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

export type ImportToBoxRequest = {
  kind: "verse" | "chapter";
  externalVerseId?: string;
  bookId?: number;
  chapterNo?: number;
};

export type ImportToBoxResult = {
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

export type TrainingScope =
  | { type: "all" }
  | { type: "box"; boxId: string; boxTitle: string }
  | {
      type: "chapter";
      bookId: number;
      chapterNo: number;
      boxId?: string | null;
      boxTitle?: string | null;
    };

export type TrainingSelectionPayload = {
  scope: TrainingScope;
  verses: Verse[];
};
