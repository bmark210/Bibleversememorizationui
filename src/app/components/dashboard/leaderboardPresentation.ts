import type { domain_UserLeaderboardEntry } from "@/api/models/domain_UserLeaderboardEntry";

export function selectCompactLeaderboardEntries(
  items: readonly domain_UserLeaderboardEntry[],
  currentUserTelegramId: string | null,
  maxItems = 3,
): domain_UserLeaderboardEntry[] {
  if (items.length === 0 || maxItems <= 0) {
    return [];
  }
  if (items.length <= maxItems) {
    return [...items];
  }

  const currentUserIndex =
    currentUserTelegramId == null
      ? -1
      : items.findIndex(
          (entry) =>
            String(entry.telegramId ?? "") !== "" &&
            String(entry.telegramId ?? "") === currentUserTelegramId,
        );

  if (currentUserIndex < 0) {
    return items.slice(0, maxItems);
  }

  const desiredStart = currentUserIndex - Math.floor(maxItems / 2);
  const maxStart = Math.max(0, items.length - maxItems);
  const start = Math.min(Math.max(0, desiredStart), maxStart);
  return items.slice(start, start + maxItems);
}
