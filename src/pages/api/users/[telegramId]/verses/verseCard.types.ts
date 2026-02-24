import { VerseStatus } from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { TRAINING_STAGE_MASTERY_MAX } from "@/shared/training/constants";

export const REVIEW_MASTERY_LEVEL_MIN = TRAINING_STAGE_MASTERY_MAX;
export const MASTERED_REPETITIONS_MIN = 5;

type PrismaUserVerse = Prisma.UserVerseGetPayload<Record<string, never>>;
type PrismaTag = Prisma.TagGetPayload<Record<string, never>>;

type PrismaVerseCardBaseFields = Pick<
  PrismaUserVerse,
  "externalVerseId" | "masteryLevel" | "repetitions" | "lastReviewedAt" | "nextReviewAt"
>;

export type DisplayStatus = VerseStatus | "REVIEW" | "MASTERED";

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
  repetitionsInput: number | null | undefined
): DisplayStatus {
  const baseStatus = normalizeBaseStatus(baseStatusInput);
  const masteryLevel = normalizeProgressValue(masteryLevelInput);
  const repetitions = normalizeProgressValue(repetitionsInput);

  if (baseStatus === VerseStatus.NEW) return VerseStatus.NEW;
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

function toIsoStringOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function mapUserVerseToVerseCardDto(verse: EnrichedUserVerseSource): VerseCardDto {
  const baseStatus = normalizeBaseStatus(verse.status);
  const masteryLevel =
    baseStatus === VerseStatus.NEW ? 0 : normalizeProgressValue(verse.masteryLevel);
  const repetitions =
    baseStatus === VerseStatus.NEW ? 0 : normalizeProgressValue(verse.repetitions);

  return {
    externalVerseId: verse.externalVerseId,
    status: computeDisplayStatus(baseStatus, masteryLevel, repetitions),
    masteryLevel,
    repetitions,
    lastReviewedAt: toIsoStringOrNull(verse.lastReviewedAt),
    nextReviewAt: toIsoStringOrNull(verse.nextReviewAt),
    tags: verse.tags ?? [],
    ...(typeof verse.text === "string" ? { text: verse.text } : {}),
    ...(typeof verse.reference === "string" ? { reference: verse.reference } : {}),
  };
}
