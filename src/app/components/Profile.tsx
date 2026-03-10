"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Moon, Search, Sun, UserMinus, UserPlus } from "lucide-react";
import {
  addFriend,
  EMPTY_FRIEND_PLAYERS_PAGE,
  fetchFriendsPage,
  fetchPlayersPage,
  removeFriend,
  type FriendPlayerListItem,
  type FriendPlayersPageResponse,
} from "@/api/services/friends";
import { toast } from "@/app/lib/toast";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "./ui/utils";

type Theme = "light" | "dark";
type FriendsTab = "players" | "friends";

const FRIENDS_PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 280;

interface ProfileProps {
  theme: Theme;
  onToggleTheme: () => void;
  telegramId?: string | null;
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

export function Profile({
  theme,
  onToggleTheme,
  telegramId = null,
  onFriendsChanged,
}: ProfileProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = React.useState<FriendsTab>("players");
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [playersPageIndex, setPlayersPageIndex] = React.useState(1);
  const [friendsPageIndex, setFriendsPageIndex] = React.useState(1);
  const [playersPage, setPlayersPage] =
    React.useState<FriendPlayersPageResponse>(EMPTY_FRIEND_PLAYERS_PAGE);
  const [friendsPage, setFriendsPage] =
    React.useState<FriendPlayersPageResponse>(EMPTY_FRIEND_PLAYERS_PAGE);
  const [isListLoading, setIsListLoading] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);
  const [pendingMutationByTelegramId, setPendingMutationByTelegramId] =
    React.useState<Record<string, boolean>>({});
  const playersRequestIdRef = React.useRef(0);
  const friendsRequestIdRef = React.useRef(0);

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
      setSearchQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchInput]);

  React.useEffect(() => {
    setPlayersPageIndex(1);
    setFriendsPageIndex(1);
  }, [searchQuery]);

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
        const nextPage =
          tab === "players"
            ? await fetchPlayersPage(telegramId, {
                search: searchQuery || undefined,
                limit: FRIENDS_PAGE_SIZE,
                startWith,
              })
            : await fetchFriendsPage(telegramId, {
                search: searchQuery || undefined,
                limit: FRIENDS_PAGE_SIZE,
                startWith,
              });

        const isStale =
          tab === "players"
            ? playersRequestIdRef.current !== requestId
            : friendsRequestIdRef.current !== requestId;
        if (isStale) return;

        const totalPages = Math.max(
          1,
          Math.ceil(nextPage.totalCount / FRIENDS_PAGE_SIZE),
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
    [searchQuery, telegramId],
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

  const handleToggleFriend = async (item: FriendPlayerListItem) => {
    if (!telegramId) {
      toast.error("Не найден telegramId");
      return;
    }
    if (pendingMutationByTelegramId[item.telegramId]) {
      return;
    }

    setMutationPending(item.telegramId, true);
    try {
      if (item.isFriend) {
        const response = await removeFriend(telegramId, item.telegramId);
        if (response.status === "removed") {
          toast.success("Друг удалён");
        } else {
          toast.info("Пользователь уже не был у вас в друзьях");
        }
      } else {
        const response = await addFriend(telegramId, item.telegramId);
        if (response.status === "added") {
          toast.success("Друг добавлен");
        } else {
          toast.info("Пользователь уже добавлен в друзья");
        }
      }

      await refreshFriendsLists();
      onFriendsChanged?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось изменить список друзей";
      toast.error(message);
    } finally {
      setMutationPending(item.telegramId, false);
    }
  };

  const currentPage =
    activeTab === "players" ? playersPageIndex : friendsPageIndex;
  const currentPageData = activeTab === "players" ? playersPage : friendsPage;
  const totalPages = Math.max(
    1,
    Math.ceil(currentPageData.totalCount / FRIENDS_PAGE_SIZE),
  );
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const canManageFriends = Boolean(telegramId);
  const themeLabel = theme === "dark" ? "Тёмная" : "Светлая";
  const activeCount =
    activeTab === "players" ? playersPage.totalCount : friendsPage.totalCount;

  const updatePage = (nextPage: number) => {
    if (activeTab === "players") {
      setPlayersPageIndex(nextPage);
    } else {
      setFriendsPageIndex(nextPage);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
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
          <motion.div variants={sectionVariants}>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Профиль
            </h1>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <ProfileSurface>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground/82">
                    Тема
                  </div>
                  <div className="mt-1 text-sm text-foreground/52">
                    {themeLabel}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onToggleTheme}
                  className="h-10 rounded-full border-border/60 bg-background/55 px-4 text-foreground/78 shadow-none"
                  aria-label={`Переключить на ${theme === "light" ? "тёмную" : "светлую"} тему`}
                >
                  {theme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  {themeLabel}
                </Button>
              </div>
            </ProfileSurface>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <ProfileSurface>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Друзья
                </h2>
                {canManageFriends ? (
                  <div className="text-sm text-foreground/45">{activeCount}</div>
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
                        value="players"
                        className="h-9 rounded-xl text-sm text-foreground/55 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none"
                      >
                        Игроки
                      </TabsTrigger>
                      <TabsTrigger
                        value="friends"
                        className="h-9 rounded-xl text-sm text-foreground/55 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none"
                      >
                        Друзья
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
                    <Input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder={
                        activeTab === "players" ? "Поиск игроков" : "Поиск друзей"
                      }
                      className="h-11 rounded-2xl border-border/60 bg-background/45 pl-9 shadow-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-foreground/42">
                    <span>{activeCount}</span>
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
                        {searchQuery
                          ? "Ничего не найдено."
                          : activeTab === "players"
                            ? "Пока пусто."
                            : "Пока нет друзей."}
                      </div>
                    ) : (
                      currentPageData.items.map((item) => {
                        const isMutationPending =
                          pendingMutationByTelegramId[item.telegramId] === true;
                        const showRemoveAction =
                          activeTab === "friends" || item.isFriend;

                        return (
                          <div
                            key={`${activeTab}-${item.telegramId}`}
                            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/45 px-3 py-3"
                          >
                            <Avatar className="h-10 w-10 border border-border/60 bg-background/70">
                              {item.avatarUrl ? (
                                <AvatarImage src={item.avatarUrl} alt={item.name} />
                              ) : null}
                              <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                                {getInitials(item.name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-foreground/82">
                                {item.name}
                              </div>
                              <div className="mt-1 truncate text-xs text-foreground/48">
                                {formatRelativeLastActive(item.lastActiveAt)} ·{" "}
                                {item.averageProgressPercent}% · {item.dailyStreak} дн.
                              </div>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isMutationPending}
                              onClick={() => void handleToggleFriend(item)}
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
