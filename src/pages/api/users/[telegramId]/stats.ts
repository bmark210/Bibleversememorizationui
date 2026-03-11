import type { NextApiRequest, NextApiResponse } from "next";
import { VerseStatus } from "@/generated/prisma";
import { getBibleBookNameRu } from "@/app/types/bible";
import { getUserByTelegramId } from "@/modules/users/infrastructure/userRepository";
import { findUserVerses } from "@/modules/verses/infrastructure/verseRepository";
import {
  computeSocialUserXpSummary,
  computeSocialVerseXp,
} from "@/shared/social/xp";
import {
  formatParsedExternalVerseReference,
  parseExternalVerseId,
} from "@/shared/bible/externalVerseId";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

type UserDashboardStatsResponse = {
  totalVerses: number;
  learningStatusVerses: number;
  learningVerses: number;
  reviewVerses: number;
  masteredVerses: number;
  stoppedVerses: number;
  dueReviewVerses: number;
  totalRepetitions: number;
  xp: number;
  bestVerseReference: string | null;
  dailyStreak: number;
};

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
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userVerses = await findUserVerses({
      telegramId,
    });

    const summary = computeSocialUserXpSummary({
      verses: userVerses.map((userVerse) => ({
        status: userVerse.status,
        masteryLevel: userVerse.masteryLevel,
        repetitions: userVerse.repetitions,
        referenceScore: userVerse.referenceScore,
        incipitScore: userVerse.incipitScore,
        contextScore: userVerse.contextScore,
        lastReviewedAt: userVerse.lastReviewedAt,
        nextReviewAt: userVerse.nextReviewAt,
      })),
      storedStreak: user.dailyStreak,
    });

    let bestVerseXp = Number.NEGATIVE_INFINITY;
    let bestVerseExternalId: string | null = null;
    let bestVerseReference: string | null = null;

    for (const userVerse of userVerses) {
      const breakdown = computeSocialVerseXp({
        status: userVerse.status,
        masteryLevel: userVerse.masteryLevel,
        repetitions: userVerse.repetitions,
        referenceScore: userVerse.referenceScore,
        incipitScore: userVerse.incipitScore,
        contextScore: userVerse.contextScore,
      });
      if (!breakdown.countsForXp) {
        continue;
      }

      const externalVerseId = userVerse.verse.externalVerseId;
      if (
        breakdown.totalXp > bestVerseXp ||
        (breakdown.totalXp === bestVerseXp &&
          bestVerseExternalId != null &&
          externalVerseId.localeCompare(bestVerseExternalId) < 0)
      ) {
        bestVerseXp = breakdown.totalXp;
        bestVerseExternalId = externalVerseId;
        bestVerseReference = formatVerseReference(externalVerseId);
      }
    }

    return res.status(200).json({
      totalVerses: userVerses.length,
      learningStatusVerses: userVerses.filter(
        (userVerse) => userVerse.status === VerseStatus.LEARNING
      ).length,
      learningVerses: summary.learningVerses,
      reviewVerses: summary.reviewVerses,
      masteredVerses: summary.masteredVerses,
      stoppedVerses: userVerses.filter(
        (userVerse) => userVerse.status === VerseStatus.STOPPED
      ).length,
      dueReviewVerses: summary.dueReviewVerses,
      totalRepetitions: summary.totalRepetitions,
      xp: summary.xp,
      bestVerseReference,
      dailyStreak: summary.dailyStreak,
    });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
