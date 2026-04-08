"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Dumbbell,
  LayoutDashboard,
  User,
  Users,
} from "lucide-react";
import { getTelegramWebApp } from "@/app/lib/telegramWebApp";
import { useTelegramSafeArea } from "../hooks/useTelegramSafeArea";
import { triggerHaptic } from "../lib/haptics";
import { useTelegramUiStore } from "../stores/telegramUiStore";
import { useScreenStore } from "../stores/screenStore";
import { cn } from "./ui/utils";
import type { AppRootPage } from "@/app/domain/appPages";

interface LayoutProps {
  children: React.ReactNode;
  onNavigateIntent?: (page: string) => void;
  isContentReady?: boolean;
  hideChrome?: boolean;
  contentMode?: "scroll" | "fit" | "fit-strict";
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Главная",
  verses: "Библия",
  training: "Тренировка",
  community: "Сообщество",
  profile: "Профиль",
};

const DEFAULT_NAV_ITEMS = [
  { id: "dashboard", label: "Главная", icon: LayoutDashboard },
  { id: "verses", label: "Тексты", icon: BookOpen },
  { id: "training", label: "Тренировка", icon: Dumbbell },
  { id: "community", label: "Сообщество", icon: Users },
  { id: "profile", label: "Профиль", icon: User },
] as const;

