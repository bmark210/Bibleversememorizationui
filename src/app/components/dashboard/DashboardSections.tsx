"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  Dumbbell,
  Medal,
  Trophy,
  FlameIcon,
} from "lucide-react";
import { Card } from "../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import type { domain_UserLeaderboardEntry } from "@/api/models/domain_UserLeaderboardEntry";
import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import { formatXp } from "@/shared/social/formatXp";

const DASHBOARD_LEADERBOARD_PAGE_SIZE = 5;
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";
import { cn } from "../ui/utils";

function leaderboardEntryDisplayName(entry: domain_UserLeaderboardEntry): string {
  const n = entry.name?.trim();
  if (n) return n;
  const nick = entry.nickname?.trim();
  if (nick) return nick.startsWith("@") ? nick : `@${nick}`;
  return entry.telegramId ?? "Игрок";
}

function leaderboardEntryXp(entry: domain_UserLeaderboardEntry): number {
  return Math.max(0, Math.round(entry.xp ?? entry.score ?? 0));
}

function leaderboardEntryWeeklyReps(entry: domain_UserLeaderboardEntry): number {
  return Math.max(0, Math.round(entry.versesCount ?? entry.score ?? 0));
}

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
    valueClassName: "text-foreground/66",
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
  currentUserAvatarUrl?: string | null;
  learningVersesCount: number;
  dueReviewVerses: number;
  dailyStreak?: number | null;
  onOpenTraining?: () => void;
  onOpenCurrentUserProfile?: () => void;
};

