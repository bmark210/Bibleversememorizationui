"use client";

import React from "react";
import { Users } from "lucide-react";
import {
  fetchVerseOwnersPage,
  type VerseOwnersScope,
} from "@/api/services/verseOwners";
import type { FriendPlayerListItem } from "@/api/services/friends";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { formatXp } from "@/shared/social/formatXp";
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";

const OWNERS_PAGE_SIZE = 20;
const LOAD_MORE_THRESHOLD_PX = 96;

type VerseOwnersTarget = {
  externalVerseId: string;
  reference: string;
  scope: VerseOwnersScope;
  totalCount: number;
};

interface VerseOwnersDrawerProps {
  viewerTelegramId?: string | null;
  target: VerseOwnersTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function formatRelativeLastActive(value: string | null): string {
  if (!value) return "Без активности";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Без активности";

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
    month: "short",
  });
}

export function VerseOwnersDrawer({
  viewerTelegramId = null,
  target,
  open,
  onOpenChange,
  onOpenPlayerProfile,
}: VerseOwnersDrawerProps) {
  const [items, setItems] = React.useState<FriendPlayerListItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isInitialLoading, setIsInitialLoading] = React.useState(false);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const requestIdRef = React.useRef(0);
  const currentUserTelegramId = useCurrentUserStatsStore((state) => state.telegramId);
  const currentUserXp = useCurrentUserStatsStore((state) => state.xp);
  const currentUserDailyStreak = useCurrentUserStatsStore(
    (state) => state.dailyStreak
  );
  const pendingPlayerRef = React.useRef<{
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  } | null>(null);

  const loadPage = React.useCallback(
    async (startWith: number, mode: "replace" | "append") => {
      if (!viewerTelegramId || !target) {
        return;
      }

      const requestId = ++requestIdRef.current;
      if (mode === "replace") {
        setIsInitialLoading(true);
      } else {
        setIsFetchingMore(true);
      }
      setLoadError(null);

      try {
        const page = await fetchVerseOwnersPage(
          viewerTelegramId,
          target.externalVerseId,
          {
            scope: target.scope,
            limit: OWNERS_PAGE_SIZE,
            startWith,
          }
        );

        if (requestIdRef.current !== requestId) return;

        setItems((prev) => {
          if (mode === "replace") {
            return page.items;
          }

          const seen = new Set(prev.map((item) => item.telegramId));
          const appended = page.items.filter((item) => {
            if (seen.has(item.telegramId)) return false;
            seen.add(item.telegramId);
            return true;
          });
          return appended.length > 0 ? [...prev, ...appended] : prev;
        });
        setTotalCount(page.totalCount);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить список"
        );
      } finally {
        if (requestIdRef.current === requestId) {
          setIsInitialLoading(false);
          setIsFetchingMore(false);
        }
      }
    },
    [target, viewerTelegramId]
  );

  React.useEffect(() => {
    if (!open) {
      setLoadError(null);
      setIsInitialLoading(false);
      setIsFetchingMore(false);
      return;
    }

    if (!viewerTelegramId) {
      setItems([]);
      setTotalCount(0);
      setLoadError("Профиль Telegram ещё не инициализирован.");
      return;
    }

    setItems([]);
    setTotalCount(target?.totalCount ?? 0);
    void loadPage(0, "replace");
  }, [loadPage, open, target?.externalVerseId, target?.scope, target?.totalCount, viewerTelegramId]);

  React.useEffect(() => {
    if (open || !pendingPlayerRef.current || !onOpenPlayerProfile) {
      return;
    }

    const player = pendingPlayerRef.current;
    pendingPlayerRef.current = null;
    onOpenPlayerProfile(player);
  }, [onOpenPlayerProfile, open]);

  const hasMore = items.length < totalCount;
  const scopeTitle = target?.scope === "friends" ? "Друзья со стихом" : "Игроки со стихом";
  const ScopeIcon = target?.scope === "friends" ? Users : Users;

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (isInitialLoading || isFetchingMore || !hasMore) {
      return;
    }

    const element = event.currentTarget;
    const distanceToBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceToBottom > LOAD_MORE_THRESHOLD_PX) {
      return;
    }

    void loadPage(items.length, "append");
  };

  const handleSelectPlayer = (item: FriendPlayerListItem) => {
    pendingPlayerRef.current = {
      telegramId: item.telegramId,
      name: item.name,
      avatarUrl: item.avatarUrl,
    };
    onOpenChange(false);
  };

  const getDisplayXp = (item: FriendPlayerListItem) =>
    viewerTelegramId &&
    currentUserTelegramId === viewerTelegramId &&
    item.telegramId === viewerTelegramId &&
    currentUserXp != null
      ? currentUserXp
      : item.xp;

  const getDisplayDailyStreak = (item: FriendPlayerListItem) =>
    viewerTelegramId &&
    currentUserTelegramId === viewerTelegramId &&
    item.telegramId === viewerTelegramId &&
    currentUserDailyStreak != null
      ? currentUserDailyStreak
      : item.dailyStreak;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="rounded-t-[32px] border-border/70 bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl backdrop-blur-xl sm:px-6">
        <DrawerHeader className="px-0 pb-0 pt-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-foreground/70">
              <ScopeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DrawerTitle className="truncate text-xl tracking-tight text-foreground">
                {scopeTitle}
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-sm text-foreground/56">
                {target?.reference ?? "Стих"} · {totalCount} участников
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div
          className="mt-5 max-h-[62vh] overflow-y-auto overscroll-contain pr-1"
          onScroll={handleScroll}
        >
          {isInitialLoading ? (
            <div className="space-y-3 pb-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`owners-skeleton-${index}`}
                  className="h-16 animate-pulse rounded-2xl border border-border/60 bg-background/60"
                />
              ))}
            </div>
          ) : loadError && items.length === 0 ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <div>{loadError}</div>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadPage(0, "replace")}
                  className="h-9 rounded-full border-destructive/25 bg-background/70 px-4 text-xs text-foreground/78 shadow-none"
                >
                  Повторить
                </Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/50 p-4 text-sm text-foreground/56">
              Пока никто не добавил этот стих в выбранной группе.
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              {items.map((item) => (
                <button
                  key={item.telegramId}
                  type="button"
                  onClick={() => handleSelectPlayer(item)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/55 px-3 py-3 text-left transition-colors hover:bg-background/70"
                  aria-label={`Открыть профиль ${item.name}`}
                >
                  <Avatar className="h-10 w-10 border border-border/60 bg-background/70">
                    {item.avatarUrl ? (
                      <AvatarImage src={item.avatarUrl} alt={item.name} />
                    ) : null}
                    <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                      {getInitials(item.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground/82">
                      {item.name}
                    </div>
                    <div className="mt-1 truncate text-xs text-foreground/48">
                      {formatRelativeLastActive(item.lastActiveAt)} ·{" "}
                      {formatXp(getDisplayXp(item))} ·{" "}
                      {getDisplayDailyStreak(item)} дн. подряд
                    </div>
                  </div>
                </button>
              ))}

              {isFetchingMore ? (
                <div className="space-y-2 pt-1">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div
                      key={`owners-load-more-${index}`}
                      className="h-16 animate-pulse rounded-2xl border border-border/60 bg-background/60"
                    />
                  ))}
                </div>
              ) : null}

              {loadError && items.length > 0 ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <div>{loadError}</div>
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadPage(items.length, "append")}
                      className="h-8 rounded-full border-destructive/25 bg-background/70 px-3 text-[11px] text-foreground/78 shadow-none"
                    >
                      Догрузить ещё
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
