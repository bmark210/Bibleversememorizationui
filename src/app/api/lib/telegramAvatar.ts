/**
 * Получение аватарки пользователя через Telegram Bot API.
 *
 * Bot API (`getUserProfilePhotos`) — единственный надёжный источник.
 * `photo_url` из Mini App SDK часто приходит `undefined` даже когда
 * у пользователя есть аватарка, поэтому клиентское значение не используется.
 *
 * Ссылки на файлы Telegram действительны ~1 час, но обновляются
 * при каждом входе пользователя в приложение.
 */

// ── Типы Telegram Bot API ───────────────────────────────────────────

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
};

type TelegramPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};

type TelegramUserProfilePhotos = {
  total_count: number;
  photos: TelegramPhotoSize[][];
};

type TelegramFile = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
};

// ── Хелперы ─────────────────────────────────────────────────────────

function getBotToken(): string {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return token;
}

async function botApi<T>(
  method: string,
  params: Record<string, string>,
): Promise<T> {
  const token = getBotToken();
  const url = new URL(`https://api.telegram.org/bot${token}/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const json = (await res.json().catch(() => null)) as TelegramApiResponse<T> | null;

  if (!res.ok || !json?.ok || json.result == null) {
    throw new Error(
      json?.description ?? `Bot API ${method} failed (${res.status})`,
    );
  }
  return json.result;
}

// ── Основная функция ────────────────────────────────────────────────

/**
 * Получает URL текущей аватарки пользователя через Bot API.
 * Возвращает `null` если у пользователя нет аватарки или Bot API недоступен.
 */
export async function fetchTelegramAvatarUrl(
  telegramId: string,
): Promise<string | null> {
  const id = (telegramId ?? "").trim();
  if (!id) return null;

  try {
    // 1. Получаем список фото профиля (берём только последнее)
    const photos = await botApi<TelegramUserProfilePhotos>(
      "getUserProfilePhotos",
      { user_id: id, limit: "1" },
    );

    const group = photos.photos[0];
    if (!group?.length) return null;

    // Берём самый большой размер (последний в массиве)
    const fileId = group[group.length - 1]?.file_id;
    if (!fileId) return null;

    // 2. Получаем file_path для скачивания
    const file = await botApi<TelegramFile>("getFile", { file_id: fileId });
    const filePath = (file.file_path ?? "").trim();
    if (!filePath) return null;

    // 3. Формируем публичный URL
    return `https://api.telegram.org/file/bot${getBotToken()}/${filePath}`;
  } catch (error) {
    console.error(
      `[TelegramAvatar] Не удалось получить аватарку для ${id}:`,
      error,
    );
    return null;
  }
}
