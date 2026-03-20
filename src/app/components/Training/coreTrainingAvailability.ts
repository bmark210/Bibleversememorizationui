import type { Verse } from "@/app/App";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { normalizeVerseFlow } from "@/shared/domain/verseFlow";
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
  verse: Pick<Verse, "status" | "nextReviewAt" | "nextReview" | "flow">
) {
  const flow = normalizeVerseFlow(verse.flow);
  if (flow?.code === "REVIEW_DUE") return true;
  if (flow?.code === "REVIEW_WAITING") return false;
  if (normalizeDisplayVerseStatus(verse.status) !== "REVIEW") return false;

  const nextReviewAt = parseReviewDate(verse.nextReviewAt ?? verse.nextReview);
  if (!nextReviewAt) return true;

  return nextReviewAt.getTime() <= Date.now();
}

export function isAnchorEligibleVerse(verse: Pick<Verse, "status" | "flow">) {
  const flow = normalizeVerseFlow(verse.flow);
  if (flow) {
    return flow.code === "REVIEW_DUE" || flow.code === "REVIEW_WAITING" || flow.code === "MASTERED";
  }
  const status = normalizeDisplayVerseStatus(verse.status);
  return status === "REVIEW" || status === "MASTERED";
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
    const status = normalizeDisplayVerseStatus(verse.status);
    const flow = normalizeVerseFlow(verse.flow);

    if (flow?.code === "LEARNING" || status === "LEARNING") {
      learningCount += 1;
      continue;
    }

    if (
      flow?.code === "REVIEW_DUE" ||
      flow?.code === "REVIEW_WAITING" ||
      status === "REVIEW"
    ) {
      totalReviewCount += 1;

      if (flow?.code === "REVIEW_DUE" || isDueReviewVerse(verse)) {
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

    if (flow?.code === "MASTERED" || status === "MASTERED") {
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
    const flow = normalizeVerseFlow(verse.flow);

    if (flow?.code === "LEARNING" || status === "LEARNING") {
      return modes.includes("learning");
    }

    if (
      flow?.code === "REVIEW_DUE" ||
      flow?.code === "REVIEW_WAITING" ||
      status === "REVIEW"
    ) {
      return modes.includes("review") && (flow?.code === "REVIEW_DUE" || isDueReviewVerse(verse));
    }

    return false;
  });
}
