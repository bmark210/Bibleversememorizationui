"use client";

import React from "react";
import { Crown, Dumbbell, Medal, Trophy, FlameIcon } from "lucide-react";
import { Card } from "../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import type {
  DashboardLeaderboard as DashboardLeaderboardData,
} from "@/api/services/leaderboard";
import type { DashboardFriendsActivity } from "@/api/services/friends";
import { cn } from "../ui/utils";

type DashboardUser = {
  firstName: string;
  photoUrl?: string | null;
} | null;

const DASHBOARD_WELCOME_SEEN_STORAGE_KEY =
  "bible-memory.dashboard-welcome-seen.v1";

type StatsCardItem = {
  key: string;
  label: string;
  value: string | null;
  isLoading?: boolean;
  tone?: "neutral" | "learning" | "review" | "mastered";
};

const STAT_TONE_STYLES = {
  neutral: {
    panelClassName: "border-border/60 bg-background/55",
    labelClassName: "text-foreground/42",
    valueClassName: "text-foreground/88",
  },
  learning: {
    panelClassName:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    labelClassName: "text-emerald-700/80 dark:text-emerald-300/80",
    valueClassName: "text-emerald-700 dark:text-emerald-300",
  },
  review: {
    panelClassName:
      "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    labelClassName: "text-violet-700/80 dark:text-violet-300/80",
    valueClassName: "text-violet-700 dark:text-violet-300",
  },
  mastered: {
    panelClassName:
      "border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-300",
    labelClassName: "text-amber-800/80 dark:text-amber-300/80",
    valueClassName: "text-amber-800 dark:text-amber-300",
  },
} as const;

const CHIP_TONE_STYLES = {
  neutral: "border-border/60 bg-background/55 text-foreground/62",
  review:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
} as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function pluralizeVerses(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return "стих";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return "стиха";
  }
  return "стихов";
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

function getRankMarker(rank: number) {
  if (rank === 1) {
    return {
      icon: Crown,
      className:
        "border-amber-400/35 bg-amber-500/12 text-amber-700 dark:text-amber-300",
    };
  }
  if (rank === 2) {
    return {
      icon: Medal,
      className:
        "border-slate-400/35 bg-slate-500/10 text-slate-700 dark:text-slate-200",
    };
  }
  if (rank === 3) {
    return {
      icon: Trophy,
      className:
        "border-orange-400/35 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    };
  }

  return {
    icon: null,
    className: "border-border/60 bg-background/80 text-foreground/55",
  };
}

function DashboardSurface({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-[28px] border-border/65 bg-card/55 p-4 shadow-none backdrop-blur-xl sm:p-5",
        className,
      )}
      {...props}
    />
  );
}

function MetricChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof CHIP_TONE_STYLES;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium",
        CHIP_TONE_STYLES[tone],
      )}
    >
      {children}
    </span>
  );
}

type DashboardWelcomeSectionProps = {
  user: DashboardUser;
  learningVersesCount: number;
  dueReviewVerses: number;
  dailyStreak?: number | null;
  onOpenTraining?: () => void;
  onOpenCurrentUserProfile?: () => void;
};

