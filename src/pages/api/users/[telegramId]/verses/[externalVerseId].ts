import type { NextApiRequest, NextApiResponse } from "next";
import { VerseStatus } from "@/generated/prisma";
import { computeReviewResult } from "@/modules/training/application/computeProgressDelta";
import type { RatingValue } from "@/modules/training/domain/VerseProgress";
import { persistVerseProgressPatch } from "@/modules/training/infrastructure/verseProgressRepository";
import { getUserByTelegramId } from "@/modules/users/infrastructure/userRepository";
import {
  deleteUserVerseBinding,
  getUserVerseByExternalVerseId,
  getVerseByExternalVerseId,
  upsertUserVerseBinding,
} from "@/modules/verses/infrastructure/verseRepository";
import {
  TRAINING_STAGE_MASTERY_MAX,
} from "@/shared/training/constants";
import { handleApiError } from "@/shared/errors/apiErrorHandler";
import { patchVerseSchema } from "@/shared/validation/schemas/patchVerseSchema";
import { putVerseSchema } from "@/shared/validation/schemas/putVerseSchema";
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parsedParams = putVerseSchema.safeParse({
    telegramId: req.query.telegramId,
    externalVerseId: req.query.externalVerseId,
  });
  if (!parsedParams.success) {
    return res.status(400).json({ error: parsedParams.error.flatten() });
  }

  const { telegramId, externalVerseId } = parsedParams.data;

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
  const { verse, userVerse } = await getUserVerseByExternalVerseId({
    telegramId,
    externalVerseId,
  });
  return { globalVerse: verse, userVerse };
}

async function handlePut(res: NextApiResponse, telegramId: string, externalVerseId: string) {
  // Добавляет стих в коллекцию пользователя (создаёт UserVerse со статусом MY, если нет).
  try {
    const [user, globalVerse] = await Promise.all([
      getUserByTelegramId(telegramId),
      getVerseByExternalVerseId(externalVerseId),
    ]);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!globalVerse) return res.status(404).json({ error: "Verse not found in catalog" });

    const userVerse = await upsertUserVerseBinding({
      telegramId,
      verseId: globalVerse.id,
    });

    return res.status(200).json(
      mapUserVerseToVerseCardDto({
        ...(userVerse as UserVerseWithLegacyNullableProgress),
        externalVerseId: userVerse.verse.externalVerseId,
        tags: [],
      })
    );
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
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
    const parsedBody = patchVerseSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.flatten() });
    }
    const body = parsedBody.data;
    const reviewRating = body.reviewRating as RatingValue | undefined;
    const nowMs = Date.now();
    const reviewedAt = body.lastReviewedAt ? new Date(body.lastReviewedAt) : null;
    const nextLastTrainingModeId = body.lastTrainingModeId;

    const [user, { globalVerse, userVerse: existingVerse }] = await Promise.all([
      getUserByTelegramId(telegramId),
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
    const currentReviewLapseStreak = normalizeProgressValue(
      existingVerseWithStatus.reviewLapseStreak
    );
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
      nowMs < currentNextReviewAt.getTime();
    const requestedRepetitions =
      body.repetitions !== undefined ? normalizeProgressValue(body.repetitions) : currentRepetitions;
    const requestedReviewLapseStreak =
      body.reviewLapseStreak !== undefined
        ? normalizeProgressValue(body.reviewLapseStreak)
        : currentReviewLapseStreak;
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
          "repetitions can only be changed after a LEARNING verse reaches the review mastery threshold",
      });
    }

    // Fires exactly once: when mastery first crosses the learning→review boundary.
    const reachedWaitingThresholdNow =
      currentBaseStatus === VerseStatus.LEARNING &&
      currentMasteryLevel < WAITING_MASTERY_LEVEL_MIN_EXCLUSIVE &&
      requestedMasteryLevel >= REVIEW_MASTERY_LEVEL_MIN &&
      requestedBaseStatus === VerseStatus.LEARNING;

    const autoNextReviewAt = reachedWaitingThresholdNow
      ? new Date(nowMs + WAITING_NEXT_REVIEW_DELAY_HOURS * 60 * 60 * 1000)
      : null;
    const normalizedReviewResult =
      isCurrentReviewState && reviewRating !== undefined
        ? computeReviewResult({
            rating: reviewRating,
            currentRepetitions,
            currentReviewLapseStreak,
            now: new Date(nowMs),
          })
        : null;
    const resolvedRepetitions =
      normalizedReviewResult?.repetitions ?? requestedRepetitions;
    const resolvedReviewLapseStreak =
      normalizedReviewResult?.reviewLapseStreak ?? requestedReviewLapseStreak;
    const shouldPersistResolvedRepetitions =
      !isNotYetDue &&
      (body.repetitions !== undefined || normalizedReviewResult !== null);

    // Review retries are normalized on the server for backward compatibility.
    // Then client-computed nextReviewAt (spaced repetition), then server auto-value on graduation.
    const resolvedNextReviewAt =
      normalizedReviewResult?.nextReviewAt ??
      (body.nextReviewAt ? new Date(body.nextReviewAt) : autoNextReviewAt);

    const verse = await persistVerseProgressPatch({
      telegramId,
      verseId: globalVerse.id,
      patch: {
        ...(body.masteryLevel !== undefined
          ? { masteryLevel: requestedMasteryLevel }
          : {}),
        ...(shouldPersistResolvedRepetitions
          ? { repetitions: resolvedRepetitions }
          : {}),
        ...(body.reviewLapseStreak !== undefined || normalizedReviewResult
          ? { reviewLapseStreak: resolvedReviewLapseStreak }
          : {}),
        ...(reviewedAt ? { lastReviewedAt: reviewedAt } : {}),
        ...(resolvedNextReviewAt ? { nextReviewAt: resolvedNextReviewAt } : {}),
        ...(nextLastTrainingModeId !== undefined
          ? { lastTrainingModeId: nextLastTrainingModeId }
          : {}),
        ...(body.status ? { status: body.status } : {}),
      },
      ...(reviewedAt
        ? {
            dailyStreakContext: {
              currentStreak: user.dailyStreak,
              reviewedAt,
            },
          }
        : {}),
    });

    return res.status(200).json(
      mapUserVerseToVerseCardDto({
        ...(verse as UserVerseWithLegacyNullableProgress),
        externalVerseId: verse.verse.externalVerseId,
        tags: [],
      })
    );
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

async function handleDelete(res: NextApiResponse, telegramId: string, externalVerseId: string) {
  // Удаляет стих только из списка пользователя; глобальный Verse не затрагивается.
  try {
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const globalVerse = await getVerseByExternalVerseId(externalVerseId);

    if (!globalVerse) {
      return res.status(404).json({ error: "Verse not found" });
    }

    await deleteUserVerseBinding({
      telegramId,
      verseId: globalVerse.id,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
