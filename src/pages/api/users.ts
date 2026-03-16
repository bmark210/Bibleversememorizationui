import type { NextApiRequest, NextApiResponse } from "next";
import { Translation } from "@/generated/prisma";
import { upsertUserByTelegramId, getAllUsers } from "@/modules/users/infrastructure/userRepository";
import { fetchTelegramAvatarUrl } from "@/app/api/lib/telegramAvatar";
import { handleApiError } from "@/shared/errors/apiErrorHandler";
import { getSocialMetricVerseRows } from "@/modules/social/infrastructure/socialRepository";
import { computeSocialUserXpSummary } from "@/shared/social/xp";

type CreateUserPayload = {
  telegramId?: string;
  translation?: string;
  name?: string | null;
  nickname?: string | null;
};

const ALLOWED_TRANSLATIONS: Translation[] = Object.values(Translation);
const TRANSLATION_ALIASES: Record<string, Translation> = {
  RUS_SYN: Translation.SYNOD,
};

const normalizeTranslation = (value?: string): Translation | undefined => {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  const aliasValue = TRANSLATION_ALIASES[normalized.toUpperCase()];
  if (aliasValue) return aliasValue;
  return ALLOWED_TRANSLATIONS.includes(normalized as Translation)
    ? (normalized as Translation)
    : undefined;
};

const normalizeOptionalString = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

function normalizeNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : fallback;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET - получить список всех пользователей
  if (req.method === "GET") {
    try {
      const { limit } = req.query;
      const limitNumber = normalizeNumber(limit, 20);
      
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
      
      const entries = users.slice(0, limitNumber).map((user) => {
        const summary = computeSocialUserXpSummary({
          verses: versesByTelegramId.get(user.telegramId) ?? [],
          storedStreak: user.dailyStreak,
        });
        return {
          telegramId: user.telegramId,
          name: user.name ?? `Участник #${user.telegramId.slice(-4)}`,
          avatarUrl: user.avatarUrl,
          xp: summary.xp,
          dailyStreak: summary.dailyStreak,
        };
      });

      return res.status(200).json({
        generatedAt: new Date().toISOString(),
        totalCount: users.length,
        entries,
      });
    } catch (error) {
      return handleApiError(
        res,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // POST - создать или обновить пользователя
  if (req.method === "POST") {
    try {
      const body = req.body as CreateUserPayload;
      const { telegramId, translation, name, nickname } = body ?? {};
      const translationValue = normalizeTranslation(translation);
      const nameValue = normalizeOptionalString(name);
      const nicknameValue = normalizeOptionalString(nickname);

      if (!telegramId) {
        return res.status(400).json({ error: "telegramId is required" });
      }

      const avatarUrlValue = await fetchTelegramAvatarUrl(telegramId);

      const user = await upsertUserByTelegramId({
        telegramId,
        update: {
          ...(translationValue ? { translation: translationValue } : {}),
          ...(nameValue ? { name: nameValue } : {}),
          ...(nicknameValue ? { nickname: nicknameValue } : {}),
          avatarUrl: avatarUrlValue,
        },
        create: {
          ...(translationValue ? { translation: translationValue } : {}),
          ...(nameValue ? { name: nameValue } : {}),
          ...(nicknameValue ? { nickname: nicknameValue } : {}),
          avatarUrl: avatarUrlValue,
        },
      });

      return res.status(201).json(user);
    } catch (error) {
      return handleApiError(
        res,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
