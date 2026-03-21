/**
 * Локальная отладка UI «как в Telegram fullscreen» в браузере без WebApp.
 *
 * Включение (любой вариант):
 * - `.env.local`: `NEXT_PUBLIC_DEV_EMULATE_TELEGRAM_FULLSCREEN=true` (пересборка dev-сервера)
 * - консоль: `localStorage.setItem('bible-memory.devTelegramFullscreen','1'); location.reload()`
 *
 * Выключить: удалить ключ или `= '0'`, перезагрузить страницу.
 *
 * При `npm run dev` переключатель в профиле сам включает UI полного экрана (без Telegram WebApp).
 * Доп. флаг `bible-memory.devTelegramFullscreen` нужен только для прод-сборки в браузере.
 */
export const DEV_TELEGRAM_FULLSCREEN_EMULATION_STORAGE_KEY =
  "bible-memory.devTelegramFullscreen";

export function isDevTelegramFullscreenEmulationEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  const fromEnv = process.env.NEXT_PUBLIC_DEV_EMULATE_TELEGRAM_FULLSCREEN;
  if (fromEnv === "1" || fromEnv === "true") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(DEV_TELEGRAM_FULLSCREEN_EMULATION_STORAGE_KEY) ===
      "1"
    );
  } catch {
    return false;
  }
}
