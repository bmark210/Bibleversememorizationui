import { VerseStatus } from "@/shared/domain/verseStatus";
import { computeDisplayStatus as computeTrainingDisplayStatus } from "@/modules/training/application/computeDisplayStatus";
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import { computeActiveDailyStreak } from "@/shared/training/dailyStreak";
import {
  getDifficultyMultiplier,
  type VerseDifficultyLevel,
} from "@/shared/verses/difficulty";

export type SocialDisplayStatus = "LEARNING" | "REVIEW" | "MASTERED";

export type SocialVerseProgressRow = {
  status: VerseStatus | null | undefined;
  difficultyLevel?: VerseDifficultyLevel | null | undefined;
  masteryLevel: number | null | undefined;
  repetitions: number | null | undefined;
  referenceScore?: number | null | undefined;
  incipitScore?: number | null | undefined;
  contextScore?: number | null | undefined;
  lastReviewedAt?: Date | null | undefined;
  nextReviewAt?: Date | null | undefined;
};

export type SocialVerseXpBreakdown = {
  displayStatus: SocialDisplayStatus | null;
  progressPoints: number;
  verseXp: number;
  anchorBonusXp: number;
  totalXp: number;
  countsForXp: boolean;
};

export type SocialUserXpSummary = {
  xp: number;
  dailyStreak: number;
  weeklyRepetitions: number;
  masteredVerses: number;
  learningVerses: number;
  reviewVerses: number;
  dueReviewVerses: number;
  totalRepetitions: number;
  lastActiveAt: string | null;
  latestReviewedAt: Date | null;
  rankable: boolean;
};

