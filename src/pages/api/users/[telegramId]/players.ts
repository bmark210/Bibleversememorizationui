import type { NextApiRequest, NextApiResponse } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertUserExists,
  buildFriendMetricsMap,
  buildUserSearchWhere,
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

    const searchWhere = buildUserSearchWhere(query.search);
    const where: Prisma.UserWhereInput = searchWhere
      ? {
          AND: [{ telegramId: { not: telegramId } }, searchWhere],
        }
      : { telegramId: { not: telegramId } };

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: query.startWith,
        take: query.limit,
        orderBy: [{ createdAt: "desc" }, { telegramId: "asc" }],
        select: {
          telegramId: true,
          name: true,
          nickname: true,
          avatarUrl: true,
          dailyStreak: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const playerTelegramIds = users.map((user) => user.telegramId);
    const follows = await prisma.userFollow.findMany({
      where: {
        followerTelegramId: telegramId,
        followingTelegramId: {
          in: playerTelegramIds,
        },
      },
      select: {
        followingTelegramId: true,
      },
    });

    const friendTelegramIds = new Set(
      follows.map((follow) => follow.followingTelegramId)
    );
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

