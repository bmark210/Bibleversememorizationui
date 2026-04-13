'use client'

import { useEffect, useState } from 'react';
import {
  getTelegramWebApp,
  type TelegramColorScheme,
  type TelegramInitDataUnsafe,
  type TelegramThemeParams,
  type TelegramWebApp,
} from '@/app/lib/telegramWebApp';

let webAppSdk: TelegramWebApp | null =
  typeof window !== 'undefined' ? getTelegramWebApp() : null;

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
    webAppSdk = getTelegramWebApp();

    // Проверяем, запущено ли приложение в Telegram
    if (typeof window !== 'undefined' && webAppSdk) {
      const syncState = () => {
        const tgUser = webAppSdk?.initDataUnsafe?.user;

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
          platform: webAppSdk?.platform ?? 'unknown',
          colorScheme: (webAppSdk?.colorScheme ?? 'light') as TelegramColorScheme,
          themeParams: webAppSdk?.themeParams ?? {},
          initDataUnsafe: webAppSdk?.initDataUnsafe ?? {},
        });
      };

      try {
        // Инициализируем WebApp
        webAppSdk.ready?.();
        syncState();

        const handleThemeChanged = () => {
          syncState();
        };

        const handleViewportChanged = () => {
          syncState();
        };

        webAppSdk.onEvent?.('themeChanged', handleThemeChanged);
        webAppSdk.onEvent?.('fullscreenChanged', handleViewportChanged);
        webAppSdk.onEvent?.('viewportChanged', handleViewportChanged);

        return () => {
          webAppSdk?.offEvent?.('themeChanged', handleThemeChanged);
          webAppSdk?.offEvent?.('fullscreenChanged', handleViewportChanged);
          webAppSdk?.offEvent?.('viewportChanged', handleViewportChanged);
        };

      } catch (error) {
        console.error('Ошибка инициализации Telegram WebApp:', error);
        setState(prev => ({ ...prev, isReady: true }));
      }
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
  }, []);

  return state;
}
