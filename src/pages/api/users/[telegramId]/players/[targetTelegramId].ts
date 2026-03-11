import type { NextApiRequest, NextApiResponse } from "next";
import { isFollowing } from "@/modules/social/infrastructure/socialRepository";
import { getUserByTelegramId } from "@/modules/users/infrastructure/userRepository";
import {
  assertUserExists,
  buildFriendMetricsMap,
  buildPublicName,
  FriendsApiError,
} from "../friends/_shared";

type PlayerProfileResponse = {
  telegramId: string;
  displayName: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  isCurrentUser: boolean;
  isFriend: boolean;
  lastActiveAt: string | null;
  masteredVerses: number;
  weeklyRepetitions: number;
  dailyStreak: number;
  xp: number;
  createdAt: string;
};

type PlayerProfileRouteErrorResponse = { error: string; details?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlayerProfileResponse | PlayerProfileRouteErrorResponse>
) {
  const { telegramId, targetTelegramId } = req.query;

  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (!targetTelegramId || Array.isArray(targetTelegramId)) {
    return res.status(400).json({ error: "targetTelegramId is required" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await assertUserExists(telegramId);

    const targetUser = await getUserByTelegramId(targetTelegramId);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    const metricsByTelegramId = await buildFriendMetricsMap([
      {
        telegramId: targetUser.telegramId,
        name: targetUser.name,
        nickname: targetUser.nickname,
        avatarUrl: targetUser.avatarUrl,
        dailyStreak: targetUser.dailyStreak,
      },
    ]);
    const metrics = metricsByTelegramId.get(targetUser.telegramId);
    const isCurrentUser = telegramId === targetUser.telegramId;
    const isFriend = isCurrentUser
      ? false
      : await isFollowing({
          followerTelegramId: telegramId,
          followingTelegramId: targetUser.telegramId,
        });

    return res.status(200).json({
      telegramId: targetUser.telegramId,
      displayName: buildPublicName({
        telegramId: targetUser.telegramId,
        name: targetUser.name,
        nickname: targetUser.nickname,
      }),
      name: targetUser.name,
      nickname: targetUser.nickname,
      avatarUrl: targetUser.avatarUrl ?? null,
      isCurrentUser,
      isFriend,
      lastActiveAt: metrics?.lastActiveAt ?? null,
      masteredVerses: metrics?.masteredVerses ?? 0,
      weeklyRepetitions: metrics?.weeklyRepetitions ?? 0,
      dailyStreak: metrics?.dailyStreak ?? 0,
      xp: metrics?.xp ?? 0,
      createdAt: targetUser.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof FriendsApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Error fetching player profile:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
