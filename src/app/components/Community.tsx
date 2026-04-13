"use client";

import React from "react";
import { Search, UserMinus, UserPlus } from "lucide-react";
import { Virtuoso, type ListRange, type VirtuosoHandle } from "react-virtuoso";
import type { domain_FriendPlayerListItem } from "@/api/services/friends";
import {
  addFriend,
  fetchFriendsPage,
  fetchPlayersPage,
  removeFriend,
} from "@/api/services/friends";
import { toast } from "@/app/lib/toast";
import { AppSurface } from "./ui/AppSurface";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PAGE_COMPACT_PADDING } from "./ui/responsiveTokens";
import { cn } from "./ui/utils";
import {
  mergeCommunityPageWindow,
  type CommunityListCacheItem,
} from "./communityVirtualization";
import { formatXp } from "@/shared/social/formatXp";

type FriendsTab = "players" | "friends";

const FRIENDS_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 280;
const COMMUNITY_OVERSCAN = 220;

const PAGE_SHELL =
  "mx-auto grid gap-3 grid-rows-[auto_minmax(0,1fr)] sm:items-center h-full min-h-0 w-full max-w-5xl gap-3 overflow-hidden short-phone:h-auto short-phone:min-h-full short-phone:overflow-visible";

const ROW_ACTION_BUTTON =
  "h-10 w-10 shrink-0 rounded-full p-0 narrow:h-9 narrow:w-9";

type CommunityListState = {
  items: CommunityListCacheItem[];
  total: number;
  error: string | null;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
};

interface CommunityProps {
  telegramId?: string | null;
  onFriendsChanged?: () => void;
  onOpenPlayerProfile?: (player: {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
  friendsRefreshVersion?: number;
}

const EMPTY_LIST_STATE: CommunityListState = {
  items: [],
  total: 0,
  error: null,
  isInitialLoading: false,
  isLoadingMore: false,
};

const COMMUNITY_LIST_BASE_CLASS =
  "h-full min-h-0 [scrollbar-gutter:stable] pr-1";

const CommunityVirtuosoList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CommunityVirtuosoList({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("grid content-start gap-2", className)}
      {...props}
    />
  );
});

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function friendPlayerDisplayName(item: domain_FriendPlayerListItem): string {
  const name = item.name?.trim();
  if (name) return name;
  const nickname = item.nickname?.trim();
  if (nickname) return nickname.startsWith("@") ? nickname : `@${nickname}`;
  return item.telegramId ? `ID ${item.telegramId}` : "Игрок";
}

function friendPlayerSubtitle(item: domain_FriendPlayerListItem): string {
  const versesCount = item.versesCount;
  if (versesCount != null && Number.isFinite(versesCount)) {
    return `${Math.max(0, Math.round(versesCount))} стихов`;
  }
  return "Нет данных";
}

