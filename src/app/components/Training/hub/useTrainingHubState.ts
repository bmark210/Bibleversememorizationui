import { useMemo } from "react";
import type { Verse } from "@/app/domain/verse";
import type { domain_UserDashboardStats } from "@/api/models/domain_UserDashboardStats";
import type { CoreTrainingMode, TrainingMode } from "../types";
import {
  getCoreTrainingCountsFromVerses,
  getCountForCoreModes,
  type CoreTrainingCounts,
} from "../coreTrainingAvailability";

export type TrainingCounts = CoreTrainingCounts;

export function useTrainingHubState(params: {
  allVerses: Verse[];
  dashboardStats?: domain_UserDashboardStats | null;
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
    const masteredCount = dashboardStats?.masteredCount ?? 0;

    return {
      learningCount,
      dueReviewCount,
      totalReviewCount,
      waitingReviewCount: Math.max(0, totalReviewCount - dueReviewCount),
      masteredCount,
      anchorEligibleCount: totalReviewCount + masteredCount,
      flashcardCount: learningCount + totalReviewCount + masteredCount,
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
      return counts.anchorEligibleCount;
  }
}

/** Total count for a multi-mode selection (deduplicated) */
export function getCountForModes(
  modes: CoreTrainingMode[] | TrainingMode[],
  counts: TrainingCounts
): number {
  if ((modes as TrainingMode[]).some((mode) => mode === "anchor")) {
    return counts.anchorEligibleCount;
  }

  return getCountForCoreModes(modes as CoreTrainingMode[], counts);
}
