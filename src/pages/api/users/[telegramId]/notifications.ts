import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

type UserNotificationSettingsResponse = {
  telegramId: string;
  reminderEnabled: boolean;
  weeklyGoal: number;
  botConnected: boolean;
  botStartLink: string | null;
  openAppUrl: string;
  reminderSchedule: string;
};

type UpdateUserNotificationSettingsPayload = {
  reminderEnabled?: boolean;
  weeklyGoal?: number;
};

const WEEKLY_GOAL_MIN = 1;
const WEEKLY_GOAL_MAX = 500;
const DAILY_REMINDER_SCHEDULE_LABEL = "Ежедневно в 20:00 UTC";

function normalizeBotUsername(value: string | undefined): string | null {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^@+/, "");
  return normalized.length > 0 ? normalized : null;
}

function buildBotStartLink(botUsername: string | undefined): string | null {
  const normalized = normalizeBotUsername(botUsername);
  if (!normalized) return null;
  return `https://t.me/${normalized}?start=app`;
}

function mapUserNotificationResponse(params: {
  telegramId: string;
  reminderEnabled: boolean;
  weeklyGoal: number;
  botChatId: string | null;
  botBlockedAt: Date | null;
}): UserNotificationSettingsResponse {
  return {
    telegramId: params.telegramId,
    reminderEnabled: params.reminderEnabled,
    weeklyGoal: params.weeklyGoal,
    botConnected: Boolean(params.botChatId) && params.botBlockedAt == null,
    botStartLink: buildBotStartLink(process.env.TELEGRAM_BOT_USERNAME),
    openAppUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    reminderSchedule: DAILY_REMINDER_SCHEDULE_LABEL,
  };
}

async function ensureUser(telegramId: string) {
  const fallbackName = `Участник #${telegramId.slice(-4) || telegramId}`;

  return prisma.user.upsert({
    where: { telegramId },
    update: {},
    create: { telegramId, name: fallbackName },
    select: {
      telegramId: true,
      reminderEnabled: true,
      weeklyGoal: true,
      botChatId: true,
      botBlockedAt: true,
    },
  });
}

function parsePayload(req: NextApiRequest): UpdateUserNotificationSettingsPayload {
  return (req.body ?? {}) as UpdateUserNotificationSettingsPayload;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserNotificationSettingsResponse | { error: string; details?: string }>
) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    if (req.method === "GET") {
      const user = await ensureUser(telegramId);
      return res.status(200).json(
        mapUserNotificationResponse({
          telegramId: user.telegramId,
          reminderEnabled: user.reminderEnabled,
          weeklyGoal: user.weeklyGoal,
          botChatId: user.botChatId,
          botBlockedAt: user.botBlockedAt,
        })
      );
    }

    const payload = parsePayload(req);
    const updates: UpdateUserNotificationSettingsPayload = {};

    if (payload.reminderEnabled !== undefined) {
      if (typeof payload.reminderEnabled !== "boolean") {
        return res.status(400).json({ error: "reminderEnabled must be a boolean" });
      }
      updates.reminderEnabled = payload.reminderEnabled;
    }

    if (payload.weeklyGoal !== undefined) {
      if (
        typeof payload.weeklyGoal !== "number" ||
        !Number.isInteger(payload.weeklyGoal) ||
        payload.weeklyGoal < WEEKLY_GOAL_MIN ||
        payload.weeklyGoal > WEEKLY_GOAL_MAX
      ) {
        return res.status(400).json({
          error: `weeklyGoal must be an integer between ${WEEKLY_GOAL_MIN} and ${WEEKLY_GOAL_MAX}`,
        });
      }
      updates.weeklyGoal = payload.weeklyGoal;
    }

    const fallbackName = `Участник #${telegramId.slice(-4) || telegramId}`;
    const user = await prisma.user.upsert({
      where: { telegramId },
      update: updates,
      create: {
        telegramId,
        name: fallbackName,
        ...(updates.reminderEnabled !== undefined ? { reminderEnabled: updates.reminderEnabled } : {}),
        ...(updates.weeklyGoal !== undefined ? { weeklyGoal: updates.weeklyGoal } : {}),
      },
      select: {
        telegramId: true,
        reminderEnabled: true,
        weeklyGoal: true,
        botChatId: true,
        botBlockedAt: true,
      },
    });

    return res.status(200).json(
      mapUserNotificationResponse({
        telegramId: user.telegramId,
        reminderEnabled: user.reminderEnabled,
        weeklyGoal: user.weeklyGoal,
        botChatId: user.botChatId,
        botBlockedAt: user.botBlockedAt,
      })
    );
  } catch (error) {
    console.error("Error handling notifications settings:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
