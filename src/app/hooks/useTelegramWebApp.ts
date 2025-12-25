'use client'

import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

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
  themeParams: any;
  initDataUnsafe: any;
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
    if (typeof window !== 'undefined' && WebApp) {
      try {
        // Инициализируем WebApp
        WebApp.ready();

        // Расширяем WebApp на весь экран
        WebApp.expand();

        // Получаем данные пользователя
        const tgUser = WebApp.initDataUnsafe?.user;
        
        let user: TelegramUser | null = null;
        
        if (tgUser) {
          user = {
            id: tgUser.id,
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
          platform: WebApp.platform,
          colorScheme: WebApp.colorScheme as 'light' | 'dark',
          themeParams: WebApp.themeParams,
          initDataUnsafe: WebApp.initDataUnsafe,
        });

        // Устанавливаем цвет заголовка
        WebApp.setHeaderColor('secondary_bg_color');

        console.log('Telegram WebApp инициализирован:', {
          platform: WebApp.platform,
          version: WebApp.version,
          user: user,
        });

      } catch (error) {
        console.error('Ошибка инициализации Telegram WebApp:', error);
        setState(prev => ({ ...prev, isReady: true }));
      }
    } else {
      // Не в Telegram - используем моковые данные для разработки
      console.log('Приложение запущено вне Telegram');
      setState({
        isReady: true,
        user: null,
        platform: 'web',
        colorScheme: 'light',
        themeParams: {},
        initDataUnsafe: {},
      });
    }
  }, []);

  return state;
}

/**
 * Показать всплывающее уведомление в Telegram
 */
export function showTelegramAlert(message: string) {
  if (WebApp) {
    WebApp.showAlert(message);
  } else {
    alert(message);
  }
}

/**
 * Показать подтверждение в Telegram
 */
export function showTelegramConfirm(message: string, callback: (confirmed: boolean) => void) {
  if (WebApp) {
    WebApp.showConfirm(message, callback);
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
}, callback?: (buttonId: string) => void) {
  if (WebApp && WebApp.showPopup) {
    WebApp.showPopup(params as any, callback);
  } else {
    alert(params.message);
    callback?.('ok');
  }
}

/**
 * Закрыть WebApp
 */
export function closeTelegramWebApp() {
  if (WebApp) {
    WebApp.close();
  }
}

/**
 * Открыть ссылку
 */
export function openTelegramLink(url: string) {
  if (WebApp) {
    WebApp.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Включить кнопку "Закрыть" с подтверждением
 */
export function enableClosingConfirmation() {
  if (WebApp) {
    WebApp.enableClosingConfirmation();
  }
}

/**
 * Отключить кнопку "Закрыть" с подтверждением
 */
export function disableClosingConfirmation() {
  if (WebApp) {
    WebApp.disableClosingConfirmation();
  }
}

/**
 * Вибрация (легкая)
 */
export function hapticFeedbackLight() {
  if (WebApp && WebApp.HapticFeedback) {
    WebApp.HapticFeedback.impactOccurred('light');
  }
}

/**
 * Вибрация (средняя)
 */
export function hapticFeedbackMedium() {
  if (WebApp && WebApp.HapticFeedback) {
    WebApp.HapticFeedback.impactOccurred('medium');
  }
}

/**
 * Вибрация (сильная)
 */
export function hapticFeedbackHeavy() {
  if (WebApp && WebApp.HapticFeedback) {
    WebApp.HapticFeedback.impactOccurred('heavy');
  }
}

/**
 * Вибрация успеха
 */
export function hapticFeedbackSuccess() {
  if (WebApp && WebApp.HapticFeedback) {
    WebApp.HapticFeedback.notificationOccurred('success');
  }
}

/**
 * Вибрация ошибки
 */
export function hapticFeedbackError() {
  if (WebApp && WebApp.HapticFeedback) {
    WebApp.HapticFeedback.notificationOccurred('error');
  }
}

/**
 * Вибрация предупреждения
 */
export function hapticFeedbackWarning() {
  if (WebApp && WebApp.HapticFeedback) {
    WebApp.HapticFeedback.notificationOccurred('warning');
  }
}