function formatRelativeLastActive(value?: string | null): string {
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

function createOffsetRecord() {
  return {
    players: new Set<number>(),
    friends: new Set<number>(),
  } as const;
}

function CommunityRowSkeleton({ isLast = false }: { isLast?: boolean }) {
  return (
    <div className={cn(isLast ? "pb-0" : "pb-2")}>
      <div className="h-[90px] animate-pulse rounded-[1.45rem] border border-border-subtle bg-bg-elevated" />
    </div>
  );
}

function CommunityListRow({
  item,
  activeFriendsTab,
  isMutationPending,
  onOpenPlayerProfile,
  onToggleFriend,
}: {
  item: domain_FriendPlayerListItem;
  activeFriendsTab: FriendsTab;
  isMutationPending: boolean;
  onOpenPlayerProfile?: (player: {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
  onToggleFriend: (item: domain_FriendPlayerListItem) => void;
}) {
  const rowId = String(item.telegramId ?? "");
  const displayName = friendPlayerDisplayName(item);
  const showRemoveAction = activeFriendsTab === "friends" || item.isFriend;
  const xpLabel = formatXp(item.xp);
  const activityLabel = formatRelativeLastActive(item.lastActiveAt);
  const versesLabel = friendPlayerSubtitle(item);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[1.45rem] border border-border-default/55 bg-bg-elevated px-3.5 py-3.5 shadow-[var(--shadow-soft)] transition-[background-color,border-color,box-shadow] hover:border-brand-primary/18 hover:bg-bg-surface hover:shadow-[var(--shadow-floating)] narrow:gap-2.5 narrow:px-3 narrow:py-3 sm:gap-3.5 sm:px-4 sm:py-4",
      )}
    >
      {onOpenPlayerProfile ? (
        <button
          type="button"
          onClick={() =>
            onOpenPlayerProfile({
              telegramId: rowId,
              name: displayName,
              avatarUrl: item.avatarUrl?.trim() ? item.avatarUrl.trim() : null,
            })
          }
          className="flex min-w-0 flex-1 items-center gap-3.5 rounded-[1.1rem] text-left"
          aria-label={`Открыть профиль ${displayName}`}
        >
          <Avatar
            className={cn(
              "h-11 w-11 shrink-0 border border-border-subtle bg-bg-surface sm:h-12 sm:w-12",
            )}
          >
            {item.avatarUrl ? (
              <AvatarImage src={item.avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-bg-subtle text-xs text-text-secondary">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="truncate text-[15px] font-semibold tracking-tight text-text-primary sm:text-base">
              {displayName}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-brand-primary/18 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-medium text-brand-primary">
                {xpLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-border-subtle/80 bg-bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                {activityLabel}
              </span>
            </div>
            <div className="truncate text-[12px] text-text-muted sm:text-[12.5px]">
              {versesLabel}
            </div>
          </div>
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <Avatar
            className={cn(
              "h-11 w-11 shrink-0 border border-border-subtle bg-bg-surface sm:h-12 sm:w-12",
            )}
          >
            {item.avatarUrl ? (
              <AvatarImage src={item.avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-bg-subtle text-xs text-text-secondary">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="truncate text-[15px] font-semibold tracking-tight text-text-primary sm:text-base">
              {displayName}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-brand-primary/18 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-medium text-brand-primary">
                {xpLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-border-subtle/80 bg-bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                {activityLabel}
              </span>
            </div>
            <div className="truncate text-[12px] text-text-muted sm:text-[12.5px]">
              {versesLabel}
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isMutationPending}
        data-tour={showRemoveAction ? undefined : "profile-add-friend-button"}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFriend(item);
        }}
        aria-label={
          showRemoveAction
            ? `Удалить ${displayName}`
            : `Добавить ${displayName}`
        }
        className={cn(
          ROW_ACTION_BUTTON,
          showRemoveAction
            ? "border-border-subtle/80 bg-bg-surface text-text-secondary hover:border-state-error/20 hover:bg-state-error/10 hover:text-state-error"
            : "border-brand-primary/20 bg-brand-primary/10 text-brand-primary hover:border-brand-primary/30 hover:bg-brand-primary/14 hover:text-brand-primary",
        )}
      >
        {showRemoveAction ? (
          <UserMinus className="h-3.5 w-3.5" />
        ) : (
          <UserPlus className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

// Stable reference — must NOT be defined inline inside the component or
// Virtuoso will remount the entire list on every render (→ stack overflow).
const VIRTUOSO_COMPONENTS = { List: CommunityVirtuosoList } as const;

export function Community({
  telegramId = null,
  onFriendsChanged,
  onOpenPlayerProfile,
  friendsRefreshVersion = 0,
}: CommunityProps) {
  const [activeFriendsTab, setActiveFriendsTab] =
    React.useState<FriendsTab>("friends");
  const [playersSearchInput, setPlayersSearchInput] = React.useState("");
  const [friendsSearchInput, setFriendsSearchInput] = React.useState("");
  const [playersSearchQuery, setPlayersSearchQuery] = React.useState("");
  const [friendsSearchQuery, setFriendsSearchQuery] = React.useState("");
  const [pendingMutationByTelegramId, setPendingMutationByTelegramId] =
    React.useState<Record<string, boolean>>({});
  const [listStates, setListStates] = React.useState<
    Record<FriendsTab, CommunityListState>
  >({
    players: EMPTY_LIST_STATE,
    friends: EMPTY_LIST_STATE,
  });

  const virtuosoRef = React.useRef<VirtuosoHandle | null>(null);
  const listStatesRef = React.useRef(listStates);
  const loadedOffsetsRef = React.useRef(createOffsetRecord());
  const pendingOffsetsRef = React.useRef(createOffsetRecord());
  const queryVersionRef = React.useRef({
    players: 0,
    friends: 0,
  });
  const lastExternalRefreshVersionRef = React.useRef(friendsRefreshVersion);

  // ── Scroll shadow (mask-image on Virtuoso's scroller) ────────────────
  // Uses the same technique as ScrollShadowContainer with shadowStyle="mask":
  // CSS mask-image fades out the content itself at scroll edges — no
  // coloured overlay, works on any background, colour-agnostic.
  const SHADOW_SIZE = 56;
  const MASK_SCROLLED =
    `linear-gradient(to bottom, transparent 0px, black ${SHADOW_SIZE}px, black 100%)`;
  const listScrollerDomRef = React.useRef<HTMLElement | null>(null);

  const applyScrollMask = React.useCallback((el: HTMLElement) => {
    const scrolled = el.scrollTop > 2;
    const mask = scrolled ? MASK_SCROLLED : "";
    if (el.style.maskImage !== mask) {
      el.style.maskImage = mask;
      el.style.webkitMaskImage = mask;
    }
  }, [MASK_SCROLLED]);

  const handleScrollForShadow = React.useCallback(() => {
    const el = listScrollerDomRef.current;
    if (el) applyScrollMask(el);
  }, [applyScrollMask]);

  const handleVirtuosoScrollerRef = React.useCallback(
    (ref: HTMLElement | Window | null) => {
      const prev = listScrollerDomRef.current;
      if (prev) {
        prev.removeEventListener("scroll", handleScrollForShadow);
        prev.style.maskImage = "";
        prev.style.webkitMaskImage = "";
      }
      if (ref instanceof HTMLElement) {
        listScrollerDomRef.current = ref;
        applyScrollMask(ref);
        ref.addEventListener("scroll", handleScrollForShadow, {
          passive: true,
        });
      } else {
        listScrollerDomRef.current = null;
      }
    },
    [handleScrollForShadow, applyScrollMask],
  );
  // ────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    listStatesRef.current = listStates;
  }, [listStates]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPlayersSearchQuery(playersSearchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [playersSearchInput]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFriendsSearchQuery(friendsSearchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [friendsSearchInput]);

  const requestTabWindow = React.useCallback(
    async (
      tab: FriendsTab,
      requestedOffset: number,
      options?: { initial?: boolean; force?: boolean },
    ) => {
      if (!telegramId) {
        React.startTransition(() => {
          setListStates((previous) => ({
            ...previous,
            [tab]: EMPTY_LIST_STATE,
          }));
        });
        return null;
      }

      const activeQuery =
        tab === "players" ? playersSearchQuery : friendsSearchQuery;
      const normalizedOffset = Math.max(0, Math.trunc(requestedOffset));
      const loadedOffsets = loadedOffsetsRef.current[tab];
      const pendingOffsets = pendingOffsetsRef.current[tab];

      if (
        !options?.force &&
        (loadedOffsets.has(normalizedOffset) ||
          pendingOffsets.has(normalizedOffset))
      ) {
        return null;
      }

      const requestVersion = queryVersionRef.current[tab];
      pendingOffsets.add(normalizedOffset);
      setListStates((previous) => ({
        ...previous,
        [tab]: {
          ...previous[tab],
          error: null,
          isInitialLoading:
            options?.initial === true && previous[tab].items.length === 0,
          isLoadingMore: options?.initial === true ? false : true,
        },
      }));

      try {
        const nextPage =
          tab === "players"
            ? await fetchPlayersPage(telegramId, {
                search: activeQuery || undefined,
                limit: FRIENDS_PAGE_SIZE,
                startWith: normalizedOffset,
              })
            : await fetchFriendsPage(telegramId, {
                search: activeQuery || undefined,
                limit: FRIENDS_PAGE_SIZE,
                startWith: normalizedOffset,
              });

        if (queryVersionRef.current[tab] !== requestVersion) {
          return null;
        }

        loadedOffsets.add(Math.max(0, nextPage.offset ?? normalizedOffset));
        React.startTransition(() => {
          setListStates((previous) => ({
            ...previous,
            [tab]: {
              items: mergeCommunityPageWindow(previous[tab].items, nextPage),
              total: Math.max(0, nextPage.total ?? previous[tab].total),
              error: null,
              isInitialLoading: false,
              isLoadingMore: pendingOffsetsRef.current[tab].size > 1,
            },
          }));
        });

        return nextPage;
      } catch (error) {
        if (queryVersionRef.current[tab] !== requestVersion) {
          return null;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Не удалось загрузить список";
        setListStates((previous) => ({
          ...previous,
          [tab]: {
            ...previous[tab],
            error: message,
            isInitialLoading: false,
            isLoadingMore: pendingOffsetsRef.current[tab].size > 1,
          },
        }));
        return null;
      } finally {
        pendingOffsets.delete(normalizedOffset);
        if (queryVersionRef.current[tab] === requestVersion) {
          setListStates((previous) => ({
            ...previous,
            [tab]: {
              ...previous[tab],
              isInitialLoading: false,
              isLoadingMore: pendingOffsetsRef.current[tab].size > 0,
            },
          }));
        }
      }
    },
    [friendsSearchQuery, playersSearchQuery, telegramId],
  );

  const resetAndPrimeTab = React.useCallback(
    (tab: FriendsTab) => {
      queryVersionRef.current[tab] += 1;
      loadedOffsetsRef.current[tab].clear();
      pendingOffsetsRef.current[tab].clear();

      React.startTransition(() => {
        setListStates((previous) => ({
          ...previous,
          [tab]: {
            ...EMPTY_LIST_STATE,
            isInitialLoading: Boolean(telegramId),
          },
        }));
      });

      if (!telegramId) {
        return;
      }

      void requestTabWindow(tab, 0, { initial: true, force: true });
    },
    [requestTabWindow, telegramId],
  );

  React.useEffect(() => {
    resetAndPrimeTab("players");
  }, [playersSearchQuery, resetAndPrimeTab, telegramId]);

  React.useEffect(() => {
    resetAndPrimeTab("friends");
  }, [friendsSearchQuery, resetAndPrimeTab, telegramId]);

  React.useEffect(() => {
    if (!telegramId) return;
    if (friendsRefreshVersion === lastExternalRefreshVersionRef.current) {
      return;
    }

    lastExternalRefreshVersionRef.current = friendsRefreshVersion;
    resetAndPrimeTab("players");
    resetAndPrimeTab("friends");
  }, [friendsRefreshVersion, resetAndPrimeTab, telegramId]);

  React.useEffect(() => {
    // Reset mask when switching tabs / searching — Virtuoso scrolls to top
    // via scrollToIndex, and the scroller ref callback will re-apply the mask.
    const el = listScrollerDomRef.current;
    if (el) {
      el.style.maskImage = "";
      el.style.webkitMaskImage = "";
    }
    virtuosoRef.current?.scrollToIndex({
      index: 0,
      align: "start",
      behavior: "auto",
    });
  }, [activeFriendsTab, friendsSearchQuery, playersSearchQuery]);

  const setMutationPending = (targetTelegramId: string, isPending: boolean) => {
    setPendingMutationByTelegramId((prev) => {
      if (isPending) {
        return {
          ...prev,
          [targetTelegramId]: true,
        };
      }

      const next = { ...prev };
      delete next[targetTelegramId];
      return next;
    });
  };

  const handleToggleFriend = async (item: domain_FriendPlayerListItem) => {
    if (!telegramId) {
      toast.warning("Не найден telegramId", {
        label: "Сообщество",
      });
      return;
    }

    const targetId = item.telegramId?.trim() ?? "";
    if (!targetId || pendingMutationByTelegramId[targetId]) {
      return;
    }

    setMutationPending(targetId, true);
    try {
      if (item.isFriend) {
        const response = await removeFriend(telegramId, targetId);
        if (response.status === "removed") {
          toast.success("Друг удалён", { label: "Сообщество" });
        }
      } else {
        const response = await addFriend(telegramId, targetId);
        if (response.status === "added") {
          toast.success("Друг добавлен", { label: "Сообщество" });
        }
      }

      resetAndPrimeTab("players");
      resetAndPrimeTab("friends");
      onFriendsChanged?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось изменить список друзей";
      toast.error(message, { label: "Сообщество" });
    } finally {
      setMutationPending(targetId, false);
    }
  };

  const activeSearchInput =
    activeFriendsTab === "players" ? playersSearchInput : friendsSearchInput;
  const activeSearchQuery =
    activeFriendsTab === "players" ? playersSearchQuery : friendsSearchQuery;
  const activeState = listStates[activeFriendsTab];
  const playersTotal = listStates.players.total;
  const friendsTotal = listStates.friends.total;
  const canManageFriends = Boolean(telegramId);
  const emptyStateLabel = activeSearchQuery
    ? "Ничего не найдено"
    : activeFriendsTab === "players"
      ? "Игроков пока нет"
      : "Друзей пока нет";

  const handleSearchInputChange = (value: string) => {
    if (activeFriendsTab === "players") {
      setPlayersSearchInput(value);
      return;
    }
    setFriendsSearchInput(value);
  };

  // Page-aligned lazy loading: when Virtuoso reports the visible range,
  // calculate which page offsets overlap the visible + buffer region
  // and request any that haven't been fetched yet.
  const handleRangeChanged = React.useCallback(
    ({ startIndex, endIndex }: ListRange) => {
      const activeTabState = listStatesRef.current[activeFriendsTab];
      const total = activeTabState.total;
      if (total === 0) return;

      // Buffer: pre-fetch one extra page ahead of the visible region
      const rangeEnd = Math.min(total - 1, endIndex + FRIENDS_PAGE_SIZE);
      const firstPage =
        Math.floor(Math.max(0, startIndex) / FRIENDS_PAGE_SIZE) *
        FRIENDS_PAGE_SIZE;
      const lastPage =
        Math.floor(rangeEnd / FRIENDS_PAGE_SIZE) * FRIENDS_PAGE_SIZE;

      for (
        let offset = firstPage;
        offset <= lastPage;
        offset += FRIENDS_PAGE_SIZE
      ) {
        // requestTabWindow already deduplicates via loadedOffsetsRef/pendingOffsetsRef
        void requestTabWindow(activeFriendsTab, offset);
      }
    },
    [activeFriendsTab, requestTabWindow],
  );

  return (
    <section className={cn(PAGE_SHELL, PAGE_COMPACT_PADDING, '!pb-0')}>
      <AppSurface
        data-tour="profile-friends"
        className="flex h-full min-h-0 flex-1 flex-col gap-3 short-phone:h-auto"
      >
        {!canManageFriends ? (
          <div className="flex flex-1 items-center justify-center rounded-[1.25rem] border border-dashed border-border-subtle bg-bg-elevated px-4 py-6 text-sm text-text-secondary">
            Telegram не инициализирован
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="grid gap-3 grid-rows-[auto_minmax(0,1fr)] sm:items-center">
                <div className="inline-flex w-full rounded-[1.15rem] border border-border-subtle/80 bg-bg-elevated/70 p-1 shadow-[var(--shadow-soft)] sm:w-auto">
                  {(
                    [
                      {
                        key: "friends",
                        label: "Мои друзья",
                        count: friendsTotal,
                      },
                      {
                        key: "players",
                        label: "Игроки",
                        count: playersTotal,
                      },
                    ] as const
                  ).map((tab) => {
                    const isActive = activeFriendsTab === tab.key;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveFriendsTab(tab.key)}
                        className={cn(
                          "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[0.95rem] px-4 py-2.5 text-[15px] font-medium transition-[background-color,color,box-shadow] narrow:px-3.5 narrow:py-2",
                          isActive
                            ? "bg-bg-surface text-text-primary shadow-[var(--shadow-soft)]"
                            : "text-text-secondary hover:text-text-primary",
                        )}
                      >
                        <span className="truncate">{tab.label}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            isActive
                              ? "bg-brand-primary/10 text-brand-primary"
                              : "bg-bg-subtle text-text-muted",
                          )}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    value={activeSearchInput}
                    onChange={(event) =>
                      handleSearchInputChange(event.target.value)
                    }
                    placeholder={
                      activeFriendsTab === "players"
                        ? "Поиск игроков"
                        : "Поиск друзей"
                    }
                    className="h-11 rounded-[1.2rem] border-border-subtle/80 bg-bg-elevated/70 pl-10 text-[15px] shadow-none"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </AppSurface>
      <div className="min-h-0 flex-1 overflow-hidden pt-2 px-2 sm:p-2.5">
        {activeState.isInitialLoading && activeState.items.length === 0 ? (
          <div className="grid h-full min-h-0 content-start gap-2 overflow-y-auto pr-1">
            {Array.from({ length: 8 }).map((_, index) => (
              <CommunityRowSkeleton
                key={`community-skeleton-${activeFriendsTab}-${index}`}
                isLast={index === 7}
              />
            ))}
          </div>
        ) : activeState.error ? (
          <div className="rounded-[1.2rem] border border-state-error/25 bg-state-error/12 px-4 py-3 text-sm text-state-error">
            {activeState.error}
          </div>
        ) : activeState.total === 0 ? (
          <div className="flex h-full min-h-[14rem] items-center justify-center rounded-[1.2rem] border border-dashed border-border-subtle bg-bg-elevated/70 px-4 py-6 text-center text-sm text-text-secondary">
            {emptyStateLabel}
          </div>
        ) : (
          <div className="h-full min-h-0">
            <Virtuoso
              ref={virtuosoRef}
              key={`${activeFriendsTab}:${activeSearchQuery}`}
              className={COMMUNITY_LIST_BASE_CLASS}
              totalCount={activeState.total}
              defaultItemHeight={98}
              increaseViewportBy={COMMUNITY_OVERSCAN}
              overscan={COMMUNITY_OVERSCAN}
              components={VIRTUOSO_COMPONENTS}
              scrollerRef={handleVirtuosoScrollerRef}
              computeItemKey={(index) => {
                const item = activeState.items[index];
                return item
                  ? `${activeFriendsTab}-${String(item.telegramId ?? index)}`
                  : `${activeFriendsTab}-skeleton-${index}`;
              }}
              rangeChanged={handleRangeChanged}
              itemContent={(index) => {
                const item = activeState.items[index];

                if (!item) {
                  return (
                    <CommunityRowSkeleton
                      isLast={index === activeState.total - 1}
                    />
                  );
                }

                const rowId = String(item.telegramId ?? "");
                const isMutationPending =
                  pendingMutationByTelegramId[rowId] === true;

                return (
                  <div
                    className={cn(
                      index === activeState.total - 1 ? "pb-4" : "pb-0",
                    )}
                  >
                    <CommunityListRow
                      item={item}
                      activeFriendsTab={activeFriendsTab}
                      isMutationPending={isMutationPending}
                      onOpenPlayerProfile={onOpenPlayerProfile}
                      onToggleFriend={(nextItem) => {
                        void handleToggleFriend(nextItem);
                      }}
                    />
                  </div>
                );
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
