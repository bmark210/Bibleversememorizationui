import type { ParsedUrlQuery } from "querystring";
import { VerseStatus } from "@/generated/prisma";
import { getSocialMetricVerseRows } from "@/modules/social/infrastructure/socialRepository";
import { userExists } from "@/modules/users/infrastructure/userRepository";
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import { computeActiveDailyStreak } from "@/shared/training/dailyStreak";
import {
  computeDisplayStatus,
  normalizeProgressValue,
} from "../verses/verseCard.types";

const DEFAULT_LIST_LIMIT = 8;
const DEFAULT_ACTIVITY_LIMIT = 6;
const MAX_LIMIT = 50;
const MAX_SEARCH_LENGTH = 80;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RATING_PROGRESS_WEIGHT = 0.4;
const RATING_SKILLS_WEIGHT = 0.3;
const RATING_STREAK_WEIGHT = 0.2;
const RATING_WEEKLY_WEIGHT = 0.1;

export type FriendListItemResponse = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  isFriend: boolean;
  lastActiveAt: string | null;
  masteredVerses: number;
  weeklyRepetitions: number;
  dailyStreak: number;
  averageProgressPercent: number;
};

export type FriendsPageResponse = {
  items: FriendListItemResponse[];
  totalCount: number;
  limit: number;
  startWith: number;
};

export type FriendActivityEntryResponse = Omit<FriendListItemResponse, "isFriend">;

export type DashboardFriendsActivityResponse = {
  generatedAt: string;
  summary: {
    friendsTotal: number;
    activeLast7Days: number;
    avgWeeklyRepetitions: number;
    avgStreakDays: number;
    avgProgressPercent: number;
  };
  entries: FriendActivityEntryResponse[];
};

export type FriendsMutationResponse = {
  status: "added" | "already-following" | "removed" | "not-following";
};

export type FriendsListQuery = {
  search?: string;
  limit: number;
  startWith: number;
};

type UserForFriendList = {
  telegramId: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  dailyStreak: number;
};

type UserMetricAggregate = {
  rows: Array<{
    status: VerseStatus;
    masteryLevel: number;
    repetitions: number;
    referenceScore: number;
    incipitScore: number;
    contextScore: number;
    lastReviewedAt: Date | null;
  }>;
};

export type UserFriendMetrics = {
  lastActiveAt: string | null;
  masteredVerses: number;
  weeklyRepetitions: number;
  dailyStreak: number;
  averageProgressPercent: number;
};

function getSingleQueryValue(
  query: ParsedUrlQuery,
  key: string
): string | undefined {
  const value = query[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toProgressPercent(masteryLevel: number, repetitions: number) {
  const totalProgressPoints = Math.min(
    normalizeProgressValue(masteryLevel) + normalizeProgressValue(repetitions),
    TOTAL_REPEATS_AND_STAGE_MASTERY_MAX
  );
  return clampPercent(
    (totalProgressPoints / TOTAL_REPEATS_AND_STAGE_MASTERY_MAX) * 100
  );
}

function normalizeSkillScore(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toSkillsPercent(
  referenceScore: number | null | undefined,
  incipitScore: number | null | undefined,
  contextScore: number | null | undefined
): number {
  return clampPercent(
    (normalizeSkillScore(referenceScore) +
      normalizeSkillScore(incipitScore) +
      normalizeSkillScore(contextScore)) /
      3
  );
}

function computeRatingPercent(params: {
  averageProgressPercent: number;
  averageSkillsPercent: number;
  streakDays: number;
  weeklyRepetitions: number;
}): number {
  const streakPercent = Math.min(100, Math.max(0, params.streakDays) * 5);
  const weeklyActivityPercent = Math.min(
    100,
    Math.max(0, params.weeklyRepetitions) * 10
  );

  return clampPercent(
    params.averageProgressPercent * RATING_PROGRESS_WEIGHT +
      params.averageSkillsPercent * RATING_SKILLS_WEIGHT +
      streakPercent * RATING_STREAK_WEIGHT +
      weeklyActivityPercent * RATING_WEEKLY_WEIGHT
  );
}

function parseLimit(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    throw new FriendsApiError(
      400,
      `limit must be an integer between 1 and ${MAX_LIMIT}`
    );
  }
  return parsed;
}

function parseStartWith(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FriendsApiError(400, "startWith must be a non-negative integer");
  }
  return parsed;
}

function parseSearch(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > MAX_SEARCH_LENGTH) {
    throw new FriendsApiError(
      400,
      `search must be at most ${MAX_SEARCH_LENGTH} characters`
    );
  }
  return normalized;
}

