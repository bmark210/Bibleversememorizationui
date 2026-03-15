import { z } from "zod";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { computeTrainingAttemptOutcome } from "@/modules/training/application/computeTrainingAttemptOutcome";
import { persistVerseProgressPatch } from "@/modules/training/infrastructure/verseProgressRepository";
import { handleApiError } from "@/shared/errors/apiErrorHandler";
import { mapUserVerseToVerseCardDto } from "@/pages/api/users/[telegramId]/verses/verseCard.types";
import {
  TRAINING_MODE_ID_MAX,
  TRAINING_MODE_ID_MIN,
} from "@/shared/constants/training";

const bodySchema = z
  .object({
    telegramId: z.string().trim().min(1),
    externalVerseId: z.string().trim().min(1),
    modeId: z
      .number()
      .finite()
      .int()
      .min(TRAINING_MODE_ID_MIN)
      .max(TRAINING_MODE_ID_MAX),
    phase: z.enum(["learning", "review"]),
    requestedRating: z.number().finite().int().min(0).max(3),
    ratingCap: z.number().finite().int().min(0).max(3),
  })
  .strict();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { telegramId, externalVerseId, modeId, phase, requestedRating, ratingCap } =
      parsed.data;

    const userVerse = await prisma.userVerse.findFirst({
      where: {
        telegramId,
        verse: { externalVerseId },
      },
      include: {
        verse: true,
        user: true,
      },
    });

    if (!userVerse) {
      return res.status(404).json({ error: "Verse not found" });
    }

    const now = new Date();
    const outcome = computeTrainingAttemptOutcome({
      phase,
      modeId,
      ratingCap: ratingCap as 0 | 1 | 2 | 3,
      userVerse: {
        status: userVerse.status,
        masteryLevel: userVerse.masteryLevel,
        repetitions: userVerse.repetitions,
        reviewLapseStreak: userVerse.reviewLapseStreak,
      },
      requestedRating: requestedRating as 0 | 1 | 2 | 3,
      now,
    });

    const persistedVerse = await persistVerseProgressPatch({
      telegramId,
      verseId: userVerse.verseId,
      patch: outcome.patch,
      dailyStreakContext: {
        currentStreak: userVerse.user.dailyStreak,
        reviewedAt: now,
      },
    });

    return res.status(200).json({
      appliedRating: outcome.appliedRating,
      verse: mapUserVerseToVerseCardDto({
        ...persistedVerse,
        externalVerseId: persistedVerse.verse.externalVerseId,
        verse: {
          id: userVerse.verse.id,
          createdAt: userVerse.verse.createdAt,
          externalVerseId: persistedVerse.verse.externalVerseId,
          difficultyLetters: persistedVerse.difficultyLetters,
        },
        tags: [],
      }),
    });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
