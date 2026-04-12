"use client";

import React from "react";
import { Check, Moon } from "lucide-react";
import { useTrainingFontStore } from "@/app/stores/trainingFontStore";
import { useTelegram } from "../contexts/TelegramContext";
import { Feedback } from "./Feedback";
import { AppSurface } from "./ui/AppSurface";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PAGE_COMPACT_PADDING } from "./ui/responsiveTokens";
import { Switch } from "./ui/switch";
import { cn } from "./ui/utils";

type Theme = "light" | "dark";

// overflow-hidden (not auto) so flex-1 / flex-[N] children truly share
// the fixed viewport height without being able to grow past it.
const PAGE_SHELL = "mx-auto flex h-full w-full max-w-3xl flex-col gap-3 overflow-hidden";
const SECTION_LABEL = "shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-text-muted";

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
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
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
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Пользователь";
  const usernameLabel = user?.username
    ? `@${user.username}`
    : telegramId ? `ID ${telegramId}` : "Telegram";
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
    <section className={cn(PAGE_SHELL, PAGE_COMPACT_PADDING)}>

      {/* ── User card — fixed/shrink height ───────────────────────── */}
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
              <div className="truncate text-lg font-semibold text-text-primary leading-snug">{profileName}</div>
              <div className="truncate text-sm text-text-muted mt-0.5">{usernameLabel}</div>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-4">
            {avatarEl}
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-text-primary leading-snug">{profileName}</div>
              <div className="truncate text-sm text-text-muted mt-0.5">{usernameLabel}</div>
            </div>
          </div>
        )}
      </AppSurface>

      {/* ── Settings — takes ~62% of remaining vertical space ─────── */}
      <AppSurface className="flex flex-[3] flex-col overflow-hidden px-4 sm:px-5 pt-4 sm:pt-5 pb-4 sm:pb-5">
        <div className={cn(SECTION_LABEL, "mb-4 mt-2")}>Настройки</div>

        <div className="flex flex-1 flex-col gap-3 overflow-hidden">

          {/* Theme row */}
          <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-elevated/60 px-4 py-[1.1rem]">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-subtle text-text-secondary">
                <Moon className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-base font-medium text-text-primary leading-none">Тёмная тема</div>
                <div className="text-[0.8rem] text-text-muted mt-[0.3rem]">
                  {theme === "dark" ? "Включена" : "Выключена"}
                </div>
              </div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={onToggleTheme} aria-label="Тёмная тема" />
          </div>

          {/* Font size list — fills ALL remaining space evenly */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated/60">

            <div className="shrink-0 border-b border-border-subtle px-4 py-[0.875rem]">
              <div className="text-base font-medium text-text-primary leading-none">Шрифт тренировки</div>
              <div className="text-[0.8rem] text-text-muted mt-[0.3rem]">Размер текста стиха</div>
            </div>

            {/* Each row claims equal share via flex-1 */}
            <div className="flex flex-1 flex-col divide-y divide-border-subtle overflow-auto">
              {FONT_OPTIONS.map((opt) => {
                const active = trainingFontSize === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTrainingFontSize(opt.value)}
                    aria-label={`Шрифт: ${opt.label}`}
                    className={cn(
                      "flex flex-1 items-center gap-4 px-4 py-2 transition-colors",
                      active
                        ? "bg-status-mastered-soft/35"
                        : "hover:bg-bg-surface/40 active:bg-bg-surface/60",
                    )}
                  >
                    <span
                      style={{ fontSize: opt.preview }}
                      className={cn(
                        "w-10 shrink-0 text-center font-serif leading-none",
                        active ? "text-brand-primary" : "text-text-secondary",
                      )}
                    >
                      Аа
                    </span>

                    <span className={cn(
                      "flex-1 text-left text-base font-medium",
                      active ? "text-brand-primary" : "text-text-primary",
                    )}>
                      {opt.label}
                    </span>

                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {active
                        ? <Check className="h-4 w-4 text-brand-primary" strokeWidth={2.5} />
                        : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </AppSurface>

      {/* ── Feedback — takes ~38% of remaining vertical space ─────── */}
      <AppSurface className="flex flex-[2] flex-col overflow-hidden px-4 sm:px-5 pt-4 sm:pt-5 pb-4 sm:pb-5">
        <div className={cn(SECTION_LABEL, "mb-3 mt-2")}>Обратная связь</div>
        <Feedback telegramId={telegramId} />
      </AppSurface>

    </section>
  );
}
