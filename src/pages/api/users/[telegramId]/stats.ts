import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { VerseStatus } from "@/generated/prisma";
import { getBibleBookNameRu } from "@/app/types/bible";
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import {
  computeDisplayStatus,
  normalizeProgressValue,
} from "./verses/verseCard.types";

type UserDashboardStatsResponse = {
  totalVerses: number;
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

type ParsedExternalVerseId = {
  book: number;
  chapter: number;
  verse: number;
};

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

function parseExternalVerseId(value?: string): ParsedExternalVerseId | null {
  if (!value) return null;
  const parts = value.split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [book, chapter, verse] = parts;
  if (!book || !chapter || !verse) return null;
  return { book, chapter, verse };
}

function formatVerseReference(externalVerseId: string): string {
  const parsed = parseExternalVerseId(externalVerseId);
  if (!parsed) return externalVerseId;
  return `${getBibleBookNameRu(parsed.book)} ${parsed.chapter}:${parsed.verse}`;
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
        nextReviewAt: true,
        verse: {
          select: {
            externalVerseId: true,
          },
        },
      },
    });

    const now = Date.now();
    let learningVerses = 0;
    let reviewVerses = 0;
    let masteredVerses = 0;
    let stoppedVerses = 0;
    let dueReviewVerses = 0;
    let totalRepetitions = 0;
    let progressSum = 0;
    let progressCount = 0;
    let bestProgressPercent = -1;
    let bestVerseReference: string | null = null;

    for (const userVerse of userVerses) {
      const masteryLevel = normalizeProgressValue(userVerse.masteryLevel);
      const repetitions = normalizeProgressValue(userVerse.repetitions);
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

      totalRepetitions += repetitions;

      if (
        displayStatus === VerseStatus.LEARNING ||
        displayStatus === "REVIEW" ||
        displayStatus === "MASTERED"
      ) {
        const progressPercent = toProgressPercent(masteryLevel, repetitions);
        progressSum += progressPercent;
        progressCount += 1;

        if (progressPercent > bestProgressPercent) {
          bestProgressPercent = progressPercent;
          bestVerseReference = formatVerseReference(
            userVerse.verse.externalVerseId
          );
        }
      }
    }

    const averageProgressPercent =
      progressCount > 0 ? clampPercent(progressSum / progressCount) : 0;
    const dailyStreak = Math.max(0, Math.round(Number(user.dailyStreak ?? 0)));

    return res.status(200).json({
      totalVerses: userVerses.length,
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