const LEARNING_XP_MULTIPLIER = 10;
const REVIEW_XP_BASE = 120;
const REVIEW_XP_MULTIPLIER = 6;
const MASTERED_XP = 220;
const ANCHOR_BONUS_RATIO = 0.1;
const STREAK_BONUS_CAP_DAYS = 30;
const STREAK_BONUS_PER_DAY = 4;
const WEEKLY_REPETITIONS_BONUS_CAP = 50;
const WEEKLY_REPETITIONS_BONUS_PER_ITEM = 2;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeSocialProgressValue(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

export function normalizeSocialSkillScore(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getSocialProgressPoints(
  masteryLevel: number | null | undefined,
  repetitions: number | null | undefined
): number {
  return Math.max(
    0,
    Math.min(
      normalizeSocialProgressValue(masteryLevel) +
        normalizeSocialProgressValue(repetitions),
      TOTAL_REPEATS_AND_STAGE_MASTERY_MAX
    )
  );
}

export function getSocialDisplayStatus(
  status: VerseStatus | null | undefined,
  masteryLevel: number | null | undefined,
  repetitions: number | null | undefined
): SocialDisplayStatus | null {
  if (status !== VerseStatus.LEARNING) {
    return null;
  }

  return computeTrainingDisplayStatus(
    normalizeSocialProgressValue(masteryLevel),
    normalizeSocialProgressValue(repetitions)
  );
}

export function computeSocialVerseXp(
  row: SocialVerseProgressRow
): SocialVerseXpBreakdown {
  const displayStatus = getSocialDisplayStatus(
    row.status,
    row.masteryLevel,
    row.repetitions
  );
  const progressPoints = getSocialProgressPoints(row.masteryLevel, row.repetitions);

  if (!displayStatus) {
    return {
      displayStatus: null,
      progressPoints,
      verseXp: 0,
      anchorBonusXp: 0,
      totalXp: 0,
      countsForXp: false,
    };
  }

  const countsForXp =
    displayStatus === "MASTERED" ||
    displayStatus === "REVIEW" ||
    progressPoints > 0;

  if (!countsForXp) {
    return {
      displayStatus,
      progressPoints,
      verseXp: 0,
      anchorBonusXp: 0,
      totalXp: 0,
      countsForXp: false,
    };
  }

  const verseXp =
    displayStatus === "MASTERED"
      ? MASTERED_XP
      : displayStatus === "REVIEW"
        ? REVIEW_XP_BASE + progressPoints * REVIEW_XP_MULTIPLIER
        : progressPoints * LEARNING_XP_MULTIPLIER;
  const anchorAverage = Math.round(
    (normalizeSocialSkillScore(row.referenceScore) +
      normalizeSocialSkillScore(row.incipitScore) +
      normalizeSocialSkillScore(row.contextScore)) /
      3
  );
  const anchorBonusXp = Math.round(anchorAverage * ANCHOR_BONUS_RATIO);
  const totalXp = Math.round(
    (verseXp + anchorBonusXp) * getDifficultyMultiplier(row.difficultyLevel)
  );

  return {
    displayStatus,
    progressPoints,
    verseXp,
    anchorBonusXp,
    totalXp,
    countsForXp: true,
  };
}

export function computeSocialUserXpSummary(params: {
  verses: SocialVerseProgressRow[];
  storedStreak: number;
  now?: Date | number;
}): SocialUserXpSummary {
  const nowDate =
    params.now instanceof Date ? params.now : new Date(params.now ?? Date.now());
  const nowTime = nowDate.getTime();
  const weeklyCutoff = nowTime - WEEK_MS;

  let xpFromVerses = 0;
  let weeklyRepetitions = 0;
  let masteredVerses = 0;
  let learningVerses = 0;
  let reviewVerses = 0;
  let dueReviewVerses = 0;
  let totalRepetitions = 0;
  let latestReviewedAt: Date | null = null;

  for (const verse of params.verses) {
    const repetitions = normalizeSocialProgressValue(verse.repetitions);
    const breakdown = computeSocialVerseXp(verse);

    if (breakdown.displayStatus === "LEARNING") {
      learningVerses += 1;
    } else if (breakdown.displayStatus === "REVIEW") {
      reviewVerses += 1;

      const nextReviewAt =
        verse.nextReviewAt instanceof Date
          ? verse.nextReviewAt.getTime()
          : Number.NaN;
      if (Number.isNaN(nextReviewAt) || nextReviewAt <= nowTime) {
        dueReviewVerses += 1;
      }
    } else if (breakdown.displayStatus === "MASTERED") {
      masteredVerses += 1;
    }

    if (breakdown.displayStatus !== null) {
      totalRepetitions += repetitions;
    }

    const reviewedAt =
      verse.lastReviewedAt instanceof Date
        ? verse.lastReviewedAt
        : verse.lastReviewedAt
          ? new Date(verse.lastReviewedAt)
          : null;
    if (
      reviewedAt &&
      !Number.isNaN(reviewedAt.getTime()) &&
      (!latestReviewedAt || reviewedAt.getTime() > latestReviewedAt.getTime())
    ) {
      latestReviewedAt = reviewedAt;
    }

    if (!breakdown.countsForXp) {
      continue;
    }

    xpFromVerses += breakdown.totalXp;

    const reviewedAtTime = reviewedAt?.getTime() ?? Number.NaN;
    if (!Number.isNaN(reviewedAtTime) && reviewedAtTime >= weeklyCutoff) {
      weeklyRepetitions += 1;
    }
  }

  const dailyStreak = computeActiveDailyStreak({
    storedStreak: params.storedStreak,
    latestReviewedAt,
    now: nowDate,
  });
  const streakBonusXp =
    Math.min(dailyStreak, STREAK_BONUS_CAP_DAYS) * STREAK_BONUS_PER_DAY;
  const weeklyActivityBonusXp =
    Math.min(weeklyRepetitions, WEEKLY_REPETITIONS_BONUS_CAP) *
    WEEKLY_REPETITIONS_BONUS_PER_ITEM;
  const xp = Math.max(
    0,
    Math.round(xpFromVerses + streakBonusXp + weeklyActivityBonusXp)
  );

  return {
    xp,
    dailyStreak,
    weeklyRepetitions,
    masteredVerses,
    learningVerses,
    reviewVerses,
    dueReviewVerses,
    totalRepetitions,
    lastActiveAt: latestReviewedAt ? latestReviewedAt.toISOString() : null,
    latestReviewedAt,
    rankable: xp > 0,
  };
}
