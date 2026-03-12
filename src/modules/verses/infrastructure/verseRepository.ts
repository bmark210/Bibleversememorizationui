import { prisma } from "@/lib/prisma";
import { VerseStatus } from "@/generated/prisma";
import { Prisma } from "@/generated/prisma/client";
import type {
  CatalogUserVerseProgressRecord,
  CatalogVerseRecord,
  TagRecord,
  UserVerseRecord,
  VerseRecord,
  VerseAdminSummaryRecord,
  VerseTagLinkRecord,
  VerseTagRecord,
} from "@/modules/verses/domain/Verse";

function mapVerseRecord(row: { id: string; externalVerseId: string }): VerseRecord {
  return {
    id: row.id,
    externalVerseId: row.externalVerseId,
  };
}

function mapTagRecord(row: { id: string; slug: string; title: string }): TagRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
  };
}

function mapCatalogVerseRecord(row: {
  id: string;
  externalVerseId: string;
  createdAt: Date;
  tags: Array<{
    tag: {
      id: string;
      slug: string;
      title: string;
    };
  }>;
}): CatalogVerseRecord {
  return {
    id: row.id,
    externalVerseId: row.externalVerseId,
    createdAt: row.createdAt,
    tags: row.tags.map((item) => mapTagRecord(item.tag)),
  };
}

function mapCatalogUserVerseProgressRecord(row: {
  verseId: string;
  status: VerseStatus;
  masteryLevel: number;
  repetitions: number;
  reviewLapseStreak: number;
  referenceScore: number;
  incipitScore: number;
  contextScore: number;
  lastTrainingModeId: number | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
}): CatalogUserVerseProgressRecord {
  return {
    verseId: row.verseId,
    status: row.status,
    masteryLevel: row.masteryLevel,
    repetitions: row.repetitions,
    reviewLapseStreak: row.reviewLapseStreak,
    referenceScore: row.referenceScore,
    incipitScore: row.incipitScore,
    contextScore: row.contextScore,
    lastTrainingModeId: row.lastTrainingModeId,
    lastReviewedAt: row.lastReviewedAt,
    nextReviewAt: row.nextReviewAt,
  };
}

export function mapUserVerseRecord(
  row: {
    id: number;
    telegramId: string;
    verseId: string;
    status: VerseStatus;
    masteryLevel: number;
    repetitions: number;
    reviewLapseStreak: number;
    referenceScore: number;
    incipitScore: number;
    contextScore: number;
    lastTrainingModeId: number | null;
    lastReviewedAt: Date | null;
    nextReviewAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    verse: { externalVerseId: string };
  }
): UserVerseRecord {
  return {
    id: row.id,
    telegramId: row.telegramId,
    verseId: row.verseId,
    status: row.status,
    masteryLevel: row.masteryLevel,
    repetitions: row.repetitions,
    reviewLapseStreak: row.reviewLapseStreak,
    referenceScore: row.referenceScore,
    incipitScore: row.incipitScore,
    contextScore: row.contextScore,
    lastTrainingModeId: row.lastTrainingModeId,
    lastReviewedAt: row.lastReviewedAt,
    nextReviewAt: row.nextReviewAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    verse: {
      externalVerseId: row.verse.externalVerseId,
    },
  };
}

export async function getVerseByExternalVerseId(
  externalVerseId: string
): Promise<VerseRecord | null> {
  const verse = await prisma.verse.findUnique({
    where: { externalVerseId },
    select: {
      id: true,
      externalVerseId: true,
    },
  });

  return verse ? mapVerseRecord(verse) : null;
}

export async function getVersesByIds(verseIds: string[]): Promise<VerseRecord[]> {
  if (verseIds.length === 0) {
    return [];
  }

  const verses = await prisma.verse.findMany({
    where: {
      id: {
        in: verseIds,
      },
    },
    select: {
      id: true,
      externalVerseId: true,
    },
  });

  return verses.map(mapVerseRecord);
}

