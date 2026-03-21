"use client";

import { create } from "zustand";
import { isDevTelegramFullscreenEmulationEnabled } from "@/app/lib/devTelegramFullscreen";
import { getTelegramWebApp } from "@/app/lib/telegramWebApp";

const TELEGRAM_FULLSCREEN_PREFERENCE_STORAGE_KEY =
  "telegram.fullscreen-preference";

type TelegramUiRuntimeState = {
  isTelegramMiniApp: boolean;
  isTelegramFullscreen: boolean;
  canToggleTelegramFullscreen: boolean;
  prefersTelegramFullscreen: boolean;
};

type TelegramUiStore = TelegramUiRuntimeState & {
  hydrateTelegramFullscreenPreference: () => boolean;
  setTelegramRuntime: (state: Partial<TelegramUiRuntimeState>) => void;
  resetTelegramRuntime: () => void;
  setTelegramFullscreenPreference: (enabled: boolean) => void;
  setTelegramFullscreen: (enabled: boolean) => void;
};

const DEFAULT_TELEGRAM_UI_STATE: TelegramUiRuntimeState = {
  isTelegramMiniApp: false,
  isTelegramFullscreen: false,
  canToggleTelegramFullscreen: false,
  prefersTelegramFullscreen: false,
};

function readStoredTelegramFullscreenPreference(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return (
      window.localStorage.getItem(TELEGRAM_FULLSCREEN_PREFERENCE_STORAGE_KEY) ===
      "1"
    );
  } catch {
    return false;
  }
}

function writeStoredTelegramFullscreenPreference(enabled: boolean) {
  if (typeof window === "undefined") return;

  try {
    if (enabled) {
      window.localStorage.setItem(
        TELEGRAM_FULLSCREEN_PREFERENCE_STORAGE_KEY,
        "1"
      );
      return;
    }

    window.localStorage.removeItem(TELEGRAM_FULLSCREEN_PREFERENCE_STORAGE_KEY);
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

export const useTelegramUiStore = create<TelegramUiStore>((set) => ({
  ...DEFAULT_TELEGRAM_UI_STATE,
  hydrateTelegramFullscreenPreference: () => {
    const prefersTelegramFullscreen = readStoredTelegramFullscreenPreference();
    set({ prefersTelegramFullscreen });
    return prefersTelegramFullscreen;
  },
  setTelegramRuntime: (state) =>
    set((current) => ({
      ...current,
      ...state,
    })),
  resetTelegramRuntime: () =>
    set((current) => ({
      ...DEFAULT_TELEGRAM_UI_STATE,
      prefersTelegramFullscreen: current.prefersTelegramFullscreen,
    })),
  setTelegramFullscreenPreference: (enabled) => {
    writeStoredTelegramFullscreenPreference(enabled);
    set({ prefersTelegramFullscreen: enabled });
  },
  setTelegramFullscreen: (enabled) => set({ isTelegramFullscreen: enabled }),
}));

/**
 * Единый источник для UI: нативный полный экран Telegram ИЛИ пользовательская настройка
 * (нужно для клиентов без requestFullscreen / WebAppMethodUnsupported, напр. Bot API 6.0).
 */
export function syncTelegramFullscreenFromWebApp() {
  const store = useTelegramUiStore.getState();
  const webApp = getTelegramWebApp();
  const { prefersTelegramFullscreen } = store;

  if (!webApp) {
    const mirrorPrefersInUi =
      process.env.NODE_ENV === "development" ||
      isDevTelegramFullscreenEmulationEnabled();
    store.setTelegramFullscreen(
      mirrorPrefersInUi ? prefersTelegramFullscreen : false,
    );
    return;
  }

  const native = Boolean(webApp.isFullscreen);
  store.setTelegramFullscreen(native || prefersTelegramFullscreen);
}

export function applyTelegramFullscreenPreference(enabled: boolean) {
  const store = useTelegramUiStore.getState();
  store.setTelegramFullscreenPreference(enabled);

  const webApp = getTelegramWebApp();
  if (webApp) {
    try {
      if (enabled) {
        if (typeof webApp.requestFullscreen === "function") {
          webApp.requestFullscreen();
        }
      } else if (typeof webApp.exitFullscreen === "function") {
        webApp.exitFullscreen();
      }
    } catch {
      // Telegram 6.x и др.: метод есть, но бросает WebAppMethodUnsupported — оставляем UI по prefers*
    }
  }

  queueMicrotask(() => {
    syncTelegramFullscreenFromWebApp();
  });
}
