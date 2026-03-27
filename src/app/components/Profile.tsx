"use client";

import React from "react";
import { LogOut, Search, UserMinus, UserPlus } from "lucide-react";
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
import { useTrainingFontStore } from "@/app/stores/trainingFontStore";
import {
  getTelegramWebApp,
  isTelegramDevMock,
} from "@/app/lib/telegramWebApp";
import { useTelegram } from "../contexts/TelegramContext";
import { Feedback } from "./Feedback";
import { AppSurface } from "./ui/AppSurface";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  AVATAR_SIZE,
  PAGE_COMPACT_PADDING,
  ROW_AVATAR,
  ROW_DETAIL,
  ROW_NAME,
  ROW_PAD,
  SEGMENTED_TABS_TRIGGER,
  SHOW_ME_BTN,
} from "./ui/responsiveTokens";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "./ui/utils";

type Theme = "light" | "dark";
type FriendsTab = "players" | "friends";
type ProfileTab = "community" | "settings" | "feedback";

const FRIENDS_PAGE_SIZE = 4;
const SEARCH_DEBOUNCE_MS = 280;

const PAGE_SHELL =
  "mx-auto grid h-full min-h-0 w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden short-phone:h-auto short-phone:min-h-full short-phone:grid-rows-[auto_auto] short-phone:overflow-visible";

const SETTINGS_CARD_ROW =
  "flex items-center justify-between gap-3 rounded-[1.15rem] border border-border-subtle bg-bg-elevated px-3.5 py-2.5 shadow-[var(--shadow-soft)]";

const FONT_BUTTON =
  "flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-medium transition-[background-color,border-color,color,box-shadow]";

const ROW_ACTION_BUTTON =
  "h-8 w-8 shrink-0 rounded-full p-0 narrow:h-7.5 narrow:w-7.5";

const SUMMARY_TILE =
  "flex items-center justify-between gap-3 rounded-[1.15rem] border border-border-subtle bg-bg-elevated px-3.5 py-3 text-left shadow-[var(--shadow-soft)] transition-[background-color,border-color,color,box-shadow] hover:border-brand-primary/25";

const SUMMARY_TILE_LABEL =
  "text-[11px] uppercase tracking-[0.14em] text-text-muted";

const SUMMARY_TILE_VALUE =
  "mt-1 text-lg font-semibold leading-none text-text-primary";

const SETTINGS_INFO_CARD =
  "flex h-full flex-col justify-between rounded-[1.15rem] border border-border-subtle bg-bg-elevated px-3.5 py-3 shadow-[var(--shadow-soft)]";

const TRAINING_FONT_OPTIONS = [
  { value: "small", label: "Малый", preview: 14 },
  { value: "medium", label: "Средний", preview: 17 },
  { value: "large", label: "Крупный", preview: 20 },
  { value: "extra-large", label: "Очень крупный", preview: 24 },
] as const;

function friendPlayerDisplayName(item: domain_FriendPlayerListItem): string {
  const n = item.name?.trim();
  if (n) return n;
  const nick = item.nickname?.trim();
  if (nick) return nick.startsWith("@") ? nick : `@${nick}`;
  return item.telegramId ? `ID ${item.telegramId}` : "Игрок";
}

function friendPlayerSubtitle(item: domain_FriendPlayerListItem): string {
  const c = item.versesCount;
  if (c != null && Number.isFinite(c)) {
    return `${Math.max(0, Math.round(c))} стихов`;
  }
  return "Нет данных";
}

