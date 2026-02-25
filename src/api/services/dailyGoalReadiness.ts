import { OpenAPI } from "@/api/core/OpenAPI";
import { request as apiRequest } from "@/api/core/request";
import type { DailyGoalReadinessResponse } from "@/app/features/daily-goal/types";

export async function fetchDailyGoalReadiness(params: {
  telegramId: string;
  newVersesCount: number;
  reviewVersesCount: number;
}): Promise<DailyGoalReadinessResponse> {
  return apiRequest<DailyGoalReadinessResponse>(OpenAPI, {
    method: "GET",
    url: "/api/users/{telegramId}/daily-goal/readiness",
    path: { telegramId: params.telegramId },
    query: {
      newVersesCount: params.newVersesCount,
      reviewVersesCount: params.reviewVersesCount,
    },
  });
}

