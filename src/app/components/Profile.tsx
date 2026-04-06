"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useTrainingFontStore } from "@/app/stores/trainingFontStore";
import {
  getTelegramWebApp,
  isTelegramDevMock,
} from "@/app/lib/telegramWebApp";
import { useTelegram } from "../contexts/TelegramContext";
import { Feedback } from "./Feedback";
import { AppSurface } from "./ui/AppSurface";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  AVATAR_SIZE,
  PAGE_COMPACT_PADDING,
  SEGMENTED_TABS_TRIGGER,
} from "./ui/responsiveTokens";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "./ui/utils";

type Theme = "light" | "dark";
type ProfileTab = "settings" | "feedback";

const PAGE_SHELL =
  "mx-auto grid h-full min-h-0 w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden short-phone:h-auto short-phone:min-h-full short-phone:grid-rows-[auto_auto] short-phone:overflow-visible";

const SETTINGS_CARD_ROW =
  "flex items-center justify-between gap-3 rounded-[1.15rem] border border-border-subtle bg-bg-elevated px-3.5 py-2.5 shadow-[var(--shadow-soft)]";

const FONT_BUTTON =
  "flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-medium transition-[background-color,border-color,color,box-shadow]";

const SUMMARY_TILE_LABEL =
  "text-[11px] uppercase tracking-[0.14em] text-text-muted";

const SETTINGS_INFO_CARD =
  "flex h-full flex-col justify-between rounded-[1.15rem] border border-border-subtle bg-bg-elevated px-3.5 py-3 shadow-[var(--shadow-soft)]";

const TRAINING_FONT_OPTIONS = [
  { value: "small", label: "Малый", preview: 14 },
  { value: "medium", label: "Средний", preview: 17 },
  { value: "large", label: "Крупный", preview: 20 },
  { value: "extra-large", label: "Очень крупный", preview: 24 },
] as const;

