import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { VerseStatus } from "@/generated/prisma";
import { TRAINING_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import {
  REVIEW_MASTERY_LEVEL_MIN,
  WAITING_MASTERY_LEVEL_MIN_EXCLUSIVE,
  WAITING_NEXT_REVIEW_DELAY_HOURS,
  canMutateRepetitionsByMastery,
  mapUserVerseToVerseCardDto,
  normalizeBaseStatus,
  normalizeProgressValue,
  type UserVerseWithLegacyNullableProgress,
} from "./verseCard.types";

function clampMasteryForLearning(value: number): number {
  return Math.max(1, Math.min(TRAINING_STAGE_MASTERY_MAX, Math.round(value)));
}

type UpdateVersePayload = {
  masteryLevel?: number;
  repetitions?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  lastTrainingModeId?: number | null;
  status?: VerseStatus;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId, externalVerseId } = req.query;
  if (!telegramId || Array.isArray(telegramId) || !externalVerseId || Array.isArray(externalVerseId)) {
    return res.status(400).json({ error: "telegramId and externalVerseId are required" });
  }

  // Поддерживает обновление и удаление прогресса по конкретному стиху.
  if (req.method === "PATCH") {
    return handlePatch(req, res, telegramId, externalVerseId);
  }

  if (req.method === "DELETE") {
    return handleDelete(res, telegramId, externalVerseId);
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  telegramId: string,
  externalVerseId: string
) {
  // Корректирует поля прогресса (мастерство, повторения, даты).
  try {
    const body = req.body as UpdateVersePayload;

    const [user, existingVerse] = await Promise.all([
      prisma.user.findUnique({
        where: { telegramId },
        select: { id: true },
      }),
      prisma.userVerse.findUnique({
        where: {
          telegramId_externalVerseId: {
            telegramId,
            externalVerseId,
          },
        },
      }),
    ]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!existingVerse) {
      return res.status(404).json({ error: "Verse not found" });
    }

    const existingVerseWithStatus = existingVerse as UserVerseWithLegacyNullableProgress;

    const currentBaseStatus = normalizeBaseStatus(existingVerseWithStatus.status);
    const currentMasteryLevel = normalizeProgressValue(existingVerseWithStatus.masteryLevel);
    const currentRepetitions = normalizeProgressValue(existingVerseWithStatus.repetitions);
    const rawNextReviewAt = existingVerseWithStatus.nextReviewAt;
    const currentNextReviewAt =
      rawNextReviewAt instanceof Date
        ? rawNextReviewAt
        : rawNextReviewAt != null
          ? new Date(String(rawNextReviewAt))
          : null;
    const isNotYetDue =
      currentNextReviewAt !== null &&
      !Number.isNaN(currentNextReviewAt.getTime()) &&
      Date.now() < currentNextReviewAt.getTime();
    const requestedRepetitions =
      body.repetitions !== undefined ? normalizeProgressValue(body.repetitions) : currentRepetitions;
    const requestedMasteryLevelRaw =
      body.masteryLevel !== undefined
        ? normalizeProgressValue(body.masteryLevel)
        : currentMasteryLevel;
    const requestedMasteryLevel =
      currentBaseStatus === VerseStatus.LEARNING && body.masteryLevel !== undefined
        ? clampMasteryForLearning(requestedMasteryLevelRaw)
        : requestedMasteryLevelRaw;
    const requestedBaseStatus =
      body.status !== undefined ? normalizeBaseStatus(body.status) : currentBaseStatus;
    const isRepetitionsMutation =
      body.repetitions !== undefined && requestedRepetitions !== currentRepetitions;

    if (
      isRepetitionsMutation &&
      !canMutateRepetitionsByMastery(requestedBaseStatus, requestedMasteryLevel)
    ) {
      // 409 is clearer than silently ignoring the write:
      // repetitions are allowed only after the verse is in LEARNING and mastery is >= REVIEW_MASTERY_LEVEL_MIN.
      return res.status(409).json({
        error:
          "repetitions can only be changed after LEARNING verse reaches masteryLevel >= 7",
      });
    }

    // Fires exactly once: when mastery first crosses the learning→review boundary.
    const reachedWaitingThresholdNow =
      currentBaseStatus === VerseStatus.LEARNING &&
      currentMasteryLevel < WAITING_MASTERY_LEVEL_MIN_EXCLUSIVE &&
      requestedMasteryLevel >= REVIEW_MASTERY_LEVEL_MIN &&
      requestedBaseStatus === VerseStatus.LEARNING;

    const autoNextReviewAt = reachedWaitingThresholdNow
      ? new Date(Date.now() + WAITING_NEXT_REVIEW_DELAY_HOURS * 60 * 60 * 1000)
      : null;

    // Client-computed nextReviewAt (spaced repetition) takes precedence;
    // server auto-value is the fallback for the graduation step.
    const resolvedNextReviewAt =
      body.nextReviewAt ? new Date(body.nextReviewAt) : autoNextReviewAt;

    const verse = await prisma.userVerse.update({
      where: {
        telegramId_externalVerseId: {
          telegramId,
          externalVerseId,
        },
      },
      data: {
        ...(body.masteryLevel !== undefined ? { masteryLevel: requestedMasteryLevel } : {}),
        ...(body.repetitions !== undefined && !isNotYetDue
          ? { repetitions: normalizeProgressValue(body.repetitions) }
          : {}),
        ...(body.lastReviewedAt ? { lastReviewedAt: new Date(body.lastReviewedAt) } : {}),
        ...(resolvedNextReviewAt ? { nextReviewAt: resolvedNextReviewAt } : {}),
        ...(body.lastTrainingModeId !== undefined
          ? { lastTrainingModeId: body.lastTrainingModeId ?? null }
          : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });

    return res.status(200).json(
      mapUserVerseToVerseCardDto({
        ...(verse as UserVerseWithLegacyNullableProgress),
        tags: [],
      })
    );
  } catch (error) {
    console.error("Error updating verse:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleDelete(res: NextApiResponse, telegramId: string, externalVerseId: string) {
  // Удаляет стих из списка пользователя.
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.userVerse.delete({
      where: {
        telegramId_externalVerseId: {
          telegramId,
          externalVerseId,
        },
      },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error deleting verse:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
