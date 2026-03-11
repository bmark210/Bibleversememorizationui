import { useMemo } from "react";
import type { Verse } from "@/app/App";
import type { UserDashboardStats } from "@/api/services/userStats";
import type { CoreTrainingMode, TrainingMode } from "../types";
import {
  getCoreTrainingCountsFromVerses,
  getCountForCoreModes,
  type CoreTrainingCounts,
} from "../coreTrainingAvailability";

export type TrainingCounts = CoreTrainingCounts;

export function useTrainingHubState(params: {
  allVerses: Verse[];
  dashboardStats?: UserDashboardStats | null;
}): TrainingCounts {
  const { allVerses, dashboardStats } = params;

  return useMemo(() => {
    if (allVerses.length > 0) {
      return getCoreTrainingCountsFromVerses(allVerses);
    }

    const learningCount = dashboardStats?.learningVerses ?? 0;
    const dueReviewCount =
      dashboardStats?.dueReviewVerses ?? dashboardStats?.reviewVerses ?? 0;
    const totalReviewCount = dashboardStats?.reviewVerses ?? dueReviewCount;
    const masteredCount = dashboardStats?.masteredVerses ?? 0;

    return {
      learningCount,
      dueReviewCount,
      totalReviewCount,
      waitingReviewCount: Math.max(0, totalReviewCount - dueReviewCount),
      masteredCount,
      allCount: learningCount + totalReviewCount + masteredCount,
      earliestWaitingReviewAt: null,
    };
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
      return counts.dueReviewCount;
    case "anchor":
      // Only REVIEW + MASTERED are eligible for anchor (no LEARNING)
      return counts.totalReviewCount + counts.masteredCount;
  }
}

/** Total count for a multi-mode selection (deduplicated) */
export function getCountForModes(
  modes: CoreTrainingMode[] | TrainingMode[],
  counts: TrainingCounts
): number {
  if ((modes as TrainingMode[]).some((mode) => mode === "anchor")) {
    return counts.totalReviewCount + counts.masteredCount;
  }

  return getCountForCoreModes(modes as CoreTrainingMode[], counts);
}
