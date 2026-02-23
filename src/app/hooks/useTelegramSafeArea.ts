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
        platform?: string;
        version?: string;
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
      console.log("📱 Platform:", tg.platform);
      console.log("📱 Version:", tg.version);
      setIsInTelegram(true);

      // Инициализация Telegram WebApp
      tg.ready();
      tg.expand();

      // Функция получения Content Safe Area ТОЛЬКО из CSS переменных Telegram
      const getTelegramContentSafeAreaFromCSS = (): SafeAreaInsets => {
        if (typeof window === "undefined") {
          return { top: 0, bottom: 0, left: 0, right: 0 };
        }

        const root = document.documentElement;
        const computedStyle = window.getComputedStyle(root);
        
        const getCSSVariable = (varName: string): number => {
          const value = computedStyle.getPropertyValue(varName).trim();
          console.log(`🔍 Reading CSS variable ${varName}:`, value);
          if (!value) {
            console.log(`⚠️ CSS variable ${varName} is empty`);
            return 0;
          }
          // Убираем 'px' и парсим число
          const numValue = parseFloat(value.replace('px', ''));
          const result = isNaN(numValue) ? 0 : numValue;
          console.log(`✅ Parsed ${varName}:`, result);
          return result;
        };

        const top = getCSSVariable('--tg-content-safe-area-inset-top');
        const bottom = getCSSVariable('--tg-content-safe-area-inset-bottom');
        const left = getCSSVariable('--tg-content-safe-area-inset-left');
        const right = getCSSVariable('--tg-content-safe-area-inset-right');

        console.log("🎨 Telegram Content Safe Area from CSS:", { top, bottom, left, right });

        return { top, bottom, left, right };
      };

      // Функция обновления safe area - используем ТОЛЬКО CSS переменные
      const updateSafeAreas = () => {
        // Получаем Content Safe Area ТОЛЬКО из CSS переменных Telegram
        const contentSafeArea = getTelegramContentSafeAreaFromCSS();

        console.log("🎯 Content Safe Area from CSS:", contentSafeArea);

        // Используем те же значения для safeAreaInset (для обратной совместимости)
        setSafeAreaInset(contentSafeArea);
        setContentSafeAreaInset(contentSafeArea);
        setViewportHeight(tg.viewportHeight || window.innerHeight);
        setIsExpanded(tg.isExpanded || false);
      };

      // Первоначальное обновление
      updateSafeAreas();

      // Подписка на события изменения content safe area
      const handleContentSafeAreaChanged = () => {
        console.log("🔄 contentSafeAreaChanged event");
        updateSafeAreas();
      };

      const handleViewportChanged = () => {
        console.log("🔄 viewportChanged event");
        setViewportHeight(tg.viewportHeight || window.innerHeight);
        setIsExpanded(tg.isExpanded || false);
        // Обновляем safe area при изменении viewport, так как CSS переменные могут измениться
        updateSafeAreas();
      };

      tg.onEvent("contentSafeAreaChanged", handleContentSafeAreaChanged);
      tg.onEvent("viewportChanged", handleViewportChanged);

      // Также проверяем CSS переменные периодически на случай, если они установятся позже
      // Отслеживаем предыдущие значения для сравнения
      let previousValues: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };
      const intervalId = setInterval(() => {
        const current = getTelegramContentSafeAreaFromCSS();
        // Обновляем только если значения изменились
        if (
          current.top !== previousValues.top ||
          current.bottom !== previousValues.bottom ||
          current.left !== previousValues.left ||
          current.right !== previousValues.right
        ) {
          console.log("🔄 CSS variables changed, updating state");
          previousValues = current;
          updateSafeAreas();
        }
      }, 200); // Проверяем каждые 200ms

      return () => {
        tg.offEvent("contentSafeAreaChanged", handleContentSafeAreaChanged);
        tg.offEvent("viewportChanged", handleViewportChanged);
        clearInterval(intervalId);
      };
    } else {
      // Fallback для обычного браузера - используем ТОЛЬКО CSS переменные
      console.log("🔴 Not in Telegram, using CSS variables only");
      setIsInTelegram(false);
      
      // Функция получения Content Safe Area ТОЛЬКО из CSS переменных
      const getContentSafeAreaFromCSS = (): SafeAreaInsets => {
        if (typeof window === "undefined") {
          return { top: 0, bottom: 0, left: 0, right: 0 };
        }

        const root = document.documentElement;
        const computedStyle = window.getComputedStyle(root);
        
        const getCSSVariable = (varName: string): number => {
          const value = computedStyle.getPropertyValue(varName).trim();
          if (!value) return 0;
          const numValue = parseFloat(value.replace('px', ''));
          return isNaN(numValue) ? 0 : numValue;
        };

        return {
          top: getCSSVariable('--tg-content-safe-area-inset-top'),
          bottom: getCSSVariable('--tg-content-safe-area-inset-bottom'),
          left: getCSSVariable('--tg-content-safe-area-inset-left'),
          right: getCSSVariable('--tg-content-safe-area-inset-right'),
        };
      };
      
      const updateFallback = () => {
        const contentSafeArea = getContentSafeAreaFromCSS();
        
        // Используем те же значения для safeAreaInset (для обратной совместимости)
        setSafeAreaInset(contentSafeArea);
        setContentSafeAreaInset(contentSafeArea);
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
