import { useMemo } from "react";
import type { Verse } from "@/app/domain/verse";
import type { domain_UserDashboardStats } from "@/api/models/domain_UserDashboardStats";
import {
  getCoreTrainingCountsFromVerses,
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
      anchorEligibleCount: learningCount + totalReviewCount + masteredCount,
      flashcardCount: learningCount + totalReviewCount + masteredCount,
      allCount: learningCount + totalReviewCount + masteredCount,
      earliestWaitingReviewAt: null,
    };
  }, [allVerses, dashboardStats]);
}
