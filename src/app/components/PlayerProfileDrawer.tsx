"use client";

import React from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { addFriend, removeFriend } from "@/api/services/friends";
import {
  fetchPlayerProfile,
  type PlayerProfile,
} from "@/api/services/playerProfile";
import { toast } from "@/app/lib/toast";
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";
import { formatXp } from "@/shared/social/formatXp";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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
  if (deltaMs < 2 * 60 * 1000) return "Только что был в приложении";

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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-background/60 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/44">
        {label}
      </div>
      <div className="mt-2 text-2xl text-primary font-semibold tracking-tight">
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
  const currentUserTelegramId = useCurrentUserStatsStore((state) => state.telegramId);
  const currentUserXp = useCurrentUserStatsStore((state) => state.xp);
  const currentUserMasteredVerses = useCurrentUserStatsStore(
    (state) => state.masteredVerses
  );
  const currentUserDailyStreak = useCurrentUserStatsStore(
    (state) => state.dailyStreak
  );

  const loadProfile = React.useCallback(async () => {
    if (!open || !viewerTelegramId || !preview?.telegramId) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);

    try {
      const nextProfile = await fetchPlayerProfile(
        viewerTelegramId,
        preview.telegramId
      );
      if (requestIdRef.current !== requestId) return;
      setProfile(nextProfile);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setProfile(null);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить профиль игрока"
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
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
      prev?.telegramId === preview?.telegramId ? prev : null
    );
    void loadProfile();
  }, [loadProfile, open, preview?.telegramId, viewerTelegramId]);

  const handleToggleFriend = async () => {
    if (!viewerTelegramId || !profile || profile.isCurrentUser) {
      return;
    }

    setIsMutating(true);
    try {
      if (profile.isFriend) {
        const response = await removeFriend(viewerTelegramId, profile.telegramId);
        setProfile((prev) => (prev ? { ...prev, isFriend: false } : prev));
        (
          response.status === "removed" ? toast.success : toast.info
        )(
          response.status === "removed"
            ? "Друг удалён"
            : "Пользователь уже не был у вас в друзьях",
          {
            label: "Друзья",
          }
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
            : prev
        );
        (
          response.status === "added" ? toast.success : toast.info
        )(
          response.status === "added"
            ? "Друг добавлен"
            : "Пользователь уже у вас в друзьях",
          {
            label: "Друзья",
          }
        );
      }

      onFriendsChanged?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось изменить список друзей",
        {
          label: "Друзья",
        }
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
  const isCurrentUserProfile =
    profile?.isCurrentUser === true &&
    currentUserTelegramId != null &&
    profile.telegramId === currentUserTelegramId;
  const profileXp =
    isCurrentUserProfile && currentUserXp != null
      ? currentUserXp
      : profile?.xp ?? 0;
  const profileMasteredVerses =
    isCurrentUserProfile && currentUserMasteredVerses != null
      ? currentUserMasteredVerses
      : profile?.masteredVerses ?? 0;
  const profileDailyStreak =
    isCurrentUserProfile && currentUserDailyStreak != null
      ? currentUserDailyStreak
      : profile?.dailyStreak ?? 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="rounded-t-[32px] border-border/70 bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl backdrop-blur-xl sm:px-6">
        <DrawerHeader className="px-0 pb-0 pt-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border border-border/60 bg-background/70">
              {resolvedAvatarUrl ? (
                <AvatarImage src={resolvedAvatarUrl} alt={resolvedName} />
              ) : null}
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {getInitials(resolvedName || "Игрок")}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <DrawerTitle className="truncate text-xl tracking-tight text-foreground/88">
                {resolvedName}
              </DrawerTitle>
              <DrawerDescription className="mt-1 truncate text-sm text-foreground/56">
                {subtitle ?? (resolvedTelegramId ? `ID ${resolvedTelegramId}` : "")}
              </DrawerDescription>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {profile?.isCurrentUser ? (
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                    Ваш профиль
                  </span>
                ) : profile?.isFriend ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
                    В друзьях
                  </span>
                ) : profile ? (
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-foreground/62">
                    Можно добавить в друзья
                  </span>
                ) : null}

                {activityLabel ? (
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-3 py-1 text-foreground/62">
                    {activityLabel}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-16 animate-pulse rounded-3xl border border-border/60 bg-background/60" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`player-profile-skeleton-${index}`}
                    className="h-24 animate-pulse rounded-3xl border border-border/60 bg-background/60"
                  />
                ))}
              </div>
            </div>
          ) : loadError ? (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <div>{loadError}</div>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadProfile()}
                  className="h-9 rounded-full border-destructive/25 bg-background/70 px-4 text-xs text-foreground/78 shadow-none"
                >
                  Повторить
                </Button>
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/60 bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground/62">
                <div>Активность: {activityLabel ?? "Пока без активности"}</div>
                <div className="mt-1">
                  {joinedAtLabel
                    ? `В приложении с ${joinedAtLabel}`
                    : "Дата регистрации пока недоступна"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="XP"
                  value={formatXp(profileXp)}
                />
                <StatCard
                  label="Выучено"
                  value={`${profileMasteredVerses}`}
                />
                <StatCard
                  label="За 7 дней"
                  value={`${profile.weeklyRepetitions}`}
                />
                <StatCard label="Серия" value={`${profileDailyStreak} дн`} />
              </div>
            </div>
          ) : null}
        </div>

        <DrawerFooter className="px-0 pt-5">
          <div
            className={`grid grid-cols-1 gap-2 ${
              profile?.isCurrentUser ? "sm:grid-cols-1" : "sm:grid-cols-2"
            }`}
          >
            {!profile?.isCurrentUser ? (
              <Button
                type="button"
                disabled={!profile || isLoading || isMutating || Boolean(loadError)}
                onClick={() => void handleToggleFriend()}
                className="h-11 rounded-2xl bg-primary/60 text-primary-foreground  border border-primary/20"
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
              className="h-11 rounded-2xl border-border/60 bg-background/60 shadow-none"
            >
              Закрыть
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
