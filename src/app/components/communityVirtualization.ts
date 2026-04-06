import type { domain_FriendPlayerListItem } from "@/api/models/domain_FriendPlayerListItem";
import type { domain_FriendPlayersPageResponse } from "@/api/models/domain_FriendPlayersPageResponse";

export type CommunityListCacheItem = domain_FriendPlayerListItem | null;

export function clampCommunityWindowOffset(
  requestedOffset: number,
  totalItems: number,
  windowSize: number,
) {
  const normalizedWindow = Math.max(1, Math.trunc(windowSize));
  const normalizedOffset = Math.max(0, Math.trunc(requestedOffset));

  if (totalItems <= 0) {
    return normalizedOffset;
  }

  return Math.min(
    normalizedOffset,
    Math.max(0, totalItems - normalizedWindow),
  );
}

export function getCommunityWindowOffsetForIndex(
  index: number,
  totalItems: number,
  windowSize: number,
) {
  const normalizedWindow = Math.max(1, Math.trunc(windowSize));
  const normalizedIndex = Math.max(0, Math.trunc(index));

  return clampCommunityWindowOffset(
    Math.floor(normalizedIndex / normalizedWindow) * normalizedWindow,
    totalItems,
    normalizedWindow,
  );
}

export function createCommunityItemsCache(
  totalItems: number,
  previous: CommunityListCacheItem[] = [],
) {
  if (totalItems <= 0) {
    return [] as CommunityListCacheItem[];
  }

  return Array.from(
    { length: totalItems },
    (_, index) => previous[index] ?? null,
  );
}

export function mergeCommunityPageWindow(
  previous: CommunityListCacheItem[],
  page: domain_FriendPlayersPageResponse,
) {
  const totalItems = Math.max(0, page.total ?? previous.length);
  const next = createCommunityItemsCache(totalItems, previous);
  const offset = Math.max(0, page.offset ?? 0);

  (page.items ?? []).forEach((item, index) => {
    const targetIndex = offset + index;
    if (targetIndex >= 0 && targetIndex < next.length) {
      next[targetIndex] = item;
    }
  });

  return next;
}
