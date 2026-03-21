import { UserVersesService } from "@/api/services/UserVersesService";
import { OpenAPI } from "@/api/core/OpenAPI";
import type { AnchorTrainingResult, AnchorSessionXPResponse } from "../types";

export interface FetchVersesPoolParams {
  telegramId: string;
  limit?: number;
  translation?: "NRT" | "SYNOD" | "RBS2" | "BTI";
}

/**
 * Fetches the verse pool for anchor training.
 */
export async function fetchAnchorVersesPool(params: FetchVersesPoolParams) {
  return UserVersesService.getReferenceTrainer(
    params.telegramId,
    params.limit ?? 12,
    params.translation,
  );
}

/**
 * Submits anchor training session results (new XP contract).
 * Backend awards XP based on outcomes and verse difficulty.
 */
export async function submitAnchorSession(params: {
  telegramId: string;
  results: AnchorTrainingResult[];
}): Promise<AnchorSessionXPResponse> {
  const baseUrl = OpenAPI.BASE || "";
  const res = await fetch(
    `${baseUrl}/api/users/${params.telegramId}/verses/reference-trainer/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: params.results }),
    },
  );
  if (!res.ok) {
    throw new Error(`Submit session failed: ${res.status}`);
  }
  return res.json();
}
