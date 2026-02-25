import { VerseStatus } from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { TRAINING_STAGE_MASTERY_MAX } from "@/shared/training/constants";

export const REVIEW_MASTERY_LEVEL_MIN = TRAINING_STAGE_MASTERY_MAX;
export const MASTERED_REPETITIONS_MIN = 5;
export const WAITING_MASTERY_LEVEL_MIN_EXCLUSIVE = TRAINING_STAGE_MASTERY_MAX;
export const WAITING_NEXT_REVIEW_DELAY_HOURS = 24;

type PrismaUserVerse = Prisma.UserVerseGetPayload<Record<string, never>>;
type PrismaTag = Prisma.TagGetPayload<Record<string, never>>;

type PrismaVerseCardBaseFields = Pick<
  PrismaUserVerse,
  "externalVerseId" | "masteryLevel" | "repetitions" | "lastReviewedAt" | "nextReviewAt"
>;

export type DisplayStatus = VerseStatus | "REVIEW" | "WAITING" | "MASTERED";

export interface VerseCardTagDto extends Pick<PrismaTag, "id" | "slug" | "title"> {}

export interface VerseCardDto
  extends Omit<
    PrismaVerseCardBaseFields,
    "status" | "masteryLevel" | "repetitions" | "lastReviewedAt" | "nextReviewAt"
  > {
  status: DisplayStatus;
  masteryLevel: number;
  repetitions: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  tags: VerseCardTagDto[];
  text?: string;
  reference?: string;
}

export type UserVersesPageResponse = {
  items: VerseCardDto[];
  totalCount: number;
};

export type VerseTagLinkWithTag = Prisma.VerseTagGetPayload<{
  select: {
    externalVerseId: true;
    tag: {
      select: {
        id: true;
        slug: true;
        title: true;
      };
    };
  };
}>;

export type UserVerseWithLegacyNullableProgress = Omit<
  PrismaUserVerse,
  "masteryLevel" | "repetitions"
> & {
  status?: VerseStatus | null;
  masteryLevel?: PrismaUserVerse["masteryLevel"] | null;
  repetitions?: PrismaUserVerse["repetitions"] | null;
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
  return VerseStatus.NEW;
}

export function computeDisplayStatus(
  baseStatusInput: VerseStatus | null | undefined,
  masteryLevelInput: number | null | undefined,
  repetitionsInput: number | null | undefined,
  nextReviewAtInput?: Date | string | null | undefined
): DisplayStatus {
  const baseStatus = normalizeBaseStatus(baseStatusInput);
  const masteryLevel = normalizeProgressValue(masteryLevelInput);
  const repetitions = normalizeProgressValue(repetitionsInput);

  if (baseStatus === VerseStatus.NEW) return VerseStatus.NEW;
  if (baseStatus === VerseStatus.STOPPED) return VerseStatus.STOPPED;

  if (repetitions >= MASTERED_REPETITIONS_MIN) return "MASTERED";
  if (
    masteryLevel > WAITING_MASTERY_LEVEL_MIN_EXCLUSIVE &&
    isFutureReviewDate(nextReviewAtInput)
  ) {
    return "WAITING";
  }
  if (masteryLevel >= REVIEW_MASTERY_LEVEL_MIN) return "REVIEW";
  return VerseStatus.LEARNING;
}

export function isReviewState(
  baseStatusInput: VerseStatus | null | undefined,
  masteryLevelInput: number | null | undefined,
  repetitionsInput: number | null | undefined,
  nextReviewAtInput?: Date | string | null | undefined
): boolean {
  return (
    computeDisplayStatus(baseStatusInput, masteryLevelInput, repetitionsInput, nextReviewAtInput) ===
    "REVIEW"
  );
}

export function canMutateRepetitionsByMastery(
  baseStatusInput: VerseStatus | null | undefined,
  masteryLevelInput: number | null | undefined
): boolean {
  return (
    normalizeBaseStatus(baseStatusInput) === VerseStatus.LEARNING &&
    normalizeProgressValue(masteryLevelInput) > WAITING_MASTERY_LEVEL_MIN_EXCLUSIVE
  );
}

function toIsoStringOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isFutureReviewDate(value: Date | string | null | undefined): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

export function mapUserVerseToVerseCardDto(verse: EnrichedUserVerseSource): VerseCardDto {
  const baseStatus = normalizeBaseStatus(verse.status);
  const masteryLevel =
    baseStatus === VerseStatus.NEW ? 0 : normalizeProgressValue(verse.masteryLevel);
  const repetitions =
    baseStatus === VerseStatus.NEW ? 0 : normalizeProgressValue(verse.repetitions);

  return {
    externalVerseId: verse.externalVerseId,
    status: computeDisplayStatus(baseStatus, masteryLevel, repetitions, verse.nextReviewAt),
    masteryLevel,
    repetitions,
    lastReviewedAt: toIsoStringOrNull(verse.lastReviewedAt),
    nextReviewAt: toIsoStringOrNull(verse.nextReviewAt),
    tags: verse.tags ?? [],
    ...(typeof verse.text === "string" ? { text: verse.text } : {}),
    ...(typeof verse.reference === "string" ? { reference: verse.reference } : {}),
  };
}
