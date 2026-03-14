import type { VerseStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { computeNextDailyStreakOnReview } from "@/shared/training/dailyStreak";
import { mapUserVerseRecord } from "@/modules/verses/infrastructure/verseRepository";
import type { UserVerseRecord } from "@/modules/verses/domain/Verse";
import {
  buildVerseRelationSelect,
  hasVerseDifficultyLettersColumn,
} from "@/modules/verses/infrastructure/verseDifficultyColumnCompat";

export type VerseProgressPatchInput = {
  masteryLevel?: number;
  repetitions?: number;
  reviewLapseStreak?: number;
  lastReviewedAt?: Date;
  nextReviewAt?: Date;
  lastTrainingModeId?: number | null;
  status?: VerseStatus;
};

export async function persistVerseProgressPatch(params: {
  telegramId: string;
  verseId: string;
  patch: VerseProgressPatchInput;
  dailyStreakContext?: {
    currentStreak: number;
    reviewedAt: Date;
  };
}): Promise<UserVerseRecord> {
  const includeDifficultyLetters = await hasVerseDifficultyLettersColumn();
  const userVerse = await prisma.$transaction(async (tx) => {
    const latestReviewedBeforeUpdate = params.dailyStreakContext
      ? await tx.userVerse.findFirst({
          where: {
            telegramId: params.telegramId,
            lastReviewedAt: { not: null },
          },
          orderBy: { lastReviewedAt: "desc" },
          select: { lastReviewedAt: true },
        })
      : null;

    const updatedVerse = await tx.userVerse.update({
      where: {
        telegramId_verseId: {
          telegramId: params.telegramId,
          verseId: params.verseId,
        },
      },
      data: {
        ...(params.patch.masteryLevel !== undefined
          ? { masteryLevel: params.patch.masteryLevel }
          : {}),
        ...(params.patch.repetitions !== undefined
          ? { repetitions: params.patch.repetitions }
          : {}),
        ...(params.patch.reviewLapseStreak !== undefined
          ? { reviewLapseStreak: params.patch.reviewLapseStreak }
          : {}),
        ...(params.patch.lastReviewedAt
          ? { lastReviewedAt: params.patch.lastReviewedAt }
          : {}),
        ...(params.patch.nextReviewAt
          ? { nextReviewAt: params.patch.nextReviewAt }
          : {}),
        ...(params.patch.lastTrainingModeId !== undefined
          ? { lastTrainingModeId: params.patch.lastTrainingModeId }
          : {}),
        ...(params.patch.status ? { status: params.patch.status } : {}),
      },
      include: {
        verse: {
          select: buildVerseRelationSelect(includeDifficultyLetters),
        },
      },
    });

    if (params.dailyStreakContext) {
      const streakDecision = computeNextDailyStreakOnReview({
        currentStreak: params.dailyStreakContext.currentStreak,
        latestReviewedAt: latestReviewedBeforeUpdate?.lastReviewedAt ?? null,
        reviewedAt: params.dailyStreakContext.reviewedAt,
      });

      if (streakDecision.shouldUpdate) {
        await tx.user.update({
          where: { telegramId: params.telegramId },
          data: { dailyStreak: streakDecision.nextStreak },
        });
      }
    }

    return updatedVerse;
  });

  return mapUserVerseRecord(userVerse);
}
