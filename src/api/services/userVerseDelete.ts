import { publicApiUrl } from "@/lib/publicApiBase";

export type DeleteUserVerseResponse = {
  status?: string;
  xp?: number;
  xpDelta?: number;
};

function toSafeInt(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/**
 * Удаляет прогресс по стиху; сервер пересчитывает суммарный XP в БД и возвращает дельту.
 */
export async function deleteUserVerseWithXp(
  telegramId: string,
  externalVerseId: string
): Promise<DeleteUserVerseResponse | null> {
  const url = publicApiUrl(
    `/api/users/${encodeURIComponent(telegramId)}/verses/${encodeURIComponent(externalVerseId)}`
  );
  const response = await fetch(url, { method: "DELETE" });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    const err = new Error(
      payload?.error || `Failed to delete user verse: ${response.status}`
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  const data = (await response.json().catch(() => ({}))) as DeleteUserVerseResponse;
  return {
    status: typeof data.status === "string" ? data.status : "deleted",
    xp: toSafeInt(data.xp),
    xpDelta: toSafeInt(data.xpDelta),
  };
}
