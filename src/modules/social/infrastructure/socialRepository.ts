import { prisma } from "@/lib/prisma";
import type { VerseStatus } from "@/generated/prisma";

export type FriendVerseAggregate = {
  verseId: string;
  friendsCount: number;
  lastFriendActivityAt: Date | null;
};

export type SocialMetricVerseRow = {
  telegramId: string;
  status: VerseStatus;
  masteryLevel: number;
  repetitions: number;
  referenceScore: number;
  incipitScore: number;
  contextScore: number;
  lastReviewedAt: Date | null;
};

export async function getFollowingTelegramIds(
  followerTelegramId: string
): Promise<string[]> {
  const follows = await prisma.userFollow.findMany({
    where: {
      followerTelegramId,
    },
    select: {
      followingTelegramId: true,
    },
  });

  return Array.from(
    new Set(
      follows
        .map((follow) => follow.followingTelegramId)
        .filter((telegramId): telegramId is string => Boolean(telegramId))
    )
  );
}

export async function getFollowingTelegramIdsInSet(params: {
  followerTelegramId: string;
  candidateTelegramIds: string[];
}): Promise<string[]> {
  if (params.candidateTelegramIds.length === 0) {
    return [];
  }

  const follows = await prisma.userFollow.findMany({
    where: {
      followerTelegramId: params.followerTelegramId,
      followingTelegramId: {
        in: params.candidateTelegramIds,
      },
    },
    select: {
      followingTelegramId: true,
    },
  });

  return Array.from(
    new Set(
      follows
        .map((follow) => follow.followingTelegramId)
        .filter((telegramId): telegramId is string => Boolean(telegramId))
    )
  );
}

export async function isFollowing(params: {
  followerTelegramId: string;
  followingTelegramId: string;
}): Promise<boolean> {
  const follow = await prisma.userFollow.findUnique({
    where: {
      followerTelegramId_followingTelegramId: {
        followerTelegramId: params.followerTelegramId,
        followingTelegramId: params.followingTelegramId,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(follow);
}

export async function createFollow(params: {
  followerTelegramId: string;
  followingTelegramId: string;
}): Promise<void> {
  await prisma.userFollow.create({
    data: {
      followerTelegramId: params.followerTelegramId,
      followingTelegramId: params.followingTelegramId,
    },
  });
}

export async function deleteFollow(params: {
  followerTelegramId: string;
  followingTelegramId: string;
}): Promise<boolean> {
  const result = await prisma.userFollow.deleteMany({
    where: {
      followerTelegramId: params.followerTelegramId,
      followingTelegramId: params.followingTelegramId,
    },
  });

  return result.count > 0;
}

export async function getSocialMetricVerseRows(
  telegramIds: string[]
): Promise<SocialMetricVerseRow[]> {
  if (telegramIds.length === 0) {
    return [];
  }

  const rows = await prisma.userVerse.findMany({
    where: {
      telegramId: {
        in: telegramIds,
      },
    },
    select: {
      telegramId: true,
      status: true,
      masteryLevel: true,
      repetitions: true,
      referenceScore: true,
      incipitScore: true,
      contextScore: true,
      lastReviewedAt: true,
    },
  });

  return rows;
}

export async function getFriendVerseAggregates(params: {
  telegramId: string;
  bookId?: number;
  tagSlugs?: string[];
}): Promise<FriendVerseAggregate[]> {
  const followingTelegramIds = await getFollowingTelegramIds(params.telegramId);
  if (followingTelegramIds.length === 0) {
    return [];
  }

  const verseFilter =
    (params.tagSlugs && params.tagSlugs.length > 0) || params.bookId
      ? {
          verse: {
            ...(params.tagSlugs && params.tagSlugs.length > 0
              ? {
                  tags: {
                    some: {
                      tag: {
                        slug: {
                          in: params.tagSlugs,
                        },
                      },
                    },
                  },
                }
              : {}),
            ...(params.bookId
              ? {
                  externalVerseId: {
                    startsWith: `${params.bookId}-`,
                  },
                }
              : {}),
          },
        }
      : {};

  const aggregates = await prisma.userVerse.groupBy({
    by: ["verseId"],
    where: {
      telegramId: {
        in: followingTelegramIds,
      },
      ...verseFilter,
    },
    _count: {
      _all: true,
    },
    _max: {
      updatedAt: true,
    },
  });

  return aggregates.map((aggregate) => ({
    verseId: aggregate.verseId,
    friendsCount: Math.max(0, aggregate._count._all ?? 0),
    lastFriendActivityAt: aggregate._max.updatedAt ?? null,
  }));
}
