import type { UserVerse } from "../models/UserVerse";

export type ReferenceTrainerSessionTrack =
  | "reference"
  | "incipit"
  | "ending"
  | "context"
  | "mixed";
export type ReferenceTrainerSkillTrack =
  | "reference"
  | "incipit"
  | "ending"
  | "context";
export type ReferenceTrainerSessionOutcome =
  | "correct_first"
  | "correct_retry"
  | "wrong";

export type ReferenceTrainerSessionUpdate = {
  externalVerseId: string;
  track: ReferenceTrainerSkillTrack;
  outcome: ReferenceTrainerSessionOutcome;
};

export type ReferenceTrainerSessionResponse = {
  updated: Array<{
    externalVerseId: string;
    referenceScore: number;
    incipitScore: number;
    contextScore: number;
  }>;
};

export type ReferenceTrainerVersesResponse = {
  verses: Array<UserVerse>;
  totalCount: number;
  minRequired: number;
};

export async function fetchReferenceTrainerVerses(
  telegramId: string,
  options?: {
    limit?: number;
  }
): Promise<ReferenceTrainerVersesResponse> {
  const params = new URLSearchParams();
  if (typeof options?.limit === "number" && Number.isFinite(options.limit)) {
    params.set("limit", String(Math.max(1, Math.round(options.limit))));
  }
  const query = params.toString();
  const response = await fetch(
    `/api/users/${encodeURIComponent(telegramId)}/verses/reference-trainer${
      query ? `?${query}` : ""
    }`
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      payload?.error ||
        `Failed to fetch reference trainer verses: ${response.status}`
    );
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return {
      verses: data as Array<UserVerse>,
      totalCount: data.length,
      minRequired: 10,
    };
  }
  return data as ReferenceTrainerVersesResponse;
}

export async function submitReferenceTrainerSession(params: {
  telegramId: string;
  sessionTrack: ReferenceTrainerSessionTrack;
  updates: ReferenceTrainerSessionUpdate[];
}): Promise<ReferenceTrainerSessionResponse> {
  const response = await fetch(
    `/api/users/${encodeURIComponent(params.telegramId)}/verses/reference-trainer/session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionTrack: params.sessionTrack,
        updates: params.updates,
      }),
    }
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      payload?.error ||
        `Failed to submit reference trainer session: ${response.status}`
    );
  }

  return response.json() as Promise<ReferenceTrainerSessionResponse>;
}
