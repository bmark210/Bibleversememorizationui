import { VerseStatus } from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { TRAINING_STAGE_MASTERY_MAX } from "@/shared/training/constants";

export const REVIEW_MASTERY_LEVEL_MIN = TRAINING_STAGE_MASTERY_MAX;
export const MASTERED_REPETITIONS_MIN = 5;
export const WAITING_MASTERY_LEVEL_MIN_EXCLUSIVE = TRAINING_STAGE_MASTERY_MAX;
export const WAITING_NEXT_REVIEW_DELAY_HOURS = 24;

type PrismaTag = Prisma.TagGetPayload<Record<string, never>>;

// UserVerse is now fetched with the verse relation to access externalVerseId
type PrismaUserVerseWithVerse = Prisma.UserVerseGetPayload<{
  include: { verse: true };
}>;

export type DisplayStatus = VerseStatus | "REVIEW" | "MASTERED" | "CATALOG";

export interface VerseCardTagDto extends Pick<PrismaTag, "id" | "slug" | "title"> {}

export interface VerseCardDto {
  externalVerseId: string;
  status: DisplayStatus;
  masteryLevel: number;
  repetitions: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  lastTrainingModeId: number | null;
  tags: VerseCardTagDto[];
  text?: string;
  reference?: string;
}

export type UserVersesPageResponse = {
  items: VerseCardDto[];
  totalCount: number;
};

// VerseTag now references Verse via verseId FK; externalVerseId comes through the verse relation
export type VerseTagLinkWithTag = Prisma.VerseTagGetPayload<{
  select: {
    verse: {
      select: { externalVerseId: true };
    };
    tag: {
      select: {
        id: true;
        slug: true;
        title: true;
      };
    };
  };
}>;

// externalVerseId is flattened from verse.externalVerseId at the DB fetch site
export type UserVerseWithLegacyNullableProgress = Omit<
  PrismaUserVerseWithVerse,
  "masteryLevel" | "repetitions"
> & {
  externalVerseId: string;
  status?: VerseStatus | null;
  masteryLevel?: PrismaUserVerseWithVerse["masteryLevel"] | null;
  repetitions?: PrismaUserVerseWithVerse["repetitions"] | null;
  lastTrainingModeId?: number | null;
};

export type EnrichedUserVerseSource = UserVerseWithLegacyNullableProgress & {
  text?: string;
  reference?: string;
  tags?: VerseCardTagDto[];
};

export function normalizeProgressValue(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.trunc(value));
}

export function normalizeBaseStatus(status: VerseStatus | null | undefined): VerseStatus {
  if (status === VerseStatus.LEARNING) return VerseStatus.LEARNING;
  if (status === VerseStatus.STOPPED) return VerseStatus.STOPPED;
  return VerseStatus.MY;
}

export function computeDisplayStatus(
  baseStatusInput: VerseStatus | null | undefined,
  masteryLevelInput: number | null | undefined,
  repetitionsInput: number | null | undefined
): DisplayStatus {
  const baseStatus = normalizeBaseStatus(baseStatusInput);
  const masteryLevel = normalizeProgressValue(masteryLevelInput);
  const repetitions = normalizeProgressValue(repetitionsInput);

  if (baseStatus === VerseStatus.MY) return VerseStatus.MY;
  if (baseStatus === VerseStatus.STOPPED) return VerseStatus.STOPPED;

  if (repetitions >= MASTERED_REPETITIONS_MIN) return "MASTERED";
  if (masteryLevel >= REVIEW_MASTERY_LEVEL_MIN) return "REVIEW";
  return VerseStatus.LEARNING;
}

export function isReviewState(
  baseStatusInput: VerseStatus | null | undefined,
  masteryLevelInput: number | null | undefined,
  repetitionsInput: number | null | undefined
): boolean {
  return (
    computeDisplayStatus(baseStatusInput, masteryLevelInput, repetitionsInput) ===
    "REVIEW"
  );
}

export function canMutateRepetitionsByMastery(
  baseStatusInput: VerseStatus | null | undefined,
  masteryLevelInput: number | null | undefined
): boolean {
  return (
    normalizeBaseStatus(baseStatusInput) === VerseStatus.LEARNING &&
    normalizeProgressValue(masteryLevelInput) >= REVIEW_MASTERY_LEVEL_MIN
  );
}

export function toIsoStringOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}


export function mapUserVerseToVerseCardDto(verse: EnrichedUserVerseSource): VerseCardDto {
  const baseStatus = normalizeBaseStatus(verse.status);
  const masteryLevel =
    baseStatus === VerseStatus.MY ? 0 : normalizeProgressValue(verse.masteryLevel);
  const repetitions =
    baseStatus === VerseStatus.MY ? 0 : normalizeProgressValue(verse.repetitions);

  return {
    externalVerseId: verse.externalVerseId,
    status: computeDisplayStatus(baseStatus, masteryLevel, repetitions),
    masteryLevel,
    repetitions,
    lastTrainingModeId: typeof verse.lastTrainingModeId === "number" ? verse.lastTrainingModeId : null,
    lastReviewedAt: toIsoStringOrNull(verse.lastReviewedAt),
    nextReviewAt: toIsoStringOrNull(verse.nextReviewAt),
    tags: verse.tags ?? [],
    ...(typeof verse.text === "string" ? { text: verse.text } : {}),
    ...(typeof verse.reference === "string" ? { reference: verse.reference } : {}),
  };
}
