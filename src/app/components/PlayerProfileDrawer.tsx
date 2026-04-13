"use client";

import React from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { addFriend, removeFriend } from "@/api/services/friends";
import {
  fetchPlayerProfile,
  type PlayerProfile,
} from "@/api/services/playerProfile";
import { toast } from "@/app/lib/toast";
import { formatXp } from "@/shared/social/formatXp";
import { cn } from "./ui/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";

type PlayerProfilePreview = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
};

interface PlayerProfileDrawerProps {
  viewerTelegramId?: string | null;
  preview: PlayerProfilePreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFriendsChanged?: () => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatHandle(nickname: string | null, telegramId: string) {
  const normalizedNickname = nickname?.trim();
  if (normalizedNickname) {
    return normalizedNickname.startsWith("@")
      ? normalizedNickname
      : `@${normalizedNickname}`;
  }
  return `ID ${telegramId}`;
}

function formatRelativeLastActive(value: string | null): string {
  if (!value) return "Пока без активности";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Пока без активности";

  const deltaMs = Date.now() - parsed;
  if (deltaMs < 2 * 60 * 1000) return "Только что";

  const minutes = Math.floor(deltaMs / (60 * 1000));
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.floor(deltaMs / (60 * 60 * 1000));
  if (hours < 24) return `${hours} ч назад`;

  const days = Math.floor(deltaMs / (24 * 60 * 60 * 1000));
  if (days < 7) return `${days} дн назад`;

  return new Date(parsed).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

function formatJoinDate(value: string | null) {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-border-subtle/80 bg-bg-surface px-4 py-3.5">
      <div className="text-[11px] font-medium uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-brand-primary">
        {value}
      </div>
    </div>
  );
}

export function PlayerProfileDrawer({
  viewerTelegramId = null,
  preview,
  open,
  onOpenChange,
  onFriendsChanged,
}: PlayerProfileDrawerProps) {
  const [profile, setProfile] = React.useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isMutating, setIsMutating] = React.useState(false);
  const requestIdRef = React.useRef(0);

  const loadProfile = React.useCallback(async () => {
    if (!open || !viewerTelegramId || !preview?.telegramId) return;

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);

    try {
      const nextProfile = await fetchPlayerProfile(
        viewerTelegramId,
        preview.telegramId,
      );
      if (requestIdRef.current !== requestId) return;
      setProfile(nextProfile);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setProfile(null);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить профиль игрока",
      );
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, [open, preview?.telegramId, viewerTelegramId]);

  React.useEffect(() => {
    if (!open) {
      setLoadError(null);
      setIsMutating(false);
      return;
    }

    if (!viewerTelegramId) {
      setProfile(null);
      setIsLoading(false);
      setLoadError("Профиль Telegram ещё не инициализирован.");
      return;
    }

    setProfile((prev) =>
      prev?.telegramId === preview?.telegramId ? prev : null,
    );
    void loadProfile();
  }, [loadProfile, open, preview?.telegramId, viewerTelegramId]);

  const handleToggleFriend = async () => {
    if (!viewerTelegramId || !profile || profile.isCurrentUser) return;

    setIsMutating(true);
    try {
      if (profile.isFriend) {
        const response = await removeFriend(
          viewerTelegramId,
          profile.telegramId,
        );
        setProfile((prev) => (prev ? { ...prev, isFriend: false } : prev));
        (response.status === "removed" ? toast.success : toast.info)(
          response.status === "removed"
            ? "Друг удалён"
            : "Пользователь уже не был у вас в друзьях",
          { label: "Друзья" },
        );
      } else {
        const response = await addFriend(viewerTelegramId, profile.telegramId);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFriend:
                  response.status === "added" ||
                  response.status === "already-following",
              }
            : prev,
        );
        (response.status === "added" ? toast.success : toast.info)(
          response.status === "added"
            ? "Друг добавлен"
            : "Пользователь уже у вас в друзьях",
          { label: "Друзья" },
        );
      }

