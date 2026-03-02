import { OpenAPI } from "@/api/core/OpenAPI";
import { request as apiRequest } from "@/api/core/request";
import type {
  DailyGoalEventRequest,
  DailyGoalMutationResponse,
  DailyGoalSkipRequest,
} from "@/app/features/daily-goal/types";

export async function postDailyGoalEvent(params: {
  telegramId: string;
  body: DailyGoalEventRequest;
}): Promise<DailyGoalMutationResponse> {
  return apiRequest<DailyGoalMutationResponse>(OpenAPI, {
    method: "POST",
    url: "/api/users/{telegramId}/daily-goal/events",
    path: { telegramId: params.telegramId },
    body: params.body,
    mediaType: "application/json",
  });
}

export async function postDailyGoalSkip(params: {
  telegramId: string;
  body: DailyGoalSkipRequest;
}): Promise<DailyGoalMutationResponse> {
  return apiRequest<DailyGoalMutationResponse>(OpenAPI, {
    method: "POST",
    url: "/api/users/{telegramId}/daily-goal/skip",
    path: { telegramId: params.telegramId },
    body: params.body,
    mediaType: "application/json",
  });
}
