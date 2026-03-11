import type { Verse } from "@/app/App";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { parseExternalVerseId } from "@/shared/bible/externalVerseId";
import type { CoreTrainingMode } from "./types";

export type CoreTrainingCounts = {
  learningCount: number;
  dueReviewCount: number;
  totalReviewCount: number;
  waitingReviewCount: number;
  masteredCount: number;
  allCount: number;
  earliestWaitingReviewAt: Date | null;
};

function parseReviewDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isDueReviewVerse(
  verse: Pick<Verse, "status" | "nextReviewAt" | "nextReview">
) {
  if (normalizeDisplayVerseStatus(verse.status) !== "REVIEW") return false;

  const nextReviewAt = parseReviewDate(verse.nextReviewAt ?? verse.nextReview);
  if (!nextReviewAt) return true;

  return nextReviewAt.getTime() <= Date.now();
}

export function isAnchorEligibleVerse(verse: Pick<Verse, "status">) {
  const status = normalizeDisplayVerseStatus(verse.status);
  return status === "REVIEW" || status === "MASTERED";
}

export function getAnchorEligibleVerseCount(
  allVerses: Verse[],
  bookId?: number,
) {
  let total = 0;

  for (const verse of allVerses) {
    if (!isAnchorEligibleVerse(verse)) continue;

    if (bookId != null) {
      const parsed = parseExternalVerseId(verse.externalVerseId);
      if (!parsed || parsed.book !== bookId) continue;
    }

    total += 1;
  }

  return total;
}

export function getCoreTrainingCountsFromVerses(
  allVerses: Verse[]
): CoreTrainingCounts {
  let learningCount = 0;
  let dueReviewCount = 0;
  let totalReviewCount = 0;
  let masteredCount = 0;
  let earliestWaitingReviewAt: Date | null = null;

  for (const verse of allVerses) {
    const status = normalizeDisplayVerseStatus(verse.status);

    if (status === "LEARNING") {
      learningCount += 1;
      continue;
    }

    if (status === "REVIEW") {
      totalReviewCount += 1;

      if (isDueReviewVerse(verse)) {
        dueReviewCount += 1;
        continue;
      }

      const nextReviewAt = parseReviewDate(verse.nextReviewAt ?? verse.nextReview);
      if (
        nextReviewAt &&
        (earliestWaitingReviewAt === null ||
          nextReviewAt.getTime() < earliestWaitingReviewAt.getTime())
      ) {
        earliestWaitingReviewAt = nextReviewAt;
      }
      continue;
    }

    if (status === "MASTERED") {
      masteredCount += 1;
    }
  }

  return {
    learningCount,
    dueReviewCount,
    totalReviewCount,
    waitingReviewCount: Math.max(0, totalReviewCount - dueReviewCount),
    masteredCount,
    allCount: learningCount + totalReviewCount + masteredCount,
    earliestWaitingReviewAt,
  };
}

export function getCountForCoreModes(
  modes: CoreTrainingMode[],
  counts: Pick<CoreTrainingCounts, "learningCount" | "dueReviewCount">
) {
  let total = 0;
  if (modes.includes("learning")) total += counts.learningCount;
  if (modes.includes("review")) total += counts.dueReviewCount;
  return total;
}

export function getSelectableCountForCoreModes(
  modes: CoreTrainingMode[],
  counts: Pick<CoreTrainingCounts, "learningCount" | "totalReviewCount">
) {
  let total = 0;
  if (modes.includes("learning")) total += counts.learningCount;
  if (modes.includes("review")) total += counts.totalReviewCount;
  return total;
}

export function getWaitingReviewCountForCoreModes(
  modes: CoreTrainingMode[],
  counts: Pick<CoreTrainingCounts, "waitingReviewCount">
) {
  return modes.includes("review") ? counts.waitingReviewCount : 0;
}

export function pickVersesForCoreModes(
  modes: CoreTrainingMode[],
  allVerses: Verse[]
) {
  if (modes.length === 0) return [];

  return allVerses.filter((verse) => {
    const status = normalizeDisplayVerseStatus(verse.status);

    if (status === "LEARNING") {
      return modes.includes("learning");
    }

    if (status === "REVIEW") {
      return modes.includes("review") && isDueReviewVerse(verse);
    }

    return false;
  });
}
