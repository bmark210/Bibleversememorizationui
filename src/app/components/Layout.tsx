'use client'

import React, { useEffect, useState } from 'react';
import { BookOpen, LayoutDashboard, Library, BarChart3, Settings, Flame, Sun, Moon, Copy, X } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTelegram } from '../contexts/TelegramContext';
import { useTelegramSafeArea } from '../hooks/useTelegramSafeArea';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

type Theme = 'light' | 'dark';

const getPreferredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);
  const { user, isReady, platform } = useTelegram();
  const { safeAreaInset, isInTelegram } = useTelegramSafeArea();
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  // Отладка safe area
  useEffect(() => {
    if (isInTelegram) {
      console.log('📱 Layout: Telegram detected, safe area:', safeAreaInset);
    } else {
      console.log('🌐 Layout: Browser mode, safe area:', safeAreaInset);
    }
  }, [isInTelegram, safeAreaInset]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const handleThemeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    toggleTheme();
    event.currentTarget.blur();
  };

  // Собираем все Telegram переменные
  const getTelegramDebugInfo = () => {
    if (typeof window === 'undefined') return null;

    const tg = window.Telegram?.WebApp;
    if (!tg) return null;

    // Получаем CSS переменные
    const getCSSVariable = (varName: string) => {
      if (typeof window === 'undefined') return null;
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return value || null;
    };

    // Получаем значения Content Safe Area CSS переменных
    const contentSafeAreaTop = getCSSVariable('--tg-content-safe-area-inset-top');
    const contentSafeAreaBottom = getCSSVariable('--tg-content-safe-area-inset-bottom');
    const contentSafeAreaLeft = getCSSVariable('--tg-content-safe-area-inset-left');
    const contentSafeAreaRight = getCSSVariable('--tg-content-safe-area-inset-right');
    
    return {
      // ⭐ Content Safe Area CSS переменные (главные значения)
      '--tg-content-safe-area-inset-top': contentSafeAreaTop,
      '--tg-content-safe-area-inset-bottom': contentSafeAreaBottom,
      '--tg-content-safe-area-inset-left': contentSafeAreaLeft,
      '--tg-content-safe-area-inset-right': contentSafeAreaRight,
      
      // Основная информация
      platform: tg.platform,
      version: tg.version,
      isExpanded: tg.isExpanded,
      
      // Viewport
      viewportHeight: tg.viewportHeight,
      viewportStableHeight: tg.viewportStableHeight,
      
      // Content Safe Area (области контента - избегаемые зоны)
      contentSafeAreaInset: {
        api: tg.contentSafeAreaInset,
        css: {
          top: contentSafeAreaTop,
          bottom: contentSafeAreaBottom,
          left: contentSafeAreaLeft,
          right: contentSafeAreaRight,
        }
      },
      
      // Viewport padding
      viewportPadding: {
        top: getCSSVariable('--tg-viewport-height'),
        stableHeight: getCSSVariable('--tg-viewport-stable-height'),
      },
      
      // Тема
      colorScheme: (tg as any).colorScheme,
      themeParams: (tg as any).themeParams,
      themeCSSVariables: {
        bgColor: getCSSVariable('--tg-theme-bg-color'),
        textColor: getCSSVariable('--tg-theme-text-color'),
        hintColor: getCSSVariable('--tg-theme-hint-color'),
        linkColor: getCSSVariable('--tg-theme-link-color'),
        buttonColor: getCSSVariable('--tg-theme-button-color'),
        buttonTextColor: getCSSVariable('--tg-theme-button-text-color'),
        secondaryBgColor: getCSSVariable('--tg-theme-secondary-bg-color'),
        headerBgColor: getCSSVariable('--tg-theme-header-bg-color'),
        accentTextColor: getCSSVariable('--tg-theme-accent-text-color'),
        sectionBgColor: getCSSVariable('--tg-theme-section-bg-color'),
        sectionHeaderTextColor: getCSSVariable('--tg-theme-section-header-text-color'),
        subtitleTextColor: getCSSVariable('--tg-theme-subtitle-text-color'),
        destructiveTextColor: getCSSVariable('--tg-theme-destructive-text-color'),
      },
      
      // Пользователь
      initData: (tg as any).initData,
      initDataUnsafe: (tg as any).initDataUnsafe,
      
      // Кнопки
      MainButton: (tg as any).MainButton ? {
        text: (tg as any).MainButton.text,
        color: (tg as any).MainButton.color,
        textColor: (tg as any).MainButton.textColor,
        isVisible: (tg as any).MainButton.isVisible,
        isActive: (tg as any).MainButton.isActive,
        isProgressVisible: (tg as any).MainButton.isProgressVisible,
      } : null,
      BackButton: (tg as any).BackButton ? {
        isVisible: (tg as any).BackButton.isVisible,
      } : null,
      SettingsButton: (tg as any).SettingsButton ? {
        isVisible: (tg as any).SettingsButton.isVisible,
      } : null,
      
      // Haptic Feedback
      HapticFeedback: (tg as any).HapticFeedback ? 'available' : 'not available',
      
      // Дополнительно
      headerColor: (tg as any).headerColor,
      backgroundColor: (tg as any).backgroundColor,
      bottomBarColor: (tg as any).bottomBarColor,
      
      // Все CSS переменные viewport
      allCSSVariables: {
        '--tg-viewport-height': getCSSVariable('--tg-viewport-height'),
        '--tg-viewport-stable-height': getCSSVariable('--tg-viewport-stable-height'),
      },
      
      // Наши вычисленные значения
      _computed: {
        safeAreaInset,
        isInTelegram,
        user,
        isReady,
      }
    };
  };

  const handleCopyDebugInfo = async () => {
    const info = getTelegramDebugInfo();
    if (!info) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Не удалось скопировать:', error);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
    { id: 'verses', label: 'Стихи', icon: BookOpen },
    { id: 'collections', label: 'Коллекции', icon: Library },
    { id: 'stats', label: 'Статистика', icon: BarChart3 },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header 
        className="bg-card border-b border-border sticky top-0 z-10"
        style={{ paddingTop: `${safeAreaInset.top}px` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Bible Memory</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-accent/50 rounded-lg">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">12 дней подряд</span>
              </div>
              {/* Кнопка Debug (только в Telegram) */}
              {/* {isInTelegram && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="gap-2 rounded-full border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60"
                  aria-label="Debug"
                >
                  <span className="text-xs font-mono">DEBUG</span>
                </Button>
              )} */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleThemeClick}
                className="gap-2 rounded-full border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60"
                aria-label={`Переключить на ${theme === 'light' ? 'тёмную' : 'светлую'} тему`}
              >
                <Sun className={`w-4 h-4 ${theme === 'dark' ? 'hidden' : 'block'}`} />
                <Moon className={`w-4 h-4 ${theme === 'dark' ? 'block' : 'hidden'}`} />
              </Button>
              <Avatar>
                {user?.photoUrl ? (
                  <AvatarImage src={user.photoUrl} alt={user.firstName} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground">{user?.firstName.charAt(0).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside className="hidden md:block w-64 my-4 ml-4 border-r rounded-lg border-border bg-card">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main 
          className="flex-1 overflow-auto"
          style={{ 
            paddingBottom: `calc(82px + ${safeAreaInset.bottom}px)` 
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border backdrop-blur-xl bg-card/90"
        style={{ paddingBottom: `${safeAreaInset.bottom}px` }}
      >
        <nav className="flex justify-around p-2 pt-2.5">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl font-semibold">Telegram Debug Info</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugPanel(false)}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono bg-muted/50 p-4 rounded-lg overflow-auto">
                {JSON.stringify(getTelegramDebugInfo(), null, 2)}
              </pre>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDebugPanel(false)}
              >
                Закрыть
              </Button>
              <Button
                type="button"
                onClick={handleCopyDebugInfo}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                {copySuccess ? 'Скопировано!' : 'Скопировать JSON'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