export function Layout({
  children,
  onNavigateIntent,
  isContentReady = false,
  hideChrome = false,
  contentMode = "scroll",
}: LayoutProps) {
  const { active: currentPage, go } = useScreenStore();
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen,
  );
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [bottomNavClearance, setBottomNavClearance] = useState(0);
  const mobileNavShellRef = React.useRef<HTMLDivElement | null>(null);
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;
  const pageTitle = PAGE_TITLES[currentPage] ?? "Bible Memory";
  const hideAppChrome = hideChrome;
  const isFitContent = contentMode === "fit" || contentMode === "fit-strict";
  const isFitStrict = contentMode === "fit-strict";
  const navItems = DEFAULT_NAV_ITEMS;
  const isExtendedNav = navItems.length > 4;

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

  React.useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const rootStyle = document.documentElement.style;
    const shell = mobileNavShellRef.current;
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const extraGap = 0;

    const updateClearance = () => {
      const measuredShellHeight = shell
        ? Math.ceil(shell.getBoundingClientRect().height)
        : 0;
      const shouldReserveNavSpace =
        !mediaQuery.matches && !hideAppChrome && !isKeyboardOpen;
      const nextClearance = shouldReserveNavSpace
        ? measuredShellHeight + extraGap
        : 0;

      setBottomNavClearance((prev) =>
        prev === nextClearance ? prev : nextClearance,
      );
      rootStyle.setProperty("--app-bottom-nav-clearance", `${nextClearance}px`);
    };

    updateClearance();

    const resizeObserver =
      shell && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateClearance)
        : null;

    if (resizeObserver && shell) {
      resizeObserver.observe(shell);
    }

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateClearance);
    } else {
      mediaQuery.addListener(updateClearance);
    }
    window.addEventListener("resize", updateClearance);
    window.visualViewport?.addEventListener("resize", updateClearance);

    return () => {
      resizeObserver?.disconnect();
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", updateClearance);
      } else {
        mediaQuery.removeListener(updateClearance);
      }
      window.removeEventListener("resize", updateClearance);
      window.visualViewport?.removeEventListener("resize", updateClearance);
      rootStyle.setProperty("--app-bottom-nav-clearance", "0px");
    };
  }, [bottomInset, hideAppChrome, isKeyboardOpen]);

  const handleNavigateClick = (page: string) => {
    if (page === currentPage) {
      triggerHaptic("light");
      return;
    }

    triggerHaptic("medium");
    go(page as AppRootPage);
  };

  const handleNavigateIntent = (page: string) => {
    if (page === currentPage) {
      return;
    }

    onNavigateIntent?.(page);
  };

  const mainBottomPadding = hideAppChrome
    ? bottomInset
    : isKeyboardOpen
      ? bottomInset
      : bottomNavClearance;

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {isTelegramFullscreen && !hideAppChrome ? (
        <header
          id="app-layout-header"
          className={`sticky top-0 z-10 overflow-hidden border-b border-border-subtle bg-bg-overlay shadow-[var(--shadow-soft)] backdrop-blur-2xl transition-[opacity,transform] duration-400 ease-out ${
            isContentReady ? "opacity-100 translate-y-0" : "opacity-0"
          }`}
          style={{ paddingTop: `${topInset}px` }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex min-h-10 items-center justify-center">
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
                  aria-current={isActive ? "page" : undefined}
                  onPointerEnter={() => handleNavigateIntent(item.id)}
                  onFocus={() => handleNavigateIntent(item.id)}
                  onTouchStart={() => handleNavigateIntent(item.id)}
                  onClick={() => handleNavigateClick(item.id)}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-sm transition-[background-color,border-color,color,box-shadow]",
                    isActive
                      ? "border-brand-primary/20 bg-bg-elevated text-brand-primary shadow-[var(--shadow-soft)]"
                      : "border-transparent text-text-secondary hover:border-border-subtle hover:bg-bg-elevated hover:text-text-primary",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      isActive ? "text-brand-primary" : "text-text-muted",
                    )}
                  />
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
            isFitContent
              ? "overflow-hidden short-phone:overflow-y-auto short-phone:overscroll-contain"
              : "overflow-y-auto overscroll-contain",
          )}
          style={{
            paddingBottom: `${mainBottomPadding}px`,
          }}
        >
          <div
            className={cn(
              "min-h-0",
              isFitContent && !isFitStrict &&
                "flex h-full flex-col overflow-hidden short-phone:h-auto short-phone:min-h-full short-phone:overflow-visible",
              isFitStrict &&
                "flex h-full flex-col overflow-hidden",
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div
        ref={mobileNavShellRef}
        data-tour="app-nav"
        className={`md:hidden fixed bottom-0 left-0 right-0 transition-[opacity,transform] duration-300 ease-out ${
          hideAppChrome || !isContentReady
            ? "opacity-0 translate-y-3 pointer-events-none"
            : isKeyboardOpen
              ? "opacity-0 translate-y-full pointer-events-none"
              : "opacity-100 translate-y-0"
        }`}
      >
        <nav
          style={{ paddingBottom: `${Math.max(bottomInset, 20)}px` }}
          className={cn(
            "flex justify-around border border-border-subtle bg-bg-overlay py-2.5 shadow-[var(--shadow-floating)] backdrop-blur-2xl narrow:py-2",
            isExtendedNav ? "px-1.5 narrow:px-1.5" : "px-2.5 narrow:px-2",
          )}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                type="button"
                key={item.id}
                aria-current={isActive ? "page" : undefined}
                onPointerEnter={() => handleNavigateIntent(item.id)}
                onFocus={() => handleNavigateIntent(item.id)}
                onTouchStart={() => handleNavigateIntent(item.id)}
                onClick={() => handleNavigateClick(item.id)}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-[1.2rem] py-2 transition-[background-color,color,box-shadow] narrow:gap-1 narrow:rounded-[1rem] narrow:py-1.5",
                  isExtendedNav
                    ? "px-1.5 narrow:px-1"
                    : "px-2.5 narrow:px-2",
                  isActive
                    ? "bg-bg-elevated border border-border text-brand-primary shadow-[var(--shadow-soft)]"
                    : "text-text-muted",
                )}
              >
                <Icon className="h-6 w-6 narrow:h-[1.1rem] narrow:w-[1.1rem]" />
                <span
                  className={cn(
                    "max-w-full truncate font-medium leading-none",
                    isExtendedNav
                      ? "text-[10px] narrow:text-[9px]"
                      : "text-xs narrow:text-[11px]",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
