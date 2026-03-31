import type { bible_memory_db_internal_domain_UserVerse as UserVerse } from "@/api/models/bible_memory_db_internal_domain_UserVerse";

export type ExamVerseResult = {
  externalVerseId: string;
  passed: boolean;
};

export type ExamSessionInput = {
  results: ExamVerseResult[];
};

export type ExamSessionOutput = {
  sessionId: string;
  verseCount: number;
  passCount: number;
  failCount: number;
  passed: boolean;
  newlyConfirmedCount: number;
  newCapacity: number;
  promotedVerseIds?: string[];
};

export type ExamEligibleVersesResponse = {
  verses: UserVerse[];
  totalCount: number;
  canStart: boolean;
  minRequired: number;
  cooldownUntil?: string | null;
};

export type LearningCapacityResponse = {
  activeLearning: number;
  capacity: number;
  canAddMore: boolean;
  base: number;
  examConfirmedCount: number;
  queueCount: number;
  promotedVerseIds?: string[];
};

export type QueueVerseItem = {
  externalVerseId: string;
  reference: string;
  text?: string;
  queuePosition: number;
};

export type QueueResponse = {
  items: QueueVerseItem[];
  totalCount: number;
  freeSlots: number;
  promotedVerseIds?: string[];
};

export const EXAM_MIN_ELIGIBLE = 3;
export const EXAM_MAX_SESSION_SIZE = 10;
export const EXAM_COOLDOWN_HOURS = 20;
