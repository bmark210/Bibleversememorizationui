import type { NextApiRequest, NextApiResponse } from "next";
import { buildOpenAppKeyboard, sendTelegramMessage } from "@/lib/telegramBot";
import { upsertUserByTelegramId } from "@/modules/users/infrastructure/userRepository";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: {
      id?: number | string;
      first_name?: string;
    };
  };
};

function getSingleHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeCommand(rawText: string): { command: string; payload: string } {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith("/")) return { command: "", payload: "" };

  const [commandToken = "", ...rest] = trimmed.split(/\s+/);
  const command = commandToken.split("@")[0]?.toLowerCase() ?? "";
  return {
    command,
    payload: rest.join(" ").trim(),
  };
}

function buildWelcomeText(firstName: string | undefined) {
  const userName = firstName?.trim() || "друг";

  return [
    `Привет, ${userName}! 🌟`,
    "",
    "Я бот-помощник для приложения Bible Memory 📖",
    "Это игра для запоминания стихов из Библии",
  ].join("\n");
}

function buildOpenText(appUrl: string) {
  return [
    "Открывайте приложение и продолжайте тренировку.",
    appUrl ? "Нажмите кнопку ниже, чтобы открыть приложение." : "Приложение сейчас недоступно.",
  ].join("\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const expectedSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
  if (!expectedSecret) {
    console.error("TELEGRAM_WEBHOOK_SECRET is not configured");
    return res.status(500).json({ error: "Webhook secret is not configured" });
  }

  const receivedSecret = getSingleHeaderValue(
    req.headers["x-telegram-bot-api-secret-token"]
  );
  if (receivedSecret !== expectedSecret) {
    console.warn("Unauthorized telegram webhook request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const update = (req.body ?? {}) as TelegramUpdate;
    const message = update.message;
    const text = message?.text?.trim() ?? "";
    if (!message || !text.startsWith("/")) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const chatIdRaw = message.chat?.id;
    const fromIdRaw = message.from?.id;
    if (chatIdRaw == null || fromIdRaw == null) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const chatId = String(chatIdRaw);
    const telegramId = String(fromIdRaw);
    const firstName = message.from?.first_name?.trim() || null;
    const fallbackName = firstName || `Участник #${telegramId.slice(-4) || telegramId}`;
    const openAppUrl = String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
    const replyMarkup = buildOpenAppKeyboard(openAppUrl);

    const { command } = normalizeCommand(text);

    if (command === "/start") {
      await upsertUserByTelegramId({
        telegramId,
        update: {
          ...(firstName ? { name: firstName } : {}),
        },
        create: {
          name: fallbackName,
        },
      });

      await sendTelegramMessage({
        chatId,
        text: buildWelcomeText(firstName ?? undefined),
        replyMarkup,
      });

      return res.status(200).json({ ok: true, action: "start" });
    }

    if (command === "/open") {
      await sendTelegramMessage({
        chatId,
        text: buildOpenText(openAppUrl),
        replyMarkup,
      });
      return res.status(200).json({ ok: true, action: "open" });
    }

    return res.status(200).json({ ok: true, skipped: true });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
