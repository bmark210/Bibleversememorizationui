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
  type FriendsMutationResponse,
  type FriendsPageResponse,
} from "./_shared";

type FriendsRouteErrorResponse = { error: string; details?: string };
type FriendsRouteResponse =
  | FriendsPageResponse
  | FriendsMutationResponse
  | FriendsRouteErrorResponse;

type AddFriendPayload = {
  targetTelegramId?: string;
};

function normalizeTargetTelegramId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FriendsRouteResponse>
) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method === "GET") {
    return handleGet(req, res, telegramId);
  }

  if (req.method === "POST") {
    return handlePost(req, res, telegramId);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<FriendsRouteResponse>,
  telegramId: string
) {
  try {
    await assertUserExists(telegramId);
    const query = parseFriendsListQuery(req.query);
    const searchWhere = buildUserSearchWhere(query.search);

    const baseWhere: Prisma.UserWhereInput = {
      followers: {
        some: {
          followerTelegramId: telegramId,
        },
      },
    };
    const where: Prisma.UserWhereInput = searchWhere
      ? { AND: [baseWhere, searchWhere] }
      : baseWhere;

    const [friends, totalCount] = await Promise.all([
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

    const metricsByTelegramId = await buildFriendMetricsMap(friends);
    const items = mapUsersToFriendListItems({
      users: friends,
      metricsByTelegramId,
      forceIsFriend: true,
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

    console.error("Error fetching friends list:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<FriendsRouteResponse>,
  telegramId: string
) {
  try {
    const body = (req.body ?? {}) as AddFriendPayload;
    const targetTelegramId = normalizeTargetTelegramId(body.targetTelegramId);

    if (!targetTelegramId) {
      return res.status(400).json({ error: "targetTelegramId is required" });
    }
    if (targetTelegramId === telegramId) {
      return res.status(400).json({ error: "You cannot add yourself as a friend" });
    }

    const [currentUser, targetUser] = await Promise.all([
      prisma.user.findUnique({
        where: { telegramId },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { telegramId: targetTelegramId },
        select: { id: true },
      }),
    ]);

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    const existing = await prisma.userFollow.findUnique({
      where: {
        followerTelegramId_followingTelegramId: {
          followerTelegramId: telegramId,
          followingTelegramId: targetTelegramId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return res.status(200).json({ status: "already-following" });
    }

    await prisma.userFollow.create({
      data: {
        followerTelegramId: telegramId,
        followingTelegramId: targetTelegramId,
      },
    });

    return res.status(200).json({ status: "added" });
  } catch (error) {
    if (error instanceof FriendsApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Error adding friend:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

