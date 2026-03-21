"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Expand,
  Minimize2,
  Moon,
  Search,
  Sun,
  UserMinus,
  UserPlus,
} from "lucide-react";
import {
  applyTelegramFullscreenPreference,
  useTelegramUiStore,
} from "@/app/stores/telegramUiStore";
import { useTrainingFontStore } from "@/app/stores/trainingFontStore";
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
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";
import { formatXp } from "@/shared/social/formatXp";
import { useTelegram } from "../contexts/TelegramContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Feedback } from "./Feedback";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "./ui/utils";
type Theme = "light" | "dark";
type FriendsTab = "players" | "friends";

const FRIENDS_PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 280;

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
    return `${Math.max(0, Math.round(c))} стихов в учёте`;
  }
  return "Нет данных по стихам";
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

function pluralizePeople(count: number, one: string, few: string, many: string) {
  if (count % 10 === 1 && count % 100 !== 11) return one;
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return few;
  }
  return many;
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
  const isTelegramMiniApp = useTelegramUiStore(
    (state) => state.isTelegramMiniApp
  );
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen
  );
  const canToggleTelegramFullscreen = useTelegramUiStore(
    (state) => state.canToggleTelegramFullscreen
  );
  const prefersTelegramFullscreen = useTelegramUiStore(
    (state) => state.prefersTelegramFullscreen
  );
  const isNextJsDev = process.env.NODE_ENV === "development";
  const currentUserTelegramId = useCurrentUserStatsStore((state) => state.telegramId);
  const currentUserXp = useCurrentUserStatsStore((state) => state.xp);
  const currentUserDailyStreak = useCurrentUserStatsStore(
    (state) => state.dailyStreak
  );
  const trainingFontStore = useTrainingFontStore();
  const trainingFontSize = trainingFontStore.trainingFontSize;
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion ?? false);
  const [activeTab, setActiveTab] = React.useState<FriendsTab>("friends");
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

  const getDisplayXp = React.useCallback(
    (item: domain_FriendPlayerListItem) =>
      telegramId &&
      currentUserTelegramId === telegramId &&
      item.telegramId === telegramId &&
      currentUserXp != null
        ? currentUserXp
        : 0,
    [currentUserTelegramId, currentUserXp, telegramId]
  );

  const getDisplayDailyStreak = React.useCallback(
    (item: domain_FriendPlayerListItem) =>
      telegramId &&
      currentUserTelegramId === telegramId &&
      item.telegramId === telegramId &&
      currentUserDailyStreak != null
        ? currentUserDailyStreak
        : 0,
    [currentUserDailyStreak, currentUserTelegramId, telegramId]
  );

  const sectionVariants = {
    hidden: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : 12,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.24,
        ease: "easeOut" as const,
      },
    },
  };

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPlayersSearchQuery(playersSearchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [playersSearchInput]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFriendsSearchQuery(friendsSearchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeout);
    };
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
        const totalPages = Math.max(
          1,
          Math.ceil(total / FRIENDS_PAGE_SIZE),
        );
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
      activeTab === "players" ? playersPageIndex : friendsPageIndex;
    void fetchTabPage(activeTab, pageIndex, { withLoader: true });
  }, [activeTab, fetchTabPage, friendsPageIndex, playersPageIndex]);

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
    if (!targetId) return;
    if (pendingMutationByTelegramId[targetId]) {
      return;
    }

    setMutationPending(targetId, true);
    try {
      if (item.isFriend) {
        const response = await removeFriend(telegramId, targetId);
        if (response.status === "removed") {
          toast.success("Друг удалён", {
            label: "Друзья",
          });
        } else {
          toast.info("Пользователь уже не был у вас в друзьях", {
            label: "Друзья",
          });
        }
      } else {
        const response = await addFriend(telegramId, targetId);
        if (response.status === "added") {
          toast.success("Друг добавлен", {
            label: "Друзья",
          });
        } else {
          toast.info("Пользователь уже добавлен в друзья", {
            label: "Друзья",
          });
        }
      }

      await refreshFriendsLists();
      onFriendsChanged?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось изменить список друзей";
      toast.error(message, {
        label: "Друзья",
      });
    } finally {
      setMutationPending(targetId, false);
    }
  };

  const currentPage =
    activeTab === "players" ? playersPageIndex : friendsPageIndex;
  const currentPageData = activeTab === "players" ? playersPage : friendsPage;
  const totalPages = Math.max(
    1,
    Math.ceil((currentPageData.total ?? 0) / FRIENDS_PAGE_SIZE),
  );
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const canManageFriends = Boolean(telegramId);
  const fullscreenButtonLabel = "Полный экран";

  const activeCount =
    activeTab === "players"
      ? (playersPage.total ?? 0)
      : (friendsPage.total ?? 0);
  const activeSearchInput =
    activeTab === "players" ? playersSearchInput : friendsSearchInput;
  const activeSearchQuery =
    activeTab === "players" ? playersSearchQuery : friendsSearchQuery;
  const profileName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Пользователь Telegram";
  const usernameLabel = user?.username ? `@${user.username}` : "Без username";
  const telegramStatusLabel = canManageFriends
    ? "Telegram синхронизирован"
    : "Ожидаем инициализацию Telegram";
  const activeCountLabel =
    activeTab === "players"
      ? `${activeCount} ${pluralizePeople(activeCount, "игрок", "игрока", "игроков")}`
      : `${activeCount} ${pluralizePeople(activeCount, "друг", "друга", "друзей")}`;

  const updatePage = (nextPage: number) => {
    if (activeTab === "players") {
      setPlayersPageIndex(nextPage);
    } else {
      setFriendsPageIndex(nextPage);
    }
  };

  const handleSearchInputChange = (value: string) => {
    if (activeTab === "players") {
      setPlayersSearchInput(value);
      return;
    }

    setFriendsSearchInput(value);
  };

  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-5xl p-4 sm:p-6 lg:p-8",
        isTelegramFullscreen ? "pt-3 sm:pt-5 lg:pt-7" : "",
      )}
    >
      <motion.div
        {...(shouldReduceMotion
          ? {}
          : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.2, ease: "easeOut" as const },
            })}
      >
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: shouldReduceMotion ? 0 : 0.06,
                delayChildren: shouldReduceMotion ? 0 : 0.02,
              },
            },
          }}
          className="space-y-5"
        >
          {isTelegramFullscreen ? null : (
            <motion.div variants={sectionVariants}>
              <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                Профиль
              </h1>
            </motion.div>
          )}
          <motion.div variants={sectionVariants}>
            <ProfileSurface>
              {telegramId && onOpenPlayerProfile ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenPlayerProfile({
                      telegramId,
                      name: profileName,
                      avatarUrl: effectiveAvatarUrl,
                    })
                  }
                  className="w-full text-left transition-opacity hover:opacity-90"
                  aria-label="Открыть ваш профиль"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-14 w-14 border border-border/60 bg-background/70">
                        {effectiveAvatarUrl ? (
                          <AvatarImage src={effectiveAvatarUrl} alt={profileName} />
                        ) : null}
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          {getInitials(profileName || "TG")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-foreground/80">
                          {profileName}
                        </div>
                        <div className="mt-1 truncate text-sm text-foreground/56">
                          {usernameLabel}
                        </div>
                        <div className="mt-2 inline-flex items-center rounded-full border border-border/60 bg-background/45 px-3 py-1 text-xs text-foreground/62">
                          {telegramStatusLabel}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {user?.isPremium ? (
                        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                          Telegram Premium
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-14 w-14 border border-border/60 bg-background/70">
                      {effectiveAvatarUrl ? (
                        <AvatarImage src={effectiveAvatarUrl} alt={profileName} />
                      ) : null}
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {getInitials(profileName || "TG")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-foreground/80">
                        {profileName}
                      </div>
                      <div className="mt-1 truncate text-sm text-foreground/56">
                        {usernameLabel}
                      </div>
                      <div className="mt-2 inline-flex items-center rounded-full border border-border/60 bg-background/45 px-3 py-1 text-xs text-foreground/62">
                        {telegramStatusLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {user?.isPremium ? (
                      <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                        Telegram Premium
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </ProfileSurface>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <ProfileSurface>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground/82">
                    Оформление
                  </div>
                  <div className="mt-1 text-sm text-foreground/56">
                    Переключение между светлой и тёмной темой интерфейса.
                  </div>
                </div>

                <div className="w-fit flex items-center gap-3 rounded-full border border-border/60 bg-background/55 px-4 py-2 text-sm text-foreground/78">
                  {theme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  <span>Тёмная тема</span>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={onToggleTheme}
                    aria-label="Тёмная тема"
                  />
                </div>
              </div>
            </ProfileSurface>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <ProfileSurface>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground/82">
                    Размер шрифта
                  </div>
                  <div className="mt-1 text-sm text-foreground/56">
                    Размер текста в тренировочных упражнениях.
                  </div>
                </div>

                <div className="flex w-fit items-center gap-1 rounded-full border border-border/60 bg-background/55 p-1">
                  {(
                    [
                      { value: "small", label: "Малый", preview: 14 },
                      { value: "medium", label: "Средний", preview: 17 },
                      { value: "large", label: "Крупный", preview: 20 },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => trainingFontStore.setTrainingFontSize(option.value)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                        trainingFontSize === option.value
                          ? "bg-primary/15 text-foreground border border-primary/30 shadow-sm"
                          : "text-foreground/60 border border-transparent hover:text-foreground/80"
                      )}
                    >
                      <span style={{ fontSize: option.preview }} className="font-serif leading-none">
                        Аа
                      </span>
                      <span className="hidden min-[400px]:inline">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </ProfileSurface>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <ProfileSurface>
              <div className="flex w-fit flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground/82">
                    Полный экран Telegram
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    !(isTelegramMiniApp || isNextJsDev) ||
                    (!canToggleTelegramFullscreen && !isNextJsDev)
                  }
                  onClick={() =>
                    applyTelegramFullscreenPreference(!prefersTelegramFullscreen)
                  }
                  className="h-10 rounded-full border-border/60 bg-background/55 px-4 text-sm text-foreground/78 shadow-none"
                >
                  {prefersTelegramFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Expand className="h-4 w-4" />
                  )}
                  {fullscreenButtonLabel}
                </Button>
              </div>
            </ProfileSurface>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <ProfileSurface data-tour="profile-friends">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-foreground/80">
                  Друзья
                </h2>
                {canManageFriends ? (
                  <div className="text-sm text-foreground/45">{activeCountLabel}</div>
                ) : null}
              </div>

              {!canManageFriends ? (
                <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-background/45 p-4 text-sm text-foreground/56">
                  Раздел станет доступен после инициализации профиля в Telegram.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as FriendsTab)}
                  >
                    <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-border/60 bg-background/45 p-1">
                      <TabsTrigger
                        data-tour="profile-players-tab"
                        value="players"
                        className="h-9 rounded-xl text-sm text-foreground/66 data-[state=active]:bg-background data-[state=active]:text-foreground/80 data-[state=active]:shadow-none"
                      >
                        Игроки
                      </TabsTrigger>
                      <TabsTrigger
                        value="friends"
                        className="h-9 rounded-xl text-sm text-foreground/66 data-[state=active]:bg-background data-[state=active]:text-foreground/80 data-[state=active]:shadow-none"
                      >
                        Друзья
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
                    <Input
                      value={activeSearchInput}
                      onChange={(event) => handleSearchInputChange(event.target.value)}
                      placeholder={
                        activeTab === "players" ? "Поиск игроков" : "Поиск друзей"
                      }
                      className="h-11 rounded-2xl border-border/60 bg-background/45 pl-9 shadow-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-foreground/42">
                    <span>{activeCountLabel}</span>
                    <span>
                      {currentPage}/{totalPages}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {isListLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={`friends-skeleton-${index}`}
                          className="h-16 animate-pulse rounded-2xl border border-border/60 bg-background/45"
                        />
                      ))
                    ) : listError ? (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        <div>{listError}</div>
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void fetchTabPage(
                                activeTab,
                                activeTab === "players"
                                  ? playersPageIndex
                                  : friendsPageIndex,
                                { withLoader: true },
                              )
                            }
                          >
                            Повторить
                          </Button>
                        </div>
                      </div>
                    ) : currentPageData.items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/60 bg-background/45 p-4 text-sm text-foreground/56">
                        <div>
                          {activeSearchQuery
                            ? "Ничего не найдено."
                            : activeTab === "players"
                              ? "Сейчас список игроков пуст."
                              : "Пока нет друзей. Перейдите во вкладку игроков, чтобы добавить их."}
                        </div>
                        {!activeSearchQuery && activeTab === "friends" ? (
                          <div className="mt-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveTab("players")}
                              className="h-9 rounded-full border-border/60 bg-background/55 px-4 text-xs text-foreground/78 shadow-none"
                            >
                              Открыть игроков
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      currentPageData.items.map((item) => {
                        const rowId = String(item.telegramId ?? "");
                        const displayName = friendPlayerDisplayName(item);
                        const isMutationPending =
                          pendingMutationByTelegramId[rowId] === true;
                        const showRemoveAction =
                          activeTab === "friends" || item.isFriend;

                        return (
                          <div
                            key={`${activeTab}-${rowId}`}
                            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/45 px-3 py-3"
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
                                className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:bg-background/20"
                                aria-label={`Открыть профиль ${displayName}`}
                              >
                                <Avatar className="h-10 w-10 border border-border/60 bg-background/70">
                                  {item.avatarUrl ? (
                                    <AvatarImage src={item.avatarUrl} alt={displayName} />
                                  ) : null}
                                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                                    {getInitials(displayName)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-foreground/82">
                                    {displayName}
                                  </div>
                                  <div className="mt-1 truncate text-xs text-foreground/48">
                                    {friendPlayerSubtitle(item)} ·{" "}
                                    {formatXp(getDisplayXp(item))} ·{" "}
                                    {getDisplayDailyStreak(item)} дн. подряд
                                  </div>
                                </div>
                              </button>
                            ) : (
                              <>
                                <Avatar className="h-10 w-10 border border-border/60 bg-background/70">
                                  {item.avatarUrl ? (
                                    <AvatarImage src={item.avatarUrl} alt={displayName} />
                                  ) : null}
                                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                                    {getInitials(displayName)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-foreground/82">
                                    {displayName}
                                  </div>
                                  <div className="mt-1 truncate text-xs text-foreground/48">
                                    {friendPlayerSubtitle(item)} ·{" "}
                                    {formatXp(getDisplayXp(item))} ·{" "}
                                    {getDisplayDailyStreak(item)} дн. подряд
                                  </div>
                                </div>
                              </>
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
                              className="h-9 rounded-full border-border/60 bg-background/55 px-3 text-xs text-foreground/78 shadow-none"
                            >
                              {showRemoveAction ? (
                                <>
                                  <UserMinus className="h-3.5 w-3.5" />
                                  Удалить
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Добавить
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border/55 pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canGoPrev || isListLoading}
                      onClick={() => updatePage(Math.max(1, currentPage - 1))}
                      className="h-9 rounded-full border-border/60 bg-background/55 px-4 text-xs text-foreground/78 shadow-none"
                    >
                      Назад
                    </Button>

                    <div className="text-xs text-foreground/42">
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
                      className="h-9 rounded-full border-border/60 bg-background/55 px-4 text-xs text-foreground/78 shadow-none"
                    >
                      Вперёд
                    </Button>
                  </div>
                </div>
              )}
            </ProfileSurface>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <ProfileSurface>
              <Feedback telegramId={telegramId} />
            </ProfileSurface>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function ProfileSurface({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-[28px] border-border/65 bg-card/55 p-5 shadow-none backdrop-blur-xl sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