      onFriendsChanged?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось изменить список друзей",
        { label: "Друзья" },
      );
    } finally {
      setIsMutating(false);
    }
  };

  const resolvedName = profile?.displayName ?? preview?.name ?? "Игрок";
  const resolvedAvatarUrl = profile?.avatarUrl ?? preview?.avatarUrl ?? null;
  const resolvedTelegramId = profile?.telegramId ?? preview?.telegramId ?? "";
  const activityLabel =
    profile != null ? formatRelativeLastActive(profile.lastActiveAt) : null;
  const joinedAtLabel = formatJoinDate(profile?.createdAt ?? null);
  const subtitle =
    profile != null ? formatHandle(profile.nickname, profile.telegramId) : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="px-4">
        <DrawerHeader className="px-0 pb-0 pt-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0 border border-border-subtle bg-bg-surface">
              {resolvedAvatarUrl ? (
                <AvatarImage src={resolvedAvatarUrl} alt={resolvedName} />
              ) : null}
              <AvatarFallback className="bg-bg-subtle text-sm text-text-secondary">
                {getInitials(resolvedName || "Игрок")}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <DrawerTitle className="truncate">
                {resolvedName}
              </DrawerTitle>
              <p className="mt-1 truncate text-sm text-text-secondary">
                {subtitle ?? (resolvedTelegramId ? `ID ${resolvedTelegramId}` : "")}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {profile?.isCurrentUser ? (
                  <span className="inline-flex items-center rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
                    Ваш профиль
                  </span>
                ) : profile?.isFriend ? (
                  <span className="inline-flex items-center rounded-full border border-border-subtle/80 bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                    В друзьях
                  </span>
                ) : profile ? (
                  <span className="inline-flex items-center rounded-full border border-border-subtle/60 bg-bg-elevated px-3 py-1 text-xs font-medium text-text-muted">
                    Можно добавить в друзья
                  </span>
                ) : null}

                {activityLabel ? (
                  <span className="inline-flex items-center rounded-full border border-border-subtle/60 bg-bg-elevated px-3 py-1 text-xs font-medium text-text-muted">
                    {activityLabel}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-[1.45rem] border border-border-subtle/80 bg-bg-surface" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`player-profile-skeleton-${index}`}
                    className="h-24 animate-pulse rounded-[1.35rem] border border-border-subtle/80 bg-bg-surface"
                  />
                ))}
              </div>
            </div>
          ) : loadError ? (
            <div className="rounded-[1.35rem] border border-state-error/25 bg-state-error/10 p-4 text-sm text-state-error">
              <div>{loadError}</div>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadProfile()}
                  className="h-9 rounded-full border-state-error/25 bg-bg-surface px-4 text-xs text-text-secondary shadow-none"
                >
                  Повторить
                </Button>
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-3">
              <div className="rounded-[1.45rem] border border-border-subtle/80 bg-bg-surface px-4 py-3.5 text-sm leading-relaxed text-text-secondary">
                <div>Активность: {activityLabel ?? "Пока без активности"}</div>
                {joinedAtLabel ? (
                  <div className={cn("text-text-muted", activityLabel && "mt-1")}>
                    В приложении с {joinedAtLabel}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard label="XP" value={formatXp(profile.xp)} />
                <StatCard label="Выучено" value={`${profile.masteredVerses}`} />
                <StatCard label="За 7 дней" value={`${profile.weeklyRepetitions}`} />
                <StatCard label="Серия" value={`${profile.dailyStreak} дн`} />
              </div>
            </div>
          ) : null}
        </div>

        <DrawerFooter className="px-0 pt-5">
          <div
            className={cn(
              "grid gap-2",
              !profile?.isCurrentUser ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {!profile?.isCurrentUser ? (
              <Button
                type="button"
                disabled={!profile || isLoading || isMutating || Boolean(loadError)}
                onClick={() => void handleToggleFriend()}
                className="h-11 rounded-[1.2rem]"
              >
                {profile?.isFriend ? (
                  <>
                    <UserMinus className="h-4 w-4" />
                    Удалить из друзей
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Добавить в друзья
                  </>
                )}
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-[1.2rem] border-border-subtle/80 bg-bg-surface shadow-none"
            >
              Закрыть
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
