"use client";

import React from "react";
import { Users } from "lucide-react";
import {
  fetchVerseOwnersPage,
  type VerseOwnersScope,
  type domain_SocialPlayerListItem,
} from "../../api/services/verseOwners";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { cn } from "./ui/utils";
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

function getRelationshipBadgeCopy(params: {
  isCurrentUser: boolean;
  isFriend: boolean;
}) {
  if (params.isCurrentUser) {
    return {
      label: "Это вы",
      className:
        "border-primary/20 bg-primary/10 text-primary",
    };
  }

  if (params.isFriend) {
    return {
      label: "Ваш друг",
      className:
        "border-status-learning/25 bg-status-learning-soft text-status-learning",
    };
  }

  return {
    label: "Не в друзьях",
    className:
      "border-border/60 bg-background/70 text-foreground/62",
  };
}

export function VerseOwnersDrawer({
  viewerTelegramId = null,
  target,
  open,
  onOpenChange,
  onOpenPlayerProfile,
}: VerseOwnersDrawerProps) {
  const [items, setItems] = React.useState<domain_SocialPlayerListItem[]>([]);
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
  const ScopeIcon = Users;
  const relationshipSummary = React.useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const telegramId = String(item.telegramId ?? "");
        if (viewerTelegramId && telegramId === viewerTelegramId) {
          acc.currentUserCount += 1;
          return acc;
        }
        if (item.isFriend) {
          acc.friendCount += 1;
          return acc;
        }
        acc.otherPlayersCount += 1;
        return acc;
      },
      {
        currentUserCount: 0,
        friendCount: 0,
        otherPlayersCount: 0,
      }
    );
  }, [items, viewerTelegramId]);

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

  const ownerDisplayName = (item: domain_SocialPlayerListItem) => {
    const n = item.name?.trim();
    if (n) return n;
    return item.telegramId ? `ID ${item.telegramId}` : "Игрок";
  };

  const handleSelectPlayer = (item: domain_SocialPlayerListItem) => {
    pendingPlayerRef.current = {
      telegramId: String(item.telegramId ?? ""),
      name: ownerDisplayName(item),
      avatarUrl: item.avatarUrl?.trim() ? item.avatarUrl.trim() : null,
    };
    onOpenChange(false);
  };

  const getDisplayXp = (item: domain_SocialPlayerListItem) =>
    viewerTelegramId &&
    currentUserTelegramId === viewerTelegramId &&
    item.telegramId === viewerTelegramId &&
    currentUserXp != null
      ? currentUserXp
      : item.xp ?? 0;

  const getDisplayDailyStreak = (item: domain_SocialPlayerListItem) =>
    viewerTelegramId &&
    currentUserTelegramId === viewerTelegramId &&
    item.telegramId === viewerTelegramId &&
    currentUserDailyStreak != null
      ? currentUserDailyStreak
      : item.dailyStreak ?? 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="rounded-t-[32px] border-border/70 bg-card/95 px-4 shadow-2xl backdrop-blur-xl sm:px-6">
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
                {target?.reference ?? "Стих"} ·{" "}
                {target?.scope === "friends" ? `${totalCount} друзей` : `${totalCount} участников`}
              </DrawerDescription>
              {target?.scope !== "friends" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {relationshipSummary.currentUserCount > 0 ? (
                    <Badge className="border-primary/20 bg-primary/10 text-primary">
                      Вы
                    </Badge>
                  ) : null}
                  {relationshipSummary.friendCount > 0 ? (
                    <Badge className="border-status-learning/25 bg-status-learning-soft text-status-learning">
                      Друзья: {relationshipSummary.friendCount}
                    </Badge>
                  ) : null}
                  {relationshipSummary.otherPlayersCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-background/70 text-foreground/62"
                    >
                      Другие игроки: {relationshipSummary.otherPlayersCount}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
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
              Пока никто не добавил этот стих.
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              {items.map((item) => {
                const label = ownerDisplayName(item);
                const telegramId = String(item.telegramId ?? "");
                const isCurrentUser =
                  Boolean(viewerTelegramId) && telegramId === viewerTelegramId;
                const relationshipBadge = getRelationshipBadgeCopy({
                  isCurrentUser,
                  isFriend: Boolean(item.isFriend),
                });
                return (
                  <button
                    key={item.telegramId ?? label}
                    type="button"
                    onClick={() => handleSelectPlayer(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
                      isCurrentUser
                        ? "border-primary/18 bg-primary/[0.07] hover:bg-primary/[0.11]"
                        : item.isFriend
                          ? "border-status-learning/18 bg-status-learning-soft/55 hover:bg-status-learning-soft/80"
                          : "border-border/60 bg-background/55 hover:bg-background/70"
                    )}
                    aria-label={`Открыть профиль ${label}`}
                  >
                    <Avatar
                      className={cn(
                        "h-10 w-10 border bg-background/70",
                        isCurrentUser
                          ? "border-primary/25"
                          : item.isFriend
                            ? "border-status-learning/25"
                            : "border-border/60"
                      )}
                    >
                      {item.avatarUrl ? (
                        <AvatarImage src={item.avatarUrl} alt={label} />
                      ) : null}
                      <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                        {getInitials(label)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground/82">
                            {label}
                          </div>
                          <div className="mt-1 truncate text-xs text-foreground/48">
                            {formatRelativeLastActive(item.lastActiveAt)} ·{" "}
                            {formatXp(getDisplayXp(item))} ·{" "}
                            {getDisplayDailyStreak(item)} дн. подряд
                          </div>
                        </div>

                        <Badge className={relationshipBadge.className}>
                          {relationshipBadge.label}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}

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
