'use client'

import { useEffect, useState } from 'react';
import {
  getTelegramWebApp,
  type TelegramColorScheme,
  type TelegramInitDataUnsafe,
  type TelegramPopupParams,
  type TelegramThemeParams,
  type TelegramWebApp,
} from '@/app/lib/telegramWebApp';
import { triggerHaptic } from '../lib/haptics';

// Динамический импорт SDK только на клиенте
let webAppSdk: TelegramWebApp | null = null;
if (typeof window !== 'undefined') {
  webAppSdk = getTelegramWebApp();
  void import('@twa-dev/sdk')
    .then((sdkModule) => {
      webAppSdk =
        ((sdkModule.default as unknown) as TelegramWebApp | undefined) ??
        getTelegramWebApp();
    })
    .catch(() => {
      webAppSdk = getTelegramWebApp();
    });
}

/**
 * Информация о пользователе Telegram
 */
export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
}

/**
 * Состояние Telegram WebApp
 */
export interface TelegramWebAppState {
  isReady: boolean;
  user: TelegramUser | null;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  initDataUnsafe: TelegramInitDataUnsafe;
}

/**
 * React Hook для работы с Telegram WebApp
 * 
 * @example
 * const { isReady, user, platform } = useTelegramWebApp();
 * 
 * if (!isReady) return <div>Загрузка...</div>;
 * 
 * return <div>Привет, {user?.firstName}!</div>;
 */
export function useTelegramWebApp() {
  const [state, setState] = useState<TelegramWebAppState>({
    isReady: false,
    user: null,
    platform: 'unknown',
    colorScheme: 'light',
    themeParams: {},
    initDataUnsafe: {},
  });

  useEffect(() => {
    // Проверяем, запущено ли приложение в Telegram
    if (typeof window !== 'undefined' && webAppSdk) {
      try {
        // Инициализируем WebApp
        webAppSdk.ready?.();

        // Расширяем WebApp на весь экран
        webAppSdk.expand?.();

        // Запускаем полноэкранный режим
        webAppSdk.requestFullscreen?.();

        // Отключаем вертикальные свайпы
        webAppSdk.disableVerticalSwipes?.();

        // Блокируем выход из приложения
        webAppSdk.enableClosingConfirmation?.();

        // Блокируем переворот устройства
        webAppSdk.disableRotation?.();

        // Блокируем перемещение фокуса за пределы приложения
        webAppSdk.disableFocusOutside?.();

        // Получаем данные пользователя
        const tgUser = webAppSdk.initDataUnsafe?.user;
        
        let user: TelegramUser | null = null;
        
        if (tgUser) {
          const telegramUserId = Number(tgUser.id);
          user = {
            id: Number.isFinite(telegramUserId) ? telegramUserId : 0,
            firstName: tgUser.first_name || '',
            lastName: tgUser.last_name,
            username: tgUser.username,
            languageCode: tgUser.language_code,
            isPremium: tgUser.is_premium,
            photoUrl: tgUser.photo_url,
          };
        }

        setState({
          isReady: true,
          user,
          platform: webAppSdk.platform ?? 'unknown',
          colorScheme: (webAppSdk.colorScheme ?? 'light') as TelegramColorScheme,
          themeParams: webAppSdk.themeParams ?? {},
          initDataUnsafe: webAppSdk.initDataUnsafe ?? {},
        });

      } catch (error) {
        console.error('Ошибка инициализации Telegram WebApp:', error);
        setState(prev => ({ ...prev, isReady: true }));
      }

      const handleThemeChanged = () => {
        if (!webAppSdk) return;

        setState((prev) => ({
          ...prev,
          colorScheme: (webAppSdk?.colorScheme ?? prev.colorScheme) as TelegramColorScheme,
          themeParams: webAppSdk?.themeParams ?? {},
        }));
      };

      webAppSdk.onEvent?.('themeChanged', handleThemeChanged);

      return () => {
        webAppSdk?.offEvent?.('themeChanged', handleThemeChanged);
      };
    } else {
      setState({
        isReady: true,
        user: null,
        platform: 'web',
        colorScheme: 'light',
        themeParams: {},
        initDataUnsafe: {},
      });
    }

    return undefined;
  }, []);

  return state;
}

/**
 * Показать всплывающее уведомление в Telegram
 */
export function showTelegramAlert(message: string) {
  if (webAppSdk?.showAlert) {
    webAppSdk.showAlert(message);
  } else {
    alert(message);
  }
}

/**
 * Показать подтверждение в Telegram
 */
export function showTelegramConfirm(message: string, callback: (confirmed: boolean) => void) {
  if (webAppSdk?.showConfirm) {
    webAppSdk.showConfirm(message, callback);
  } else {
    const confirmed = confirm(message);
    callback(confirmed);
  }
}

/**
 * Показать всплывающее окно в Telegram
 */
export function showTelegramPopup(params: {
  title?: string;
  message: string;
  buttons?: Array<{ id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text: string }>;
}, callback?: (buttonId?: string) => void) {
  if (webAppSdk?.showPopup) {
    webAppSdk.showPopup(params as TelegramPopupParams, callback);
  } else {
    alert(params.message);
    callback?.('ok');
  }
}

/**
 * Закрыть WebApp
 */
export function closeTelegramWebApp() {
  if (webAppSdk?.close) {
    webAppSdk.close();
  }
}

/**
 * Открыть ссылку
 */
export function openTelegramLink(url: string) {
  if (webAppSdk?.openLink) {
    webAppSdk.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Включить кнопку "Закрыть" с подтверждением
 */
export function enableClosingConfirmation() {
  if (webAppSdk?.enableClosingConfirmation) {
    webAppSdk.enableClosingConfirmation();
  }
}

/**
 * Отключить кнопку "Закрыть" с подтверждением
 */
export function disableClosingConfirmation() {
  if (webAppSdk?.disableClosingConfirmation) {
    webAppSdk.disableClosingConfirmation();
  }
}

/**
 * Вибрация (легкая)
 */
export function hapticFeedbackLight() {
  triggerHaptic('light');
}

/**
 * Вибрация (средняя)
 */
export function hapticFeedbackMedium() {
  triggerHaptic('medium');
}

/**
 * Вибрация (сильная)
 */
export function hapticFeedbackHeavy() {
  triggerHaptic('heavy');
}

/**
 * Вибрация успеха
 */
export function hapticFeedbackSuccess() {
  triggerHaptic('success');
}

/**
 * Вибрация ошибки
 */
export function hapticFeedbackError() {
  triggerHaptic('error');
}

/**
 * Вибрация предупреждения
 */
export function hapticFeedbackWarning() {
  triggerHaptic('warning');
}
