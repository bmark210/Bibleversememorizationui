import type { Translation, VerseStatus } from "@/generated/prisma";

export type UserRecord = {
  id: string;
  telegramId: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  dailyStreak: number;
  translation: Translation;
  createdAt: Date;
};

export type UserVerseLinkRecord = {
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
};

export type UserWithVerseLinksRecord = UserRecord & {
  verses: UserVerseLinkRecord[];
};
