'use client'

import React, { createContext, useContext, ReactNode } from 'react';
import { useTelegramWebApp, TelegramWebAppState } from '../hooks/useTelegramWebApp';

/**
 * Контекст Telegram WebApp
 */
const TelegramContext = createContext<TelegramWebAppState | null>(null);

/**
 * Provider для Telegram WebApp
 */
export function TelegramProvider({ children }: { children: ReactNode }) {
  const telegramState = useTelegramWebApp();

  return (
    <TelegramContext.Provider value={telegramState}>
      {children}
    </TelegramContext.Provider>
  );
}

/**
 * Hook для доступа к Telegram WebApp контексту
 * 
 * @example
 * const { user, isReady, platform } = useTelegram();
 */
export function useTelegram() {
  const context = useContext(TelegramContext);
  
  if (!context) {
    throw new Error('useTelegram должен использоваться внутри TelegramProvider');
  }
  
  return context;
}

