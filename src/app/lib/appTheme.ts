import type { TelegramWebApp } from "@/app/lib/telegramWebApp";
import { getTelegramWebApp } from "@/app/lib/telegramWebApp";
import type { AppThemeId } from "@/app/domain/appPages";
import { getThemePalette } from "@/app/lib/themePalette";

const THEME_STORAGE_KEY = "theme";
export const DEFAULT_THEME: AppThemeId = "light";

function readStoredTheme(): AppThemeId | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: AppThemeId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

export function applyThemeToDocument(theme: AppThemeId) {
  if (typeof document === "undefined") return;
  const palette = getThemePalette(theme);

  const targets = [document.documentElement, document.body].filter(Boolean);
  for (const target of targets) {
    target.classList.remove("light", "dark");
    target.classList.add(theme);
    target.setAttribute("data-theme", theme);
  }

  document.documentElement.style.colorScheme = theme;
  document.body.style.colorScheme = theme;
  document.documentElement.style.color = palette.chrome.foreground;
  document.body.style.color = palette.chrome.foreground;
  document.documentElement.style.backgroundColor = palette.chrome.background;
  document.body.style.backgroundColor = palette.chrome.background;
}

export function syncTelegramChromeTheme(theme: AppThemeId) {
  const webApp = getTelegramWebApp();
  if (!webApp) return;

  const palette = getThemePalette(theme).chrome;

  try {
    if (typeof webApp.setBackgroundColor === "function") {
      webApp.setBackgroundColor(palette.background);
    }
  } catch (error) {
    console.warn("Telegram setBackgroundColor failed:", error);
  }

  try {
    if (typeof webApp.setHeaderColor === "function") {
      webApp.setHeaderColor(palette.header);
    }
  } catch (error) {
    console.warn("Telegram setHeaderColor failed:", error);
  }

  try {
    if (typeof webApp.setBottomBarColor === "function") {
      webApp.setBottomBarColor(palette.bottomBar);
    }
  } catch (error) {
    console.warn("Telegram setBottomBarColor failed:", error);
  }
}

function getTelegramThemePreference(): AppThemeId | null {
  const webApp = getTelegramWebApp();
  const colorScheme = webApp?.colorScheme;
  return colorScheme === "light" || colorScheme === "dark" ? colorScheme : null;
}

export function getPreferredTheme(): AppThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = readStoredTheme();
  if (stored) return stored;
  const telegramTheme = getTelegramThemePreference();
  if (telegramTheme) return telegramTheme;
  return DEFAULT_THEME;
}

export function lockTelegramPortraitOrientation(webApp: TelegramWebApp) {
  if (typeof webApp.lockOrientation !== "function") {
    return;
  }

  if (!isPortraitOrientation()) {
    return;
  }

  try {
    webApp.lockOrientation();
  } catch (error) {
    console.warn("Telegram lockOrientation failed:", error);
  }
}

function isPortraitOrientation() {
  if (typeof window === "undefined") return true;
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(orientation: portrait)").matches;
  }

  return window.innerHeight >= window.innerWidth;
}
