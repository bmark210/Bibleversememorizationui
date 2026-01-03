import { useEffect, useState } from "react";

/* ===================== TELEGRAM WEBAPP TYPES ===================== */

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        expand: () => void;
        ready: () => void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        safeAreaInset?: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
        contentSafeAreaInset?: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
        onEvent: (eventType: string, callback: () => void) => void;
        offEvent: (eventType: string, callback: () => void) => void;
      };
    };
  }
}

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

/**
 * Хук для работы с безопасными зонами Telegram Mini App
 * Автоматически расширяет приложение на весь экран и отслеживает изменения safe area
 */
export function useTelegramSafeArea(): TelegramWebAppData {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [safeAreaInset, setSafeAreaInset] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [contentSafeAreaInset, setContentSafeAreaInset] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tg = window.Telegram?.WebApp;

    if (tg) {
      setIsInTelegram(true);

      // Инициализация и расширение на весь экран
      tg.ready();
      tg.expand();

      // Получаем начальные значения
      const updateSafeAreas = () => {
        setSafeAreaInset({
          top: tg.safeAreaInset?.top || 0,
          bottom: tg.safeAreaInset?.bottom || 0,
          left: tg.safeAreaInset?.left || 0,
          right: tg.safeAreaInset?.right || 0,
        });

        setContentSafeAreaInset({
          top: tg.contentSafeAreaInset?.top || 0,
          bottom: tg.contentSafeAreaInset?.bottom || 0,
          left: tg.contentSafeAreaInset?.left || 0,
          right: tg.contentSafeAreaInset?.right || 0,
        });

        setViewportHeight(tg.viewportHeight || window.innerHeight);
        setIsExpanded(tg.isExpanded || false);
      };

      updateSafeAreas();

      // Подписываемся на события изменения safe area
      const handleSafeAreaChanged = () => {
        updateSafeAreas();
      };

      const handleContentSafeAreaChanged = () => {
        updateSafeAreas();
      };

      const handleViewportChanged = () => {
        setViewportHeight(tg.viewportHeight || window.innerHeight);
        setIsExpanded(tg.isExpanded || false);
      };

      tg.onEvent("safeAreaChanged", handleSafeAreaChanged);
      tg.onEvent("contentSafeAreaChanged", handleContentSafeAreaChanged);
      tg.onEvent("viewportChanged", handleViewportChanged);

      return () => {
        tg.offEvent("safeAreaChanged", handleSafeAreaChanged);
        tg.offEvent("contentSafeAreaChanged", handleContentSafeAreaChanged);
        tg.offEvent("viewportChanged", handleViewportChanged);
      };
    } else {
      // Fallback для браузера (вне Telegram)
      setIsInTelegram(false);
      
      const isMobile = window.innerWidth < 768;
      setSafeAreaInset({
        top: isMobile ? 112 : 0, // 112px ≈ pt-28 для мобильных
        bottom: 0,
        left: 0,
        right: 0,
      });
      
      setContentSafeAreaInset({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });
      
      setViewportHeight(window.innerHeight);
      setIsExpanded(true);

      // Обработка изменения размера окна
      const handleResize = () => {
        const isMobile = window.innerWidth < 768;
        setSafeAreaInset(prev => ({
          ...prev,
          top: isMobile ? 112 : 0,
        }));
        setViewportHeight(window.innerHeight);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return {
    isInTelegram,
    safeAreaInset,
    contentSafeAreaInset,
    viewportHeight,
    isExpanded,
  };
}

/**
 * Хелпер для создания CSS переменных из safe area
 */
export function createSafeAreaCSSVars(insets: SafeAreaInsets): Record<string, string> {
  return {
    "--safe-area-inset-top": `${insets.top}px`,
    "--safe-area-inset-bottom": `${insets.bottom}px`,
    "--safe-area-inset-left": `${insets.left}px`,
    "--safe-area-inset-right": `${insets.right}px`,
  };
}
