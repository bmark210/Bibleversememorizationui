type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
};

type TelegramUserProfilePhotosResult = {
  total_count: number;
  photos: Array<
    Array<{
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size?: number;
    }>
  >;
};

type TelegramFileResult = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
};

function getTelegramBotToken(): string {
  const token = String(process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  return token;
}

async function callTelegramBotApi<T>(
  method: string,
  searchParams: Record<string, string>
): Promise<T> {
  const token = getTelegramBotToken();
  const url = new URL(`https://api.telegram.org/bot${token}/${method}`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as TelegramApiResponse<T> | null;
  if (!response.ok || !payload?.ok || payload.result == null) {
    const message =
      payload?.description ??
      `Telegram Bot API request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload.result;
}

function normalizeClientAvatarUrl(value?: string | null): string | null {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

export async function fetchTelegramAvatar(
  telegramId: string
): Promise<string | null> {
  const normalizedTelegramId = String(telegramId ?? "").trim();
  if (!normalizedTelegramId) {
    return null;
  }

  const profilePhotos = await callTelegramBotApi<TelegramUserProfilePhotosResult>(
    "getUserProfilePhotos",
    {
      user_id: normalizedTelegramId,
      limit: "1",
    }
  );

  const firstPhotoGroup = profilePhotos.photos[0];
  if (!firstPhotoGroup?.length) {
    return null;
  }

  const bestAvailablePhoto = firstPhotoGroup[firstPhotoGroup.length - 1];
  const fileId = String(bestAvailablePhoto?.file_id ?? "").trim();
  if (!fileId) {
    return null;
  }

  const file = await callTelegramBotApi<TelegramFileResult>("getFile", {
    file_id: fileId,
  });

  const filePath = String(file.file_path ?? "").trim();
  if (!filePath) {
    return null;
  }

  const token = getTelegramBotToken();
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

export async function resolveTelegramAvatarUrl(
  telegramId: string,
  clientAvatarUrl?: string | null
): Promise<string | null> {
  const fallbackAvatarUrl = normalizeClientAvatarUrl(clientAvatarUrl);

  try {
    return await fetchTelegramAvatar(telegramId);
  } catch (error) {
    console.error(`[TelegramAvatar] Failed to refresh avatar for user ${telegramId}:`, error);
    return fallbackAvatarUrl;
  }
}
