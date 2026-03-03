import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { VerseStatus } from "@/generated/prisma";
import {
  buildOpenAppKeyboard,
  isTelegramForbiddenError,
  sendTelegramMessage,
} from "@/lib/telegramBot";
import {
  REPEAT_THRESHOLD_FOR_MASTERED,
  TRAINING_STAGE_MASTERY_MAX,
} from "@/shared/training/constants";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getSingleHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getUtcDayStart(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function getUtcDayEnd(value: Date): Date {
  return new Date(getUtcDayStart(value).getTime() + DAY_IN_MS);
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return getUtcDayStart(a).getTime() === getUtcDayStart(b).getTime();
}

function pluralRu(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function buildGentleEncouragement(inactiveDays: number): string {
  if (inactiveDays >= 30) {
    return "Господь милостив. Даже маленький шаг сегодня может стать началом новой доброй привычки.";
  }
  if (inactiveDays >= 14) {
    return "Не переживайте из-за паузы. Начните с одного стиха и двигайтесь спокойно, шаг за шагом.";
  }
  if (inactiveDays >= 7) {
    return "Небольшая тренировка сегодня поможет вернуть ритм и радость от Слова.";
  }
  return "Даже 5 минут повторения сегодня укрепят память и внимание к Писанию.";
}

function buildReminderText(params: {
  userName: string;
  inactiveDays: number;
  dueCount: number;
  weeklyGoal: number;
  dailyStreak: number;
  appUrl: string;
}) {
  const dueLabel = pluralRu(params.dueCount, "стих", "стиха", "стихов");
  const dayLabel = pluralRu(params.inactiveDays, "день", "дня", "дней");
  const appLine = params.appUrl
    ? "Откройте приложение кнопкой ниже."
    : "Откройте приложение и продолжайте тренировку.";

  const dueLine =
    params.dueCount > 0
      ? `Сегодня к повторению: ${params.dueCount} ${dueLabel}.`
      : "Сегодня нет просроченных повторений, но короткая тренировка поможет держать темп.";

  return [
    `Привет, ${params.userName}!`,
    "",
    `Вы не были активны ${params.inactiveDays} ${dayLabel}.`,
    dueLine,
    `Серия: ${params.dailyStreak} дн. Цель недели: ${params.weeklyGoal} повторений.`,
    buildGentleEncouragement(params.inactiveDays),
    appLine,
  ].join("\n");
}

function isAuthorizedCronRequest(req: NextApiRequest): { ok: boolean; reason?: string } {
  const cronSecret = String(process.env.CRON_SECRET ?? "").trim();
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "CRON_SECRET is not configured in production" };
    }
    return { ok: true };
  }

  const authHeader = getSingleHeaderValue(req.headers.authorization);
  if (authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false, reason: "Unauthorized" };
  }

  return { ok: true };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const auth = isAuthorizedCronRequest(req);
  if (!auth.ok) {
    const status = auth.reason === "Unauthorized" ? 401 : 500;
    return res.status(status).json({ error: auth.reason });
  }

  const dryRun = req.query.dryRun === "1";
  const now = new Date();
  const dayStartUtc = getUtcDayStart(now);
  const dayEndUtc = getUtcDayEnd(now);

  const openAppUrl = String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  const replyMarkup = buildOpenAppKeyboard(openAppUrl);

  try {
    const candidates = await prisma.user.findMany({
      where: {
        reminderEnabled: true,
        botChatId: { not: null },
        botBlockedAt: null,
      },
      select: {
        telegramId: true,
        name: true,
        createdAt: true,
        botChatId: true,
        weeklyGoal: true,
        dailyStreak: true,
        lastReminderSentAt: true,
      },
    });

    const results: Array<{
      telegramId: string;
      status: "sent" | "skip" | "error";
      reason?: string;
      dueCount?: number;
      inactiveDays?: number;
    }> = [];

    for (const user of candidates) {
      if (!user.botChatId) {
        results.push({ telegramId: user.telegramId, status: "skip", reason: "no-chat-id" });
        continue;
      }

      if (user.lastReminderSentAt && isSameUtcDay(user.lastReminderSentAt, now)) {
        results.push({
          telegramId: user.telegramId,
          status: "skip",
          reason: "already-sent-today",
        });
        continue;
      }

      const hasActivityToday = await prisma.userVerse.findFirst({
        where: {
          telegramId: user.telegramId,
          OR: [
            { updatedAt: { gte: dayStartUtc, lt: dayEndUtc } },
            { lastReviewedAt: { gte: dayStartUtc, lt: dayEndUtc } },
          ],
        },
        select: { id: true },
      });

      if (hasActivityToday) {
        results.push({
          telegramId: user.telegramId,
          status: "skip",
          reason: "active-today",
        });
        continue;
      }

      const [latestActivity, dueCount] = await Promise.all([
        prisma.userVerse.findFirst({
          where: { telegramId: user.telegramId },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.userVerse.count({
          where: {
            telegramId: user.telegramId,
            status: VerseStatus.LEARNING,
            masteryLevel: { gte: TRAINING_STAGE_MASTERY_MAX },
            repetitions: { lt: REPEAT_THRESHOLD_FOR_MASTERED },
            OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
          },
        }),
      ]);

      const lastActivityDate = latestActivity?.updatedAt ?? user.createdAt;
      const inactiveDays = lastActivityDate
        ? Math.max(
            1,
            Math.floor((dayStartUtc.getTime() - getUtcDayStart(lastActivityDate).getTime()) / DAY_IN_MS)
          )
        : 1;

      const userName = user.name?.trim() || "друг";
      const messageText = buildReminderText({
        userName,
        inactiveDays,
        dueCount,
        weeklyGoal: user.weeklyGoal,
        dailyStreak: Math.max(0, Math.round(Number(user.dailyStreak ?? 0))),
        appUrl: openAppUrl,
      });

      if (dryRun) {
        results.push({
          telegramId: user.telegramId,
          status: "sent",
          reason: "dry-run",
          dueCount,
          inactiveDays,
        });
        continue;
      }

      try {
        await sendTelegramMessage({
          chatId: user.botChatId,
          text: messageText,
          replyMarkup,
        });

        await prisma.user.update({
          where: { telegramId: user.telegramId },
          data: { lastReminderSentAt: now },
        });

        results.push({
          telegramId: user.telegramId,
          status: "sent",
          dueCount,
          inactiveDays,
        });
      } catch (error) {
        if (isTelegramForbiddenError(error)) {
          await prisma.user.update({
            where: { telegramId: user.telegramId },
            data: { botBlockedAt: now },
          });

          results.push({
            telegramId: user.telegramId,
            status: "error",
            reason: "bot-blocked",
            dueCount,
            inactiveDays,
          });
          continue;
        }

        console.error("Failed to send telegram reminder", {
          telegramId: user.telegramId,
          error,
        });
        results.push({
          telegramId: user.telegramId,
          status: "error",
          reason: "send-failed",
          dueCount,
          inactiveDays,
        });
      }
    }

    const sent = results.filter((entry) => entry.status === "sent").length;
    const skipped = results.filter((entry) => entry.status === "skip").length;
    const errors = results.filter((entry) => entry.status === "error").length;

    return res.status(200).json({
      ok: true,
      dryRun,
      schedule: "daily-18:00-utc",
      processed: results.length,
      sent,
      skipped,
      errors,
      results,
    });
  } catch (error) {
    console.error("Error in telegram reminders cron:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