export function DashboardWelcomeSection({
  user,
  learningVersesCount,
  dueReviewVerses,
  dailyStreak,
  onOpenTraining,
  onOpenCurrentUserProfile,
}: DashboardWelcomeSectionProps) {
  const [isFirstAppVisit, setIsFirstAppVisit] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const isFirstVisit =
        window.localStorage.getItem(DASHBOARD_WELCOME_SEEN_STORAGE_KEY) !== "1";
      setIsFirstAppVisit(isFirstVisit);
    } catch {
      setIsFirstAppVisit(false);
    }
  }, []);

  const heroMessage =
    dueReviewVerses > 0 && learningVersesCount > 0
      ? `Сегодня ${dueReviewVerses} ждут повторения, ещё ${learningVersesCount} ${pluralizeVerses(learningVersesCount)} в изучении.`
      : dueReviewVerses > 0
        ? `Сегодня ${dueReviewVerses} ${pluralizeVerses(dueReviewVerses)} ждут повторения.`
        : learningVersesCount > 0
          ? `Сейчас ${learningVersesCount} ${pluralizeVerses(learningVersesCount)} в активной практике.`
          : "Откройте тренировку и выберите следующую сессию.";
  const trainingCtaLabel =
    dueReviewVerses > 0
      ? "Повторить сейчас"
      : learningVersesCount > 0
        ? "Продолжить практику"
        : "Открыть тренировку";

  return (
    <div className="mb-5">
      <DashboardSurface className="rounded-[32px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {user ? (
              onOpenCurrentUserProfile ? (
                <button
                  type="button"
                  onClick={onOpenCurrentUserProfile}
                  className="flex items-center gap-3 text-left transition-opacity hover:opacity-90"
                  aria-label={`Открыть профиль ${user.firstName}`}
                >
                  <Avatar className="h-12 w-12 border border-border/60">
                    {user.photoUrl ? (
                      <AvatarImage src={user.photoUrl} alt={user.firstName} />
                    ) : (
                      <AvatarFallback className="bg-primary/12 text-primary">
                        {user.firstName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl whitespace-normal break-words line-clamp-2 overflow-hidden text-ellipsis">
                    {isFirstAppVisit
                      ? `Привет, ${user.firstName}`
                      : `С возвращением, ${user.firstName}`}
                  </h1>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border/60">
                    {user.photoUrl ? (
                      <AvatarImage src={user.photoUrl} alt={user.firstName} />
                    ) : (
                      <AvatarFallback className="bg-primary/12 text-primary">
                        {user.firstName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {isFirstAppVisit
                      ? `Привет, ${user.firstName}.`
                      : `С возвращением, ${user.firstName}.`}
                  </h1>
                </div>
              )
            ) : (
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                С возвращением
              </h1>
            )}

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/62">
              {heroMessage}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {dailyStreak != null && dailyStreak > 0 ? (
                <MetricChip>
                  <div className="flex items-center gap-2">
                    <FlameIcon className="h-4 w-4 text-yellow-500" /> {dailyStreak} дн. подряд
                  </div>
                </MetricChip>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            haptic="medium"
            onClick={onOpenTraining}
            className="h-11 min-w-[190px] rounded-2xl border border-primary/20 bg-primary/10 px-5 text-sm font-medium text-foreground shadow-none hover:bg-primary/14"
          >
            <Dumbbell className="h-4 w-4 text-primary" />
            {trainingCtaLabel}
          </Button>
        </div>
      </DashboardSurface>
    </div>
  );
}

type DashboardTrainingStatsCardProps = {
  statsCards: ReadonlyArray<StatsCardItem>;
};

export function DashboardTrainingStatsCard({
  statsCards,
}: DashboardTrainingStatsCardProps) {
  return (
    <div>
      <DashboardSurface>
        <div className="grid grid-cols-2 gap-3">
          {statsCards.map((item) => {
            const tone = STAT_TONE_STYLES[item.tone ?? "neutral"];

            return (
              <div
                key={item.key}
                className={cn("rounded-2xl border px-4 py-3", tone.panelClassName)}
              >
                <div
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-[0.16em]",
                    tone.labelClassName,
                  )}
                >
                  {item.label}
                </div>
                <div
                  className={cn(
                    "mt-2 text-2xl font-semibold tracking-tight",
                    tone.valueClassName,
                  )}
                >
                  {item.isLoading ? (
                    <Skeleton className="h-8 w-16 rounded-xl border-0 bg-background/70" />
                  ) : item.value != null ? (
                    item.value
                  ) : (
                    <span className="text-sm font-medium text-foreground/50">
                      Нет данных
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DashboardSurface>
    </div>
  );
}

type DashboardLeaderboardCardProps = {
  leaderboard?: DashboardLeaderboardData | null;
  isLeaderboardLoading?: boolean;
  onOpenTraining?: () => void;
  onOpenPlayerProfile?: (player: {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
};

export function DashboardLeaderboardCard({
  leaderboard = null,
  isLeaderboardLoading = false,
  onOpenTraining,
  onOpenPlayerProfile,
}: DashboardLeaderboardCardProps) {
  const entries = leaderboard?.entries ?? [];
  const currentUser = leaderboard?.currentUser ?? null;
  const shouldShowCurrentUserSnapshot =
    currentUser != null &&
    !entries.some((entry) => entry.telegramId === currentUser.telegramId);

  return (
    <div>
      <DashboardSurface>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Рейтинг
          </h2>
          <div className="text-xs text-foreground/45">
            {leaderboard?.totalParticipants ?? 0}
          </div>
        </div>

        <div className="space-y-2.5">
          {entries.length > 0 ? (
            entries.map((entry) => {
              const rankMarker = getRankMarker(entry.rank);
              const RankIcon = rankMarker.icon;
              const handleOpenProfile = () =>
                onOpenPlayerProfile?.({
                  telegramId: entry.telegramId,
                  name: entry.name,
                  avatarUrl: entry.avatarUrl,
                });

              return (
                <div key={entry.telegramId}>
                  <button
                    type="button"
                    onClick={handleOpenProfile}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors hover:bg-background/70",
                      entry.isCurrentUser
                        ? "border-primary/20 bg-primary/[0.07]"
                        : "border-border/60 bg-background/55",
                    )}
                    aria-label={`Открыть профиль ${entry.name}`}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        rankMarker.className,
                      )}
                      aria-hidden="true"
                    >
                      {RankIcon ? (
                        <RankIcon className="h-4 w-4" />
                      ) : (
                        <span>#{entry.rank}</span>
                      )}
                    </div>

                    <Avatar className="h-9 w-9 border border-border/60 bg-background/70">
                      {entry.avatarUrl ? (
                        <AvatarImage src={entry.avatarUrl} alt={entry.name} />
                      ) : null}
                      <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                        {getInitials(entry.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate text-sm font-medium",
                          entry.isCurrentUser
                            ? "text-primary"
                            : "text-foreground/78",
                        )}
                      >
                        {entry.name}
                      </div>
                      <div className="mt-1 text-xs text-foreground/48">
                        {entry.weeklyRepetitions} · {entry.streakDays} дн. подряд
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-foreground/82">
                      {entry.score}%
                    </div>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/45 p-4">
              {isLeaderboardLoading ? (
                <div className="text-sm text-foreground/56">Обновляем...</div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-foreground/56">
                    Рейтинг появится, когда у вас и других участников появится
                    активность за неделю.
                  </p>
                  {onOpenTraining ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenTraining}
                      className="h-9 rounded-full border-border/60 bg-background/55 px-4 text-xs text-foreground/78 shadow-none"
                    >
                      Открыть тренировку
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {shouldShowCurrentUserSnapshot ? (
          <div className="mt-3 border-t border-border/55 pt-3">
            <button
              type="button"
              onClick={() =>
                onOpenPlayerProfile?.({
                  telegramId: currentUser.telegramId,
                  name: currentUser.name,
                  avatarUrl: currentUser.avatarUrl,
                })
              }
              className="flex w-full items-center justify-between gap-3 text-left text-sm"
              aria-label="Открыть ваш профиль"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-primary">Вы</div>
                <div className="mt-1 text-xs text-foreground/48">
                  {currentUser.rank ? `#${currentUser.rank}` : "Вне топа"} ·{" "}
                  {currentUser.weeklyRepetitions}
                </div>
              </div>
              <div className="font-semibold text-foreground/82">
                {currentUser.score}%
              </div>
            </button>
          </div>
        ) : null}
      </DashboardSurface>
    </div>
  );
}

type DashboardFriendsActivityCardProps = {
  friendsActivity?: DashboardFriendsActivity | null;
  isFriendsActivityLoading?: boolean;
  onOpenProfile?: () => void;
  onOpenPlayerProfile?: (player: {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
};

export function DashboardFriendsActivityCard({
  friendsActivity = null,
  isFriendsActivityLoading = false,
  onOpenProfile,
  onOpenPlayerProfile,
}: DashboardFriendsActivityCardProps) {
  const entries = friendsActivity?.entries ?? [];
  const summary = friendsActivity?.summary ?? {
    friendsTotal: 0,
  };

  return (
    <div>
      <DashboardSurface>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Друзья
          </h2>
          <div className="text-xs text-foreground/45">{summary.friendsTotal}</div>
        </div>

        <div className="space-y-2.5">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <button
                key={entry.telegramId}
                type="button"
                onClick={() =>
                  onOpenPlayerProfile?.({
                    telegramId: entry.telegramId,
                    name: entry.name,
                    avatarUrl: entry.avatarUrl,
                  })
                }
                className="w-full rounded-2xl border border-border/60 bg-background/55 px-3 py-2.5 text-left transition-colors hover:bg-background/70"
                aria-label={`Открыть профиль ${entry.name}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-border/60 bg-background/70">
                    {entry.avatarUrl ? (
                      <AvatarImage src={entry.avatarUrl} alt={entry.name} />
                    ) : null}
                    <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                      {getInitials(entry.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground/78">
                      {entry.name}
                    </div>
                    <div className="mt-1 text-xs text-foreground/48">
                      {formatRelativeLastActive(entry.lastActiveAt)} · {entry.dailyStreak} дн. подряд
                    </div>
                  </div>

                  <div className="text-xs font-medium text-foreground/68">
                    {entry.averageProgressPercent}%
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background/45 p-4">
              {isFriendsActivityLoading ? (
                <div className="text-sm text-foreground/56">Обновляем...</div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-foreground/56">
                    Здесь появится прогресс друзей. Добавьте их в профиле, чтобы
                    видеть активность без перехода из главного экрана.
                  </p>
                  {onOpenProfile ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenProfile}
                      className="h-9 rounded-full border-border/60 bg-background/55 px-4 text-xs text-foreground/78 shadow-none"
                    >
                      Открыть профиль
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardSurface>
    </div>
  );
}
