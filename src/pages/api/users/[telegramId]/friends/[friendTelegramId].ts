import type { NextApiRequest, NextApiResponse } from "next";
import {
  deleteFollow,
  isFollowing,
} from "@/modules/social/infrastructure/socialRepository";
import {
  assertUserExists,
  FriendsApiError,
  type FriendsMutationResponse,
} from "./_shared";

type DeleteFriendRouteError = { error: string; details?: string };
type DeleteFriendRouteResponse = FriendsMutationResponse | DeleteFriendRouteError;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteFriendRouteResponse>
) {
  const { telegramId, friendTelegramId } = req.query;

  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }
  if (!friendTelegramId || Array.isArray(friendTelegramId)) {
    return res.status(400).json({ error: "friendTelegramId is required" });
  }

  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await assertUserExists(telegramId);

    if (friendTelegramId === telegramId) {
      return res.status(400).json({ error: "You cannot remove yourself from friends" });
    }

    const following = await isFollowing({
      followerTelegramId: telegramId,
      followingTelegramId: friendTelegramId,
    });

    if (!following) {
      return res.status(200).json({ status: "not-following" });
    }

    await deleteFollow({
      followerTelegramId: telegramId,
      followingTelegramId: friendTelegramId,
    });

    return res.status(200).json({ status: "removed" });
  } catch (error) {
    if (error instanceof FriendsApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Error removing friend:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
