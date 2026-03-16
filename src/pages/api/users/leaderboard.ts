import type { NextApiRequest, NextApiResponse } from "next";
import { getSocialMetricVerseRows } from "@/modules/social/infrastructure/socialRepository";
import { getAllUsers } from "@/modules/users/infrastructure/userRepository";
import { computeSocialUserXpSummary } from "@/shared/social/xp";
import { getTelegramAvatarProxyUrl } from "@/app/api/lib/telegramAvatar";

type LeaderboardEntry = {
  rank: number;
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
  streakDays: number;
  weeklyRepetitions: number;
  isCurrentUser: boolean;
};

type CurrentUserLeaderboardSnapshot = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
  rank: number | null;
  xp: number;
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
  xp: number;
  masteredVerses: number;
  streakDays: number;
  weeklyRepetitions: number;
  rankable: boolean;
};

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 25;

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

    const users = await getAllUsers();
    const metricVerses = await getSocialMetricVerseRows(
      users.map((user) => user.telegramId)
    );

    const versesByTelegramId = new Map<string, typeof metricVerses>();
    for (const verse of metricVerses) {
      const group = versesByTelegramId.get(verse.telegramId) ?? [];
      group.push(verse);
      versesByTelegramId.set(verse.telegramId, group);
    }

    const participants: ComputedParticipant[] = users.map((user) => {
      const summary = computeSocialUserXpSummary({
        verses: versesByTelegramId.get(user.telegramId) ?? [],
        storedStreak: user.dailyStreak,
      });

      return {
        telegramId: user.telegramId,
        name: buildPublicName({
          telegramId: user.telegramId,
          name: user.name,
          nickname: user.nickname,
        }),
        avatarUrl: getTelegramAvatarProxyUrl(user.telegramId),
        xp: summary.xp,
        masteredVerses: summary.masteredVerses,
        streakDays: summary.dailyStreak,
        weeklyRepetitions: summary.weeklyRepetitions,
        rankable: summary.rankable,
      };
    });

    const rankedParticipants = participants
      .filter((participant) => participant.rankable)
      .sort((left, right) => {
        if (left.xp !== right.xp) return right.xp - left.xp;
        if (left.masteredVerses !== right.masteredVerses) {
          return right.masteredVerses - left.masteredVerses;
        }
        if (left.weeklyRepetitions !== right.weeklyRepetitions) {
          return right.weeklyRepetitions - left.weeklyRepetitions;
        }
        if (left.streakDays !== right.streakDays) {
          return right.streakDays - left.streakDays;
        }
        return left.telegramId.localeCompare(right.telegramId);
      });

    const rankedEntries: LeaderboardEntry[] = rankedParticipants.map(
      (participant, index) => ({
        rank: index + 1,
        telegramId: participant.telegramId,
        name: participant.name,
        avatarUrl: participant.avatarUrl,
        xp: participant.xp,
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
            xp: currentParticipant.xp,
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