function buildCatalogVerseWhere(params: {
  tagSlugs: string[];
  bookId?: number;
}): Prisma.VerseWhereInput | undefined {
  const conditions: Prisma.VerseWhereInput[] = [];

  if (params.tagSlugs.length > 0) {
    conditions.push({
      tags: {
        some: {
          tag: {
            slug: {
              in: params.tagSlugs,
            },
          },
        },
      },
    });
  }

  if (params.bookId) {
    conditions.push({
      externalVerseId: {
        startsWith: `${params.bookId}-`,
      },
    });
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { AND: conditions };
}

function buildCatalogVerseSqlWhereClause(params: {
  tagSlugs: string[];
  bookId?: number;
}): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  if (params.tagSlugs.length > 0) {
    conditions.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "VerseTag" vt
        INNER JOIN "Tag" t ON t.id = vt."tagId"
        WHERE vt."verseId" = v.id
          AND t.slug IN (${Prisma.join(params.tagSlugs)})
      )
    `);
  }

  if (params.bookId) {
    conditions.push(
      Prisma.sql`CAST(split_part(v."externalVerseId", '-', 1) AS integer) = ${params.bookId}`
    );
  }

  if (conditions.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export async function countCatalogVerses(params: {
  tagSlugs: string[];
  bookId?: number;
}): Promise<number> {
  const where = buildCatalogVerseWhere(params);

  return prisma.verse.count({ where });
}

export async function getCatalogVersesPage(params: {
  tagSlugs: string[];
  bookId?: number;
  orderBy: "createdAt" | "bible" | "popularity";
  order: "asc" | "desc";
  startWith: number;
  limit: number;
}): Promise<CatalogVerseRecord[]> {
  const where = buildCatalogVerseWhere(params);

  if (params.orderBy === "createdAt") {
    const verses = await prisma.verse.findMany({
      where,
      orderBy: { createdAt: params.order },
      skip: params.startWith,
      take: params.limit,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return verses.map(mapCatalogVerseRecord);
  }

  if (params.orderBy === "popularity") {
    const directionSql = params.order === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const whereClauseSql = buildCatalogVerseSqlWhereClause(params);

    const rawRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT v.id
      FROM "Verse" v
      LEFT JOIN "UserVerse" uv ON uv."verseId" = v.id
      ${whereClauseSql}
      GROUP BY v.id, v."createdAt"
      ORDER BY COUNT(uv.id) ${directionSql}, v."createdAt" DESC, v.id ASC
      OFFSET ${params.startWith}
      LIMIT ${params.limit}
    `);

    const verseIds = rawRows.map((row) => row.id);
    if (verseIds.length === 0) {
      return [];
    }

    const verses = await prisma.verse.findMany({
      where: {
        id: {
          in: verseIds,
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const verseById = new Map(verses.map((verse) => [verse.id, verse] as const));
    return verseIds
      .map((verseId) => verseById.get(verseId))
      .filter((verse): verse is (typeof verses)[number] => Boolean(verse))
      .map(mapCatalogVerseRecord);
  }

  const directionSql = params.order === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const whereClauseSql = buildCatalogVerseSqlWhereClause(params);

  const rawRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT v.id
    FROM "Verse" v
    ${whereClauseSql}
    ORDER BY
      CAST(split_part(v."externalVerseId", '-', 1) AS integer) ${directionSql},
      CAST(split_part(v."externalVerseId", '-', 2) AS integer) ${directionSql},
      CAST(split_part(v."externalVerseId", '-', 3) AS integer) ${directionSql},
      COALESCE(
        NULLIF(split_part(v."externalVerseId", '-', 4), '')::integer,
        CAST(split_part(v."externalVerseId", '-', 3) AS integer)
      ) ${directionSql},
      v.id ${directionSql}
    OFFSET ${params.startWith}
    LIMIT ${params.limit}
  `);

  const verseIds = rawRows.map((row) => row.id);
  if (verseIds.length === 0) {
    return [];
  }

  const verses = await prisma.verse.findMany({
    where: {
      id: {
        in: verseIds,
      },
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  const verseById = new Map(verses.map((verse) => [verse.id, verse] as const));
  return verseIds
    .map((verseId) => verseById.get(verseId))
    .filter((verse): verse is (typeof verses)[number] => Boolean(verse))
    .map(mapCatalogVerseRecord);
}

export async function getGlobalOwnerCountByVerseIds(
  verseIds: string[]
): Promise<Map<string, number>> {
  const uniqueVerseIds = Array.from(new Set(verseIds.filter(Boolean)));
  if (uniqueVerseIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.userVerse.groupBy({
    by: ["verseId"],
    where: {
      verseId: {
        in: uniqueVerseIds,
      },
    },
    _count: {
      _all: true,
    },
  });

  return new Map(
    rows.map((row) => [row.verseId, Math.max(0, row._count._all ?? 0)] as const)
  );
}

export type VerseOwnerPreviewUserRecord = {
  verseId: string;
  telegramId: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
};

export type VerseOwnerListUserRecord = {
  telegramId: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  dailyStreak: number;
};

export async function getVerseOwnerPreviewByVerseIds(params: {
  verseIds: string[];
  scope: "friends" | "players";
  followerTelegramId?: string;
  limitPerVerse?: number;
}): Promise<Map<string, VerseOwnerPreviewUserRecord[]>> {
  const uniqueVerseIds = Array.from(new Set(params.verseIds.filter(Boolean)));
  if (uniqueVerseIds.length === 0) {
    return new Map();
  }

  if (params.scope === "friends" && !params.followerTelegramId) {
    return new Map();
  }

  const limitPerVerse = Math.max(
    1,
    Math.min(5, Math.round(params.limitPerVerse ?? 3))
  );
  const followJoinSql =
    params.scope === "friends"
      ? Prisma.sql`
          INNER JOIN "UserFollow" uf
            ON uf."followingTelegramId" = uv."telegramId"
           AND uf."followerTelegramId" = ${params.followerTelegramId!}
        `
      : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{
      verseId: string;
      telegramId: string;
      name: string | null;
      nickname: string | null;
      avatarUrl: string | null;
    }>
  >(Prisma.sql`
    WITH ranked_owners AS (
      SELECT
        uv."verseId" AS "verseId",
        uv."telegramId" AS "telegramId",
        u.name AS "name",
        u.nickname AS "nickname",
        u."avatarUrl" AS "avatarUrl",
        ROW_NUMBER() OVER (
          PARTITION BY uv."verseId"
          ORDER BY uv."updatedAt" DESC, uv."createdAt" DESC, uv."telegramId" ASC
        ) AS "rowNumber"
      FROM "UserVerse" uv
      INNER JOIN "User" u
        ON u."telegramId" = uv."telegramId"
      ${followJoinSql}
      WHERE uv."verseId" IN (${Prisma.join(uniqueVerseIds)})
    )
    SELECT
      "verseId",
      "telegramId",
      "name",
      "nickname",
      "avatarUrl"
    FROM ranked_owners
    WHERE "rowNumber" <= ${limitPerVerse}
    ORDER BY "verseId" ASC, "rowNumber" ASC
  `);

  const result = new Map<string, VerseOwnerPreviewUserRecord[]>();
  for (const row of rows) {
    const bucket = result.get(row.verseId) ?? [];
    bucket.push({
      verseId: row.verseId,
      telegramId: row.telegramId,
      name: row.name,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl,
    });
    result.set(row.verseId, bucket);
  }

  return result;
}

function buildVerseOwnersWhere(params: {
  verseId: string;
  scope: "friends" | "players";
  followerTelegramId?: string;
}) {
  if (params.scope === "friends") {
    if (!params.followerTelegramId) {
      return {
        verseId: "__missing__",
      };
    }

    return {
      verseId: params.verseId,
      user: {
        followers: {
          some: {
            followerTelegramId: params.followerTelegramId,
          },
        },
      },
    };
  }

  return {
    verseId: params.verseId,
  };
}

export async function countVerseOwners(params: {
  verseId: string;
  scope: "friends" | "players";
  followerTelegramId?: string;
}): Promise<number> {
  return prisma.userVerse.count({
    where: buildVerseOwnersWhere(params),
  });
}

export async function getVerseOwnersPage(params: {
  verseId: string;
  scope: "friends" | "players";
  followerTelegramId?: string;
  startWith: number;
  limit: number;
}): Promise<VerseOwnerListUserRecord[]> {
  const rows = await prisma.userVerse.findMany({
    where: buildVerseOwnersWhere(params),
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
      {
        telegramId: "asc",
      },
    ],
    skip: params.startWith,
    take: params.limit,
    select: {
      user: {
        select: {
          telegramId: true,
          name: true,
          nickname: true,
          avatarUrl: true,
          dailyStreak: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    telegramId: row.user.telegramId,
    name: row.user.name,
    nickname: row.user.nickname,
    avatarUrl: row.user.avatarUrl,
    dailyStreak: row.user.dailyStreak,
  }));
}

export async function getUserCatalogProgressByVerseIds(params: {
  telegramId: string;
  verseIds: string[];
}): Promise<CatalogUserVerseProgressRecord[]> {
  if (params.verseIds.length === 0) {
    return [];
  }

  const rows = await prisma.userVerse.findMany({
    where: {
      telegramId: params.telegramId,
      verseId: {
        in: params.verseIds,
      },
    },
    select: {
      verseId: true,
      status: true,
      masteryLevel: true,
      repetitions: true,
      reviewLapseStreak: true,
      referenceScore: true,
      incipitScore: true,
      contextScore: true,
      lastTrainingModeId: true,
      lastReviewedAt: true,
      nextReviewAt: true,
    },
  });

  return rows.map(mapCatalogUserVerseProgressRecord);
}

export async function upsertCatalogVerse(
  externalVerseId: string
): Promise<VerseRecord> {
  const verse = await prisma.verse.upsert({
    where: { externalVerseId },
    update: {},
    create: { externalVerseId },
    select: {
      id: true,
      externalVerseId: true,
    },
  });

  return mapVerseRecord(verse);
}

export async function upsertUserVerseBinding(params: {
  telegramId: string;
  verseId: string;
}): Promise<UserVerseRecord> {
  const userVerse = await prisma.userVerse.upsert({
    where: {
      telegramId_verseId: {
        telegramId: params.telegramId,
        verseId: params.verseId,
      },
    },
    update: {},
    create: {
      telegramId: params.telegramId,
      verseId: params.verseId,
      status: VerseStatus.MY,
    },
    include: {
      verse: {
        select: {
          externalVerseId: true,
        },
      },
    },
  });

  return mapUserVerseRecord(userVerse);
}

export async function deleteUserVerseBinding(params: {
  telegramId: string;
  verseId: string;
}): Promise<void> {
  await prisma.userVerse.delete({
    where: {
      telegramId_verseId: {
        telegramId: params.telegramId,
        verseId: params.verseId,
      },
    },
  });
}

export async function getVerseTagsByExternalVerseIds(
  externalVerseIds: string[]
): Promise<Map<string, VerseTagRecord[]>> {
  const uniqueIds = Array.from(new Set(externalVerseIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const links = await prisma.verseTag.findMany({
    where: {
      verse: {
        externalVerseId: {
          in: uniqueIds,
        },
      },
    },
    select: {
      verse: {
        select: {
          externalVerseId: true,
        },
      },
      tag: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
    },
    orderBy: {
      tag: {
        title: "asc",
      },
    },
  });

  const tagsByVerseId = new Map<string, VerseTagRecord[]>();
  for (const link of links) {
    const externalVerseId = link.verse.externalVerseId;
    const currentTags = tagsByVerseId.get(externalVerseId) ?? [];
    currentTags.push({
      externalVerseId,
      id: link.tag.id,
      slug: link.tag.slug,
      title: link.tag.title,
    });
    tagsByVerseId.set(externalVerseId, currentTags);
  }

  return tagsByVerseId;
}

export async function getTagsForVerseExternalVerseId(
  externalVerseId: string
): Promise<TagRecord[]> {
  const tags = await prisma.tag.findMany({
    where: {
      verses: {
        some: {
          verse: {
            externalVerseId,
          },
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return tags.map(mapTagRecord);
}

export async function getTagBySlug(slug: string): Promise<TagRecord | null> {
  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  return tag ? mapTagRecord(tag) : null;
}

export async function getAllTags(): Promise<TagRecord[]> {
  const tags = await prisma.tag.findMany({
    orderBy: {
      title: "asc",
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  return tags.map(mapTagRecord);
}

export async function createTag(params: {
  slug: string;
  title: string;
}): Promise<TagRecord> {
  const tag = await prisma.tag.create({
    data: {
      slug: params.slug,
      title: params.title,
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  return mapTagRecord(tag);
}

export async function findTagByTitle(title: string): Promise<TagRecord | null> {
  const tag = await prisma.tag.findFirst({
    where: {
      title,
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  return tag ? mapTagRecord(tag) : null;
}

export async function updateTagTitle(params: {
  id: string;
  title: string;
}): Promise<TagRecord> {
  const tag = await prisma.tag.update({
    where: {
      id: params.id,
    },
    data: {
      title: params.title,
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  return mapTagRecord(tag);
}

export async function attachTagToVerse(params: {
  verseId: string;
  tagId: string;
}): Promise<VerseTagLinkRecord> {
  const link = await prisma.verseTag.upsert({
    where: {
      verseId_tagId: {
        verseId: params.verseId,
        tagId: params.tagId,
      },
    },
    update: {},
    create: {
      verseId: params.verseId,
      tagId: params.tagId,
    },
  });

  return {
    id: link.id,
    verseId: link.verseId,
    tagId: link.tagId,
  };
}

export async function countVerseTagLinks(tagId: string): Promise<number> {
  return prisma.verseTag.count({
    where: { tagId },
  });
}

export async function deleteTagById(tagId: string): Promise<boolean> {
  const result = await prisma.tag.deleteMany({
    where: { id: tagId },
  });

  return result.count > 0;
}

export async function removeTagFromVerse(params: {
  verseId: string;
  tagId: string;
}): Promise<boolean> {
  const result = await prisma.verseTag.deleteMany({
    where: {
      verseId: params.verseId,
      tagId: params.tagId,
    },
  });

  return result.count > 0;
}

export async function findTagsByIds(tagIds: string[]): Promise<TagRecord[]> {
  if (tagIds.length === 0) {
    return [];
  }

  const tags = await prisma.tag.findMany({
    where: {
      id: {
        in: tagIds,
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  return tags.map(mapTagRecord);
}

export async function findTagsBySlugs(tagSlugs: string[]): Promise<TagRecord[]> {
  if (tagSlugs.length === 0) {
    return [];
  }

  const tags = await prisma.tag.findMany({
    where: {
      slug: {
        in: tagSlugs,
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  return tags.map(mapTagRecord);
}

export async function replaceVerseTags(params: {
  verseId: string;
  tagIds: string[];
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.verseTag.deleteMany({
      where: { verseId: params.verseId },
    });

    if (params.tagIds.length > 0) {
      await tx.verseTag.createMany({
        data: params.tagIds.map((tagId) => ({
          verseId: params.verseId,
          tagId,
        })),
        skipDuplicates: true,
      });
    }
  });
}

export async function getVerseAdminSummary(
  externalVerseId: string
): Promise<VerseAdminSummaryRecord | null> {
  const verse = await prisma.verse.findUnique({
    where: { externalVerseId },
    select: {
      id: true,
      externalVerseId: true,
      _count: {
        select: {
          userVerses: true,
          tags: true,
        },
      },
    },
  });

  if (!verse) {
    return null;
  }

  return {
    verseId: verse.id,
    externalVerseId: verse.externalVerseId,
    userLinksCount: verse._count.userVerses,
    tagLinksCount: verse._count.tags,
    canDelete: verse._count.userVerses === 0,
  };
}

export async function deleteCatalogVerseByExternalVerseId(
  externalVerseId: string
): Promise<boolean> {
  const verse = await getVerseByExternalVerseId(externalVerseId);
  if (!verse) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.verseTag.deleteMany({
      where: { verseId: verse.id },
    });

    await tx.verse.delete({
      where: { id: verse.id },
    });
  });

  return true;
}

export async function findUserVerses(params: {
  telegramId: string;
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>[];
  skip?: number;
  take?: number;
}): Promise<UserVerseRecord[]> {
  const rows = await prisma.userVerse.findMany({
    where: {
      telegramId: params.telegramId,
      ...(params.where ?? {}),
    },
    ...(params.orderBy ? { orderBy: params.orderBy } : {}),
    ...(typeof params.skip === "number" ? { skip: params.skip } : {}),
    ...(typeof params.take === "number" ? { take: params.take } : {}),
    include: {
      verse: {
        select: {
          externalVerseId: true,
        },
      },
    },
  });

  return rows.map(mapUserVerseRecord);
}

export async function countUserVerses(params: {
  telegramId: string;
  where?: Record<string, unknown>;
}): Promise<number> {
  return prisma.userVerse.count({
    where: {
      telegramId: params.telegramId,
      ...(params.where ?? {}),
    },
  });
}

export async function findUserVersesByVerseIds(params: {
  telegramId: string;
  verseIds: string[];
}): Promise<UserVerseRecord[]> {
  if (params.verseIds.length === 0) {
    return [];
  }

  const rows = await prisma.userVerse.findMany({
    where: {
      telegramId: params.telegramId,
      verseId: {
        in: params.verseIds,
      },
    },
    include: {
      verse: {
        select: {
          externalVerseId: true,
        },
      },
    },
  });

  return rows.map(mapUserVerseRecord);
}

export async function getUserVerseByExternalVerseId(params: {
  telegramId: string;
  externalVerseId: string;
}): Promise<{ verse: VerseRecord | null; userVerse: UserVerseRecord | null }> {
  const verse = await prisma.verse.findUnique({
    where: { externalVerseId: params.externalVerseId },
    select: {
      id: true,
      externalVerseId: true,
    },
  });
  if (!verse) {
    return { verse: null, userVerse: null };
  }

  const userVerse = await prisma.userVerse.findUnique({
    where: {
      telegramId_verseId: {
        telegramId: params.telegramId,
        verseId: verse.id,
      },
    },
    include: {
      verse: {
        select: {
          externalVerseId: true,
        },
      },
    },
  });

  return {
    verse: mapVerseRecord(verse),
    userVerse: userVerse ? mapUserVerseRecord(userVerse) : null,
  };
}
