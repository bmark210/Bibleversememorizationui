import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { buildDailyGoalReadiness, parseNonNegativeInt } from "@/server/daily-goal/readiness";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const requestedLearning = parseNonNegativeInt(req.query.newVersesCount, "newVersesCount");
    const requestedReview = parseNonNegativeInt(req.query.reviewVersesCount, "reviewVersesCount");

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const verses = await prisma.userVerse.findMany({
      where: { telegramId },
      select: {
        status: true,
        masteryLevel: true,
        repetitions: true,
        nextReviewAt: true,
      },
    });

    const response = buildDailyGoalReadiness({
      verses,
      requestedLearning,
      requestedReview,
    });

    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes("must be an integer")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error computing daily goal readiness:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