interface ProfileProps {
  theme: Theme;
  onToggleTheme: () => void;
  telegramId?: string | null;
  currentUserAvatarUrl?: string | null;
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

export function Profile({
  theme,
  onToggleTheme,
  telegramId = null,
  currentUserAvatarUrl,
  onFriendsChanged,
  onOpenPlayerProfile,
  friendsRefreshVersion = 0,
}: ProfileProps) {
  const { user } = useTelegram();
  const effectiveAvatarUrl = currentUserAvatarUrl ?? user?.photoUrl ?? null;

  const trainingFontStore = useTrainingFontStore();
  const trainingFontSize = trainingFontStore.trainingFontSize;

  const [activeTab, setActiveTab] = React.useState<ProfileTab>("community");
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
        label: "Друзья",
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
          toast.success("Друг удалён", { label: "Друзья" });
        }
      } else {
        const response = await addFriend(telegramId, targetId);
        if (response.status === "added") {
          toast.success("Друг добавлен", { label: "Друзья" });
        }
      }

      await refreshFriendsLists();
      onFriendsChanged?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось изменить список друзей";
      toast.error(message, { label: "Друзья" });
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

  const profileName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Пользователь Telegram";
  const usernameLabel = user?.username
    ? `@${user.username}`
    : telegramId
      ? `ID ${telegramId}`
      : "Telegram";
  const themeLabel = theme === "dark" ? "Тёмная" : "Светлая";
  const fontOption =
    TRAINING_FONT_OPTIONS.find((option) => option.value === trainingFontSize) ??
    TRAINING_FONT_OPTIONS[1];
  const playersTotal = playersPage.total ?? 0;
  const friendsTotal = friendsPage.total ?? 0;
  const canOpenCurrentProfile = Boolean(telegramId && onOpenPlayerProfile);

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

  const handleExitApplication = React.useCallback(() => {
    const webApp = getTelegramWebApp();

    if (webApp && !isTelegramDevMock(webApp) && typeof webApp.close === "function") {
      webApp.close();
      return;
    }

    window.close();
  }, []);

  const handleOpenCurrentProfile = React.useCallback(() => {
    if (!telegramId || !onOpenPlayerProfile) return;
    onOpenPlayerProfile({
      telegramId,
      name: profileName,
      avatarUrl: effectiveAvatarUrl,
    });
  }, [effectiveAvatarUrl, onOpenPlayerProfile, profileName, telegramId]);

  return (
    <section className={cn(PAGE_SHELL, PAGE_COMPACT_PADDING)}>
      <AppSurface className="shrink-0">
        <div className="flex items-center justify-between gap-3">
          {telegramId && onOpenPlayerProfile ? (
            <button
              type="button"
              onClick={handleOpenCurrentProfile}
              className="flex min-w-0 items-center gap-3 text-left"
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
                <div className="truncate text-base font-semibold text-text-primary sm:text-lg">
                  {profileName}
                </div>
                <div className="truncate text-sm text-text-muted">
                  {usernameLabel}
                </div>
              </div>
            </button>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
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
                <div className="truncate text-base font-semibold text-text-primary sm:text-lg">
                  {profileName}
                </div>
                <div className="truncate text-sm text-text-muted">
                  {usernameLabel}
                </div>
              </div>
            </div>
          )}
        </div>
      </AppSurface>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ProfileTab)}
        className="min-h-0 flex-1 gap-3"
      >
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-[1.35rem]">
          <TabsTrigger value="community" className={SEGMENTED_TABS_TRIGGER}>
            Друзья
          </TabsTrigger>
          <TabsTrigger value="settings" className={SEGMENTED_TABS_TRIGGER}>
            Настройки
          </TabsTrigger>
          <TabsTrigger value="feedback" className={SEGMENTED_TABS_TRIGGER}>
            Отзыв
          </TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="min-h-0">
          <AppSurface
            data-tour="profile-friends"
            className="grid h-full min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-3 short-phone:h-auto short-phone:grid-rows-none"
          >
            {!canManageFriends ? (
              <div className="flex flex-1 items-center justify-center rounded-[1.2rem] border border-dashed border-border-subtle bg-bg-elevated px-4 py-6 text-sm text-text-secondary">
                Telegram не инициализирован
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFriendsTab("friends")}
                    className={cn(
                      SUMMARY_TILE,
                      activeFriendsTab === "friends" &&
                        "border-brand-primary/20 bg-status-mastered-soft text-brand-primary",
                    )}
                  >
                    <div>
                      <div className={SUMMARY_TILE_LABEL}>Мои друзья</div>
                      <div className={SUMMARY_TILE_VALUE}>{friendsTotal}</div>
                    </div>
                    {/* <div className="text-xs text-text-muted">список</div> */}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveFriendsTab("players")}
                    className={cn(
                      SUMMARY_TILE,
                      activeFriendsTab === "players" &&
                        "border-brand-primary/20 bg-status-mastered-soft text-brand-primary",
                    )}
                  >
                    <div>
                      <div className={SUMMARY_TILE_LABEL}>Игроки</div>
                      <div className={SUMMARY_TILE_VALUE}>{playersTotal}</div>
                    </div>
                    {/* <div className="text-xs text-text-muted">поиск</div> */}
                  </button>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    value={activeSearchInput}
                    onChange={(event) => handleSearchInputChange(event.target.value)}
                    placeholder={
                      activeFriendsTab === "players" ? "Поиск игроков" : "Поиск друзей"
                    }
                    className="h-10 rounded-[1.2rem] border-border-subtle bg-bg-elevated/80 pl-10 shadow-none"
                  />
                </div>

                <div className="grid min-h-0 content-start gap-2">
                  {isListLoading ? (
                    Array.from({ length: FRIENDS_PAGE_SIZE }).map((_, index) => (
                      <div
                        key={`friends-skeleton-${index}`}
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
                            "flex items-center gap-3 border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]",
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
                                <div className={cn("truncate font-medium text-text-primary", ROW_NAME)}>
                                  {displayName}
                                </div>
                                <div className={cn("mt-0.5 truncate text-text-muted", ROW_DETAIL)}>
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
                                <div className={cn("truncate font-medium text-text-primary", ROW_NAME)}>
                                  {displayName}
                                </div>
                                <div className={cn("mt-0.5 truncate text-text-muted", ROW_DETAIL)}>
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
                            data-tour={showRemoveAction ? undefined : "profile-add-friend-button"}
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
                    onClick={() =>
                      updatePage(Math.min(totalPages, currentPage + 1))
                    }
                    className={SHOW_ME_BTN}
                  >
                    Вперёд
                  </Button>
                </div>
              </>
            )}
          </AppSurface>
        </TabsContent>

        <TabsContent value="settings" className="min-h-0">
          <AppSurface className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3 short-phone:h-auto short-phone:grid-rows-none">
            <div className={SETTINGS_CARD_ROW}>
              <div className="text-sm font-medium text-text-primary">Тема</div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={onToggleTheme}
                aria-label="Тёмная тема"
              />
            </div>

            <div className={SETTINGS_CARD_ROW}>
              <div className="text-sm font-medium text-text-primary">Шрифт</div>

              <div className="flex flex-wrap justify-end gap-1">
                {TRAINING_FONT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => trainingFontStore.setTrainingFontSize(option.value)}
                    className={cn(
                      FONT_BUTTON,
                      trainingFontSize === option.value
                        ? "border border-brand-primary/20 bg-status-mastered-soft text-brand-primary shadow-[var(--shadow-soft)]"
                        : "border border-transparent bg-bg-subtle text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <span style={{ fontSize: option.preview }} className="font-serif leading-none">
                      Аа
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid min-h-0 grid-cols-2 gap-2 short-phone:grid-cols-1">
              <div className={SETTINGS_INFO_CARD}>
                <div>
                  <div className={SUMMARY_TILE_LABEL}>Профиль</div>
                  <div className="mt-2 truncate text-sm font-medium text-text-primary">
                    {profileName}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-text-muted">
                    {usernameLabel}
                  </div>
                </div>

                {canOpenCurrentProfile ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenCurrentProfile}
                    className="mt-3 h-9 rounded-full px-3 text-xs"
                  >
                    Открыть профиль
                  </Button>
                ) : (
                  <div className="mt-3 text-xs text-text-muted">
                    Профиль доступен после инициализации Telegram.
                  </div>
                )}
              </div>

              <div className={SETTINGS_INFO_CARD}>
                <div>
                  <div className={SUMMARY_TILE_LABEL}>Сеанс</div>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-secondary">Режим</span>
                      <span className="font-medium text-text-primary">
                        Fullscreen
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-secondary">Тема</span>
                      <span className="font-medium text-text-primary">
                        {themeLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-secondary">Шрифт</span>
                      <span className="font-medium text-text-primary">
                        {fontOption.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-text-muted">
                  Настройки применяются сразу.
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <Button
                type="button"
                variant="destructive"
                onClick={handleExitApplication}
                className="h-10 w-full rounded-full px-4 text-sm sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </Button>
            </div>
          </AppSurface>
        </TabsContent>

        <TabsContent value="feedback" className="min-h-0">
          <AppSurface className="h-full min-h-0 short-phone:h-auto">
            <Feedback telegramId={telegramId} />
          </AppSurface>
        </TabsContent>
      </Tabs>
    </section>
  );
}
