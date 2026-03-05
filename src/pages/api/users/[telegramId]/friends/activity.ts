import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import {
  assertUserExists,
  buildFriendMetricsMap,
  buildFriendsActivityResponse,
  FriendsApiError,
  parseActivityLimit,
  type DashboardFriendsActivityResponse,
} from "./_shared";

type FriendsActivityRouteError = { error: string; details?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardFriendsActivityResponse | FriendsActivityRouteError>
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
    const limit = parseActivityLimit(req.query);

    const friends = await prisma.user.findMany({
      where: {
        followers: {
          some: {
            followerTelegramId: telegramId,
          },
        },
      },
      select: {
        telegramId: true,
        name: true,
        nickname: true,
        avatarUrl: true,
        dailyStreak: true,
      },
    });

    const metricsByTelegramId = await buildFriendMetricsMap(friends);
    return res.status(200).json(
      buildFriendsActivityResponse({
        friends,
        metricsByTelegramId,
        limit,
      })
    );
  } catch (error) {
    if (error instanceof FriendsApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Error fetching friends activity:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

