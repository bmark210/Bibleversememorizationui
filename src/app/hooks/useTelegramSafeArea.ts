import { useEffect, useState } from "react";
import { getTelegramWebApp } from "@/app/lib/telegramWebApp";

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TelegramWebAppData {
  isInTelegram: boolean;
  safeAreaInset: SafeAreaInsets;
  contentSafeAreaInset: SafeAreaInsets;
  viewportHeight: number;
  isExpanded: boolean;
}

const ZERO_INSETS: SafeAreaInsets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

function parseInsetValue(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, value);
}

function normalizeInsets(value: unknown): SafeAreaInsets | null {
  if (!value || typeof value !== "object") return null;
  const src = value as Partial<SafeAreaInsets>;
  return {
    top: parseInsetValue(src.top),
    bottom: parseInsetValue(src.bottom),
    left: parseInsetValue(src.left),
    right: parseInsetValue(src.right),
  };
}

function readCssInsetVar(varName: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw.replace("px", ""));
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

function readCssInsets(kind: "safe" | "content"): SafeAreaInsets {
  const prefix = kind === "content" ? "--tg-content-safe-area-inset-" : "--tg-safe-area-inset-";
  return {
    top: readCssInsetVar(`${prefix}top`),
    bottom: readCssInsetVar(`${prefix}bottom`),
    left: readCssInsetVar(`${prefix}left`),
    right: readCssInsetVar(`${prefix}right`),
  };
}

function maxInsets(...insets: Array<SafeAreaInsets | null | undefined>): SafeAreaInsets {
  return insets.reduce<SafeAreaInsets>(
    (acc, cur) => ({
      top: Math.max(acc.top, cur?.top ?? 0),
      bottom: Math.max(acc.bottom, cur?.bottom ?? 0),
      left: Math.max(acc.left, cur?.left ?? 0),
      right: Math.max(acc.right, cur?.right ?? 0),
    }),
    ZERO_INSETS
  );
}

/**
 * Хук для работы с безопасными зонами Telegram Mini App.
 * Использует Telegram WebApp API (`safeAreaInset`, `contentSafeAreaInset`) как основной источник.
 * CSS-переменные Telegram используются только как fallback.
 */
export function useTelegramSafeArea(): TelegramWebAppData {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [safeAreaInset, setSafeAreaInset] = useState<SafeAreaInsets>(ZERO_INSETS);
  const [contentSafeAreaInset, setContentSafeAreaInset] = useState<SafeAreaInsets>(ZERO_INSETS);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tg = getTelegramWebApp();

    const updateFromBrowserFallback = () => {
      // В браузере вне Telegram читаем, если есть, CSS-переменные Telegram.
      const cssSafe = readCssInsets("safe");
      const cssContent = readCssInsets("content");
      const resolvedSafe = maxInsets(cssSafe);
      const resolvedContent = maxInsets(cssContent, resolvedSafe);

      setIsInTelegram(false);
      setSafeAreaInset(resolvedSafe);
      setContentSafeAreaInset(resolvedContent);
      setViewportHeight(window.innerHeight);
      setIsExpanded(true);
    };

    if (!tg) {
      updateFromBrowserFallback();
      window.addEventListener("resize", updateFromBrowserFallback);
      return () => window.removeEventListener("resize", updateFromBrowserFallback);
    }

    setIsInTelegram(true);

    try {
      tg.ready?.();
      tg.expand?.();
    } catch {
      // ignore init errors, still try to read values
    }

    const updateFromTelegram = () => {
      const apiSafe = normalizeInsets(tg.safeAreaInset);
      const apiContent = normalizeInsets(tg.contentSafeAreaInset);
      const cssSafe = readCssInsets("safe");
      const cssContent = readCssInsets("content");

      const resolvedSafe = maxInsets(apiSafe, cssSafe);
      // content inset must not be smaller than safe inset, otherwise header/footer may overlap content
      const resolvedContent = maxInsets(apiContent, cssContent, resolvedSafe);

      setSafeAreaInset(resolvedSafe);
      setContentSafeAreaInset(resolvedContent);
      setViewportHeight(tg.viewportStableHeight || tg.viewportHeight || window.innerHeight);
      setIsExpanded(Boolean(tg.isExpanded));
    };

    updateFromTelegram();

    // Telegram может обновить значения после первого рендера/expand
    const rafId = window.requestAnimationFrame(updateFromTelegram);
    const timeoutId = window.setTimeout(updateFromTelegram, 250);

    const handleViewportChanged = () => updateFromTelegram();
    const handleSafeAreaChanged = () => updateFromTelegram();
    const handleContentSafeAreaChanged = () => updateFromTelegram();

    tg.onEvent?.("viewportChanged", handleViewportChanged);
    tg.onEvent?.("safeAreaChanged", handleSafeAreaChanged);
    tg.onEvent?.("contentSafeAreaChanged", handleContentSafeAreaChanged);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      tg.offEvent?.("viewportChanged", handleViewportChanged);
      tg.offEvent?.("safeAreaChanged", handleSafeAreaChanged);
      tg.offEvent?.("contentSafeAreaChanged", handleContentSafeAreaChanged);
    };
  }, []);

  return {
    isInTelegram,
    safeAreaInset,
    contentSafeAreaInset,
    viewportHeight,
    isExpanded,
  };
}
