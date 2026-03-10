import type { NextApiRequest, NextApiResponse } from "next";
import { getFollowingTelegramIdsInSet } from "@/modules/social/infrastructure/socialRepository";
import {
  countVerseOwners,
  getVerseByExternalVerseId,
  getVerseOwnersPage,
} from "@/modules/verses/infrastructure/verseRepository";
import {
  assertUserExists,
  buildFriendMetricsMap,
  FriendsApiError,
  mapUsersToFriendListItems,
  parseFriendsListQuery,
  type FriendsPageResponse,
} from "../friends/_shared";

type VerseOwnersScope = "friends" | "players";
type VerseOwnersRouteErrorResponse = { error: string; details?: string };

function parseScope(value: unknown): VerseOwnersScope {
  return value === "friends" ? "friends" : "players";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FriendsPageResponse | VerseOwnersRouteErrorResponse>
) {
  const { telegramId, externalVerseId } = req.query;

  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (!externalVerseId || Array.isArray(externalVerseId)) {
    return res.status(400).json({ error: "externalVerseId is required" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await assertUserExists(telegramId);
    const query = parseFriendsListQuery(req.query, 20);
    const scope = parseScope(req.query.scope);
    const verse = await getVerseByExternalVerseId(externalVerseId);

    if (!verse) {
      return res.status(404).json({ error: "Verse not found" });
    }

    const [owners, totalCount] = await Promise.all([
      getVerseOwnersPage({
        verseId: verse.id,
        scope,
        followerTelegramId: scope === "friends" ? telegramId : undefined,
        startWith: query.startWith,
        limit: query.limit,
      }),
      countVerseOwners({
        verseId: verse.id,
        scope,
        followerTelegramId: scope === "friends" ? telegramId : undefined,
      }),
    ]);

    const metricsByTelegramId = await buildFriendMetricsMap(owners);
    const friendTelegramIds =
      scope === "friends"
        ? new Set(owners.map((owner) => owner.telegramId))
        : new Set(
            await getFollowingTelegramIdsInSet({
              followerTelegramId: telegramId,
              candidateTelegramIds: owners.map((owner) => owner.telegramId),
            })
          );

    const items = mapUsersToFriendListItems({
      users: owners,
      metricsByTelegramId,
      friendTelegramIds,
      forceIsFriend: scope === "friends",
    });

    return res.status(200).json({
      items,
      totalCount,
      limit: query.limit,
      startWith: query.startWith,
    });
  } catch (error) {
    if (error instanceof FriendsApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Error fetching verse owners:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
