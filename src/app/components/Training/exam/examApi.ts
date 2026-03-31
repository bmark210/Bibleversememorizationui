import { OpenAPI } from "@/api/core/OpenAPI";
import type {
  ExamEligibleVersesResponse,
  ExamSessionInput,
  ExamSessionOutput,
  LearningCapacityResponse,
} from "./types";

function baseUrl() {
  return OpenAPI.BASE || "";
}

export async function fetchExamEligibleVerses(params: {
  telegramId: string;
  translation?: string;
}): Promise<ExamEligibleVersesResponse> {
  const url = new URL(
    `${baseUrl()}/api/users/${params.telegramId}/exam/eligible`,
  );
  if (params.translation) {
    url.searchParams.set("translation", params.translation);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`fetchExamEligibleVerses failed: ${res.status}`);
  }
  return res.json();
}

export async function submitExamSession(params: {
  telegramId: string;
  input: ExamSessionInput;
}): Promise<ExamSessionOutput> {
  const res = await fetch(
    `${baseUrl()}/api/users/${params.telegramId}/exam/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.input),
    },
  );
  if (!res.ok) {
    throw new Error(`submitExamSession failed: ${res.status}`);
  }
  return res.json();
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
