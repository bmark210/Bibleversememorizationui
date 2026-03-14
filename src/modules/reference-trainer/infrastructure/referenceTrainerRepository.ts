import { prisma } from "@/lib/prisma";
import { VerseStatus } from "@/generated/prisma";
import type {
  ReferenceTrainerAnchorRow,
  ReferenceTrainerLearningRow,
  ReferenceTrainerScoreRow,
} from "@/modules/reference-trainer/domain/ReferenceTrainerTypes";
import type { VerseRecord } from "@/modules/verses/domain/Verse";
import {
  buildVerseBaseSelect,
  buildVerseRelationSelect,
  hasVerseDifficultyLettersColumn,
  normalizeDifficultyLetters,
} from "@/modules/verses/infrastructure/verseDifficultyColumnCompat";

export async function getVersesByExternalVerseIds(
  externalVerseIds: string[]
): Promise<VerseRecord[]> {
  const includeDifficultyLetters = await hasVerseDifficultyLettersColumn();
  const verses = await prisma.verse.findMany({
    where: {
      externalVerseId: {
        in: externalVerseIds,
      },
    },
    select: buildVerseBaseSelect(includeDifficultyLetters),
  });

  return verses.map((verse) => ({
    id: verse.id,
    externalVerseId: verse.externalVerseId,
    difficultyLetters: normalizeDifficultyLetters(verse.difficultyLetters),
  }));
}

export async function getUserVerseScores(params: {
  telegramId: string;
  verseIds: string[];
  versesById: Map<string, string>;
}): Promise<Map<string, ReferenceTrainerScoreRow>> {
  const userVerseRows = await prisma.userVerse.findMany({
    where: {
      telegramId: params.telegramId,
      verseId: {
        in: params.verseIds,
      },
    },
    select: {
      id: true,
      verseId: true,
      referenceScore: true,
      incipitScore: true,
      contextScore: true,
    },
  });

  const rowsByExternalVerseId = new Map<string, ReferenceTrainerScoreRow>();

  for (const row of userVerseRows) {
    const externalVerseId = params.versesById.get(row.verseId);
    if (!externalVerseId) continue;

    rowsByExternalVerseId.set(externalVerseId, {
      id: row.id,
      externalVerseId,
      referenceScore: row.referenceScore,
      incipitScore: row.incipitScore,
      contextScore: row.contextScore,
    });
  }

  return rowsByExternalVerseId;
}

export async function updateUserVerseScores(
  rows: ReferenceTrainerScoreRow[]
): Promise<void> {
  await prisma.$transaction(
    rows.map((row) =>
      prisma.userVerse.update({
        where: { id: row.id },
        data: {
          referenceScore: row.referenceScore,
          incipitScore: row.incipitScore,
          contextScore: row.contextScore,
        },
      })
    )
  );
}

export async function getReferenceTrainerLearningRows(
  telegramId: string
): Promise<ReferenceTrainerLearningRow[]> {
  const includeDifficultyLetters = await hasVerseDifficultyLettersColumn();
  const rows = await prisma.userVerse.findMany({
    where: {
      telegramId,
      status: VerseStatus.LEARNING,
    },
    select: {
      status: true,
      masteryLevel: true,
      repetitions: true,
      referenceScore: true,
      incipitScore: true,
      contextScore: true,
      lastTrainingModeId: true,
      lastReviewedAt: true,
      nextReviewAt: true,
      verse: {
        select: buildVerseRelationSelect(includeDifficultyLetters),
      },
    },
  });

  return rows.map((row) => ({
    externalVerseId: row.verse.externalVerseId,
    difficultyLetters: normalizeDifficultyLetters(row.verse.difficultyLetters),
    status: VerseStatus.LEARNING,
    masteryLevel: row.masteryLevel,
    repetitions: row.repetitions,
    referenceScore: row.referenceScore,
    incipitScore: row.incipitScore,
    contextScore: row.contextScore,
    lastTrainingModeId: row.lastTrainingModeId,
    lastReviewedAt: row.lastReviewedAt,
    nextReviewAt: row.nextReviewAt,
  }));
}

/**
 * Fetch anchor-eligible verses (REVIEW + MASTERED display status).
 * Queries base status LEARNING — display status is derived from masteryLevel/repetitions.
 */
export async function getAnchorTrainerRows(
  telegramId: string,
): Promise<ReferenceTrainerAnchorRow[]> {
  const includeDifficultyLetters = await hasVerseDifficultyLettersColumn();
  const rows = await prisma.userVerse.findMany({
    where: {
      telegramId,
      status: VerseStatus.LEARNING,
    },
    select: {
      status: true,
      masteryLevel: true,
      repetitions: true,
      referenceScore: true,
      incipitScore: true,
      contextScore: true,
      lastTrainingModeId: true,
      lastReviewedAt: true,
      nextReviewAt: true,
      verse: {
        select: buildVerseRelationSelect(includeDifficultyLetters),
      },
    },
  });

  return rows.map((row) => ({
    externalVerseId: row.verse.externalVerseId,
    difficultyLetters: normalizeDifficultyLetters(row.verse.difficultyLetters),
    status: row.status,
    masteryLevel: row.masteryLevel,
    repetitions: row.repetitions,
    referenceScore: row.referenceScore,
    incipitScore: row.incipitScore,
    contextScore: row.contextScore,
    lastTrainingModeId: row.lastTrainingModeId,
    lastReviewedAt: row.lastReviewedAt,
    nextReviewAt: row.nextReviewAt,
  }));
}
