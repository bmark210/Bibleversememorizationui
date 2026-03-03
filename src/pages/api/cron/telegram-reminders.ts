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

const REMINDER_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const REMINDER_WINDOW_MINUTES = 15;

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getSingleHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseReminderMinutes(reminderTime: string): number | null {
  if (!REMINDER_TIME_REGEX.test(reminderTime)) return null;
  const [hours, minutes] = reminderTime.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);

    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const year = Number(byType.year);
    const month = Number(byType.month);
    const day = Number(byType.day);
    const hour = Number(byType.hour);
    const minute = Number(byType.minute);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      !Number.isFinite(hour) ||
      !Number.isFinite(minute)
    ) {
      return null;
    }

    return { year, month, day, hour, minute };
  } catch {
    return null;
  }
}

function isWithinReminderWindow(now: Date, reminderTime: string, timeZone: string): boolean {
  const reminderMinutes = parseReminderMinutes(reminderTime);
  if (reminderMinutes == null) return false;

  const zonedNow = getZonedDateParts(now, timeZone);
  if (!zonedNow) return false;

  const currentMinutes = zonedNow.hour * 60 + zonedNow.minute;
  const diff = currentMinutes - reminderMinutes;
  return diff >= 0 && diff < REMINDER_WINDOW_MINUTES;
}

function isSameLocalDay(a: Date, b: Date, timeZone: string): boolean {
  const aParts = getZonedDateParts(a, timeZone);
  const bParts = getZonedDateParts(b, timeZone);
  if (!aParts || !bParts) return false;

  return (
    aParts.year === bParts.year &&
    aParts.month === bParts.month &&
    aParts.day === bParts.day
  );
}

function formatDueReminderText(dueCount: number, appUrl: string): string {
  const suffix =
    dueCount % 10 === 1 && dueCount % 100 !== 11
      ? "стих"
      : dueCount % 10 >= 2 &&
          dueCount % 10 <= 4 &&
          (dueCount % 100 < 10 || dueCount % 100 >= 20)
        ? "стиха"
        : "стихов";

  const appLine = appUrl
    ? `Откройте приложение: ${appUrl}`
    : "Откройте приложение и продолжайте тренировку.";

  return [`Напоминание: к повторению ${dueCount} ${suffix}.`, appLine].join("\n");
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
        botChatId: true,
        reminderTime: true,
        reminderTimezone: true,
        lastReminderSentAt: true,
      },
    });

    const results: Array<{
      telegramId: string;
      status: "sent" | "skip" | "error";
      reason?: string;
      dueCount?: number;
    }> = [];

    for (const user of candidates) {
      const chatId = user.botChatId;
      if (!chatId) {
        results.push({ telegramId: user.telegramId, status: "skip", reason: "no-chat-id" });
        continue;
      }

      const inWindow = isWithinReminderWindow(now, user.reminderTime, user.reminderTimezone);
      if (!inWindow) {
        results.push({ telegramId: user.telegramId, status: "skip", reason: "outside-window" });
        continue;
      }

      if (
        user.lastReminderSentAt &&
        isSameLocalDay(user.lastReminderSentAt, now, user.reminderTimezone)
      ) {
        results.push({ telegramId: user.telegramId, status: "skip", reason: "already-sent-today" });
        continue;
      }

      const dueCount = await prisma.userVerse.count({
        where: {
          telegramId: user.telegramId,
          status: VerseStatus.LEARNING,
          masteryLevel: { gte: TRAINING_STAGE_MASTERY_MAX },
          repetitions: { lt: REPEAT_THRESHOLD_FOR_MASTERED },
          OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
        },
      });

      if (dueCount <= 0) {
        results.push({
          telegramId: user.telegramId,
          status: "skip",
          reason: "no-due-verses",
          dueCount,
        });
        continue;
      }

      if (dryRun) {
        results.push({
          telegramId: user.telegramId,
          status: "sent",
          reason: "dry-run",
          dueCount,
        });
        continue;
      }

      try {
        await sendTelegramMessage({
          chatId,
          text: formatDueReminderText(dueCount, openAppUrl),
          replyMarkup,
        });

        await prisma.user.update({
          where: { telegramId: user.telegramId },
          data: { lastReminderSentAt: now },
        });

        results.push({ telegramId: user.telegramId, status: "sent", dueCount });
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
        });
      }
    }

    const sent = results.filter((entry) => entry.status === "sent").length;
    const skipped = results.filter((entry) => entry.status === "skip").length;
    const errors = results.filter((entry) => entry.status === "error").length;

    return res.status(200).json({
      ok: true,
      dryRun,
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
