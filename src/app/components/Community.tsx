"use client";

import React from "react";
import { Search, UserMinus, UserPlus, Users } from "lucide-react";
import type { domain_FriendPlayerListItem } from "@/api/models/domain_FriendPlayerListItem";
import type { domain_FriendPlayersPageResponse } from "@/api/models/domain_FriendPlayersPageResponse";
import {
  addFriend,
  EMPTY_FRIEND_PLAYERS_PAGE,
  fetchFriendsPage,
  fetchPlayersPage,
  removeFriend,
} from "@/api/services/friends";
import { toast } from "@/app/lib/toast";
import { AppSurface } from "./ui/AppSurface";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  PAGE_COMPACT_PADDING,
  ROW_AVATAR,
  ROW_DETAIL,
  ROW_NAME,
  ROW_PAD,
  SHOW_ME_BTN,
} from "./ui/responsiveTokens";
import { cn } from "./ui/utils";

type FriendsTab = "players" | "friends";

const FRIENDS_PAGE_SIZE = 4;
const SEARCH_DEBOUNCE_MS = 280;

const PAGE_SHELL =
  "mx-auto grid h-full min-h-0 w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden short-phone:h-auto short-phone:min-h-full short-phone:grid-rows-[auto_auto] short-phone:overflow-visible";

const SUMMARY_TILE =
  "group relative overflow-hidden rounded-[1.35rem] border px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-[background-color,border-color,color,box-shadow,transform] hover:-translate-y-px";

const SUMMARY_TILE_LABEL =
  "text-[11px] uppercase tracking-[0.16em] text-text-muted transition-colors";

const SUMMARY_TILE_VALUE =
  "mt-2 text-[1.65rem] font-semibold leading-none tracking-tight";

