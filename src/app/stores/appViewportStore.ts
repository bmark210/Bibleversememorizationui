"use client";

import { create } from "zustand";

type AppViewportRuntimeState = {
  hasEditableFocus: boolean;
  isKeyboardOpen: boolean;
  keyboardOffset: number;
  stableViewportHeight: number;
  visibleViewportHeight: number;
};

type AppViewportStore = AppViewportRuntimeState & {
  resetViewportRuntime: () => void;
  setViewportRuntime: (state: Partial<AppViewportRuntimeState>) => void;
};

const DEFAULT_APP_VIEWPORT_STATE: AppViewportRuntimeState = {
  hasEditableFocus: false,
  isKeyboardOpen: false,
  keyboardOffset: 0,
  stableViewportHeight: 0,
  visibleViewportHeight: 0,
};

export const useAppViewportStore = create<AppViewportStore>((set) => ({
  ...DEFAULT_APP_VIEWPORT_STATE,
  resetViewportRuntime: () => set(DEFAULT_APP_VIEWPORT_STATE),
  setViewportRuntime: (state) =>
    set((current) => {
      const nextState = {
        ...current,
        ...state,
      };

      if (
        nextState.hasEditableFocus === current.hasEditableFocus &&
        nextState.isKeyboardOpen === current.isKeyboardOpen &&
        nextState.keyboardOffset === current.keyboardOffset &&
        nextState.stableViewportHeight === current.stableViewportHeight &&
        nextState.visibleViewportHeight === current.visibleViewportHeight
      ) {
        return current;
      }

      return nextState;
    }),
}));
