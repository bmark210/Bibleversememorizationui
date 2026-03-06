import type { NextApiRequest, NextApiResponse } from "next";
import { getFollowingTelegramIdsInSet } from "@/modules/social/infrastructure/socialRepository";
import {
  countUsers,
  getUsersPage,
} from "@/modules/users/infrastructure/userRepository";
import {
  assertUserExists,
  buildFriendMetricsMap,
  FriendsApiError,
  mapUsersToFriendListItems,
  parseFriendsListQuery,
  type FriendsPageResponse,
} from "./friends/_shared";

type PlayersRouteErrorResponse = { error: string; details?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FriendsPageResponse | PlayersRouteErrorResponse>
) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await assertUserExists(telegramId);
    const query = parseFriendsListQuery(req.query);

    const [users, totalCount] = await Promise.all([
      getUsersPage({
        excludeTelegramId: telegramId,
        search: query.search,
        startWith: query.startWith,
        limit: query.limit,
      }),
      countUsers({
        excludeTelegramId: telegramId,
        search: query.search,
      }),
    ]);

    const playerTelegramIds = users.map((user) => user.telegramId);
    const followingTelegramIds = await getFollowingTelegramIdsInSet({
      followerTelegramId: telegramId,
      candidateTelegramIds: playerTelegramIds,
    });

    const friendTelegramIds = new Set(followingTelegramIds);
    const metricsByTelegramId = await buildFriendMetricsMap(users);
    const items = mapUsersToFriendListItems({
      users,
      metricsByTelegramId,
      friendTelegramIds,
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

    console.error("Error fetching players list:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
