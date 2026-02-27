import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { VerseStatus } from "@/generated/prisma";
import {
  computeDisplayStatus,
} from "../verses/verseCard.types";

type ReadinessResponse = {
  requested: {
    learning: number;
    review: number;
  };
  available: {
    learning: number;
    review: number;
  };
  effective: {
    learning: number;
    review: number;
  };
  phases: {
    learning: {
      enabled: boolean;
      canStart: boolean;
      missingCount: number;
      status: "ready" | "insufficient" | "missing_required" | "disabled";
      userAction: "none" | "create_or_move_to_learning";
      message: string | null;
    };
    review: {
      enabled: boolean;
      skipped: boolean;
      missingCount: number;
      status: "ready" | "insufficient" | "skipped" | "disabled";
      userAction: "none";
      message: string | null;
    };
  };
  summary: {
    hasAnyUserVerses: boolean;
    canStartDailyGoal: boolean;
    reviewStageWillBeSkipped: boolean;
    hasAllCardsForRequestedGoal: boolean;
    mode: "ready" | "ready_with_review_skip" | "blocked_no_learning" | "empty";
  };
};

function parseNonNegativeInt(
  value: string | string[] | undefined,
  key: string
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw ?? 0);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`${key} must be an integer between 0 and 100`);
  }
  return parsed;
}

type VerseAvailabilityInput = {
  status?: VerseStatus | null;
  masteryLevel?: number | null;
  repetitions?: number | null;
  nextReviewAt?: Date | null;
};

function countAvailability(verses: VerseAvailabilityInput[]) {
  let learning = 0;
  let review = 0;

  for (const verse of verses) {
    const status = computeDisplayStatus(verse.status, verse.masteryLevel, verse.repetitions);
    if (status === VerseStatus.LEARNING) {
      learning += 1;
      continue;
    }
    if (status === "REVIEW") {
      const raw = verse.nextReviewAt;
      const nextReviewAt =
        raw instanceof Date ? raw : raw != null ? new Date(String(raw)) : null;
      const isDue =
        !nextReviewAt ||
        Number.isNaN(nextReviewAt.getTime()) ||
        Date.now() >= nextReviewAt.getTime();
      if (isDue) review += 1;
    }
  }

  return { learning, review };
}

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

    const verses = (await prisma.userVerse.findMany({
      where: { telegramId },
    })) as Array<{
      status?: VerseStatus | null;
      masteryLevel?: number | null;
      repetitions?: number | null;
      nextReviewAt?: Date | null;
    }>;

    const available = countAvailability(verses);
    const hasAnyUserVerses = verses.length > 0;

    const reviewStageWillBeSkipped = requestedReview > 0 && available.review === 0;
    const learningEnabled = requestedLearning > 0;
    const reviewRequested = requestedReview > 0;
    const learningCanStart = !learningEnabled || available.learning > 0;

    const effective = {
      learning: Math.min(requestedLearning, available.learning),
      review: reviewStageWillBeSkipped ? 0 : Math.min(requestedReview, available.review),
    };

    const learningMissingCount = Math.max(0, requestedLearning - available.learning);
    const reviewMissingCount = reviewStageWillBeSkipped
      ? 0
      : Math.max(0, requestedReview - available.review);

    const hasAllCardsForRequestedGoal =
      available.learning >= requestedLearning && available.review >= requestedReview;

    const canStartDailyGoal = learningCanStart && (learningEnabled || reviewRequested || hasAnyUserVerses);

    const mode: ReadinessResponse["summary"]["mode"] = !hasAnyUserVerses
      ? "empty"
      : !learningCanStart && learningEnabled
        ? "blocked_no_learning"
        : reviewStageWillBeSkipped
          ? "ready_with_review_skip"
          : "ready";

    const response: ReadinessResponse = {
      requested: {
        learning: requestedLearning,
        review: requestedReview,
      },
      available,
      effective,
      phases: {
        learning: {
          enabled: learningEnabled,
          canStart: learningCanStart,
          missingCount: learningMissingCount,
          status: !learningEnabled
            ? "disabled"
            : available.learning === 0
              ? "missing_required"
              : learningMissingCount > 0
                ? "insufficient"
                : "ready",
          userAction: learningEnabled && available.learning === 0 ? "create_or_move_to_learning" : "none",
          message:
            learningEnabled && available.learning === 0
              ? "Чтобы начать ежедневную цель, добавьте стих или переведите стих в режим изучения (LEARNING)."
              : null,
        },
        review: {
          enabled: reviewRequested && available.review > 0,
          skipped: reviewStageWillBeSkipped,
          missingCount: reviewMissingCount,
          status: !reviewRequested
            ? "disabled"
            : reviewStageWillBeSkipped
              ? "skipped"
              : reviewMissingCount > 0
                ? "insufficient"
                : "ready",
          userAction: "none",
          message: reviewStageWillBeSkipped
            ? "Этап повторения будет пропущен: сейчас нет карточек для повторения."
            : null,
        },
      },
      summary: {
        hasAnyUserVerses,
        canStartDailyGoal,
        reviewStageWillBeSkipped,
        hasAllCardsForRequestedGoal,
        mode,
      },
    };

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
