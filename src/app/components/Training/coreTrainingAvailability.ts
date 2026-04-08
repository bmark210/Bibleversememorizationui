import type { Verse } from "@/app/domain/verse";
import { resolveVerseState } from "@/shared/verseRules";
import type { CoreTrainingMode } from "./types";

export type CoreTrainingCounts = {
  learningCount: number;
  dueReviewCount: number;
  totalReviewCount: number;
  waitingReviewCount: number;
  masteredCount: number;
  anchorEligibleCount: number;
  flashcardCount: number;
  allCount: number;
  earliestWaitingReviewAt: Date | null;
};

export function isDueReviewVerse(
  verse: Pick<Verse, "status" | "nextReviewAt" | "nextReview" | "flow">,
) {
  return resolveVerseState(verse).isDueForTraining;
}

export function isAnchorEligibleVerse(verse: Pick<Verse, "status" | "flow">) {
  return resolveVerseState({
    ...verse,
    masteryLevel: 0,
    repetitions: 0,
    nextReviewAt: null,
    nextReview: null,
  }).isAnchorEligible;
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
  allVerses: Verse[],
): CoreTrainingCounts {
  let learningCount = 0;
  let dueReviewCount = 0;
  let totalReviewCount = 0;
  let masteredCount = 0;
  let earliestWaitingReviewAt: Date | null = null;

  for (const verse of allVerses) {
    const resolved = resolveVerseState(verse);

    if (resolved.isLearning) {
      learningCount += 1;
      continue;
    }

    if (resolved.isReview) {
      totalReviewCount += 1;

      if (resolved.isDueForTraining) {
        dueReviewCount += 1;
        continue;
      }

      const nextReviewAt = resolved.nextAvailabilityAt;
      if (
        nextReviewAt &&
        (earliestWaitingReviewAt === null ||
          nextReviewAt.getTime() < earliestWaitingReviewAt.getTime())
      ) {
        earliestWaitingReviewAt = nextReviewAt;
      }
      continue;
    }

    if (resolved.isMastered) {
      masteredCount += 1;
    }
  }

  const anchorEligibleCount = learningCount + totalReviewCount + masteredCount;
  const flashcardCount = anchorEligibleCount;

  return {
    learningCount,
    dueReviewCount,
    totalReviewCount,
    waitingReviewCount: Math.max(0, totalReviewCount - dueReviewCount),
    masteredCount,
    anchorEligibleCount,
    flashcardCount,
    allCount: flashcardCount,
    earliestWaitingReviewAt,
  };
}

export function getCountForCoreModes(
  modes: CoreTrainingMode[],
  counts: Pick<CoreTrainingCounts, "learningCount" | "dueReviewCount">,
) {
  let total = 0;
  if (modes.includes("learning")) total += counts.learningCount;
  if (modes.includes("review")) total += counts.dueReviewCount;
  return total;
}

export function getSelectableCountForCoreModes(
  modes: CoreTrainingMode[],
  counts: Pick<CoreTrainingCounts, "learningCount" | "totalReviewCount">,
) {
  let total = 0;
  if (modes.includes("learning")) total += counts.learningCount;
  if (modes.includes("review")) total += counts.totalReviewCount;
  return total;
}

export function getWaitingReviewCountForCoreModes(
  modes: CoreTrainingMode[],
  counts: Pick<CoreTrainingCounts, "waitingReviewCount">,
) {
  return modes.includes("review") ? counts.waitingReviewCount : 0;
}

export function pickVersesForCoreModes(
  modes: CoreTrainingMode[],
  allVerses: Verse[],
) {
  if (modes.length === 0) return [];

  return allVerses.filter((verse) => {
    const resolved = resolveVerseState(verse);

    if (resolved.isLearning) {
      return modes.includes("learning");
    }

    if (resolved.isReview) {
      return modes.includes("review") && resolved.isDueForTraining;
    }

    return false;
  });
}
