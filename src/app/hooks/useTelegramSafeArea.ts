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

      console.log("📊 Telegram safe area API:", tg.safeAreaInset);

      // Функция получения реальных safe area из CSS env() переменных
      const getCSSEnvSafeArea = (): SafeAreaInsets => {
        // Пробуем получить safe area из CSS environment variables (работает в iOS Safari/WebView)
        const testDiv = document.createElement('div');
        testDiv.style.position = 'fixed';
        testDiv.style.top = '0';
        testDiv.style.left = '0';
        testDiv.style.width = '100vw';
        testDiv.style.height = '100vh';
        testDiv.style.pointerEvents = 'none';
        testDiv.style.visibility = 'hidden';
        document.body.appendChild(testDiv);

        const computedStyle = window.getComputedStyle(testDiv);
        
        // Получаем значения safe area из CSS
        const top = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top, 0px)')) || 
                    parseInt(computedStyle.paddingTop) || 0;
        const bottom = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom, 0px)')) || 
                       parseInt(computedStyle.paddingBottom) || 0;
        const left = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left, 0px)')) || 0;
        const right = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right, 0px)')) || 0;

        document.body.removeChild(testDiv);

        console.log("🎨 CSS env() safe area:", { top, bottom, left, right });

        return { top, bottom, left, right };
      };

      // Функция определения safe area на основе устройства
      const getDeviceBasedSafeArea = (): SafeAreaInsets => {
        const userAgent = navigator.userAgent || "";
        const screenHeight = window.screen.height;
        const screenWidth = window.screen.width;
        const isIOS = /iPhone|iPad|iPod/.test(userAgent);
        const isAndroid = /Android/.test(userAgent);

        console.log("📱 Device info:", { 
          userAgent: userAgent.substring(0, 100), 
          screenHeight, 
          screenWidth,
          isIOS,
          isAndroid
        });

        // iPhone с вырезом (X и новее) - высота >= 812
        if (isIOS && screenHeight >= 812) {
          console.log("📱 Detected: iPhone with notch");
          return {
            top: 59, // Status bar + notch
            bottom: 34, // Home indicator
            left: 0,
            right: 0
          };
        }

        // iPhone без выреза (8 и старше)
        if (isIOS && screenHeight < 812) {
          console.log("📱 Detected: iPhone without notch");
          return {
            top: 20, // Status bar
            bottom: 0,
            left: 0,
            right: 0
          };
        }

        // Android с вырезом
        if (isAndroid) {
          console.log("📱 Detected: Android device");
          return {
            top: 24, // Status bar (может быть больше с вырезом)
            bottom: 0,
            left: 0,
            right: 0
          };
        }

        // Desktop / неизвестное устройство
        console.log("💻 Detected: Desktop or unknown device");
        return { top: 0, bottom: 0, left: 0, right: 0 };
      };

      // Функция обновления safe area
      const updateSafeAreas = () => {
        // 1. Пробуем получить из Telegram API
        const telegramSafeArea = {
          top: tg.safeAreaInset?.top || 0,
          bottom: tg.safeAreaInset?.bottom || 0,
          left: tg.safeAreaInset?.left || 0,
          right: tg.safeAreaInset?.right || 0,
        };

        // 2. Получаем из CSS env()
        const cssSafeArea = getCSSEnvSafeArea();

        // 3. Определяем на основе устройства
        const deviceSafeArea = getDeviceBasedSafeArea();

        // Выбираем наилучший источник (приоритет: Telegram API > CSS env > Device detection)
        let finalSafeArea = { ...telegramSafeArea };

        // Если Telegram вернул нули, пробуем CSS env()
        if (finalSafeArea.top === 0 && finalSafeArea.bottom === 0) {
          if (cssSafeArea.top > 0 || cssSafeArea.bottom > 0) {
            console.log("✅ Using CSS env() safe area");
            finalSafeArea = cssSafeArea;
          } else {
            // Если и CSS env() не помог, используем определение по устройству
            console.log("✅ Using device-based safe area");
            finalSafeArea = deviceSafeArea;
          }
        } else {
          console.log("✅ Using Telegram API safe area");
        }

        const contentSafeArea = {
          top: tg.contentSafeAreaInset?.top || 0,
          bottom: tg.contentSafeAreaInset?.bottom || 0,
          left: tg.contentSafeAreaInset?.left || 0,
          right: tg.contentSafeAreaInset?.right || 0,
        };

        console.log("🎯 Final safe area:", finalSafeArea);

        setSafeAreaInset(finalSafeArea);
        setContentSafeAreaInset(contentSafeArea);
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
