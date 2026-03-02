import { OpenAPI } from "@/api/core/OpenAPI";
import { request as apiRequest } from "@/api/core/request";
import type { DailyGoalStateResponse } from "@/app/features/daily-goal/types";

export async function fetchDailyGoalState(params: {
  telegramId: string;
  newVersesCount: number;
  reviewVersesCount: number;
  dayKey?: string;
  timezone?: string;
}): Promise<DailyGoalStateResponse> {
  return apiRequest<DailyGoalStateResponse>(OpenAPI, {
    method: "GET",
    url: "/api/users/{telegramId}/daily-goal/state",
    path: { telegramId: params.telegramId },
    query: {
      newVersesCount: params.newVersesCount,
      reviewVersesCount: params.reviewVersesCount,
      dayKey: params.dayKey,
      timezone: params.timezone,
    },
  });
}
