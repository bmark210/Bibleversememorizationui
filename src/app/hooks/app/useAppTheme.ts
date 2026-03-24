"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyThemeToDocument,
  getPreferredTheme,
  syncTelegramChromeTheme,
  writeStoredTheme,
} from "@/app/lib/appTheme";
import { getTelegramWebApp } from "@/app/lib/telegramWebApp";
import type { AppThemeId } from "@/app/domain/appPages";

const DASHBOARD_WELCOME_SEEN_STORAGE_KEY = "bible-memory.dashboard-welcome-seen.v1";

export function useAppTheme() {
  const [theme, setTheme] = useState<AppThemeId>(() => getPreferredTheme());

  useEffect(() => {
    applyThemeToDocument(theme);
    writeStoredTheme(theme);
    syncTelegramChromeTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (window.localStorage.getItem(DASHBOARD_WELCOME_SEEN_STORAGE_KEY) === "1") {
        return;
      }
    } catch {
      return;
    }

    const markDashboardWelcomeSeen = () => {
      try {
        if (window.localStorage.getItem(DASHBOARD_WELCOME_SEEN_STORAGE_KEY) !== "1") {
          window.localStorage.setItem(DASHBOARD_WELCOME_SEEN_STORAGE_KEY, "1");
        }
      } catch {
        // Ignore storage write errors in restricted webviews.
      }
    };

    window.addEventListener("pagehide", markDashboardWelcomeSeen, { once: true });
    window.addEventListener("beforeunload", markDashboardWelcomeSeen, { once: true });

    return () => {
      window.removeEventListener("pagehide", markDashboardWelcomeSeen);
      window.removeEventListener("beforeunload", markDashboardWelcomeSeen);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const webApp = getTelegramWebApp();
    if (!webApp || typeof webApp.onEvent !== "function" || typeof webApp.offEvent !== "function") {
      return;
    }

    const handleTelegramThemeChanged = () => {
      applyThemeToDocument(theme);
      syncTelegramChromeTheme(theme);
    };

    webApp.onEvent?.("themeChanged", handleTelegramThemeChanged);
    return () => {
      webApp.offEvent?.("themeChanged", handleTelegramThemeChanged);
    };
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  }, []);

  return { theme, handleToggleTheme };
}
