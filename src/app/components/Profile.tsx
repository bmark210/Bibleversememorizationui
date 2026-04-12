"use client";

import React from "react";
import { useTrainingFontStore } from "@/app/stores/trainingFontStore";
import { useTelegram } from "../contexts/TelegramContext";
import { Feedback } from "./Feedback";
import { AppSurface } from "./ui/AppSurface";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { AVATAR_SIZE, PAGE_COMPACT_PADDING } from "./ui/responsiveTokens";
import { Switch } from "./ui/switch";
import { cn } from "./ui/utils";

type Theme = "light" | "dark";

const PAGE_SHELL =
  "mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col";

const SETTINGS_ROW =
  "flex items-center justify-between gap-4 py-3.5";

const FONT_BUTTON =
  "flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-sm font-medium transition-[background-color,border-color,color,box-shadow]";

const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted";

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

  const profileName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Пользователь Telegram";
  const usernameLabel = user?.username
    ? `@${user.username}`
    : telegramId
      ? `ID ${telegramId}`
      : "Telegram";
  const canOpenCurrentProfile = Boolean(telegramId && onOpenPlayerProfile);

  const handleOpenCurrentProfile = React.useCallback(() => {
    if (!telegramId || !onOpenPlayerProfile) return;
    onOpenPlayerProfile({
      telegramId,
      name: profileName,
      avatarUrl: effectiveAvatarUrl,
    });
  }, [effectiveAvatarUrl, onOpenPlayerProfile, profileName, telegramId]);

  return (
    <section
      className={cn(
        PAGE_SHELL,
        PAGE_COMPACT_PADDING,
        "overflow-y-auto overscroll-contain",
      )}
    >
      <div className="flex flex-col gap-3 sm:gap-4">
        <AppSurface className="p-4 sm:p-5">
          {canOpenCurrentProfile ? (
            <button
              type="button"
              onClick={handleOpenCurrentProfile}
              className="flex w-full items-center gap-3 text-left sm:gap-4"
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
                <div className="truncate text-xl font-semibold text-text-primary">
                  {profileName}
                </div>
                <div className="truncate text-sm text-text-muted">
                  {usernameLabel}
                </div>
                <p className="mt-1.5 text-sm leading-5 text-text-secondary">
                  Ваш профиль и основные настройки приложения.
                </p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3 sm:gap-4">
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
                <div className="truncate text-xl font-semibold text-text-primary">
                  {profileName}
                </div>
                <div className="truncate text-sm text-text-muted">
                  {usernameLabel}
                </div>
                <p className="mt-1.5 text-sm leading-5 text-text-secondary">
                  Ваш профиль и основные настройки приложения.
                </p>
              </div>
            </div>
          )}
        </AppSurface>

        <AppSurface className="p-4 sm:p-5">
          <div className="mb-3">
            <div className={SECTION_LABEL}>Настройки</div>
            <p className="mt-1 text-sm leading-5 text-text-secondary">
              Тема интерфейса и размер текста для тренировки.
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-border-subtle bg-bg-elevated/70 px-4 sm:px-5">
            <div className={SETTINGS_ROW}>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary">
                  Тема
                </div>
                <div className="text-xs text-text-muted">Тёмная тема</div>
              </div>

              <Switch
                checked={theme === "dark"}
                onCheckedChange={onToggleTheme}
                aria-label="Тёмная тема"
              />
            </div>

            <div className="border-t border-border-subtle" />

            <div className={SETTINGS_ROW}>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary">
                  Шрифт
                </div>
                <div className="text-xs text-text-muted">
                  Размер текста в тренировке
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-1.5">
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
                        : "border border-transparent bg-bg-subtle text-text-secondary hover:bg-bg-surface hover:text-text-primary",
                    )}
                    aria-label={`Шрифт: ${option.label}`}
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
          </div>
        </AppSurface>

        <AppSurface className="p-4 sm:p-5">
          <div className="mb-3">
            <div className={SECTION_LABEL}>Обратная связь</div>
            <p className="mt-1 text-sm leading-5 text-text-secondary">
              Напишите, если нашли баг, увидели неудобство или хотите предложить
              улучшение.
            </p>
          </div>

          <Feedback telegramId={telegramId} />
        </AppSurface>
      </div>
    </section>
  );
}
