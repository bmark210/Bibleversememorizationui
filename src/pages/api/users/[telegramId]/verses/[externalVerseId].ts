import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { VerseStatus } from "@/generated/prisma";
import {
  REVIEW_FAILED_RETRY_MINUTES,
  TRAINING_STAGE_MASTERY_MAX,
} from "@/shared/training/constants";
import {
  REVIEW_MASTERY_LEVEL_MIN,
  WAITING_MASTERY_LEVEL_MIN_EXCLUSIVE,
  WAITING_NEXT_REVIEW_DELAY_HOURS,
  canMutateRepetitionsByMastery,
  isReviewState,
  mapUserVerseToVerseCardDto,
  normalizeBaseStatus,
  normalizeProgressValue,
  type UserVerseWithLegacyNullableProgress,
} from "./verseCard.types";

function clampMasteryForLearning(value: number): number {
  return Math.max(1, Math.min(TRAINING_STAGE_MASTERY_MAX, Math.round(value)));
}

function validateTrainingModeIdOrNull(value: number | null): number | null {
  if (value === null) return null;
  if (Number.isInteger(value) && value >= 1 && value <= 8) {
    return value;
  }
  throw new Error("lastTrainingModeId must be an integer between 1 and 8 or null");
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

  if (req.method === "PUT") {
    return handlePut(res, telegramId, externalVerseId);
  }

  // Поддерживает обновление и удаление прогресса по конкретному стиху.
  if (req.method === "PATCH") {
    return handlePatch(req, res, telegramId, externalVerseId);
  }

  if (req.method === "DELETE") {
    return handleDelete(res, telegramId, externalVerseId);
  }

  res.setHeader("Allow", "PUT, PATCH, DELETE");
  return res.status(405).json({ error: "Method Not Allowed" });
}

// Resolve the global Verse by externalVerseId, then find the user's progress record
async function resolveUserVerse(telegramId: string, externalVerseId: string) {
  const globalVerse = await prisma.verse.findUnique({
    where: { externalVerseId },
    select: { id: true },
  });
  if (!globalVerse) return { globalVerse: null, userVerse: null };

  const userVerse = await prisma.userVerse.findUnique({
    where: {
      telegramId_verseId: {
        telegramId,
        verseId: globalVerse.id,
      },
    },
  });

  return { globalVerse, userVerse };
}

async function handlePut(res: NextApiResponse, telegramId: string, externalVerseId: string) {
  // Добавляет стих в коллекцию пользователя (создаёт UserVerse со статусом MY, если нет).
  try {
    const [user, globalVerse] = await Promise.all([
      prisma.user.findUnique({ where: { telegramId }, select: { id: true } }),
      prisma.verse.findUnique({ where: { externalVerseId }, select: { id: true } }),
    ]);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!globalVerse) return res.status(404).json({ error: "Verse not found in catalog" });

    const userVerse = await prisma.userVerse.upsert({
      where: { telegramId_verseId: { telegramId, verseId: globalVerse.id } },
      update: {},
      create: { telegramId, verseId: globalVerse.id, status: VerseStatus.MY },
      include: { verse: true },
    });

    return res.status(200).json(
      mapUserVerseToVerseCardDto({
        ...(userVerse as UserVerseWithLegacyNullableProgress),
        externalVerseId: userVerse.verse.externalVerseId,
        tags: [],
      })
    );
  } catch (error) {
    console.error("Error adding verse to collection:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
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
    let nextLastTrainingModeId: number | null | undefined;
    if (body.lastTrainingModeId !== undefined) {
      try {
        nextLastTrainingModeId = validateTrainingModeIdOrNull(body.lastTrainingModeId ?? null);
      } catch (error) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : "Invalid lastTrainingModeId",
        });
      }
    }

    const [user, { globalVerse, userVerse: existingVerse }] = await Promise.all([
      prisma.user.findUnique({
        where: { telegramId },
        select: { id: true },
      }),
      resolveUserVerse(telegramId, externalVerseId),
    ]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!globalVerse || !existingVerse) {
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
    const requestedMasteryLevelClamped =
      currentBaseStatus === VerseStatus.LEARNING && body.masteryLevel !== undefined
        ? clampMasteryForLearning(requestedMasteryLevelRaw)
        : requestedMasteryLevelRaw;
    const requestedMasteryLevel =
      currentBaseStatus === VerseStatus.LEARNING &&
      body.masteryLevel !== undefined &&
      currentMasteryLevel < TRAINING_STAGE_MASTERY_MAX - 1 &&
      requestedMasteryLevelClamped >= TRAINING_STAGE_MASTERY_MAX
        ? TRAINING_STAGE_MASTERY_MAX - 1
        : requestedMasteryLevelClamped;
    const requestedBaseStatus =
      body.status !== undefined ? normalizeBaseStatus(body.status) : currentBaseStatus;
    const isRepetitionsMutation =
      body.repetitions !== undefined && requestedRepetitions !== currentRepetitions;
    const isCurrentReviewState = isReviewState(
      currentBaseStatus,
      currentMasteryLevel,
      currentRepetitions
    );

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
    const forcedReviewRetryNextReviewAt =
      isCurrentReviewState &&
      body.repetitions !== undefined &&
      requestedRepetitions === currentRepetitions
        ? new Date(Date.now() + REVIEW_FAILED_RETRY_MINUTES * 60 * 1000)
        : null;

    // Forced review retry (+10m) has highest priority on failed review attempts.
    // Then client-computed nextReviewAt (spaced repetition), then server auto-value on graduation.
    const resolvedNextReviewAt =
      forcedReviewRetryNextReviewAt ??
      (body.nextReviewAt ? new Date(body.nextReviewAt) : autoNextReviewAt);

    const verse = await prisma.userVerse.update({
      where: {
        telegramId_verseId: {
          telegramId,
          verseId: globalVerse.id,
        },
      },
      data: {
        ...(body.masteryLevel !== undefined ? { masteryLevel: requestedMasteryLevel } : {}),
        ...(body.repetitions !== undefined && !isNotYetDue
          ? { repetitions: requestedRepetitions }
          : {}),
        ...(body.lastReviewedAt ? { lastReviewedAt: new Date(body.lastReviewedAt) } : {}),
        ...(resolvedNextReviewAt ? { nextReviewAt: resolvedNextReviewAt } : {}),
        ...(nextLastTrainingModeId !== undefined
          ? { lastTrainingModeId: nextLastTrainingModeId }
          : {}),
        ...(body.status ? { status: body.status } : {}),
      },
      include: { verse: true },
    });

    return res.status(200).json(
      mapUserVerseToVerseCardDto({
        ...(verse as UserVerseWithLegacyNullableProgress),
        externalVerseId: verse.verse.externalVerseId,
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
  // Удаляет стих только из списка пользователя; глобальный Verse не затрагивается.
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const globalVerse = await prisma.verse.findUnique({
      where: { externalVerseId },
      select: { id: true },
    });

    if (!globalVerse) {
      return res.status(404).json({ error: "Verse not found" });
    }

    await prisma.userVerse.delete({
      where: {
        telegramId_verseId: {
          telegramId,
          verseId: globalVerse.id,
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
