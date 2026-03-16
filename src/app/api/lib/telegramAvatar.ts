/**
 * Формирует URL аватарки пользователя через внутренний прокси.
 *
 * Вместо хранения сырого URL Bot API (который истекает через ~1 час и
 * содержит bot token), храним ссылку на прокси `/api/avatar/{telegramId}`.
 * Прокси сам обращается к Bot API и проксирует изображение с кэшем.
 *
 * Всегда возвращает URL — даже если у пользователя нет аватарки.
 * Прокси вернёт 404, а Radix AvatarFallback покажет инициалы.
 */
export function getTelegramAvatarProxyUrl(telegramId: string): string | null {
  const id = (telegramId ?? "").trim();
  if (!id || !/^\d+$/.test(id)) return null;
  return `/api/avatar/${id}`;
}
