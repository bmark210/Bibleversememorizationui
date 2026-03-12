"use client";

import { create } from "zustand";
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

export function applyTelegramFullscreenPreference(enabled: boolean) {
  const store = useTelegramUiStore.getState();
  store.setTelegramFullscreenPreference(enabled);

  const webApp = getTelegramWebApp();
  if (!webApp) return;

  try {
    if (enabled) {
      webApp.requestFullscreen?.();
    } else {
      webApp.exitFullscreen?.();
    }
  } catch (error) {
    console.error("Не удалось применить fullscreen-настройку Telegram:", error);
  }

  window.setTimeout(() => {
    useTelegramUiStore
      .getState()
      .setTelegramFullscreen(Boolean(webApp.isFullscreen));
  }, 0);
}
