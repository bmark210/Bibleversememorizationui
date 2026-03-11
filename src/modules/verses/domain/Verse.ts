import type { VerseStatus } from "@/generated/prisma";

export type VerseRecord = {
  id: string;
  externalVerseId: string;
};

export type TagRecord = {
  id: string;
  slug: string;
  title: string;
};

export type VerseTagRecord = {
  externalVerseId: string;
  id: string;
  slug: string;
  title: string;
};

export type VerseTagLinkRecord = {
  id: string;
  verseId: string;
  tagId: string;
};

export type CatalogVerseRecord = {
  id: string;
  externalVerseId: string;
  createdAt: Date;
  tags: TagRecord[];
};

export type CatalogUserVerseProgressRecord = {
  verseId: string;
  status: VerseStatus;
  masteryLevel: number;
  repetitions: number;
  referenceScore: number;
  incipitScore: number;
  contextScore: number;
  lastTrainingModeId: number | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

export type VerseAdminSummaryRecord = {
  verseId: string;
  externalVerseId: string;
  userLinksCount: number;
  tagLinksCount: number;
  canDelete: boolean;
};

export type UserVerseRecord = {
  id: number;
  telegramId: string;
  verseId: string;
  status: VerseStatus;
  masteryLevel: number;
  repetitions: number;
  referenceScore: number;
  incipitScore: number;
  contextScore: number;
  lastTrainingModeId: number | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  verse: {
    externalVerseId: string;
  };
};
