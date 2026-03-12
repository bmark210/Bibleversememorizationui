'use client'

import React, { useEffect, useState } from 'react';
import { BookOpen, Dumbbell, LayoutDashboard, User } from 'lucide-react';
import { getTelegramWebApp } from '@/app/lib/telegramWebApp';
import { useTelegramSafeArea } from '../hooks/useTelegramSafeArea';
import { triggerHaptic } from '../lib/haptics';
import { useTelegramUiStore } from '../stores/telegramUiStore';
import { cn } from './ui/utils';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  isContentReady?: boolean;
  hideChrome?: boolean;
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Главная',
  verses: 'Стихи',
  training: 'Тренировка',
  profile: 'Профиль',
};

export function Layout({
  children,
  currentPage,
  onNavigate,
  isContentReady = false,
  hideChrome = false,
}: LayoutProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen
  );
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;
  const pageTitle = PAGE_TITLES[currentPage] ?? 'Bible Memory';

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

  const hideAppChrome = hideChrome;

  return (
    <div className="min-h-dvh flex flex-col">
      {isTelegramFullscreen && !hideAppChrome ? (
        <header
          className={`bg-card/90 backdrop-blur-xl border-b border-border sticky top-0 z-10 overflow-hidden transition-[opacity,transform] duration-400 ease-out ${
            isContentReady ? 'opacity-100 translate-y-0' : 'opacity-0'
          }`}
          style={{ paddingTop: `${topInset}px` }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex min-h-11 items-center justify-center">
              <div className="truncate text-sm font-semibold text-primary">
                {pageTitle}
              </div>
            </div>
          </div>
        </header>
      ) : null}

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
              : isKeyboardOpen ? `${bottomInset}px` : `calc(74px + ${bottomInset}px)`
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