function roundAverage(sum: number, count: number) {
  if (count <= 0) return 0;
  return Math.max(0, Math.round(sum / count));
}

export function summarizeFriendMetricRows(params: {
  rows: UserMetricAggregate["rows"];
  storedStreak: number;
  now?: number;
}): UserFriendMetrics {
  const now = params.now ?? Date.now();
  const weeklyCutoff = now - WEEK_MS;
  let progressSum = 0;
  let skillsSum = 0;
  let progressCount = 0;
  let masteredVerses = 0;
  let weeklyRepetitions = 0;
  let latestReviewedAt: Date | null = null;

  for (const row of params.rows) {
    const masteryLevel = normalizeProgressValue(row.masteryLevel);
    const repetitions = normalizeProgressValue(row.repetitions);
    const displayStatus = computeDisplayStatus(
      row.status,
      masteryLevel,
      repetitions
    );
    const isProgressStatus =
      displayStatus === VerseStatus.LEARNING ||
      displayStatus === "REVIEW" ||
      displayStatus === "MASTERED";

    if (isProgressStatus) {
      progressSum += toProgressPercent(masteryLevel, repetitions);
      skillsSum += toSkillsPercent(
        row.referenceScore,
        row.incipitScore,
        row.contextScore
      );
      progressCount += 1;

      if (displayStatus === "MASTERED") {
        masteredVerses += 1;
      }

      const reviewedAtTime = row.lastReviewedAt?.getTime() ?? Number.NaN;
      if (!Number.isNaN(reviewedAtTime) && reviewedAtTime >= weeklyCutoff) {
        weeklyRepetitions += 1;
      }
    }

    if (
      row.lastReviewedAt &&
      (!latestReviewedAt ||
        row.lastReviewedAt.getTime() > latestReviewedAt.getTime())
    ) {
      latestReviewedAt = row.lastReviewedAt;
    }
  }

  const dailyStreak = computeActiveDailyStreak({
    storedStreak: params.storedStreak,
    latestReviewedAt,
    now: new Date(now),
  });
  const averageProgressPercent =
    progressCount > 0 ? clampPercent(progressSum / progressCount) : 0;
  const averageSkillsPercent =
    progressCount > 0 ? clampPercent(skillsSum / progressCount) : 0;

  return {
    lastActiveAt: latestReviewedAt ? latestReviewedAt.toISOString() : null,
    masteredVerses,
    weeklyRepetitions,
    dailyStreak,
    averageProgressPercent: computeRatingPercent({
      averageProgressPercent,
      averageSkillsPercent,
      streakDays: dailyStreak,
      weeklyRepetitions,
    }),
  };
}

export class FriendsApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "FriendsApiError";
  }
}

export function buildPublicName(input: {
  telegramId: string;
  name: string | null;
  nickname: string | null;
}): string {
  const name = input.name?.trim();
  if (name) return name;

  const nickname = input.nickname?.trim();
  if (nickname) {
    return nickname.startsWith("@") ? nickname : `@${nickname}`;
  }

  return `Участник #${input.telegramId.slice(-4) || input.telegramId}`;
}

export function parseFriendsListQuery(
  query: ParsedUrlQuery,
  fallbackLimit = DEFAULT_LIST_LIMIT
): FriendsListQuery {
  return {
    search: parseSearch(getSingleQueryValue(query, "search")),
    limit: parseLimit(getSingleQueryValue(query, "limit"), fallbackLimit),
    startWith: parseStartWith(getSingleQueryValue(query, "startWith")),
  };
}

export function parseActivityLimit(query: ParsedUrlQuery): number {
  return parseLimit(getSingleQueryValue(query, "limit"), DEFAULT_ACTIVITY_LIMIT);
}

export async function assertUserExists(telegramId: string): Promise<void> {
  const exists = await userExists(telegramId);
  if (!exists) {
    throw new FriendsApiError(404, "User not found");
  }
}

export async function buildFriendMetricsMap(
  users: UserForFriendList[]
): Promise<Map<string, UserFriendMetrics>> {
  const telegramIds = Array.from(new Set(users.map((user) => user.telegramId)));
  const metrics = new Map<string, UserMetricAggregate>();

  for (const user of users) {
    metrics.set(user.telegramId, {
      rows: [],
    });
  }

  if (telegramIds.length > 0) {
    const rows = await getSocialMetricVerseRows(telegramIds);

    for (const row of rows) {
      const aggregate = metrics.get(row.telegramId);
      if (!aggregate) continue;
      aggregate.rows.push({
        status: row.status,
        masteryLevel: row.masteryLevel,
        repetitions: row.repetitions,
        referenceScore: row.referenceScore,
        incipitScore: row.incipitScore,
        contextScore: row.contextScore,
        lastReviewedAt: row.lastReviewedAt,
      });
    }
  }

  const result = new Map<string, UserFriendMetrics>();
  for (const user of users) {
    result.set(
      user.telegramId,
      summarizeFriendMetricRows({
        rows: metrics.get(user.telegramId)?.rows ?? [],
        storedStreak: user.dailyStreak,
      })
    );
  }

  return result;
}

