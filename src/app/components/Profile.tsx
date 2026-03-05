'use client'

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Flame, Moon, Palette, Search, Sun, UserMinus, UserPlus, Users } from 'lucide-react';
import {
  addFriend,
  EMPTY_FRIEND_PLAYERS_PAGE,
  fetchFriendsPage,
  fetchPlayersPage,
  removeFriend,
  type FriendPlayerListItem,
  type FriendPlayersPageResponse,
} from '@/api/services/friends';
import { toast } from '@/app/lib/toast';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

type Theme = 'light' | 'dark';
type FriendsTab = 'players' | 'friends';

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
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatRelativeLastActive(value: string | null): string {
  if (!value) return 'Пока без активности';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Пока без активности';

  const deltaMs = Date.now() - parsed;
  if (deltaMs < 2 * 60 * 1000) return 'Активен(а) только что';

  const minutes = Math.floor(deltaMs / (60 * 1000));
  if (minutes < 60) return `Активен(а) ${minutes} мин назад`;

  const hours = Math.floor(deltaMs / (60 * 60 * 1000));
  if (hours < 24) return `Активен(а) ${hours} ч назад`;

  const days = Math.floor(deltaMs / (24 * 60 * 60 * 1000));
  if (days < 7) return `Активен(а) ${days} дн назад`;

  return `Активен(а) ${new Date(parsed).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })}`;
}

