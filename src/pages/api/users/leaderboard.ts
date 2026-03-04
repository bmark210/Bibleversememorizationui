import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { VerseStatus } from "@/generated/prisma";
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import { computeActiveDailyStreak } from "@/shared/training/dailyStreak";
import {
  computeDisplayStatus,
  normalizeProgressValue,
} from "./[telegramId]/verses/verseCard.types";

type LeaderboardEntry = {
  rank: number;
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  streakDays: number;
  weeklyRepetitions: number;
  isCurrentUser: boolean;
};

type CurrentUserLeaderboardSnapshot = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  rank: number | null;
  score: number;
  streakDays: number;
  weeklyRepetitions: number;
};

type LeaderboardResponse = {
  generatedAt: string;
  totalParticipants: number;
  entries: LeaderboardEntry[];
  currentUser: CurrentUserLeaderboardSnapshot | null;
};

type ComputedParticipant = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  streakDays: number;
  weeklyRepetitions: number;
  hasActivity: boolean;
};

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 25;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKLY_REPETITIONS_FOR_MAX_SCORE = 35;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseLimit(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, parsed));
}

function parseTelegramId(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildFallbackName(telegramId: string): string {
  const suffix = telegramId.slice(-4);
  return `Участник #${suffix || telegramId}`;
}

function buildPublicName(input: {
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

  return buildFallbackName(input.telegramId);
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

function computeLeaderboardScore(params: {
  averageProgressPercent: number;
  streakDays: number;
  weeklyRepetitions: number;
}): number {
  const streakScore = Math.min(100, params.streakDays * 4);
  const weeklyScore = clampPercent(
    (params.weeklyRepetitions / WEEKLY_REPETITIONS_FOR_MAX_SCORE) * 100
  );
  const rawScore =
    params.averageProgressPercent * 0.65 +
    streakScore * 0.2 +
    weeklyScore * 0.15;
  return clampPercent(rawScore);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaderboardResponse | { error: string; details?: string }>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const limit = parseLimit(req.query.limit);
    const currentTelegramId = parseTelegramId(req.query.telegramId);
    const weeklyCutoffDate = new Date(Date.now() - WEEK_MS);

    const [users, userVerses, weeklyActivityRows] = await Promise.all([
      prisma.user.findMany({
        select: {
          telegramId: true,
          name: true,
          nickname: true,
          avatarUrl: true,
          dailyStreak: true,
        },
      }),
      prisma.userVerse.findMany({
        select: {
          telegramId: true,
          status: true,
          masteryLevel: true,
          repetitions: true,
          lastReviewedAt: true,
        },
      }),
      prisma.trainingEvent.groupBy({
        by: ["telegramId"],
        where: {
          reviewedAt: {
            gte: weeklyCutoffDate,
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const weeklyRepetitionsByTelegramId = new Map<string, number>(
      weeklyActivityRows.map((row) => [row.telegramId, row._count._all])
    );

    const versesByTelegramId = new Map<
      string,
      Array<{
        status: VerseStatus;
        masteryLevel: number;
        repetitions: number;
        lastReviewedAt: Date | null;
      }>
    >();

    for (const verse of userVerses) {
      const group = versesByTelegramId.get(verse.telegramId) ?? [];
      group.push(verse);
      versesByTelegramId.set(verse.telegramId, group);
    }

    const participants: ComputedParticipant[] = users.map((user) => {
      const verses = versesByTelegramId.get(user.telegramId) ?? [];
      let progressSum = 0;
      let progressCount = 0;
      const weeklyRepetitions =
        weeklyRepetitionsByTelegramId.get(user.telegramId) ?? 0;
      let latestReviewedAt: Date | null = null;

      for (const verse of verses) {
        const masteryLevel = normalizeProgressValue(verse.masteryLevel);
        const repetitions = normalizeProgressValue(verse.repetitions);
        const displayStatus = computeDisplayStatus(
          verse.status,
          masteryLevel,
          repetitions
        );

        if (
          displayStatus === VerseStatus.LEARNING ||
          displayStatus === "REVIEW" ||
          displayStatus === "MASTERED"
        ) {
          progressSum += toProgressPercent(masteryLevel, repetitions);
          progressCount += 1;
        }

        if (
          verse.lastReviewedAt &&
          (!latestReviewedAt || verse.lastReviewedAt.getTime() > latestReviewedAt.getTime())
        ) {
          latestReviewedAt = verse.lastReviewedAt;
        }
      }

      const streakDays = computeActiveDailyStreak({
        storedStreak: user.dailyStreak,
        latestReviewedAt,
      });
      const averageProgressPercent =
        progressCount > 0 ? clampPercent(progressSum / progressCount) : 0;
      const score = computeLeaderboardScore({
        averageProgressPercent,
        streakDays,
        weeklyRepetitions,
      });
      // Keep leaderboard focused on recent activity, not historical progress.
      const hasActivity = weeklyRepetitions > 0 || streakDays > 0;

      return {
        telegramId: user.telegramId,
        name: buildPublicName({
          telegramId: user.telegramId,
          name: user.name,
          nickname: user.nickname,
        }),
        avatarUrl: user.avatarUrl ?? null,
        score,
        streakDays,
        weeklyRepetitions,
        hasActivity,
      };
    });

    const rankedParticipants = participants
      .filter((participant) => participant.hasActivity)
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        if (a.weeklyRepetitions !== b.weeklyRepetitions) {
          return b.weeklyRepetitions - a.weeklyRepetitions;
        }
        if (a.streakDays !== b.streakDays) return b.streakDays - a.streakDays;
        return a.telegramId.localeCompare(b.telegramId);
      });

    const rankedEntries: LeaderboardEntry[] = rankedParticipants.map(
      (participant, index) => ({
        rank: index + 1,
        telegramId: participant.telegramId,
        name: participant.name,
        avatarUrl: participant.avatarUrl,
        score: participant.score,
        streakDays: participant.streakDays,
        weeklyRepetitions: participant.weeklyRepetitions,
        isCurrentUser:
          currentTelegramId != null &&
          participant.telegramId === currentTelegramId,
      })
    );

    const entries = rankedEntries.slice(0, limit);
    const currentParticipant = currentTelegramId
      ? participants.find(
          (participant) => participant.telegramId === currentTelegramId
        ) ?? null
      : null;
    const currentRankedEntry = currentTelegramId
      ? rankedEntries.find((entry) => entry.telegramId === currentTelegramId) ??
        null
      : null;

    const currentUser =
      currentParticipant != null
        ? {
            telegramId: currentParticipant.telegramId,
            name: currentParticipant.name,
            avatarUrl: currentParticipant.avatarUrl,
            rank: currentRankedEntry?.rank ?? null,
            score: currentParticipant.score,
            streakDays: currentParticipant.streakDays,
            weeklyRepetitions: currentParticipant.weeklyRepetitions,
          }
        : null;

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      totalParticipants: rankedEntries.length,
      entries,
      currentUser,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
