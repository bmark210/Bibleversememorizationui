import type { UserVerse } from "../models/UserVerse";

export async function fetchReferenceTrainerVerses(
  telegramId: string
): Promise<Array<UserVerse>> {
  const response = await fetch(
    `/api/users/${encodeURIComponent(telegramId)}/verses/reference-trainer`
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

  return response.json() as Promise<Array<UserVerse>>;
}

