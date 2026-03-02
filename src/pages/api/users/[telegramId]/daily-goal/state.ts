import type { NextApiRequest, NextApiResponse } from "next";
import type { Prisma } from "@/generated/prisma/client";
import type { DailyGoalStateResponse } from "@/app/features/daily-goal/types";
import { prisma } from "@/lib/prisma";
import {
  buildDailyGoalReadiness,
  getDayKeyInTimezone,
  parseDayKey,
  parseNonNegativeInt,
  parseTimezone,
} from "@/server/daily-goal/readiness";
import { parseDailyGoalServerStateV2, reconcileDailyGoalServerStateV2 } from "@/server/daily-goal/state";

type ErrorResponse = {
  error: string;
  details?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DailyGoalStateResponse | ErrorResponse>
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
    const requestedLearning = parseNonNegativeInt(req.query.newVersesCount, "newVersesCount");
    const requestedReview = parseNonNegativeInt(req.query.reviewVersesCount, "reviewVersesCount");
    const timezone = parseTimezone(req.query.timezone, "UTC");
    const dayKey = parseDayKey(req.query.dayKey) ?? getDayKeyInTimezone(timezone);

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        dailyGoalState: true,
        dailyGoalStateRev: true,
      },
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

    const readiness = buildDailyGoalReadiness({
      verses,
      requestedLearning,
      requestedReview,
    });

    const reconciled = reconcileDailyGoalServerStateV2({
      currentState: user.dailyGoalState,
      dayKey,
      timezone,
      requestedCounts: {
        new: requestedLearning,
        review: requestedReview,
      },
    });

    let state = reconciled.state;
    let stateRev = user.dailyGoalStateRev;

    if (reconciled.changed) {
      const updated = await prisma.user.update({
        where: { telegramId },
        data: {
          dailyGoalState: reconciled.state as unknown as Prisma.InputJsonValue,
          dailyGoalStateRev: { increment: 1 },
        },
        select: {
          dailyGoalState: true,
          dailyGoalStateRev: true,
        },
      });

      stateRev = updated.dailyGoalStateRev;
      state = parseDailyGoalServerStateV2(updated.dailyGoalState) ?? reconciled.state;
    }

    return res.status(200).json({
      dayKey,
      timezone,
      stateRev,
      state,
      readiness,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("must be an integer")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error computing daily goal state:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
