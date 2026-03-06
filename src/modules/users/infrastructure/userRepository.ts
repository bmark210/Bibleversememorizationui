import { prisma } from "@/lib/prisma";
import type { Translation } from "@/generated/prisma";
import type {
  UserRecord,
  UserVerseLinkRecord,
  UserWithVerseLinksRecord,
} from "@/modules/users/domain/User";

type UserMutationFields = {
  translation?: Translation;
  name?: string;
  nickname?: string;
  avatarUrl?: string;
};

function mapUserRecord(row: {
  id: string;
  telegramId: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  dailyStreak: number;
  translation: Translation;
  createdAt: Date;
}): UserRecord {
  return {
    id: row.id,
    telegramId: row.telegramId,
    name: row.name,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    dailyStreak: row.dailyStreak,
    translation: row.translation,
    createdAt: row.createdAt,
  };
}

function buildUserSearchWhere(search?: string) {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      {
        telegramId: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        nickname: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
    ],
  };
}

function mapUserVerseLinkRecord(row: {
  id: number;
  telegramId: string;
  verseId: string;
  status: "MY" | "LEARNING" | "STOPPED";
  masteryLevel: number;
  repetitions: number;
  referenceScore: number;
  incipitScore: number;
  contextScore: number;
  lastTrainingModeId: number | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserVerseLinkRecord {
  return {
    id: row.id,
    telegramId: row.telegramId,
    verseId: row.verseId,
    status: row.status,
    masteryLevel: row.masteryLevel,
    repetitions: row.repetitions,
    referenceScore: row.referenceScore,
    incipitScore: row.incipitScore,
    contextScore: row.contextScore,
    lastTrainingModeId: row.lastTrainingModeId,
    lastReviewedAt: row.lastReviewedAt,
    nextReviewAt: row.nextReviewAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapUserWithVerseLinksRecord(row: {
  id: string;
  telegramId: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  dailyStreak: number;
  translation: Translation;
  createdAt: Date;
  verses: Array<{
    id: number;
    telegramId: string;
    verseId: string;
    status: "MY" | "LEARNING" | "STOPPED";
    masteryLevel: number;
    repetitions: number;
    referenceScore: number;
    incipitScore: number;
    contextScore: number;
    lastTrainingModeId: number | null;
    lastReviewedAt: Date | null;
    nextReviewAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): UserWithVerseLinksRecord {
  return {
    ...mapUserRecord(row),
    verses: row.verses.map(mapUserVerseLinkRecord),
  };
}

export async function getUserByTelegramId(
  telegramId: string
): Promise<UserRecord | null> {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: {
      id: true,
      telegramId: true,
      name: true,
      nickname: true,
      avatarUrl: true,
      dailyStreak: true,
      translation: true,
      createdAt: true,
    },
  });

  return user ? mapUserRecord(user) : null;
}

export async function userExists(telegramId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: {
      id: true,
    },
  });

  return Boolean(user);
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      telegramId: true,
      name: true,
      nickname: true,
      avatarUrl: true,
      dailyStreak: true,
      translation: true,
      createdAt: true,
    },
  });

  return users.map(mapUserRecord);
}

export async function getUsersPage(params: {
  excludeTelegramId?: string;
  search?: string;
  startWith: number;
  limit: number;
}): Promise<UserRecord[]> {
  const searchWhere = buildUserSearchWhere(params.search);
  const where =
    params.excludeTelegramId && searchWhere
      ? {
          AND: [
            {
              telegramId: {
                not: params.excludeTelegramId,
              },
            },
            searchWhere,
          ],
        }
      : params.excludeTelegramId
        ? {
            telegramId: {
              not: params.excludeTelegramId,
            },
          }
        : searchWhere;

  const users = await prisma.user.findMany({
    where,
    skip: params.startWith,
    take: params.limit,
    orderBy: [{ createdAt: "desc" }, { telegramId: "asc" }],
    select: {
      id: true,
      telegramId: true,
      name: true,
      nickname: true,
      avatarUrl: true,
      dailyStreak: true,
      translation: true,
      createdAt: true,
    },
  });

  return users.map(mapUserRecord);
}

export async function countUsers(params: {
  excludeTelegramId?: string;
  search?: string;
}): Promise<number> {
  const searchWhere = buildUserSearchWhere(params.search);
  const where =
    params.excludeTelegramId && searchWhere
      ? {
          AND: [
            {
              telegramId: {
                not: params.excludeTelegramId,
              },
            },
            searchWhere,
          ],
        }
      : params.excludeTelegramId
        ? {
            telegramId: {
              not: params.excludeTelegramId,
            },
          }
        : searchWhere;

  return prisma.user.count({ where });
}

