export type TelegramInlineKeyboardButton = {
  text: string;
  web_app?: { url: string };
  url?: string;
};

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard: TelegramInlineKeyboardButton[][];
};

type SendTelegramMessageParams = {
  chatId: string | number;
  text: string;
  replyMarkup?: TelegramInlineKeyboardMarkup;
  disableWebPagePreview?: boolean;
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
};

export class TelegramBotApiError extends Error {
  readonly status: number;
  readonly errorCode?: number;

  constructor(message: string, options: { status: number; errorCode?: number }) {
    super(message);
    this.name = "TelegramBotApiError";
    this.status = options.status;
    this.errorCode = options.errorCode;
  }
}

function getTelegramApiUrl(method: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new TelegramBotApiError("TELEGRAM_BOT_TOKEN is not configured", {
      status: 500,
    });
  }
  return `https://api.telegram.org/bot${token}/${method}`;
}

export function buildOpenAppKeyboard(openAppUrl: string): TelegramInlineKeyboardMarkup | undefined {
  const appUrl = String(openAppUrl ?? "").trim();
  if (!appUrl) return undefined;

  return {
    inline_keyboard: [
      [{ text: "Открыть приложение", web_app: { url: appUrl } }],
      [{ text: "Открыть в браузере", url: appUrl }],
    ],
  };
}

export async function sendTelegramMessage(params: SendTelegramMessageParams) {
  const response = await fetch(getTelegramApiUrl("sendMessage"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: params.chatId,
      text: params.text,
      disable_web_page_preview: params.disableWebPagePreview ?? true,
      ...(params.replyMarkup ? { reply_markup: params.replyMarkup } : {}),
    }),
  });

  const payload = (await response.json().catch(() => null)) as TelegramApiResponse<unknown> | null;
  if (!response.ok || !payload?.ok) {
    const message =
      payload?.description ??
      `Telegram API request failed with status ${response.status}`;
    throw new TelegramBotApiError(message, {
      status: response.status,
      errorCode: payload?.error_code,
    });
  }

  return payload.result;
}

export function isTelegramForbiddenError(error: unknown): boolean {
  if (!(error instanceof TelegramBotApiError)) return false;
  if (error.status === 403 || error.errorCode === 403) return true;

  const message = String(error.message ?? "").toLowerCase();
  return (
    message.includes("forbidden") ||
    message.includes("blocked") ||
    message.includes("bot was blocked")
  );
}
