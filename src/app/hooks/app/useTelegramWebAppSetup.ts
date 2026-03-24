"use client";

import { useEffect } from "react";
import { getTelegramWebApp } from "@/app/lib/telegramWebApp";
import { lockTelegramPortraitOrientation } from "@/app/lib/appTheme";
import {
  syncTelegramFullscreenFromWebApp,
  useTelegramUiStore,
} from "@/app/stores/telegramUiStore";
import { useTrainingFontStore } from "@/app/stores/trainingFontStore";

export function useTelegramWebAppSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    useTrainingFontStore.getState().hydrateTrainingFontSize();

    const telegramUiStore = useTelegramUiStore.getState();
    const storedFullscreenPreference =
      telegramUiStore.hydrateTelegramFullscreenPreference();
    const webApp = getTelegramWebApp();
    if (!webApp) {
      telegramUiStore.resetTelegramRuntime();
      if (process.env.NODE_ENV === "development") {
        telegramUiStore.setTelegramRuntime({
          canToggleTelegramFullscreen: true,
        });
      }
      syncTelegramFullscreenFromWebApp();
      return;
    }

    telegramUiStore.setTelegramRuntime({
      isTelegramMiniApp: true,
      canToggleTelegramFullscreen: true,
    });

    const syncTelegramViewportState = () => {
      syncTelegramFullscreenFromWebApp();
    };

    try {
      webApp.ready?.();
    } catch (error) {
      console.warn("Telegram ready failed:", error);
    }

    try {
      webApp.disableClosingConfirmation?.();
    } catch (error) {
      console.warn("Telegram disableClosingConfirmation failed:", error);
    }

    try {
      webApp.disableVerticalSwipes?.();
    } catch (error) {
      console.warn("Telegram disableVerticalSwipes failed:", error);
    }

    lockTelegramPortraitOrientation(webApp);

    try {
      if (storedFullscreenPreference) {
        webApp.requestFullscreen?.();
      } else if (webApp.isFullscreen) {
        webApp.exitFullscreen?.();
      }
    } catch (error) {
      console.warn("Telegram fullscreen preference apply failed:", error);
    }

    syncTelegramViewportState();

    const handleFullscreenChanged = () => {
      syncTelegramViewportState();
    };

    const handleOrientationChanged = () => {
      lockTelegramPortraitOrientation(webApp);
    };

    webApp.onEvent?.("fullscreenChanged", handleFullscreenChanged);
    window.addEventListener("orientationchange", handleOrientationChanged);

    return () => {
      webApp.offEvent?.("fullscreenChanged", handleFullscreenChanged);
      window.removeEventListener("orientationchange", handleOrientationChanged);
    };
  }, []);
}
