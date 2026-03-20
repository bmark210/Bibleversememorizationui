import {
  normalizeFriendPlayerListItem,
  type FriendPlayerListItem,
  type FriendPlayersPageResponse,
} from "./friends";
import { publicApiUrl } from "@/lib/publicApiBase";

export type VerseOwnersScope = "friends" | "players";

function toSafeInt(value: unknown, options?: { min?: number; max?: number }) {
  const numeric = Number(value);
  const min = options?.min ?? 0;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeVerseOwnersPageResponse(
  value: unknown
): FriendPlayersPageResponse {
  const data = (value ?? {}) as Partial<FriendPlayersPageResponse> & {
    total?: unknown;
    offset?: unknown;
  };
  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  const totalRaw = data.totalCount ?? data.total;
  const startRaw = data.startWith ?? data.offset;

  return {
    items: itemsRaw
      .map((item) => normalizeFriendPlayerListItem(item))
      .filter((item): item is FriendPlayerListItem => item != null),
    totalCount: toSafeInt(totalRaw, { min: 0 }),
    limit: toSafeInt(data.limit, { min: 1, max: 50 }),
    startWith: toSafeInt(startRaw, { min: 0 }),
  };
}

async function parseResponsePayload(response: Response) {
  return (await response.json().catch(() => null)) as { error?: string } | null;
}

export async function fetchVerseOwnersPage(
  viewerTelegramId: string,
  externalVerseId: string,
  params: {
    scope: VerseOwnersScope;
    limit?: number;
    startWith?: number;
  }
): Promise<FriendPlayersPageResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("scope", params.scope);
  if (params.limit != null && Number.isFinite(params.limit)) {
    searchParams.set("limit", String(Math.round(params.limit)));
  }
  if (params.startWith != null && Number.isFinite(params.startWith)) {
    searchParams.set("startWith", String(Math.max(0, Math.round(params.startWith))));
  }

  const response = await fetch(
    publicApiUrl(
      `/api/users/${encodeURIComponent(
        viewerTelegramId
      )}/verse-owners/${encodeURIComponent(externalVerseId)}?${searchParams.toString()}`
    )
  );

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(
      payload?.error || `Failed to fetch verse owners: ${response.status}`
    );
  }

  return normalizeVerseOwnersPageResponse(await response.json());
}