const ROW_ACTION_BUTTON =
  "h-8 w-8 shrink-0 rounded-full p-0 narrow:h-7.5 narrow:w-7.5";

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
  const [playersPageIndex, setPlayersPageIndex] = React.useState(1);
  const [friendsPageIndex, setFriendsPageIndex] = React.useState(1);
  const [playersPage, setPlayersPage] =
    React.useState<domain_FriendPlayersPageResponse>(EMPTY_FRIEND_PLAYERS_PAGE);
  const [friendsPage, setFriendsPage] =
    React.useState<domain_FriendPlayersPageResponse>(EMPTY_FRIEND_PLAYERS_PAGE);
  const [isListLoading, setIsListLoading] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);
  const [pendingMutationByTelegramId, setPendingMutationByTelegramId] =
    React.useState<Record<string, boolean>>({});
  const playersRequestIdRef = React.useRef(0);
  const friendsRequestIdRef = React.useRef(0);
  const lastExternalRefreshVersionRef = React.useRef(friendsRefreshVersion);

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

  React.useEffect(() => {
    setPlayersPageIndex(1);
  }, [playersSearchQuery]);

  React.useEffect(() => {
    setFriendsPageIndex(1);
  }, [friendsSearchQuery]);

  const fetchTabPage = React.useCallback(
    async (
      tab: FriendsTab,
      pageIndex: number,
      options?: { withLoader?: boolean },
    ) => {
      if (!telegramId) {
        if (tab === "players") {
          setPlayersPage(EMPTY_FRIEND_PLAYERS_PAGE);
        } else {
          setFriendsPage(EMPTY_FRIEND_PLAYERS_PAGE);
        }
        setListError(null);
        return;
      }

      const requestId =
        tab === "players"
          ? ++playersRequestIdRef.current
          : ++friendsRequestIdRef.current;
      const withLoader = options?.withLoader !== false;
      const startWith = Math.max(0, (pageIndex - 1) * FRIENDS_PAGE_SIZE);

      if (withLoader) {
        setIsListLoading(true);
      }
      setListError(null);

      try {
        const activeSearchQuery =
          tab === "players" ? playersSearchQuery : friendsSearchQuery;
        const nextPage =
          tab === "players"
            ? await fetchPlayersPage(telegramId, {
                search: activeSearchQuery || undefined,
                limit: FRIENDS_PAGE_SIZE,
                startWith,
              })
            : await fetchFriendsPage(telegramId, {
                search: activeSearchQuery || undefined,
                limit: FRIENDS_PAGE_SIZE,
                startWith,
              });

        const isStale =
          tab === "players"
            ? playersRequestIdRef.current !== requestId
            : friendsRequestIdRef.current !== requestId;
        if (isStale) return;

        const total = nextPage.total ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / FRIENDS_PAGE_SIZE));
        if (pageIndex > totalPages) {
          if (tab === "players") {
            setPlayersPageIndex(totalPages);
          } else {
            setFriendsPageIndex(totalPages);
          }
          return;
        }

        if (tab === "players") {
          setPlayersPage(nextPage);
        } else {
          setFriendsPage(nextPage);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось загрузить список";
        setListError(message);
      } finally {
        const isStale =
          tab === "players"
            ? playersRequestIdRef.current !== requestId
            : friendsRequestIdRef.current !== requestId;
        if (!isStale && withLoader) {
          setIsListLoading(false);
        }
      }
    },
    [friendsSearchQuery, playersSearchQuery, telegramId],
  );

  React.useEffect(() => {
    const pageIndex =
      activeFriendsTab === "players" ? playersPageIndex : friendsPageIndex;
    void fetchTabPage(activeFriendsTab, pageIndex, { withLoader: true });
  }, [activeFriendsTab, fetchTabPage, friendsPageIndex, playersPageIndex]);

  React.useEffect(() => {
    if (!telegramId) return;

    const secondaryTab = activeFriendsTab === "players" ? "friends" : "players";
    const secondaryPageIndex =
      secondaryTab === "players" ? playersPageIndex : friendsPageIndex;

    void fetchTabPage(secondaryTab, secondaryPageIndex, { withLoader: false });
  }, [
    activeFriendsTab,
    fetchTabPage,
    friendsPageIndex,
    playersPageIndex,
    telegramId,
  ]);

  const refreshFriendsLists = React.useCallback(async () => {
    await Promise.all([
      fetchTabPage("players", playersPageIndex, { withLoader: false }),
      fetchTabPage("friends", friendsPageIndex, { withLoader: false }),
    ]);
  }, [fetchTabPage, friendsPageIndex, playersPageIndex]);

  React.useEffect(() => {
    if (!telegramId) return;
    if (friendsRefreshVersion === lastExternalRefreshVersionRef.current) {
      return;
    }

    lastExternalRefreshVersionRef.current = friendsRefreshVersion;
    void refreshFriendsLists();
  }, [friendsRefreshVersion, refreshFriendsLists, telegramId]);

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

      await refreshFriendsLists();
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

  const currentPage =
    activeFriendsTab === "players" ? playersPageIndex : friendsPageIndex;
  const currentPageData =
    activeFriendsTab === "players" ? playersPage : friendsPage;
  const totalPages = Math.max(
    1,
    Math.ceil((currentPageData.total ?? 0) / FRIENDS_PAGE_SIZE),
  );
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const canManageFriends = Boolean(telegramId);
  const activeSearchInput =
    activeFriendsTab === "players" ? playersSearchInput : friendsSearchInput;
  const activeSearchQuery =
    activeFriendsTab === "players" ? playersSearchQuery : friendsSearchQuery;
  const playersTotal = playersPage.total ?? 0;
  const friendsTotal = friendsPage.total ?? 0;
  const activeCount = activeFriendsTab === "players" ? playersTotal : friendsTotal;
  const activeListTitle =
    activeFriendsTab === "players" ? "Игроки сообщества" : "Мои друзья";
  
  const updatePage = (nextPage: number) => {
    if (activeFriendsTab === "players") {
      setPlayersPageIndex(nextPage);
    } else {
      setFriendsPageIndex(nextPage);
    }
  };

  const handleSearchInputChange = (value: string) => {
    if (activeFriendsTab === "players") {
      setPlayersSearchInput(value);
      return;
    }
    setFriendsSearchInput(value);
  };

  return (
    <section className={cn(PAGE_SHELL, PAGE_COMPACT_PADDING)}>
      <AppSurface className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-gold-rgb),0.16),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(var(--accent-olive-rgb),0.12),transparent_45%)]" />

        <div className="relative grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveFriendsTab("friends")}
              className={cn(
                SUMMARY_TILE,
                activeFriendsTab === "friends"
                  ? "border-brand-primary/20 bg-status-mastered-soft text-brand-primary shadow-[var(--shadow-floating)]"
                  : "border-border-subtle bg-bg-elevated text-text-primary hover:border-brand-primary/15 hover:bg-bg-surface",
              )}
            >
              <div className="absolute inset-y-0 left-0 w-1 rounded-l-[1.35rem] bg-brand-primary/40 opacity-0 transition-opacity group-hover:opacity-70" />
              <div className={cn(SUMMARY_TILE_LABEL, activeFriendsTab === "friends" && "text-brand-primary/80")}>
                Мои друзья
              </div>
              <div className={cn(SUMMARY_TILE_VALUE, activeFriendsTab === "friends" ? "text-brand-primary" : "text-text-primary")}>
                {friendsTotal}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFriendsTab("players")}
              className={cn(
                SUMMARY_TILE,
                activeFriendsTab === "players"
                  ? "border-brand-primary/20 bg-status-mastered-soft text-brand-primary shadow-[var(--shadow-floating)]"
                  : "border-border-subtle bg-bg-elevated text-text-primary hover:border-brand-primary/15 hover:bg-bg-surface",
              )}
            >
              <div className="absolute inset-y-0 left-0 w-1 rounded-l-[1.35rem] bg-brand-primary/40 opacity-0 transition-opacity group-hover:opacity-70" />
              <div className={cn(SUMMARY_TILE_LABEL, activeFriendsTab === "players" && "text-brand-primary/80")}>
                Игроки
              </div>
              <div className={cn(SUMMARY_TILE_VALUE, activeFriendsTab === "players" ? "text-brand-primary" : "text-text-primary")}>
                {playersTotal}
              </div>
            </button>
          </div>
        </div>
      </AppSurface>

      <AppSurface
        data-tour="profile-friends"
        className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3 short-phone:h-auto short-phone:grid-rows-none"
      >
        {!canManageFriends ? (
          <div className="flex flex-1 items-center justify-center rounded-[1.25rem] border border-dashed border-border-subtle bg-bg-elevated px-4 py-6 text-sm text-text-secondary">
            Telegram не инициализирован
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text-primary">
                  {activeListTitle}
                </div>
                {/* <div className="mt-1 text-xs leading-5 text-text-muted">
                  {activeListDescription}
                </div> */}
              </div>

              <div className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-3 text-xs font-semibold text-text-secondary shadow-[var(--shadow-soft)]">
                <Users className="h-3.5 w-3.5 text-brand-primary" />
                {activeCount}
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={activeSearchInput}
                onChange={(event) => handleSearchInputChange(event.target.value)}
                placeholder={
                  activeFriendsTab === "players"
                    ? "Поиск игроков"
                    : "Поиск друзей"
                }
                className="h-10 rounded-[1.2rem] border-border-subtle bg-bg-elevated/80 pl-10 shadow-none"
              />
            </div>

            <div className="grid min-h-0 content-start gap-2 overflow-y-auto pr-1">
              {isListLoading ? (
                Array.from({ length: FRIENDS_PAGE_SIZE }).map((_, index) => (
                  <div
                    key={`community-skeleton-${index}`}
                    className="h-[58px] animate-pulse rounded-[1.2rem] border border-border-subtle bg-bg-elevated"
                  />
                ))
              ) : listError ? (
                <div className="rounded-[1.2rem] border border-state-error/25 bg-state-error/12 px-4 py-3 text-sm text-state-error">
                  {listError}
                </div>
              ) : currentPageData.items.length === 0 ? (
                <div className="rounded-[1.2rem] border border-dashed border-border-subtle bg-bg-elevated px-4 py-6 text-center text-sm text-text-secondary">
                  {activeSearchQuery ? "Ничего не найдено" : "Список пуст"}
                </div>
              ) : (
                currentPageData.items.map((item) => {
                  const rowId = String(item.telegramId ?? "");
                  const displayName = friendPlayerDisplayName(item);
                  const isMutationPending =
                    pendingMutationByTelegramId[rowId] === true;
                  const showRemoveAction =
                    activeFriendsTab === "friends" || item.isFriend;

                  return (
                    <div
                      key={`${activeFriendsTab}-${rowId}`}
                      className={cn(
                        "flex items-center gap-3 border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)] transition-[background-color,border-color,box-shadow] hover:border-brand-primary/18 hover:bg-bg-surface",
                        ROW_PAD,
                      )}
                    >
                      {onOpenPlayerProfile ? (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenPlayerProfile({
                              telegramId: rowId,
                              name: displayName,
                              avatarUrl: item.avatarUrl?.trim()
                                ? item.avatarUrl.trim()
                                : null,
                            })
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-[1rem] text-left"
                          aria-label={`Открыть профиль ${displayName}`}
                        >
                          <Avatar
                            className={cn(
                              ROW_AVATAR,
                              "border border-border-subtle bg-bg-surface",
                            )}
                          >
                            {item.avatarUrl ? (
                              <AvatarImage src={item.avatarUrl} alt={displayName} />
                            ) : null}
                            <AvatarFallback className="bg-bg-subtle text-xs text-text-secondary">
                              {getInitials(displayName)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div
                              className={cn(
                                "truncate font-medium text-text-primary",
                                ROW_NAME,
                              )}
                            >
                              {displayName}
                            </div>
                            <div
                              className={cn(
                                "mt-0.5 truncate text-text-muted",
                                ROW_DETAIL,
                              )}
                            >
                              {friendPlayerSubtitle(item)}
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <Avatar
                            className={cn(
                              ROW_AVATAR,
                              "border border-border-subtle bg-bg-surface",
                            )}
                          >
                            {item.avatarUrl ? (
                              <AvatarImage src={item.avatarUrl} alt={displayName} />
                            ) : null}
                            <AvatarFallback className="bg-bg-subtle text-xs text-text-secondary">
                              {getInitials(displayName)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div
                              className={cn(
                                "truncate font-medium text-text-primary",
                                ROW_NAME,
                              )}
                            >
                              {displayName}
                            </div>
                            <div
                              className={cn(
                                "mt-0.5 truncate text-text-muted",
                                ROW_DETAIL,
                              )}
                            >
                              {friendPlayerSubtitle(item)}
                            </div>
                          </div>
                        </div>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isMutationPending}
                        data-tour={
                          showRemoveAction
                            ? undefined
                            : "profile-add-friend-button"
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleToggleFriend(item);
                        }}
                        aria-label={
                          showRemoveAction
                            ? `Удалить ${displayName}`
                            : `Добавить ${displayName}`
                        }
                        className={ROW_ACTION_BUTTON}
                      >
                        {showRemoveAction ? (
                          <UserMinus className="h-3.5 w-3.5" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canGoPrev || isListLoading}
                onClick={() => updatePage(Math.max(1, currentPage - 1))}
                className={SHOW_ME_BTN}
              >
                Назад
              </Button>

              <div className="text-xs text-text-muted">
                {currentPage}/{totalPages}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canGoNext || isListLoading}
                onClick={() => updatePage(Math.min(totalPages, currentPage + 1))}
                className={SHOW_ME_BTN}
              >
                Вперёд
              </Button>
            </div>
          </>
        )}
      </AppSurface>
    </section>
  );
}
