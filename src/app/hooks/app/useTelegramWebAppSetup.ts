"use client";

import { useEffect } from "react";
import { getTelegramWebApp } from "@/app/lib/telegramWebApp";
import { lockTelegramPortraitOrientation } from "@/app/lib/appTheme";
import {
  syncTelegramFullscreenFromWebApp,
  useTelegramUiStore,
} from "@/app/stores/telegramUiStore";
import { useTrainingFontStore } from "@/app/stores/trainingFontStore";
import { useTranslationStore } from "@/app/stores/translationStore";

export function useTelegramWebAppSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    useTrainingFontStore.getState().hydrateTrainingFontSize();
    useTranslationStore.getState().hydrateTranslation();

    const telegramUiStore = useTelegramUiStore.getState();
    const webApp = getTelegramWebApp();
    if (!webApp) {
      telegramUiStore.resetTelegramRuntime();
      syncTelegramFullscreenFromWebApp();
      return;
    }

    telegramUiStore.setTelegramRuntime({
      isTelegramMiniApp: true,
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
      webApp.expand?.();
    } catch (error) {
      console.warn("Telegram expand failed:", error);
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
      webApp.requestFullscreen?.();
    } catch (error) {
      console.warn("Telegram fullscreen request failed:", error);
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
