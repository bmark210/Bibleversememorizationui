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
  contentMode?: 'scroll' | 'fit';
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
  contentMode = 'scroll',
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
  const isFitContent = contentMode === 'fit';

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {isTelegramFullscreen && !hideAppChrome ? (
        <header
          id="app-layout-header"
          className={`sticky top-0 z-10 overflow-hidden border-b border-border-subtle bg-bg-overlay shadow-[var(--shadow-soft)] backdrop-blur-2xl transition-[opacity,transform] duration-400 ease-out ${
            isContentReady ? 'opacity-100 translate-y-0' : 'opacity-0'
          }`}
          style={{ paddingTop: `${topInset}px` }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex min-h-12 items-center justify-center">
              <div className="truncate [font-family:var(--font-heading)] text-sm font-semibold tracking-[0.08em] uppercase text-brand-primary">
                {pageTitle}
              </div>
            </div>
          </div>
        </header>
      ) : null}

      <div className="flex min-h-0 w-full max-w-7xl flex-1 min-w-0 mx-auto">
        {/* Sidebar Navigation */}
        <aside
          data-tour="app-nav"
          className="hidden md:block w-72 my-4 ml-4 rounded-[2rem] border border-border-subtle bg-bg-overlay shadow-[var(--shadow-soft)] backdrop-blur-2xl"
        >
          <nav className="p-4 space-y-1.5">
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
                  'flex min-h-12 w-full items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-sm transition-[background-color,border-color,color,box-shadow]',
                  isActive
                    ? 'border-brand-primary/20 bg-bg-elevated text-brand-primary shadow-[var(--shadow-soft)]'
                    : 'border-transparent text-text-secondary hover:border-border-subtle hover:bg-bg-elevated hover:text-text-primary'
                )}>
                  <Icon className={cn("w-5 h-5", isActive ? "text-brand-primary" : "text-text-muted")} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className={cn(
            "min-w-0 flex-1 min-h-0 [overflow-x:clip]",
            isFitContent ? "overflow-hidden" : "overflow-y-auto overscroll-contain",
          )}
          style={{
            paddingBottom: hideAppChrome
              ? `${bottomInset}px`
              : isKeyboardOpen
                ? `${bottomInset}px`
                : `calc(var(--app-bottom-nav-clearance, 74px) + ${bottomInset}px)`
          }}
        >
          <div
            className={cn(
              "min-h-0",
              isFitContent && "flex h-full flex-col overflow-hidden",
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div
        data-tour="app-nav"
        className={`md:hidden fixed bottom-0 left-0 right-0 transition-[opacity,transform] duration-300 ease-out ${
          hideAppChrome || !isContentReady
            ? 'opacity-0 translate-y-3 pointer-events-none'
            : isKeyboardOpen
              ? 'opacity-0 translate-y-full pointer-events-none'
              : 'opacity-100 translate-y-0'
        }`}
        style={{ paddingBottom: `${Math.max(bottomInset, 8)}px` }}
      >
        <nav className="mx-3 flex justify-around rounded-[1.75rem] border border-border-subtle bg-bg-overlay px-2 py-2.5 shadow-[var(--shadow-floating)] backdrop-blur-2xl [@media(max-width:420px)]:rounded-[1.6rem] [@media(max-width:420px)]:py-2 [@media(max-height:760px)]:py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                type="button"
                key={item.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNavigateClick(item.id)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.1rem] px-2 py-2 transition-[background-color,color,box-shadow] [@media(max-width:420px)]:gap-0.5 [@media(max-width:420px)]:rounded-[1rem] [@media(max-width:420px)]:py-1.5 [@media(max-height:760px)]:py-1.5 ${
                  isActive
                    ? 'bg-bg-elevated text-brand-primary shadow-[var(--shadow-soft)]'
                    : 'text-text-muted'
                }`}
              >
                <Icon className="h-5 w-5 [@media(max-width:420px)]:h-4 [@media(max-width:420px)]:w-4" />
                <span className="text-[11px] font-medium [@media(max-width:420px)]:text-[10px]">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