export function mapUsersToFriendListItems(params: {
  users: UserForFriendList[];
  metricsByTelegramId: Map<string, UserFriendMetrics>;
  friendTelegramIds?: Set<string>;
  forceIsFriend?: boolean;
}): FriendListItemResponse[] {
  const { users, metricsByTelegramId, friendTelegramIds, forceIsFriend = false } =
    params;

  return users.map((user) => {
    const metrics = metricsByTelegramId.get(user.telegramId);
    return {
      telegramId: user.telegramId,
      name: buildPublicName({
        telegramId: user.telegramId,
        name: user.name,
        nickname: user.nickname,
      }),
      avatarUrl: user.avatarUrl ?? null,
      isFriend:
        forceIsFriend || (friendTelegramIds?.has(user.telegramId) ?? false),
      lastActiveAt: metrics?.lastActiveAt ?? null,
      masteredVerses: metrics?.masteredVerses ?? 0,
      weeklyRepetitions: metrics?.weeklyRepetitions ?? 0,
      dailyStreak: metrics?.dailyStreak ?? 0,
      averageProgressPercent: metrics?.averageProgressPercent ?? 0,
    };
  });
}

export function buildFriendsActivityResponse(params: {
  friends: UserForFriendList[];
  metricsByTelegramId: Map<string, UserFriendMetrics>;
  limit: number;
}): DashboardFriendsActivityResponse {
  const now = Date.now();
  const weeklyCutoff = now - WEEK_MS;

  const entries = params.friends
    .map((user) => {
      const metrics = params.metricsByTelegramId.get(user.telegramId);
      return {
        telegramId: user.telegramId,
        name: buildPublicName({
          telegramId: user.telegramId,
          name: user.name,
          nickname: user.nickname,
        }),
        avatarUrl: user.avatarUrl ?? null,
        lastActiveAt: metrics?.lastActiveAt ?? null,
        masteredVerses: metrics?.masteredVerses ?? 0,
        weeklyRepetitions: metrics?.weeklyRepetitions ?? 0,
        dailyStreak: metrics?.dailyStreak ?? 0,
        averageProgressPercent: metrics?.averageProgressPercent ?? 0,
      } satisfies FriendActivityEntryResponse;
    })
    .sort((a, b) => {
      const aLastActive = a.lastActiveAt ? Date.parse(a.lastActiveAt) : Number.NaN;
      const bLastActive = b.lastActiveAt ? Date.parse(b.lastActiveAt) : Number.NaN;
      const aTime = Number.isNaN(aLastActive) ? Number.NEGATIVE_INFINITY : aLastActive;
      const bTime = Number.isNaN(bLastActive) ? Number.NEGATIVE_INFINITY : bLastActive;

      if (aTime !== bTime) return bTime - aTime;
      if (a.weeklyRepetitions !== b.weeklyRepetitions) {
        return b.weeklyRepetitions - a.weeklyRepetitions;
      }
      return a.telegramId.localeCompare(b.telegramId);
    });

  const limitedEntries = entries.slice(0, params.limit);
  const friendsTotal = entries.length;
  const activeLast7Days = entries.filter((entry) => {
    const time = entry.lastActiveAt ? Date.parse(entry.lastActiveAt) : Number.NaN;
    return !Number.isNaN(time) && time >= weeklyCutoff;
  }).length;

  return {
    generatedAt: new Date(now).toISOString(),
    summary: {
      friendsTotal,
      activeLast7Days,
      avgWeeklyRepetitions: roundAverage(
        entries.reduce((sum, entry) => sum + entry.weeklyRepetitions, 0),
        friendsTotal
      ),
      avgStreakDays: roundAverage(
        entries.reduce((sum, entry) => sum + entry.dailyStreak, 0),
        friendsTotal
      ),
      avgProgressPercent: clampPercent(
        friendsTotal > 0
          ? entries.reduce((sum, entry) => sum + entry.averageProgressPercent, 0) /
              friendsTotal
          : 0
      ),
    },
    entries: limitedEntries,
  };
}
