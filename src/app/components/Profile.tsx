"use client";

import React from "react";
import { BookOpen, Moon } from "lucide-react";
import { useTrainingFontStore } from "@/app/stores/trainingFontStore";
import {
  TRANSLATION_OPTIONS,
  useTranslationStore,
  type AppTranslation,
} from "@/app/stores/translationStore";
import { useTelegram } from "../contexts/TelegramContext";
import { Feedback } from "./Feedback";
import { AppSurface } from "./ui/AppSurface";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PAGE_COMPACT_PADDING } from "./ui/responsiveTokens";
import { Switch } from "./ui/switch";
import { cn } from "./ui/utils";

type Theme = "light" | "dark";

const PAGE_SHELL =
  "mx-auto flex h-full w-full max-w-3xl flex-col gap-3 overflow-hidden";
const SECTION_LABEL =
  "shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-text-muted";

const FONT_OPTIONS = [
  { value: "small",       preview: 16, label: "Малый"         },
  { value: "medium",      preview: 20, label: "Средний"       },
  { value: "large",       preview: 24, label: "Крупный"       },
  { value: "extra-large", preview: 28, label: "Очень крупный" },
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
  const { translation, setTranslation } = useTranslationStore();

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
    onOpenPlayerProfile({
      telegramId,
      name: profileName,
      avatarUrl: effectiveAvatarUrl,
    });
  }, [effectiveAvatarUrl, onOpenPlayerProfile, profileName, telegramId]);

  const avatarEl = (
    <Avatar className="h-14 w-14 shrink-0 border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]">
      {effectiveAvatarUrl ? (
        <AvatarImage src={effectiveAvatarUrl} alt={profileName} />
      ) : null}
      <AvatarFallback className="bg-status-mastered-soft text-brand-primary text-base font-semibold">
        {getInitials(profileName)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <section className={cn(PAGE_SHELL, PAGE_COMPACT_PADDING)}>

      {/* ── User card ─────────────────────────────────────────────── */}
      <AppSurface className="shrink-0 p-4 sm:p-5">
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
      <div className="flex-[2] grid grid-rows-[auto_auto_1fr] gap-3 overflow-hidden">

        {/* Dark theme toggle */}
        <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-elevated/60 px-4 py-2">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-subtle text-text-secondary">
              <Moon className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-base font-medium text-text-primary leading-none">
                Тёмная тема
              </div>
              <div className="text-[0.8rem] text-text-muted mt-[0.3rem]">
                {theme === "dark" ? "Включена" : "Выключена"}
              </div>
            </div>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={onToggleTheme}
            aria-label="Тёмная тема"
          />
        </div>

        {/* Translation selector */}
        <TranslationSelector value={translation} onChange={setTranslation} />

        {/* Font size list — fills remaining space */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated/60">
          <div className="shrink-0 border-b border-border-subtle px-4 py-[0.875rem]">
            <div className="text-base font-medium text-text-primary leading-none">
              Шрифт тренировки
            </div>
          </div>
          <div className="flex flex-1 divide-x divide-border-subtle">
            {FONT_OPTIONS.map((opt) => {
              const active = trainingFontSize === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTrainingFontSize(opt.value)}
                  aria-label={`Шрифт: ${opt.label}`}
                  className={cn(
                    "flex flex-1 items-center justify-center px-2 py-2 transition-colors",
                    active
                      ? "bg-status-mastered-soft/35"
                      : "hover:bg-bg-surface/40 active:bg-bg-surface/60",
                  )}
                >
                  <span
                    style={{ fontSize: opt.preview }}
                    className={cn(
                      "font-serif leading-none",
                      active ? "text-brand-primary" : "text-text-secondary",
                    )}
                  >
                    Аа
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Feedback ──────────────────────────────────────────────── */}
      <AppSurface className="flex flex-[2] flex-col overflow-hidden px-4 sm:px-5 pt-4 sm:pt-5 pb-4 sm:pb-5">
        <div className={cn(SECTION_LABEL, "mb-2 mt-2")}>Обратная связь</div>
        <Feedback telegramId={telegramId} />
      </AppSurface>
    </section>
  );
}

// ─── Translation selector component ──────────────────────────────────────────

function TranslationSelector({
  value,
  onChange,
}: {
  value: AppTranslation;
  onChange: (t: AppTranslation) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated/60">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-border-subtle px-4 py-[0.6rem]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-subtle text-text-secondary">
          <BookOpen className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.75} />
        </div>
        <div>
          <div className="text-base font-medium text-text-primary leading-none">
            Перевод Библии
          </div>
          <div className="text-[0.8rem] text-text-muted mt-[0.3rem]">
            {TRANSLATION_OPTIONS.find((o) => o.value === value)?.fullLabel}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="flex divide-x divide-border-subtle">
        {TRANSLATION_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              aria-label={opt.fullLabel}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-3 py-3 transition-colors",
                active
                  ? "bg-status-mastered-soft/35"
                  : "hover:bg-bg-surface/40 active:bg-bg-surface/60",
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold leading-none",
                  active ? "text-brand-primary" : "text-text-primary",
                )}
              >
                {opt.label}
              </span>
              <span
                className={cn(
                  "text-[10px] leading-none mt-0.5",
                  active ? "text-brand-primary/70" : "text-text-muted",
                )}
              >
                {opt.lang === "ru" ? "Русский" : "English"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
