import type { NextApiRequest, NextApiResponse } from "next";
import { getUserByTelegramId } from "@/modules/users/infrastructure/userRepository";

/**
 * GET /api/avatar/:telegramId
 *
 * Прокси для аватарок Telegram. Приоритет источников:
 * 1. Bot API `getUserProfilePhotos` — работает для пользователей с открытым фото
 * 2. DB fallback (`avatarUrl`) — CDN-ссылка из `initDataUnsafe.user.photo_url`,
 *    сохранённая при инициализации. Работает даже если пользователь скрыл фото от ботов.
 *
 * Кэширует на 1 час (max-age=3600).
 */

// ── Типы Bot API ────────────────────────────────────────────────────

type TelegramApiResponse<T> = { ok: boolean; result?: T };

type TelegramPhotoSize = {
  file_id: string;
  width: number;
  height: number;
};

type TelegramUserProfilePhotos = {
  total_count: number;
  photos: TelegramPhotoSize[][];
};

type TelegramFile = { file_path?: string };

// ── Хелперы Bot API ─────────────────────────────────────────────────

function getBotToken(): string {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return token;
}

async function botApi<T>(
  method: string,
  params: Record<string, string>,
): Promise<T | null> {
  const token = getBotToken();
  const url = new URL(`https://api.telegram.org/bot${token}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!res.ok) return null;

  const json = (await res.json().catch(() => null)) as TelegramApiResponse<T> | null;
  return json?.ok ? (json.result ?? null) : null;
}

// ── Получение изображения через Bot API ─────────────────────────────

async function fetchBotApiImage(
  telegramId: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const photos = await botApi<TelegramUserProfilePhotos>(
    "getUserProfilePhotos",
    { user_id: telegramId, limit: "1" },
  );

  const group = photos?.photos?.[0];
  if (!group?.length) return null;

  const fileId = group[group.length - 1]?.file_id;
  if (!fileId) return null;

  const file = await botApi<TelegramFile>("getFile", { file_id: fileId });
  const filePath = (file?.file_path ?? "").trim();
  if (!filePath) return null;

  const token = getBotToken();
  const imageRes = await fetch(
    `https://api.telegram.org/file/bot${token}/${filePath}`,
  );
  if (!imageRes.ok) return null;

  return {
    buffer: Buffer.from(await imageRes.arrayBuffer()),
    contentType: imageRes.headers.get("content-type") ?? "image/jpeg",
  };
}

// ── Fallback: получение через сохранённый photo_url из БД ───────────

async function fetchDbFallbackImage(
  telegramId: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const user = await getUserByTelegramId(telegramId);
  const storedUrl = (user?.avatarUrl ?? "").trim();
  if (!storedUrl) return null;

  // Не редиректим на свой же прокси-URL
  if (storedUrl.startsWith("/api/avatar/")) return null;

  try {
    const imageRes = await fetch(storedUrl);
    if (!imageRes.ok) return null;

    return {
      buffer: Buffer.from(await imageRes.arrayBuffer()),
      contentType: imageRes.headers.get("content-type") ?? "image/jpeg",
    };
  } catch {
    return null;
  }
}

// ── Handler ─────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const telegramId = String(req.query.telegramId ?? "").trim();
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return res.status(400).json({ error: "Invalid telegramId" });
  }

  try {
    // 1. Пробуем Bot API (работает если фото открыто для ботов)
    const botImage = await fetchBotApiImage(telegramId);

    if (botImage) {
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.setHeader("Content-Type", botImage.contentType);
      return res.status(200).end(botImage.buffer);
    }

    // 2. Fallback: photo_url из initDataUnsafe, сохранённый в БД
    const dbImage = await fetchDbFallbackImage(telegramId);

    if (dbImage) {
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.setHeader("Content-Type", dbImage.contentType);
      return res.status(200).end(dbImage.buffer);
    }

    // 3. Нет аватарки — AvatarFallback покажет инициалы
    return res.status(404).json({ error: "No avatar available" });
  } catch (error) {
    console.error(`[AvatarProxy] Error for ${telegramId}:`, error);
    return res.status(500).json({ error: "Internal error" });
  }
}
