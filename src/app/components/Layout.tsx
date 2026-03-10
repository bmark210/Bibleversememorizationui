'use client'

import React, { useEffect, useState } from 'react';
import { BookOpen, Dumbbell, LayoutDashboard, User } from 'lucide-react';
import { getTelegramWebApp } from '@/app/lib/telegramWebApp';
import { useTelegramSafeArea } from '../hooks/useTelegramSafeArea';
import { triggerHaptic } from '../lib/haptics';
import { cn } from './ui/utils';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  isContentReady?: boolean;
  showTelegramExitButton?: boolean;
  onTelegramExit?: () => void;
  hideChrome?: boolean;
}

export function Layout({
  children,
  currentPage,
  onNavigate,
  isContentReady = false,
  // showTelegramExitButton = false,
  // onTelegramExit,
  hideChrome = false,
}: LayoutProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;
  // const shouldShowTelegramExitButton =
  //   isInTelegram && showTelegramExitButton && typeof onTelegramExit === 'function';

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tg = getTelegramWebApp();
    const vv = window.visualViewport;

    const check = () => {
      // Telegram's viewportChanged is the most reliable source in Telegram WebApp
      if (tg?.viewportStableHeight && tg?.viewportHeight) {
        setIsKeyboardOpen(tg.viewportStableHeight - tg.viewportHeight > 100);
        return;
      }
      // Fallback for browser/dev
      if (vv) setIsKeyboardOpen(window.innerHeight - vv.height > 150);
    };

    check();
    vv?.addEventListener("resize", check);
    tg?.onEvent?.("viewportChanged", check);
    return () => {
      vv?.removeEventListener("resize", check);
      tg?.offEvent?.("viewportChanged", check);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
    { id: 'verses', label: 'Стихи', icon: BookOpen },
    { id: 'training', label: 'Тренировка', icon: Dumbbell },
    // { id: 'progress-map', label: 'Прогресс', icon: ChartLine },
    { id: 'profile', label: 'Профиль', icon: User },
  ];

  const handleNavigateClick = (page: string) => {
    if (page === currentPage) {
      triggerHaptic('light');
      return;
    }

    triggerHaptic('medium');
    onNavigate(page);
  };

  const isFullscreenPage = currentPage === 'progress-map'
  const hideAppChrome = isFullscreenPage || hideChrome;

  return (
    <div className={`min-h-dvh flex flex-col${isFullscreenPage ? ' overflow-hidden' : ''}`}>
      {/* Header — hidden on fullscreen pages and active immersive sessions */}
      <header
        className={`bg-card border-b border-border sticky top-0 z-10 overflow-hidden transition-[opacity,transform] duration-400 ease-out ${
          isContentReady ? 'opacity-100 translate-y-0' : 'opacity-0'
        }${hideAppChrome ? ' hidden' : ''}`}
        style={{ paddingTop: `${topInset}px` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
          <div className="relative flex items-center justify-center h-10">
            <div className="flex items-center gap-2">
                {/* <BookOpen className="w-5 h-5 text-primary" /> */}
              {/* <h1 className="text-xl font-semibold text-primary">B Memory</h1> */}
            </div>

            {/* {shouldShowTelegramExitButton ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                haptic="medium"
                onClick={onTelegramExit}
                className="absolute right-0 rounded-full border-border/60 bg-background/65 px-3 text-foreground/80 shadow-sm backdrop-blur-xl hover:bg-background/85 hover:text-foreground"
                aria-label="Выйти из приложения"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            ) : null} */}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex max-w-7xl w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside className="hidden md:block w-64 my-4 ml-4 border-r rounded-lg border-border bg-card">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  type="button"
                  key={item.id}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleNavigateClick(item.id)}
                  className={cn(
                  'flex min-h-8 w-full items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/12 text-primary border-primary/30 border'
                    : 'text-primary/75'
                )}>
                  <Icon className="w-5 h-5 text-primary/75" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className="flex-1 min-h-0 overflow-x-hidden md:overflow-auto"
          style={{
            paddingBottom: hideAppChrome
              ? `${bottomInset}px`
              : currentPage === 'progress-map'
              ? 0
              : isKeyboardOpen ? `${bottomInset}px` : `calc(82px + ${bottomInset}px)`
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 border-t border-border backdrop-blur-xl bg-card/90 transition-[opacity,transform] duration-300 ease-out ${
          hideAppChrome || !isContentReady
            ? 'opacity-0 translate-y-3 pointer-events-none'
            : isKeyboardOpen
              ? 'opacity-0 translate-y-full pointer-events-none'
              : 'opacity-100 translate-y-0'
        }`}
        style={{ paddingBottom: `${bottomInset}px` }}
      >
        <nav className="flex justify-around p-2 pt-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                type="button"
                key={item.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNavigateClick(item.id)}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
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
    </div>
  );
}
