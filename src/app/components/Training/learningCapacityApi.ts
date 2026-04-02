import { OpenAPI } from "@/api/core/OpenAPI";
import type { LearningCapacityResponse } from "./exam/types";

function baseUrl() {
  return OpenAPI.BASE || "";
}

export async function fetchLearningCapacity(params: {
  telegramId: string;
}): Promise<LearningCapacityResponse> {
  const res = await fetch(
    `${baseUrl()}/api/users/${params.telegramId}/exam/capacity`,
  );
  if (!res.ok) {
    throw new Error(`fetchLearningCapacity failed: ${res.status}`);
  }
  return res.json();
}
