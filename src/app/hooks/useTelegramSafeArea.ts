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
 * 
 * @returns Объект с данными о safe area и статусе Telegram окружения
 * 
 * @example
 * const { safeAreaInset, isInTelegram } = useTelegramSafeArea();
 * 
 * <div style={{ paddingTop: `${safeAreaInset.top}px` }}>
 *   Content
 * </div>
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
      console.log("🟢 Telegram WebApp detected");
      setIsInTelegram(true);

      // Инициализация Telegram WebApp
      tg.ready();
      tg.expand();

      console.log("📊 Initial safe area:", tg.safeAreaInset);

      // Функция обновления safe area
      const updateSafeAreas = () => {
        const newSafeArea = {
          top: tg.safeAreaInset?.top || 0,
          bottom: tg.safeAreaInset?.bottom || 0,
          left: tg.safeAreaInset?.left || 0,
          right: tg.safeAreaInset?.right || 0,
        };

        const newContentSafeArea = {
          top: tg.contentSafeAreaInset?.top || 0,
          bottom: tg.contentSafeAreaInset?.bottom || 0,
          left: tg.contentSafeAreaInset?.left || 0,
          right: tg.contentSafeAreaInset?.right || 0,
        };

        console.log("📐 Safe area updated:", newSafeArea);

        setSafeAreaInset(newSafeArea);
        setContentSafeAreaInset(newContentSafeArea);
        setViewportHeight(tg.viewportHeight || window.innerHeight);
        setIsExpanded(tg.isExpanded || false);
      };

      // Первоначальное обновление
      updateSafeAreas();

      // Подписка на события
      const handleSafeAreaChanged = () => {
        console.log("🔄 safeAreaChanged event");
        updateSafeAreas();
      };

      const handleContentSafeAreaChanged = () => {
        console.log("🔄 contentSafeAreaChanged event");
        updateSafeAreas();
      };

      const handleViewportChanged = () => {
        console.log("🔄 viewportChanged event");
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
      // Fallback для обычного браузера
      console.log("🔴 Not in Telegram, using fallback");
      setIsInTelegram(false);
      
      const updateFallback = () => {
        const isMobile = window.innerWidth < 768;
        setSafeAreaInset({
          top: isMobile ? 64 : 0, // Уменьшаем с 112 до 64px для мобильных
          bottom: 0,
          left: 0,
          right: 0,
        });
        setViewportHeight(window.innerHeight);
        setIsExpanded(true);
      };

      updateFallback();

      window.addEventListener("resize", updateFallback);
      return () => window.removeEventListener("resize", updateFallback);
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