interface ProfileProps {
  theme: Theme;
  onToggleTheme: () => void;
  telegramId?: string | null;
  currentUserAvatarUrl?: string | null;
  onOpenPlayerProfile?: (player: {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Profile({
  theme,
  onToggleTheme,
  telegramId = null,
  currentUserAvatarUrl,
  onOpenPlayerProfile,
}: ProfileProps) {
  const { user } = useTelegram();
  const effectiveAvatarUrl = currentUserAvatarUrl ?? user?.photoUrl ?? null;
  const trainingFontStore = useTrainingFontStore();
  const trainingFontSize = trainingFontStore.trainingFontSize;

  const [activeTab, setActiveTab] = React.useState<ProfileTab>("settings");

  const profileName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Пользователь Telegram";
  const usernameLabel = user?.username
    ? `@${user.username}`
    : telegramId
      ? `ID ${telegramId}`
      : "Telegram";
  const themeLabel = theme === "dark" ? "Тёмная" : "Светлая";
  const fontOption =
    TRAINING_FONT_OPTIONS.find((option) => option.value === trainingFontSize) ??
    TRAINING_FONT_OPTIONS[1];
  const canOpenCurrentProfile = Boolean(telegramId && onOpenPlayerProfile);

  const handleExitApplication = React.useCallback(() => {
    const webApp = getTelegramWebApp();

    if (
      webApp &&
      !isTelegramDevMock(webApp) &&
      typeof webApp.close === "function"
    ) {
      webApp.close();
      return;
    }

    window.close();
  }, []);

  const handleOpenCurrentProfile = React.useCallback(() => {
    if (!telegramId || !onOpenPlayerProfile) return;
    onOpenPlayerProfile({
      telegramId,
      name: profileName,
      avatarUrl: effectiveAvatarUrl,
    });
  }, [effectiveAvatarUrl, onOpenPlayerProfile, profileName, telegramId]);

  return (
    <section className={cn(PAGE_SHELL, PAGE_COMPACT_PADDING)}>
      <AppSurface className="relative overflow-hidden shrink-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-gold-rgb),0.12),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(var(--accent-bronze-rgb),0.1),transparent_42%)]" />

        <div className="relative flex items-center justify-between gap-3">
          {telegramId && onOpenPlayerProfile ? (
            <button
              type="button"
              onClick={handleOpenCurrentProfile}
              className="flex min-w-0 items-center gap-3 text-left"
              aria-label="Открыть ваш профиль"
            >
              <Avatar
                className={cn(
                  AVATAR_SIZE,
                  "border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]",
                )}
              >
                {effectiveAvatarUrl ? (
                  <AvatarImage src={effectiveAvatarUrl} alt={profileName} />
                ) : null}
                <AvatarFallback className="bg-status-mastered-soft text-brand-primary">
                  {getInitials(profileName || "TG")}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-text-primary sm:text-lg">
                  {profileName}
                </div>
                <div className="truncate text-sm text-text-muted">
                  {usernameLabel}
                </div>
              </div>
            </button>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                className={cn(
                  AVATAR_SIZE,
                  "border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]",
                )}
              >
                {effectiveAvatarUrl ? (
                  <AvatarImage src={effectiveAvatarUrl} alt={profileName} />
                ) : null}
                <AvatarFallback className="bg-status-mastered-soft text-brand-primary">
                  {getInitials(profileName || "TG")}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-text-primary sm:text-lg">
                  {profileName}
                </div>
                <div className="truncate text-sm text-text-muted">
                  {usernameLabel}
                </div>
              </div>
            </div>
          )}

          <div className="hidden rounded-full border border-border-subtle bg-bg-elevated px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted shadow-[var(--shadow-soft)] sm:inline-flex">
            Профиль
          </div>
        </div>
      </AppSurface>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ProfileTab)}
        className="min-h-0 flex-1 gap-3"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-[1.35rem]">
          <TabsTrigger value="settings" className={SEGMENTED_TABS_TRIGGER}>
            Настройки
          </TabsTrigger>
          <TabsTrigger value="feedback" className={SEGMENTED_TABS_TRIGGER}>
            Отзыв
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="min-h-0">
          <AppSurface className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3 short-phone:h-auto short-phone:grid-rows-none">
            <div className={SETTINGS_CARD_ROW}>
              <div className="text-sm font-medium text-text-primary">Тема</div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={onToggleTheme}
                aria-label="Тёмная тема"
              />
            </div>

            <div className={SETTINGS_CARD_ROW}>
              <div className="text-sm font-medium text-text-primary">Шрифт</div>

              <div className="flex flex-wrap justify-end gap-1">
                {TRAINING_FONT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      trainingFontStore.setTrainingFontSize(option.value)
                    }
                    className={cn(
                      FONT_BUTTON,
                      trainingFontSize === option.value
                        ? "border border-brand-primary/20 bg-status-mastered-soft text-brand-primary shadow-[var(--shadow-soft)]"
                        : "border border-transparent bg-bg-subtle text-text-secondary hover:text-text-primary",
                    )}
                  >
                    <span
                      style={{ fontSize: option.preview }}
                      className="font-serif leading-none"
                    >
                      Аа
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid min-h-0 grid-cols-2 gap-2 short-phone:grid-cols-1">
              <div className={SETTINGS_INFO_CARD}>
                <div>
                  <div className={SUMMARY_TILE_LABEL}>Профиль</div>
                  <div className="mt-2 truncate text-sm font-medium text-text-primary">
                    {profileName}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-text-muted">
                    {usernameLabel}
                  </div>
                </div>

                {canOpenCurrentProfile ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenCurrentProfile}
                    className="mt-3 h-9 rounded-full px-3 text-xs"
                  >
                    Открыть профиль
                  </Button>
                ) : (
                  <div className="mt-3 text-xs text-text-muted">
                    Профиль доступен после инициализации Telegram.
                  </div>
                )}
              </div>

              <div className={SETTINGS_INFO_CARD}>
                <div>
                  <div className={SUMMARY_TILE_LABEL}>Сеанс</div>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-secondary">Режим</span>
                      <span className="font-medium text-text-primary">
                        Fullscreen
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-secondary">Тема</span>
                      <span className="font-medium text-text-primary">
                        {themeLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-secondary">Шрифт</span>
                      <span className="font-medium text-text-primary">
                        {fontOption.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-text-muted">
                  Настройки применяются сразу.
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Button
                type="button"
                variant="destructive"
                onClick={handleExitApplication}
                className="h-10 w-full rounded-full px-4 text-sm sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </Button>
            </div>
          </AppSurface>
        </TabsContent>

        <TabsContent value="feedback" className="min-h-0">
          <AppSurface className="h-full min-h-0 short-phone:h-auto">
            <Feedback telegramId={telegramId} />
          </AppSurface>
        </TabsContent>
      </Tabs>
    </section>
  );
}
