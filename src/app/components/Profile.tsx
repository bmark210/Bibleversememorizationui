"use client";

import React from "react";
import { Moon, Type } from "lucide-react";
import { useTrainingFontStore } from "@/app/stores/trainingFontStore";
import { useTelegram } from "../contexts/TelegramContext";
import { Feedback } from "./Feedback";
import { AppSurface } from "./ui/AppSurface";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PAGE_COMPACT_PADDING } from "./ui/responsiveTokens";
import { Switch } from "./ui/switch";
import { cn } from "./ui/utils";

type Theme = "light" | "dark";

const PAGE_SHELL = "mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col";
const SECTION_LABEL = "text-[10.5px] font-semibold uppercase tracking-[0.16em] text-text-muted";
const DIVIDER = "border-t border-border-subtle mx-[-1rem] sm:mx-[-1.25rem]";

const FONT_OPTIONS = [
  { value: "small",       preview: 13 },
  { value: "medium",      preview: 16 },
  { value: "large",       preview: 19 },
  { value: "extra-large", preview: 23 },
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
    .map((w) => w[0]?.toUpperCase() ?? "")
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
  const { trainingFontSize, setTrainingFontSize } = useTrainingFontStore();

  const profileName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Пользователь";
  const usernameLabel = user?.username
    ? `@${user.username}`
    : telegramId
      ? `ID ${telegramId}`
      : "Telegram";
  const canOpenProfile = Boolean(telegramId && onOpenPlayerProfile);

  const handleOpenProfile = React.useCallback(() => {
    if (!telegramId || !onOpenPlayerProfile) return;
    onOpenPlayerProfile({ telegramId, name: profileName, avatarUrl: effectiveAvatarUrl });
  }, [effectiveAvatarUrl, onOpenPlayerProfile, profileName, telegramId]);

  const avatarEl = (
    <Avatar className="h-14 w-14 shrink-0 border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]">
      {effectiveAvatarUrl ? <AvatarImage src={effectiveAvatarUrl} alt={profileName} /> : null}
      <AvatarFallback className="bg-status-mastered-soft text-brand-primary text-base font-semibold">
        {getInitials(profileName)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <section className={cn(PAGE_SHELL, PAGE_COMPACT_PADDING, "overflow-y-auto overscroll-contain")}>
      <div className="flex flex-1 flex-col gap-3">

        {/* ── User card ─────────────────────────────────────────────── */}
        <AppSurface className="p-4 sm:p-5">
          {canOpenProfile ? (
            <button
              type="button"
              onClick={handleOpenProfile}
              className="flex w-full items-center gap-4 text-left"
              aria-label="Открыть профиль"
            >
              {avatarEl}
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-text-primary leading-snug">
                  {profileName}
                </div>
                <div className="truncate text-sm text-text-muted mt-0.5">
                  {usernameLabel}
                </div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-4">
              {avatarEl}
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-text-primary leading-snug">
                  {profileName}
                </div>
                <div className="truncate text-sm text-text-muted mt-0.5">
                  {usernameLabel}
                </div>
              </div>
            </div>
          )}
        </AppSurface>

        {/* ── Settings ──────────────────────────────────────────────── */}
        <AppSurface className="px-4 sm:px-5 py-4 sm:py-5">
          <div className={cn(SECTION_LABEL, "mb-4 mt-2")}>Настройки</div>

          {/* Theme row */}
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-bg-subtle border border-border-subtle text-text-secondary">
              <Moon className="h-4.5 w-4.5" strokeWidth={1.75} />
            </div>
            <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
              <div>
                <div className="text-[0.9375rem] font-medium text-text-primary leading-snug">
                  Тёмная тема
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {theme === "dark" ? "Включена" : "Выключена"}
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={onToggleTheme}
                aria-label="Тёмная тема"
              />
            </div>
          </div>

          <div className={cn(DIVIDER, "my-4")} />

          {/* Font row */}
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-bg-subtle border border-border-subtle text-text-secondary">
              <Type className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
              <div>
                <div className="text-[0.9375rem] font-medium text-text-primary leading-snug">
                  Шрифт тренировки
                </div>
                <div className="text-xs text-text-muted mt-0.5">Размер текста стиха</div>
              </div>
              <div className="flex items-center gap-1.5">
                {FONT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTrainingFontSize(opt.value)}
                    aria-label={`Шрифт ${opt.value}`}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-[background-color,color,box-shadow]",
                      trainingFontSize === opt.value
                        ? "border border-brand-primary/20 bg-status-mastered-soft text-brand-primary shadow-[var(--shadow-soft)]"
                        : "bg-bg-subtle text-text-secondary hover:bg-bg-surface hover:text-text-primary",
                    )}
                  >
                    <span style={{ fontSize: opt.preview }} className="font-serif leading-none">
                      Аа
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AppSurface>

        {/* ── Feedback ──────────────────────────────────────────────── */}
        <AppSurface className="flex flex-1 flex-col px-4 sm:px-5 py-4 sm:py-5">
          <div className={cn(SECTION_LABEL, "mb-4 mt-2")}>Обратная связь</div>
          <div className="flex flex-1 flex-col">
            <Feedback telegramId={telegramId} />
          </div>
        </AppSurface>

      </div>
    </section>
  );
}
