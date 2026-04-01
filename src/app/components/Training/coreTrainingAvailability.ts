import type { Verse } from "@/app/domain/verse";
import {
  getVerseNextAvailabilityAt,
  isVerseAnchorEligible,
  isVerseDueForTraining,
  isVerseLearning,
  isVerseMastered,
  isVerseReview,
} from "@/shared/verseRules";
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

export function isDueReviewVerse(
  verse: Pick<Verse, "status" | "nextReviewAt" | "nextReview" | "flow">
) {
  return isVerseDueForTraining(verse);
}

export function isAnchorEligibleVerse(verse: Pick<Verse, "status" | "flow">) {
  return isVerseAnchorEligible({
    ...verse,
    masteryLevel: 0,
    repetitions: 0,
    nextReviewAt: null,
    nextReview: null,
  });
}

export function getAnchorEligibleVerseCount(allVerses: Verse[]) {
  let total = 0;

  for (const verse of allVerses) {
    if (!isAnchorEligibleVerse(verse)) continue;

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
    if (isVerseLearning(verse)) {
      learningCount += 1;
      continue;
    }

    if (isVerseReview(verse)) {
      totalReviewCount += 1;

      if (isDueReviewVerse(verse)) {
        dueReviewCount += 1;
        continue;
      }

      const nextReviewAt = getVerseNextAvailabilityAt(verse);
      if (
        nextReviewAt &&
        (earliestWaitingReviewAt === null ||
          nextReviewAt.getTime() < earliestWaitingReviewAt.getTime())
      ) {
        earliestWaitingReviewAt = nextReviewAt;
      }
      continue;
    }

    if (isVerseMastered(verse)) {
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
    if (isVerseLearning(verse)) {
      return modes.includes("learning");
    }

    if (isVerseReview(verse)) {
      return modes.includes("review") && isDueReviewVerse(verse);
    }

    return false;
  });
}