export const DashboardWelcomeSection = React.memo(function DashboardWelcomeSection({
  user,
  currentUserAvatarUrl,
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
      ? "Тренировка"
      : learningVersesCount > 0
        ? "Тренировка"
        : "Тренировка";

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
                    {currentUserAvatarUrl ? (
                      <AvatarImage src={currentUserAvatarUrl} alt={user.firstName} />
                    ) : (
                      <AvatarFallback className="bg-primary/12 text-primary">
                        {user.firstName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <h1 className="truncate text-2xl font-semibold tracking-tight text-primary sm:text-3xl whitespace-normal break-words line-clamp-2 overflow-hidden text-ellipsis">
                    {isFirstAppVisit
                      ? `Привет, ${user.firstName}`
                      : `С возвращением, ${user.firstName}`}
                  </h1>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border/60">
                    {currentUserAvatarUrl ? (
                      <AvatarImage src={currentUserAvatarUrl} alt={user.firstName} />
                    ) : (
                      <AvatarFallback className="bg-primary/12 text-primary">
                        {user.firstName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <h1 className="truncate text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                    {isFirstAppVisit
                      ? `Привет, ${user.firstName}.`
                      : `С возвращением, ${user.firstName}.`}
                  </h1>
                </div>
              )
            ) : (
              <h1 className="truncate text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
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
            className="h-11 min-w-[190px] rounded-2xl border border-primary/20 bg-primary/10 px-5 text-sm font-medium text-primary shadow-none hover:bg-primary/14"
          >
            <Dumbbell className="h-4 w-4 text-primary" />
            {trainingCtaLabel}
          </Button>
        </div>
      </DashboardSurface>
    </div>
  );
});

type DashboardTrainingStatsCardProps = {
  statsCards: ReadonlyArray<StatsCardItem>;
};

export const DashboardTrainingStatsCard = React.memo(function DashboardTrainingStatsCard({
  statsCards,
}: DashboardTrainingStatsCardProps) {
  return (
    <div data-tour="dashboard-stats">
      <DashboardSurface>
        <h3 className="text-base font-semibold tracking-tight text-foreground/80 mb-3">Моя статистика</h3>
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
});

type DashboardLeaderboardCardProps = {
  leaderboard?: domain_UserLeaderboardResponse | null;
  isLeaderboardLoading?: boolean;
  onOpenTraining?: () => void;
  onOpenPlayerProfile?: (player: {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
  onLeaderboardPageChange?: (page: number) => void;
  onLeaderboardJumpToMe?: () => void;
};

export const DashboardLeaderboardCard = React.memo(function DashboardLeaderboardCard({
  leaderboard = null,
  isLeaderboardLoading = false,
  onOpenTraining,
  onOpenPlayerProfile,
  onLeaderboardPageChange,
  onLeaderboardJumpToMe,
}: DashboardLeaderboardCardProps) {
  const currentUserTelegramId = useCurrentUserStatsStore((state) => state.telegramId);
  const currentUserXp = useCurrentUserStatsStore((state) => state.xp);
  const currentUserDailyStreak = useCurrentUserStatsStore(
    (state) => state.dailyStreak
  );
  const entries = leaderboard?.items ?? [];
  const apiCurrentUser = leaderboard?.currentUser ?? null;
  const pageSize = leaderboard?.pageSize ?? DASHBOARD_LEADERBOARD_PAGE_SIZE;
  const totalParticipants = leaderboard?.totalParticipants ?? 0;
  const derivedTotalPages =
    leaderboard?.totalPages ??
    (totalParticipants > 0
      ? Math.max(1, Math.ceil(totalParticipants / pageSize))
      : 1);
  const currentPage = Math.min(
    Math.max(1, leaderboard?.page ?? 1),
    derivedTotalPages
  );
  const showPagination =
    Boolean(onLeaderboardPageChange) && derivedTotalPages > 1;
  const currentUserRank = apiCurrentUser?.rank;
  const isCurrentUserInEntries =
    currentUserTelegramId != null &&
    entries.some((e) => String(e.telegramId ?? "") === currentUserTelegramId);
  const showJumpToMe =
    Boolean(onLeaderboardJumpToMe) &&
    Boolean(currentUserTelegramId) &&
    showPagination &&
    typeof currentUserRank === "number" &&
    currentUserRank >= 1 &&
    !isCurrentUserInEntries;
  const shouldShowCurrentUserSnapshot =
    apiCurrentUser != null &&
    currentUserTelegramId != null &&
    !entries.some(
      (entry) => String(entry.telegramId ?? "") === currentUserTelegramId
    );
  const currentUserSnapshotDisplayXp =
    currentUserXp != null
      ? currentUserXp
      : Math.max(0, Math.round(apiCurrentUser?.xp ?? 0));
  const currentUserSnapshotDisplayStreakDays =
    currentUserDailyStreak != null ? currentUserDailyStreak : 0;

  return (
    <div>
      <DashboardSurface>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground/80">
            Таблица лидеров
          </h2>
          <div className="text-xs text-foreground/45">
            {leaderboard?.totalParticipants ?? 0}
          </div>
        </div>

        <div className="space-y-2.5">
          {entries.length > 0 ? (
            entries.map((entry) => {
              const rank = entry.rank ?? 0;
              const rankMarker = getRankMarker(rank);
              const RankIcon = rankMarker.icon;
              const entryTelegramId = String(entry.telegramId ?? "");
              const displayName = leaderboardEntryDisplayName(entry);
              const isCurrentUserEntry =
                entryTelegramId !== "" &&
                entryTelegramId === currentUserTelegramId;
              const displayXp =
                isCurrentUserEntry && currentUserXp != null
                  ? currentUserXp
                  : leaderboardEntryXp(entry);
              const displayStreakDays =
                isCurrentUserEntry && currentUserDailyStreak != null
                  ? currentUserDailyStreak
                  : 0;
              const handleOpenProfile = () =>
                onOpenPlayerProfile?.({
                  telegramId: entryTelegramId,
                  name: displayName,
                  avatarUrl: entry.avatarUrl?.trim() ? entry.avatarUrl.trim() : null,
                });

              return (
                <div key={`${rank}-${entryTelegramId || displayName}`}>
                  <button
                    type="button"
                    onClick={handleOpenProfile}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors hover:bg-background/70",
                      isCurrentUserEntry
                        ? "border-primary/20 bg-primary/[0.07]"
                        : "border-border/60 bg-background/55",
                    )}
                    aria-label={`Открыть профиль ${displayName}`}
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
                        <span>#{rank}</span>
                      )}
                    </div>

                    <Avatar className="h-9 w-9 border border-border/60 bg-background/70">
                      {entry.avatarUrl ? (
                        <AvatarImage src={entry.avatarUrl} alt={displayName} />
                      ) : null}
                      <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate text-sm font-medium",
                          isCurrentUserEntry
                            ? "text-primary"
                            : "text-foreground/78",
                        )}
                      >
                        {displayName}
                      </div>
                      <div className="mt-1 text-xs text-foreground/48">
                        {leaderboardEntryWeeklyReps(entry)} · {displayStreakDays}{" "}
                        дн. подряд
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-foreground/82">
                      {formatXp(displayXp)}
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
                    прогресс по стихам.
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

        {showPagination && onLeaderboardPageChange ? (
          <div className="mt-4 flex flex-col gap-2 border-t border-border/55 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg border-border/60 bg-background/55"
                  disabled={isLeaderboardLoading || currentPage <= 1}
                  aria-label="Первая страница"
                  onClick={() => onLeaderboardPageChange(1)}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg border-border/60 bg-background/55"
                  disabled={isLeaderboardLoading || currentPage <= 1}
                  aria-label="Предыдущая страница"
                  onClick={() => onLeaderboardPageChange(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg border-border/60 bg-background/55"
                  disabled={isLeaderboardLoading || currentPage >= derivedTotalPages}
                  aria-label="Следующая страница"
                  onClick={() => onLeaderboardPageChange(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg border-border/60 bg-background/55"
                  disabled={isLeaderboardLoading || currentPage >= derivedTotalPages}
                  aria-label="Последняя страница"
                  onClick={() => onLeaderboardPageChange(derivedTotalPages)}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs tabular-nums text-foreground/48">
                Стр. {currentPage} / {derivedTotalPages}
              </span>
            </div>
            {showJumpToMe ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 w-full rounded-full text-xs sm:w-auto"
                disabled={isLeaderboardLoading}
                onClick={() => onLeaderboardJumpToMe?.()}
              >
                Показать меня
              </Button>
            ) : null}
          </div>
        ) : null}

        {shouldShowCurrentUserSnapshot ? (
          <div className="mt-3 border-t border-border/55 pt-3">
            <button
              type="button"
              onClick={() =>
                onOpenPlayerProfile?.({
                  telegramId: currentUserTelegramId ?? "",
                  name: "Вы",
                  avatarUrl: null,
                })
              }
              className="flex w-full items-center justify-between gap-3 text-left text-sm"
              aria-label="Открыть ваш профиль"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-primary">Вы</div>
                <div className="mt-1 text-xs text-foreground/48">
                  {apiCurrentUser?.rank ? `#${apiCurrentUser.rank}` : "Вне топа"} ·{" "}
                  {apiCurrentUser?.versesCount ?? 0} ·{" "}
                  {currentUserSnapshotDisplayStreakDays} дн. подряд
                </div>
              </div>
              <div className="font-semibold text-foreground/82">
                {formatXp(currentUserSnapshotDisplayXp)}
              </div>
            </button>
          </div>
        ) : null}
      </DashboardSurface>
    </div>
  );
});
