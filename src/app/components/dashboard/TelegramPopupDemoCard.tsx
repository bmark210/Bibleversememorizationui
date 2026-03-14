"use client";

import { useEffect, useMemo, useState } from "react";
import { Palette, Smartphone } from "lucide-react";
import { useTelegram } from "@/app/contexts/TelegramContext";
import {
  getTelegramWebApp,
  isTelegramDevMock,
  type TelegramPopupParams,
} from "@/app/lib/telegramWebApp";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { cn } from "../ui/utils";

type AppTheme = "light" | "dark";
type PopupSource = "native" | "preview";

type PopupResult = {
  source: PopupSource;
  label: string;
};

const TELEGRAM_POPUP_PARAMS: TelegramPopupParams = {
  title: "Завершить сессию?",
  message: "Если выйти сейчас, прогресс текущей сессии не сохранится.",
  buttons: [
    { id: "leave", type: "destructive", text: "Выйти" },
    { id: "stay", type: "default", text: "Остаться" },
    { id: "close", type: "close", text: "Закрыть" },
  ],
};

function formatThemeLabel(theme: AppTheme) {
  return theme === "dark" ? "Тёмная" : "Светлая";
}

function describeResult(source: PopupSource, buttonId?: string): PopupResult {
  const prefix = source === "native" ? "Telegram popup" : "Styled preview";

  if (buttonId === "leave") {
    return { source, label: `${prefix}: выбрано "Выйти"` };
  }

  if (buttonId === "stay") {
    return { source, label: `${prefix}: выбрано "Остаться"` };
  }

  return { source, label: `${prefix}: окно закрыто` };
}

function StatusBadge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TelegramPopupDemoCard({ appTheme }: { appTheme: AppTheme }) {
  const { colorScheme } = useTelegram();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [lastResult, setLastResult] = useState<PopupResult | null>(null);

  const hasNativeTelegramPopup = useMemo(() => {
    const webApp = getTelegramWebApp();
    return Boolean(webApp?.showPopup) && !isTelegramDevMock(webApp);
  }, []);

  const themeMismatch = appTheme !== colorScheme;
  const appThemeLabel = formatThemeLabel(appTheme);
  const telegramThemeLabel = formatThemeLabel(colorScheme);

  useEffect(() => {
    if (!isPreviewOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsPreviewOpen(false);
      setLastResult(describeResult("preview"));
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isPreviewOpen]);

  const handleOpenNativePopup = () => {
    const webApp = getTelegramWebApp();
    if (!webApp?.showPopup || isTelegramDevMock(webApp)) {
      return;
    }

    webApp.showPopup(TELEGRAM_POPUP_PARAMS, (buttonId) => {
      setLastResult(describeResult("native", buttonId));
    });
  };

  const handleOpenPreview = () => {
    setIsPreviewOpen(true);
  };

  const handlePreviewResult = (buttonId?: string) => {
    setIsPreviewOpen(false);
    setLastResult(describeResult("preview", buttonId));
  };

  return (
    <>
      <Card className="mb-5 gap-4 rounded-[28px] border-border/65 bg-card/55 p-4 shadow-none backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <StatusBadge className="w-fit border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300">
              Тест popup
            </StatusBadge>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-primary">
                Telegram popup и themed preview
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Нативный <code>showPopup()</code> можно открыть внутри Telegram Mini App, но его
                нельзя оформить Tailwind-классами приложения. Для точного совпадения со стилем
                приложения нужен свой modal, поэтому ниже есть и нативный тест, и styled preview.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge className="border-border/60 bg-background/60 text-foreground/75">
                <Palette className="mr-2 h-3.5 w-3.5" />
                Тема приложения: {appThemeLabel}
              </StatusBadge>
              <StatusBadge className="border-border/60 bg-background/60 text-foreground/75">
                <Smartphone className="mr-2 h-3.5 w-3.5" />
                Тема Telegram: {telegramThemeLabel}
              </StatusBadge>
              <StatusBadge
                className={
                  hasNativeTelegramPopup
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                }
              >
                {hasNativeTelegramPopup ? "Нативный popup доступен" : "Нативный popup только в Telegram"}
              </StatusBadge>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm leading-6 text-foreground/78">
              {hasNativeTelegramPopup ? (
                themeMismatch ? (
                  <p>
                    Сейчас тема приложения и тема Telegram не совпадают. Нативный popup Telegram
                    может выглядеть иначе, даже если вы переключаете тему внутри приложения.
                  </p>
                ) : (
                  <p>
                    Сейчас тема приложения совпадает с темой Telegram. Нативный popup будет ближе
                    по настроению, но всё равно останется нативным окном Telegram.
                  </p>
                )
              ) : (
                <p>
                  В браузере и dev-моке Telegram popup недоступен. Для проверки стилизации и
                  переключения темы используйте styled preview.
                </p>
              )}
            </div>

            {lastResult ? (
              <p
                className={cn(
                  "text-sm",
                  lastResult.source === "native"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-primary/85",
                )}
              >
                {lastResult.label}
              </p>
            ) : null}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 lg:max-w-[240px]">
            <Button
              type="button"
              className="h-11 rounded-full"
              disabled={!hasNativeTelegramPopup}
              onClick={handleOpenNativePopup}
            >
              Открыть Telegram popup
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full border-border/70 bg-background/60 text-foreground/82"
              onClick={handleOpenPreview}
            >
              Открыть styled preview
            </Button>
          </div>
        </div>
      </Card>

      {isPreviewOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => handlePreviewResult()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="telegram-popup-preview-title"
            aria-describedby="telegram-popup-preview-description"
            className="relative w-full max-w-[28rem] overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 p-5 shadow-[0_32px_90px_rgba(0,0,0,0.36)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />

            <div className="relative space-y-6 text-center">
              <div className="space-y-3">
                <h3
                  id="telegram-popup-preview-title"
                  className="text-2xl font-semibold tracking-tight text-foreground"
                >
                  {TELEGRAM_POPUP_PARAMS.title}
                </h3>
                <p
                  id="telegram-popup-preview-description"
                  className="mx-auto max-w-sm text-base leading-7 text-muted-foreground"
                >
                  {TELEGRAM_POPUP_PARAMS.message}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  className="h-12 rounded-full text-base font-semibold"
                  onClick={() => handlePreviewResult("leave")}
                >
                  Выйти
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-full border-border/70 bg-background/60 text-base font-semibold text-foreground/80"
                  onClick={() => handlePreviewResult("stay")}
                >
                  Остаться
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
