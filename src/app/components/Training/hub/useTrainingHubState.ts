import { useMemo } from "react";
import type { Verse } from "@/app/App";
import type { UserDashboardStats } from "@/api/services/userStats";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import type { CoreTrainingMode, TrainingMode } from "../types";

export type TrainingCounts = {
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
  allCount: number;
};

export function useTrainingHubState(params: {
  allVerses: Verse[];
  dashboardStats?: UserDashboardStats | null;
}): TrainingCounts {
  const { allVerses, dashboardStats } = params;

  return useMemo(() => {
    const learningCount =
      dashboardStats?.learningVerses ??
      allVerses.filter(
        (v) => normalizeDisplayVerseStatus(v.status) === "LEARNING"
      ).length;

    const reviewCount =
      dashboardStats?.reviewVerses ??
      allVerses.filter(
        (v) => normalizeDisplayVerseStatus(v.status) === "REVIEW"
      ).length;

    const masteredCount = dashboardStats?.masteredVerses ?? 0;
    const allCount = learningCount + reviewCount + masteredCount;

    return { learningCount, reviewCount, masteredCount, allCount };
  }, [allVerses, dashboardStats]);
}

/** How many verses are available for a given mode */
export function getCountForMode(
  mode: TrainingMode,
  counts: TrainingCounts
): number {
  switch (mode) {
    case "learning":
      return counts.learningCount;
    case "review":
      return counts.reviewCount;
    case "anchor":
      // Only REVIEW + MASTERED are eligible for anchor (no LEARNING)
      return counts.reviewCount + counts.masteredCount;
  }
}

/** Total count for a multi-mode selection (deduplicated) */
export function getCountForModes(
  modes: CoreTrainingMode[] | TrainingMode[],
  counts: TrainingCounts
): number {
  if ((modes as TrainingMode[]).some((mode) => mode === "anchor")) {
    return counts.reviewCount + counts.masteredCount;
  }

  let total = 0;
  if (modes.includes("learning")) total += counts.learningCount;
  if (modes.includes("review")) total += counts.reviewCount;
  return total;
}
