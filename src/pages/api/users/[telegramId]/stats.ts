import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { VerseStatus } from "@/generated/prisma";
import { getBibleBookNameRu } from "@/app/types/bible";
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import { computeActiveDailyStreak } from "@/shared/training/dailyStreak";
import {
  formatParsedExternalVerseReference,
  parseExternalVerseId,
} from "@/shared/bible/externalVerseId";
import {
  computeDisplayStatus,
  normalizeProgressValue,
} from "./verses/verseCard.types";

type UserDashboardStatsResponse = {
  totalVerses: number;
  learningStatusVerses: number;
  learningVerses: number;
  reviewVerses: number;
  masteredVerses: number;
  stoppedVerses: number;
  dueReviewVerses: number;
  totalRepetitions: number;
  averageProgressPercent: number;
  bestVerseReference: string | null;
  dailyStreak: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RATING_PROGRESS_WEIGHT = 0.4;
const RATING_SKILLS_WEIGHT = 0.3;
const RATING_STREAK_WEIGHT = 0.2;
const RATING_WEEKLY_WEIGHT = 0.1;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toProgressPercent(masteryLevel: number, repetitions: number) {
  const totalProgressPoints = Math.min(
    normalizeProgressValue(masteryLevel) + normalizeProgressValue(repetitions),
    TOTAL_REPEATS_AND_STAGE_MASTERY_MAX
  );
  return clampPercent(
    (totalProgressPoints / TOTAL_REPEATS_AND_STAGE_MASTERY_MAX) * 100
  );
}

function normalizeSkillScore(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toSkillsPercent(
  referenceScore: number | null | undefined,
  incipitScore: number | null | undefined,
  contextScore: number | null | undefined
): number {
  return clampPercent(
    (normalizeSkillScore(referenceScore) +
      normalizeSkillScore(incipitScore) +
      normalizeSkillScore(contextScore)) /
      3
  );
}

function computeRatingPercent(params: {
  averageProgressPercent: number;
  averageSkillsPercent: number;
  streakDays: number;
  weeklyRepetitions: number;
}): number {
  const streakPercent = Math.min(100, Math.max(0, params.streakDays) * 5);
  const weeklyActivityPercent = Math.min(
    100,
    Math.max(0, params.weeklyRepetitions) * 10
  );

  return clampPercent(
    params.averageProgressPercent * RATING_PROGRESS_WEIGHT +
      params.averageSkillsPercent * RATING_SKILLS_WEIGHT +
      streakPercent * RATING_STREAK_WEIGHT +
      weeklyActivityPercent * RATING_WEEKLY_WEIGHT
  );
}

function formatVerseReference(externalVerseId: string): string {
  const parsed = parseExternalVerseId(externalVerseId);
  if (!parsed) return externalVerseId;
  return formatParsedExternalVerseReference(parsed, getBibleBookNameRu(parsed.book));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserDashboardStatsResponse | { error: string; details?: string }>
) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { dailyStreak: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userVerses = await prisma.userVerse.findMany({
      where: { telegramId },
      select: {
        status: true,
        masteryLevel: true,
        repetitions: true,
        referenceScore: true,
        incipitScore: true,
        contextScore: true,
        lastReviewedAt: true,
        nextReviewAt: true,
        verse: {
          select: {
            externalVerseId: true,
          },
        },
      },
    });

    const now = Date.now();
    const weeklyCutoff = now - WEEK_MS;
    let learningVerses = 0;
    let learningStatusVerses = 0;
    let reviewVerses = 0;
    let masteredVerses = 0;
    let stoppedVerses = 0;
    let dueReviewVerses = 0;
    let totalRepetitions = 0;
    let progressSum = 0;
    let skillsSum = 0;
    let progressCount = 0;
    let weeklyRepetitions = 0;
    let bestVerseQuality = -1;
    let bestVerseExternalId: string | null = null;
    let bestVerseReference: string | null = null;
    let latestReviewedAt: Date | null = null;

    for (const userVerse of userVerses) {
      const masteryLevel = normalizeProgressValue(userVerse.masteryLevel);
      const repetitions = normalizeProgressValue(userVerse.repetitions);
      if (
        userVerse.lastReviewedAt &&
        (!latestReviewedAt || userVerse.lastReviewedAt.getTime() > latestReviewedAt.getTime())
      ) {
        latestReviewedAt = userVerse.lastReviewedAt;
      }
      if (userVerse.status === VerseStatus.LEARNING) {
        learningStatusVerses += 1;
      }
      const displayStatus = computeDisplayStatus(
        userVerse.status,
        masteryLevel,
        repetitions
      );

      if (displayStatus === VerseStatus.LEARNING) {
        learningVerses += 1;
      } else if (displayStatus === "REVIEW") {
        reviewVerses += 1;
        const nextReviewAt = userVerse.nextReviewAt?.getTime() ?? Number.NaN;
        if (Number.isNaN(nextReviewAt) || nextReviewAt <= now) {
          dueReviewVerses += 1;
        }
      } else if (displayStatus === "MASTERED") {
        masteredVerses += 1;
      } else if (displayStatus === VerseStatus.STOPPED) {
        stoppedVerses += 1;
      }

      if (
        displayStatus === VerseStatus.LEARNING ||
        displayStatus === "REVIEW" ||
        displayStatus === "MASTERED"
      ) {
        const progressPercent = toProgressPercent(masteryLevel, repetitions);
        const skillsPercent = toSkillsPercent(
          userVerse.referenceScore,
          userVerse.incipitScore,
          userVerse.contextScore
        );
        const verseQuality = clampPercent(
          progressPercent * 0.5 + skillsPercent * 0.5
        );

        progressSum += progressPercent;
        skillsSum += skillsPercent;
        progressCount += 1;
        totalRepetitions += repetitions;

        const reviewedAt = userVerse.lastReviewedAt?.getTime() ?? Number.NaN;
        if (!Number.isNaN(reviewedAt) && reviewedAt >= weeklyCutoff) {
          weeklyRepetitions += 1;
        }

        if (
          verseQuality > bestVerseQuality ||
          (verseQuality === bestVerseQuality &&
            bestVerseExternalId != null &&
            userVerse.verse.externalVerseId.localeCompare(bestVerseExternalId) < 0)
        ) {
          bestVerseQuality = verseQuality;
          bestVerseExternalId = userVerse.verse.externalVerseId;
          bestVerseReference = formatVerseReference(
            userVerse.verse.externalVerseId
          );
        }
      }
    }

    const averageProgressOnlyPercent =
      progressCount > 0 ? clampPercent(progressSum / progressCount) : 0;
    const averageSkillsPercent =
      progressCount > 0 ? clampPercent(skillsSum / progressCount) : 0;
    const dailyStreak = computeActiveDailyStreak({
      storedStreak: user.dailyStreak,
      latestReviewedAt,
    });
    const averageProgressPercent = computeRatingPercent({
      averageProgressPercent: averageProgressOnlyPercent,
      averageSkillsPercent,
      streakDays: dailyStreak,
      weeklyRepetitions,
    });

    return res.status(200).json({
      totalVerses: userVerses.length,
      learningStatusVerses,
      learningVerses,
      reviewVerses,
      masteredVerses,
      stoppedVerses,
      dueReviewVerses,
      totalRepetitions,
      averageProgressPercent,
      bestVerseReference,
      dailyStreak,
    });
  } catch (error) {
    console.error("Error fetching user dashboard stats:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