export async function getFollowedUsersPage(params: {
  followerTelegramId: string;
  search?: string;
  startWith: number;
  limit: number;
}): Promise<UserRecord[]> {
  const searchWhere = buildUserSearchWhere(params.search);
  const where = searchWhere
    ? {
        AND: [
          {
            followers: {
              some: {
                followerTelegramId: params.followerTelegramId,
              },
            },
          },
          searchWhere,
        ],
      }
    : {
        followers: {
          some: {
            followerTelegramId: params.followerTelegramId,
          },
        },
      };

  const users = await prisma.user.findMany({
    where,
    skip: params.startWith,
    take: params.limit,
    orderBy: [{ createdAt: "desc" }, { telegramId: "asc" }],
    select: {
      id: true,
      telegramId: true,
      name: true,
      nickname: true,
      avatarUrl: true,
      dailyStreak: true,
      translation: true,
      createdAt: true,
    },
  });

  return users.map(mapUserRecord);
}

export async function countFollowedUsers(params: {
  followerTelegramId: string;
  search?: string;
}): Promise<number> {
  const searchWhere = buildUserSearchWhere(params.search);
  const where = searchWhere
    ? {
        AND: [
          {
            followers: {
              some: {
                followerTelegramId: params.followerTelegramId,
              },
            },
          },
          searchWhere,
        ],
      }
    : {
        followers: {
          some: {
            followerTelegramId: params.followerTelegramId,
          },
        },
      };

  return prisma.user.count({ where });
}

export async function getFollowedUsers(
  followerTelegramId: string
): Promise<UserRecord[]> {
  const users = await prisma.user.findMany({
    where: {
      followers: {
        some: {
          followerTelegramId,
        },
      },
    },
    select: {
      id: true,
      telegramId: true,
      name: true,
      nickname: true,
      avatarUrl: true,
      dailyStreak: true,
      translation: true,
      createdAt: true,
    },
  });

  return users.map(mapUserRecord);
}

export async function createUser(params: {
  telegramId: string;
  translation?: Translation;
  name?: string;
  nickname?: string;
  avatarUrl?: string;
}): Promise<UserRecord> {
  const user = await prisma.user.create({
    data: {
      telegramId: params.telegramId,
      ...(params.translation ? { translation: params.translation } : {}),
      ...(params.name ? { name: params.name } : {}),
      ...(params.nickname ? { nickname: params.nickname } : {}),
      ...(params.avatarUrl ? { avatarUrl: params.avatarUrl } : {}),
    },
    select: {
      id: true,
      telegramId: true,
      name: true,
      nickname: true,
      avatarUrl: true,
      dailyStreak: true,
      translation: true,
      createdAt: true,
    },
  });

  return mapUserRecord(user);
}

export async function upsertUserByTelegramId(params: {
  telegramId: string;
  update: UserMutationFields;
  create: UserMutationFields;
}): Promise<UserRecord> {
  const user = await prisma.user.upsert({
    where: {
      telegramId: params.telegramId,
    },
    update: {
      ...(params.update.translation ? { translation: params.update.translation } : {}),
      ...(params.update.name ? { name: params.update.name } : {}),
      ...(params.update.nickname ? { nickname: params.update.nickname } : {}),
      ...(params.update.avatarUrl ? { avatarUrl: params.update.avatarUrl } : {}),
    },
    create: {
      telegramId: params.telegramId,
      ...(params.create.translation ? { translation: params.create.translation } : {}),
      ...(params.create.name ? { name: params.create.name } : {}),
      ...(params.create.nickname ? { nickname: params.create.nickname } : {}),
      ...(params.create.avatarUrl ? { avatarUrl: params.create.avatarUrl } : {}),
    },
    select: {
      id: true,
      telegramId: true,
      name: true,
      nickname: true,
      avatarUrl: true,
      dailyStreak: true,
      translation: true,
      createdAt: true,
    },
  });

  return mapUserRecord(user);
}

export async function upsertUserWithVerseLinksByTelegramId(params: {
  telegramId: string;
  update: UserMutationFields;
  create: UserMutationFields;
}): Promise<UserWithVerseLinksRecord> {
  const user = await prisma.user.upsert({
    where: {
      telegramId: params.telegramId,
    },
    update: {
      ...(params.update.translation ? { translation: params.update.translation } : {}),
      ...(params.update.name ? { name: params.update.name } : {}),
      ...(params.update.nickname ? { nickname: params.update.nickname } : {}),
      ...(params.update.avatarUrl ? { avatarUrl: params.update.avatarUrl } : {}),
    },
    create: {
      telegramId: params.telegramId,
      ...(params.create.translation ? { translation: params.create.translation } : {}),
      ...(params.create.name ? { name: params.create.name } : {}),
      ...(params.create.nickname ? { nickname: params.create.nickname } : {}),
      ...(params.create.avatarUrl ? { avatarUrl: params.create.avatarUrl } : {}),
    },
    select: {
      id: true,
      telegramId: true,
      name: true,
      nickname: true,
      avatarUrl: true,
      dailyStreak: true,
      translation: true,
      createdAt: true,
      verses: {
        select: {
          id: true,
          telegramId: true,
          verseId: true,
          status: true,
          masteryLevel: true,
          repetitions: true,
          referenceScore: true,
          incipitScore: true,
          contextScore: true,
          lastTrainingModeId: true,
          lastReviewedAt: true,
          nextReviewAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return mapUserWithVerseLinksRecord(user);
}