export function Profile({
  theme,
  onToggleTheme,
  telegramId = null,
  onFriendsChanged,
}: ProfileProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = React.useState<FriendsTab>('players');
  const [searchInput, setSearchInput] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
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
        ease: 'easeOut' as const,
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
      options?: { withLoader?: boolean }
    ) => {
      if (!telegramId) {
        if (tab === 'players') {
          setPlayersPage(EMPTY_FRIEND_PLAYERS_PAGE);
        } else {
          setFriendsPage(EMPTY_FRIEND_PLAYERS_PAGE);
        }
        setListError(null);
        return;
      }

      const requestId =
        tab === 'players'
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
          tab === 'players'
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
          tab === 'players'
            ? playersRequestIdRef.current !== requestId
            : friendsRequestIdRef.current !== requestId;
        if (isStale) return;

        const totalPages = Math.max(
          1,
          Math.ceil(nextPage.totalCount / FRIENDS_PAGE_SIZE)
        );
        if (pageIndex > totalPages) {
          if (tab === 'players') {
            setPlayersPageIndex(totalPages);
          } else {
            setFriendsPageIndex(totalPages);
          }
          return;
        }

        if (tab === 'players') {
          setPlayersPage(nextPage);
        } else {
          setFriendsPage(nextPage);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось загрузить список';
        setListError(message);
      } finally {
        const isStale =
          tab === 'players'
            ? playersRequestIdRef.current !== requestId
            : friendsRequestIdRef.current !== requestId;
        if (!isStale && withLoader) {
          setIsListLoading(false);
        }
      }
    },
    [searchQuery, telegramId]
  );

  React.useEffect(() => {
    const pageIndex = activeTab === 'players' ? playersPageIndex : friendsPageIndex;
    void fetchTabPage(activeTab, pageIndex, { withLoader: true });
  }, [activeTab, fetchTabPage, friendsPageIndex, playersPageIndex]);

  const refreshFriendsLists = React.useCallback(async () => {
    await Promise.all([
      fetchTabPage('players', playersPageIndex, { withLoader: false }),
      fetchTabPage('friends', friendsPageIndex, { withLoader: false }),
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
      toast.error('Не найден telegramId');
      return;
    }
    if (pendingMutationByTelegramId[item.telegramId]) {
      return;
    }

    setMutationPending(item.telegramId, true);
    try {
      if (item.isFriend) {
        const response = await removeFriend(telegramId, item.telegramId);
        if (response.status === 'removed') {
          toast.success('Друг удалён');
        } else {
          toast.info('Пользователь уже не был у вас в друзьях');
        }
      } else {
        const response = await addFriend(telegramId, item.telegramId);
        if (response.status === 'added') {
          toast.success('Друг добавлен');
        } else {
          toast.info('Пользователь уже добавлен в друзья');
        }
      }

      await refreshFriendsLists();
      onFriendsChanged?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось изменить список друзей';
      toast.error(message);
    } finally {
      setMutationPending(item.telegramId, false);
    }
  };

  const currentPage = activeTab === 'players' ? playersPageIndex : friendsPageIndex;
  const currentPageData = activeTab === 'players' ? playersPage : friendsPage;
  const totalPages = Math.max(
    1,
    Math.ceil(currentPageData.totalCount / FRIENDS_PAGE_SIZE)
  );
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const canManageFriends = Boolean(telegramId);

  const updatePage = (nextPage: number) => {
    if (activeTab === 'players') {
      setPlayersPageIndex(nextPage);
    } else {
      setFriendsPageIndex(nextPage);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div
        {...(shouldReduceMotion
          ? {}
          : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.2, ease: 'easeOut' as const },
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
          className="space-y-6"
        >
          <motion.div className="mb-4" variants={sectionVariants}>
            <h1 className="mb-1 text-primary">Профиль</h1>
            <p className="text-foreground/75">Настройки внешнего вида приложения.</p>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <Card className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-amber-500/5 p-5 sm:p-6 gap-0">
              <div className="pointer-events-none absolute inset-0 opacity-60">
                <div className="absolute -top-20 -right-14 h-48 w-48 rounded-full bg-primary/15 blur-2xl" />
                <div className="absolute -bottom-16 left-0 h-36 w-36 rounded-full bg-amber-500/10 blur-2xl" />
              </div>

              <div className="relative space-y-4">
                <h3 className="flex items-center gap-2 text-primary">
                  <Palette className="h-4 w-4 text-primary" />
                  Оформление
                </h3>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-foreground/75">Тема приложения</Label>
                    <p className="text-sm text-muted-foreground">
                      Сейчас активна {theme === 'dark' ? 'тёмная' : 'светлая'} тема.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onToggleTheme}
                    className="gap-2 text-foreground/75 rounded-full border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60"
                    aria-label={`Переключить на ${theme === 'light' ? 'тёмную' : 'светлую'} тему`}
                  >
                    <Sun className={`w-4 h-4 ${theme === 'dark' ? 'hidden' : 'block'}`} />
                    <Moon className={`w-4 h-4 ${theme === 'dark' ? 'block' : 'hidden'}`} />
                    <span>{theme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <Card className="relative overflow-hidden rounded-3xl border-border/70 bg-gradient-to-br from-cyan-500/10 via-background to-primary/5 p-5 sm:p-6 gap-0">
              <div className="pointer-events-none absolute inset-0 opacity-60">
                <div className="absolute -top-20 -left-12 h-44 w-44 rounded-full bg-cyan-500/12 blur-2xl" />
                <div className="absolute -bottom-20 right-0 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
              </div>

              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-primary">
                      <Users className="h-4 w-4 text-primary" />
                      Друзья
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ищите игроков, подписывайтесь и следите за их прогрессом.
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-foreground/75">
                    Друзья
                  </Badge>
                </div>

                {!canManageFriends ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/65 p-4 text-sm text-muted-foreground">
                    Раздел друзей станет доступен после инициализации профиля в Telegram.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Tabs
                      value={activeTab}
                      onValueChange={(value) => setActiveTab(value as FriendsTab)}
                      className="space-y-4"
                    >
                      <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="players">Игроки</TabsTrigger>
                        <TabsTrigger value="friends">Мои друзья</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder={
                          activeTab === 'players'
                            ? 'Поиск игроков'
                            : 'Поиск по друзьям'
                        }
                        className="pl-9 rounded-xl border-border/70 bg-background/70"
                      />
                    </div>

                    <div className="flex items-start text-xs text-muted-foreground">
                      <span>
                        {activeTab === 'players'
                          ? `Игроков: ${playersPage.totalCount}`
                          : `Друзей: ${friendsPage.totalCount}`}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {isListLoading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <div
                            key={`friends-skeleton-${index}`}
                            className="h-24 animate-pulse rounded-2xl border border-border/70 bg-background/55"
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
                                  activeTab === 'players'
                                    ? playersPageIndex
                                    : friendsPageIndex,
                                  {
                                    withLoader: true,
                                  }
                                )
                              }
                            >
                              Повторить
                            </Button>
                          </div>
                        </div>
                      ) : currentPageData.items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-background/65 p-4 text-sm text-muted-foreground">
                          {searchQuery
                            ? 'По вашему запросу ничего не найдено.'
                            : activeTab === 'players'
                              ? 'Пока нет доступных игроков.'
                              : 'Пока нет друзей. Добавьте игроков в друзья.'}
                        </div>
                      ) : (
                        currentPageData.items.map((item) => {
                          const isMutationPending =
                            pendingMutationByTelegramId[item.telegramId] === true;
                          const showRemoveAction =
                            activeTab === 'friends' || item.isFriend;

                          return (
                            <div
                              key={`${activeTab}-${item.telegramId}`}
                              className="rounded-2xl border border-border/70 bg-background/70 p-3"
                            >
                              <div className="flex items-start gap-3">
                                <Avatar className="h-11 w-11 border border-border/70 bg-background/80">
                                  {item.avatarUrl ? (
                                    <AvatarImage src={item.avatarUrl} alt={item.name} />
                                  ) : null}
                                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                                    {getInitials(item.name)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="truncate font-medium text-foreground/90">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatRelativeLastActive(item.lastActiveAt)}
                                  </div>
                                  <div hidden={activeTab === 'players'} className="flex flex-wrap items-center gap-2 pt-1">
                                    <Badge
                                      variant="outline"
                                      className="rounded-full px-2 py-0.5 text-[11px] text-foreground/80"
                                    >
                                      {item.weeklyRepetitions} повторений / 7д
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="rounded-full px-2 py-0.5 text-[11px] text-foreground/80"
                                    >
                                    <Flame className="h-3.5 w-3.5" /> Серия {item.dailyStreak} дн
                                    </Badge>
                                  </div>
                                </div>
<div className="flex flex-col items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={showRemoveAction ? 'outline' : 'default'}
                                  disabled={isMutationPending}
                                  onClick={() => void handleToggleFriend(item)}
                                  className="rounded-full"
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
                                <Badge className="rounded-full px-2 py-0.5 text-[11px] bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                                      Прогресс {item.averageProgressPercent}%
                                    </Badge>
                              </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/65 p-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canGoPrev || isListLoading}
                        onClick={() => updatePage(Math.max(1, currentPage - 1))}
                      >
                        Назад
                      </Button>
                      <div className="text-xs text-muted-foreground text-center">
                        Страница {currentPage} из {totalPages}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canGoNext || isListLoading}
                        onClick={() => updatePage(Math.min(totalPages, currentPage + 1))}
                      >
                        Вперёд
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
