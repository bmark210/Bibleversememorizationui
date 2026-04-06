"use client";

import { create } from "zustand";

type TelegramUiRuntimeState = {
  isTelegramMiniApp: boolean;
  isTelegramFullscreen: boolean;
};

type TelegramUiStore = TelegramUiRuntimeState & {
  setTelegramRuntime: (state: Partial<TelegramUiRuntimeState>) => void;
  resetTelegramRuntime: () => void;
  setTelegramFullscreen: (enabled: boolean) => void;
};

const DEFAULT_TELEGRAM_UI_STATE: TelegramUiRuntimeState = {
  isTelegramMiniApp: false,
  isTelegramFullscreen: true,
};

export const useTelegramUiStore = create<TelegramUiStore>((set) => ({
  ...DEFAULT_TELEGRAM_UI_STATE,
  setTelegramRuntime: (state) =>
    set((current) => ({
      ...current,
      ...state,
    })),
  resetTelegramRuntime: () => set(DEFAULT_TELEGRAM_UI_STATE),
  setTelegramFullscreen: (enabled) => set({ isTelegramFullscreen: enabled }),
}));

export function syncTelegramFullscreenFromWebApp() {
  useTelegramUiStore.getState().setTelegramFullscreen(true);
}
