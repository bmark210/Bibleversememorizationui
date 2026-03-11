import { prisma } from "@/lib/prisma";
import { VerseStatus } from "@/generated/prisma";
import type {
  ReferenceTrainerAnchorRow,
  ReferenceTrainerLearningRow,
  ReferenceTrainerScoreRow,
} from "@/modules/reference-trainer/domain/ReferenceTrainerTypes";
import type { VerseRecord } from "@/modules/verses/domain/Verse";

export async function getVersesByExternalVerseIds(
  externalVerseIds: string[]
): Promise<VerseRecord[]> {
  const verses = await prisma.verse.findMany({
    where: {
      externalVerseId: {
        in: externalVerseIds,
      },
    },
    select: {
      id: true,
      externalVerseId: true,
    },
  });

  return verses.map((verse) => ({
    id: verse.id,
    externalVerseId: verse.externalVerseId,
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
        select: {
          externalVerseId: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    externalVerseId: row.verse.externalVerseId,
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
 * Optionally filtered by bookId (first segment of externalVerseId).
 */
export async function getAnchorTrainerRows(
  telegramId: string,
  bookId?: number,
): Promise<ReferenceTrainerAnchorRow[]> {
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
        select: {
          externalVerseId: true,
        },
      },
    },
  });

  let mapped: ReferenceTrainerAnchorRow[] = rows.map((row) => ({
    externalVerseId: row.verse.externalVerseId,
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

  if (typeof bookId === "number" && bookId > 0) {
    const bookPrefix = `${bookId}-`;
    mapped = mapped.filter((row) => row.externalVerseId.startsWith(bookPrefix));
  }

  return mapped;
}
