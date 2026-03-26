"use client";

import React from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  Dumbbell,
  Medal,
  Trophy,
  X,
} from "lucide-react";
import { Card } from "../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import type { domain_UserLeaderboardEntry } from "@/api/models/domain_UserLeaderboardEntry";
import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import { formatXp } from "@/shared/social/formatXp";

const DASHBOARD_LEADERBOARD_PAGE_SIZE = 5;
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
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
    panelClassName: "border-border-subtle bg-bg-elevated",
    labelClassName: "text-text-muted",
    valueClassName: "text-text-primary",
  },
  learning: {
    panelClassName:
      "border-status-learning/25 bg-status-learning-soft text-status-learning",
    labelClassName: "text-status-learning/80",
    valueClassName: "text-status-learning",
  },
  review: {
    panelClassName:
      "border-status-review/25 bg-status-review-soft text-status-review",
    labelClassName: "text-status-review/80",
    valueClassName: "text-status-review",
  },
  mastered: {
    panelClassName:
      "border-status-mastered/30 bg-status-mastered-soft text-status-mastered",
    labelClassName: "text-status-mastered/80",
    valueClassName: "text-status-mastered",
  },
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
        "border-status-mastered/30 bg-status-mastered-soft text-status-mastered",
    };
  }
  if (rank === 2) {
    return {
      icon: Medal,
      className:
        "border-border-default bg-bg-elevated text-text-secondary",
    };
  }
  if (rank === 3) {
    return {
      icon: Trophy,
      className:
        "border-status-community/30 bg-status-community-soft text-status-community",
    };
  }

  return {
    icon: null,
    className: "border-border-subtle bg-bg-elevated text-text-muted",
  };
}

function DashboardSurface({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "gap-0 h-fit rounded-[1.75rem] border-border-subtle bg-bg-overlay p-3.5 shadow-[var(--shadow-soft)] backdrop-blur-2xl [@media(max-width:420px)]:p-3 [@media(max-height:880px)]:p-3 [@media(max-height:820px)]:p-2.5 [@media(max-height:760px)]:p-2 [@media(max-height:720px)]:p-1.5 sm:rounded-[2rem] sm:p-4 lg:p-5",
        className,
      )}
      {...props}
    />
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
    <DashboardSurface className="shrink-0 rounded-[1.9rem] sm:rounded-[2rem]">
      <div className="flex flex-col gap-3.5 [@media(max-width:420px)]:gap-3 [@media(max-height:880px)]:gap-3 [@media(max-height:760px)]:gap-2.5 [@media(max-height:720px)]:gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {user ? (
            onOpenCurrentUserProfile ? (
              <button
                type="button"
                onClick={onOpenCurrentUserProfile}
                className="flex items-center gap-3 text-left transition-[opacity,transform] hover:opacity-95 hover:translate-x-[1px]"
                aria-label={`Открыть профиль ${user.firstName}`}
              >
                <Avatar className="h-10 w-10 border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)] [@media(max-width:420px)]:h-9 [@media(max-width:420px)]:w-9 [@media(max-height:760px)]:h-9 [@media(max-height:760px)]:w-9 [@media(max-height:720px)]:h-8 [@media(max-height:720px)]:w-8 sm:h-11 sm:w-11">
                  {currentUserAvatarUrl ? (
                    <AvatarImage src={currentUserAvatarUrl} alt={user.firstName} />
                  ) : (
                    <AvatarFallback className="bg-status-mastered-soft text-brand-primary">
                      {user.firstName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>

                <h1 className="line-clamp-2 overflow-hidden text-ellipsis whitespace-normal break-words [font-family:var(--font-heading)] text-[clamp(1.8rem,5.8vw,2.65rem)] font-semibold tracking-tight text-brand-primary [@media(max-width:420px)]:text-[clamp(1.55rem,7vw,2rem)] [@media(max-height:880px)]:text-[clamp(1.62rem,5.2vw,2.2rem)] [@media(max-height:760px)]:text-[clamp(1.45rem,4.8vw,1.9rem)] [@media(max-height:720px)]:text-[clamp(1.3rem,4.4vw,1.7rem)]">
                  {isFirstAppVisit
                    ? `Привет, ${user.firstName}`
                    : `С возвращением, ${user.firstName}`}
                </h1>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)] [@media(max-width:420px)]:h-9 [@media(max-width:420px)]:w-9 [@media(max-height:760px)]:h-9 [@media(max-height:760px)]:w-9 [@media(max-height:720px)]:h-8 [@media(max-height:720px)]:w-8 sm:h-11 sm:w-11">
                  {currentUserAvatarUrl ? (
                    <AvatarImage src={currentUserAvatarUrl} alt={user.firstName} />
                  ) : (
                    <AvatarFallback className="bg-status-mastered-soft text-brand-primary">
                      {user.firstName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>

                <h1 className="[font-family:var(--font-heading)] text-[clamp(1.8rem,5.8vw,2.65rem)] font-semibold tracking-tight text-brand-primary [@media(max-width:420px)]:text-[clamp(1.55rem,7vw,2rem)] [@media(max-height:880px)]:text-[clamp(1.62rem,5.2vw,2.2rem)] [@media(max-height:760px)]:text-[clamp(1.45rem,4.8vw,1.9rem)] [@media(max-height:720px)]:text-[clamp(1.3rem,4.4vw,1.7rem)]">
                  {isFirstAppVisit
                    ? `Привет, ${user.firstName}.`
                    : `С возвращением, ${user.firstName}.`}
                </h1>
              </div>
            )
          ) : (
            <h1 className="[font-family:var(--font-heading)] text-[clamp(1.8rem,5.8vw,2.65rem)] font-semibold tracking-tight text-brand-primary [@media(max-width:420px)]:text-[clamp(1.55rem,7vw,2rem)] [@media(max-height:880px)]:text-[clamp(1.62rem,5.2vw,2.2rem)] [@media(max-height:760px)]:text-[clamp(1.45rem,4.8vw,1.9rem)] [@media(max-height:720px)]:text-[clamp(1.3rem,4.4vw,1.7rem)]">
              С возвращением
            </h1>
          )}

          <p className="mt-2 line-clamp-2 max-w-2xl text-[13px] leading-6 text-text-secondary [@media(max-width:420px)]:text-[12px] [@media(max-width:420px)]:leading-5 [@media(max-height:820px)]:line-clamp-1 [@media(max-height:880px)]:text-[12px] [@media(max-height:880px)]:leading-5 [@media(max-height:760px)]:mt-1.5 [@media(max-height:760px)]:text-[11px] [@media(max-height:760px)]:leading-[1.125rem] [@media(max-height:720px)]:mt-1 [@media(max-height:720px)]:text-[10px] [@media(max-height:720px)]:leading-4 sm:text-sm sm:leading-relaxed">
            {heroMessage}
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          haptic="medium"
          onClick={onOpenTraining}
          className="h-11 w-full rounded-[1.2rem] px-5 shadow-[var(--shadow-floating)] [@media(max-width:420px)]:h-10 [@media(max-width:420px)]:px-4 [@media(max-height:880px)]:h-10 [@media(max-height:760px)]:h-9 [@media(max-height:760px)]:px-4 [@media(max-height:760px)]:text-sm [@media(max-height:720px)]:h-8 [@media(max-height:720px)]:text-[13px] sm:w-auto sm:min-w-[184px]"
        >
          <Dumbbell className="h-4 w-4" />
          {trainingCtaLabel}
        </Button>
      </div>
    </DashboardSurface>
  );
});

type DashboardTrainingStatsCardProps = {
  statsCards: ReadonlyArray<StatsCardItem>;
};

export const DashboardTrainingStatsCard = React.memo(function DashboardTrainingStatsCard({
  statsCards,
}: DashboardTrainingStatsCardProps) {
  return (
      <DashboardSurface className="shrink-0">
        <h3 className="[font-family:var(--font-heading)] mb-2.5 text-base font-semibold tracking-tight text-text-primary [@media(max-width:420px)]:mb-2 [@media(max-width:420px)]:text-[15px] [@media(max-height:880px)]:mb-2 [@media(max-height:880px)]:text-[15px] [@media(max-height:760px)]:mb-1.5 [@media(max-height:760px)]:text-sm [@media(max-height:720px)]:mb-1 [@media(max-height:720px)]:text-[13px] sm:mb-3 sm:text-lg">
          Моя статистика
        </h3>
        <div className="grid grid-cols-2 gap-2.5 [@media(max-width:420px)]:gap-2 [@media(max-height:880px)]:gap-2 [@media(max-height:760px)]:gap-1.5 [@media(max-height:720px)]:gap-1 sm:gap-3">
          {statsCards.map((item) => {
            const tone = STAT_TONE_STYLES[item.tone ?? "neutral"];

            return (
              <div
                key={item.key}
                className={cn(
                  "rounded-[1.2rem] border px-3.5 py-3 shadow-[var(--shadow-soft)] [@media(max-width:420px)]:px-3 [@media(max-width:420px)]:py-2.5 [@media(max-height:880px)]:px-3 [@media(max-height:880px)]:py-2.5 [@media(max-height:760px)]:rounded-[1rem] [@media(max-height:760px)]:px-2.5 [@media(max-height:760px)]:py-2 [@media(max-height:720px)]:px-2 [@media(max-height:720px)]:py-1.5 sm:rounded-[1.35rem] sm:px-4 sm:py-3.5",
                  tone.panelClassName,
                )}
              >
                <div
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-[0.15em] [@media(max-width:420px)]:text-[9px] [@media(max-height:880px)]:text-[9px] [@media(max-height:760px)]:text-[8px]",
                    tone.labelClassName,
                  )}
                >
                  {item.label}
                </div>
                <div
                  className={cn(
                    "mt-1.5 text-[clamp(1.35rem,5vw,2rem)] font-semibold leading-tight tracking-tight [@media(max-width:420px)]:mt-1 [@media(max-width:420px)]:text-[clamp(1.12rem,4.4vw,1.5rem)] [@media(max-height:880px)]:mt-1 [@media(max-height:880px)]:text-[clamp(1.2rem,4.2vw,1.72rem)] [@media(max-height:760px)]:text-[clamp(1.05rem,3.8vw,1.45rem)] [@media(max-height:720px)]:text-[clamp(0.98rem,3.5vw,1.3rem)]",
                    tone.valueClassName,
                  )}
                >
                  {item.isLoading ? (
                    <Skeleton className="h-8 w-16 rounded-xl border-0" />
                  ) : item.value != null ? (
                    item.value
                  ) : (
                    <span className="text-sm font-medium text-text-muted">
                      Нет данных
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DashboardSurface>
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

type DashboardLeaderboardRowProps = {
  entry: domain_UserLeaderboardEntry;
  currentUserTelegramId: string | null;
  currentUserXp: number | null;
  currentUserDailyStreak: number | null;
  onOpenPlayerProfile?: (player: {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
  compact?: boolean;
};

function DashboardLeaderboardRow({
  entry,
  currentUserTelegramId,
  currentUserXp,
  currentUserDailyStreak,
  onOpenPlayerProfile,
  compact = false,
}: DashboardLeaderboardRowProps) {
  const rank = entry.rank ?? 0;
  const rankMarker = getRankMarker(rank);
  const RankIcon = rankMarker.icon;
  const entryTelegramId = String(entry.telegramId ?? "");
  const displayName = leaderboardEntryDisplayName(entry);
  const isCurrentUserEntry =
    entryTelegramId !== "" && entryTelegramId === currentUserTelegramId;
  const displayXp =
    isCurrentUserEntry && currentUserXp != null
      ? currentUserXp
      : leaderboardEntryXp(entry);
  const displayStreakDays =
    isCurrentUserEntry && currentUserDailyStreak != null
      ? currentUserDailyStreak
      : 0;

  return (
    <button
      type="button"
      onClick={() =>
        onOpenPlayerProfile?.({
          telegramId: entryTelegramId,
          name: displayName,
          avatarUrl: entry.avatarUrl?.trim() ? entry.avatarUrl.trim() : null,
        })
      }
      className={cn(
        "flex w-full items-center gap-3 border text-left shadow-[var(--shadow-soft)] transition-[background-color,border-color,color]",
        compact
          ? "rounded-[1.2rem] px-3 py-2 [@media(max-width:420px)]:gap-2.5 [@media(max-width:420px)]:px-2.5 [@media(max-width:420px)]:py-1.5 [@media(max-height:880px)]:gap-2.5 [@media(max-height:880px)]:px-2.5 [@media(max-height:880px)]:py-1.5 [@media(max-height:760px)]:gap-2 [@media(max-height:760px)]:rounded-[1rem] [@media(max-height:760px)]:px-2 [@media(max-height:760px)]:py-1.5"
          : "rounded-[1.35rem] px-3.5 py-3 sm:px-4",
        isCurrentUserEntry
          ? "border-brand-primary/20 bg-status-mastered-soft"
          : "border-border-subtle bg-bg-elevated hover:border-brand-primary/20 hover:bg-bg-surface",
      )}
      aria-label={`Открыть профиль ${displayName}`}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border font-semibold",
          compact
            ? "h-7 w-7 text-[11px] [@media(max-width:420px)]:h-6 [@media(max-width:420px)]:w-6 [@media(max-width:420px)]:text-[10px] [@media(max-height:880px)]:h-6.5 [@media(max-height:880px)]:w-6.5 [@media(max-height:880px)]:text-[10px] [@media(max-height:760px)]:h-6 [@media(max-height:760px)]:w-6 [@media(max-height:760px)]:text-[9px]"
            : "h-8 w-8 text-xs",
          rankMarker.className,
        )}
        aria-hidden="true"
      >
        {RankIcon ? (
          <RankIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        ) : (
          <span>#{rank}</span>
        )}
      </div>

      <Avatar
        className={cn(
          "shrink-0 border border-border-subtle bg-bg-surface",
          compact ? "h-8 w-8 [@media(max-width:420px)]:h-7 [@media(max-width:420px)]:w-7 [@media(max-height:880px)]:h-7 [@media(max-height:880px)]:w-7 [@media(max-height:760px)]:h-6.5 [@media(max-height:760px)]:w-6.5" : "h-9 w-9",
        )}
      >
        {entry.avatarUrl ? (
          <AvatarImage src={entry.avatarUrl} alt={displayName} />
        ) : null}
        <AvatarFallback className="bg-bg-subtle text-xs text-text-secondary">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate font-medium",
            compact ? "text-[13px] [@media(max-width:420px)]:text-[12px] [@media(max-height:880px)]:text-[12px] [@media(max-height:760px)]:text-[11px]" : "text-sm",
            isCurrentUserEntry ? "text-brand-primary" : "text-text-primary",
          )}
        >
          {displayName}
        </div>
        <div className={cn("mt-0.5 text-text-muted", compact ? "text-[11px] [@media(max-width:420px)]:text-[10px] [@media(max-height:880px)]:text-[10px] [@media(max-height:760px)]:text-[9px]" : "text-xs")}>
          {leaderboardEntryWeeklyReps(entry)} · {displayStreakDays} дн. подряд
        </div>
      </div>

      <div
        className={cn(
          "shrink-0 font-semibold text-text-primary",
          compact ? "text-[13px] [@media(max-width:420px)]:text-[12px] [@media(max-height:880px)]:text-[12px] [@media(max-height:760px)]:text-[11px]" : "text-sm",
        )}
      >
        {formatXp(displayXp)}
      </div>
    </button>
  );
}

type DashboardLeaderboardPaginationProps = {
  currentPage: number;
  derivedTotalPages: number;
  isLeaderboardLoading: boolean;
  showJumpToMe: boolean;
  onLeaderboardPageChange?: (page: number) => void;
  onLeaderboardJumpToMe?: () => void;
};

function DashboardLeaderboardPagination({
  currentPage,
  derivedTotalPages,
  isLeaderboardLoading,
  showJumpToMe,
  onLeaderboardPageChange,
  onLeaderboardJumpToMe,
}: DashboardLeaderboardPaginationProps) {
  if (!onLeaderboardPageChange || derivedTotalPages <= 1) {
    return showJumpToMe ? (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-9 w-full rounded-full text-xs sm:w-auto"
        disabled={isLeaderboardLoading}
        onClick={() => onLeaderboardJumpToMe?.()}
      >
        Показать меня
      </Button>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl"
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
            className="h-9 w-9 shrink-0 rounded-xl"
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
            className="h-9 w-9 shrink-0 rounded-xl"
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
            className="h-9 w-9 shrink-0 rounded-xl"
            disabled={isLeaderboardLoading || currentPage >= derivedTotalPages}
            aria-label="Последняя страница"
            onClick={() => onLeaderboardPageChange(derivedTotalPages)}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs tabular-nums text-text-muted">
          Стр. {currentPage} / {derivedTotalPages}
        </span>
      </div>
      {showJumpToMe ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 w-full rounded-full text-xs sm:w-auto"
          disabled={isLeaderboardLoading}
          onClick={() => onLeaderboardJumpToMe?.()}
        >
          Показать меня
        </Button>
      ) : null}
    </div>
  );
}

export const DashboardLeaderboardCard = React.memo(function DashboardLeaderboardCard({
  leaderboard = null,
  isLeaderboardLoading = false,
  onOpenTraining,
  onOpenPlayerProfile,
  onLeaderboardPageChange,
  onLeaderboardJumpToMe,
}: DashboardLeaderboardCardProps) {
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);
  const { contentSafeAreaInset } = useTelegramSafeArea();
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
  const fullscreenHeaderStyle = React.useMemo(
    () => ({
      paddingTop:
        contentSafeAreaInset.top > 0
          ? `calc(${contentSafeAreaInset.top}px + 1.25rem)`
          : undefined,
      paddingLeft:
        contentSafeAreaInset.left > 0
          ? `calc(${contentSafeAreaInset.left}px + 1rem)`
          : undefined,
      paddingRight:
        contentSafeAreaInset.right > 0
          ? `calc(${contentSafeAreaInset.right}px + 1rem)`
          : undefined,
    }),
    [contentSafeAreaInset.left, contentSafeAreaInset.right, contentSafeAreaInset.top],
  );
  const fullscreenBodyStyle = React.useMemo(
    () => ({
      paddingLeft:
        contentSafeAreaInset.left > 0
          ? `calc(${contentSafeAreaInset.left}px + 1rem)`
          : undefined,
      paddingRight:
        contentSafeAreaInset.right > 0
          ? `calc(${contentSafeAreaInset.right}px + 1rem)`
          : undefined,
    }),
    [contentSafeAreaInset.left, contentSafeAreaInset.right],
  );
  const fullscreenFooterStyle = React.useMemo(
    () => ({
      paddingLeft:
        contentSafeAreaInset.left > 0
          ? `calc(${contentSafeAreaInset.left}px + 1rem)`
          : undefined,
      paddingRight:
        contentSafeAreaInset.right > 0
          ? `calc(${contentSafeAreaInset.right}px + 1rem)`
          : undefined,
      paddingBottom:
        contentSafeAreaInset.bottom > 0
          ? `calc(${contentSafeAreaInset.bottom}px + 1rem)`
          : undefined,
    }),
    [
      contentSafeAreaInset.bottom,
      contentSafeAreaInset.left,
      contentSafeAreaInset.right,
    ],
  );
  const handleFullscreenOpen = React.useCallback(() => {
    if (onLeaderboardPageChange && currentPage !== 1) {
      onLeaderboardPageChange(1);
    }
    setIsFullscreenOpen(true);
  }, [currentPage, onLeaderboardPageChange]);
  const handleFullscreenOpenChange = React.useCallback(
    (open: boolean) => {
      setIsFullscreenOpen(open);
      if (!open && onLeaderboardPageChange && currentPage !== 1) {
        onLeaderboardPageChange(1);
      }
    },
    [currentPage, onLeaderboardPageChange],
  );

  return (
    <>
        <DashboardSurface className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-3 flex items-start justify-between gap-3 [@media(max-width:420px)]:mb-2 [@media(max-height:880px)]:mb-2 [@media(max-height:760px)]:mb-1.5 [@media(max-height:720px)]:mb-1">
            <div className="min-w-0">
              <h2 className="[font-family:var(--font-heading)] text-base font-semibold tracking-tight text-text-primary [@media(max-width:420px)]:text-[15px] [@media(max-height:880px)]:text-[15px] [@media(max-height:760px)]:text-sm [@media(max-height:720px)]:text-[13px] sm:text-lg">
                Таблица лидеров
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-full px-3 text-[11px] [@media(max-width:420px)]:h-7.5 [@media(max-width:420px)]:px-2.5 [@media(max-width:420px)]:text-[10px] [@media(max-height:880px)]:h-7.5 [@media(max-height:880px)]:px-2.5 [@media(max-height:880px)]:text-[10px] [@media(max-height:760px)]:h-7 [@media(max-height:760px)]:px-2 [@media(max-height:760px)]:text-[9px] [@media(max-height:720px)]:h-6.5"
              onClick={handleFullscreenOpen}
            >
              Весь рейтинг
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-2">
            <div className="space-y-2 [@media(max-width:420px)]:space-y-1.5 [@media(max-height:880px)]:space-y-1.5 [@media(max-height:760px)]:space-y-1">
              {entries.length > 0 ? (
                entries.map((entry) => (
                  <DashboardLeaderboardRow
                    key={`${entry.rank ?? 0}-${String(entry.telegramId ?? "") || leaderboardEntryDisplayName(entry)}`}
                    entry={entry}
                    compact
                    currentUserTelegramId={currentUserTelegramId}
                    currentUserXp={currentUserXp}
                    currentUserDailyStreak={currentUserDailyStreak}
                    onOpenPlayerProfile={onOpenPlayerProfile}
                  />
                ))
              ) : isLeaderboardLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`leaderboard-skeleton-${index}`}
                    className="rounded-[1.2rem] border border-border-subtle bg-bg-elevated px-3 py-2 [@media(max-width:420px)]:px-2.5 [@media(max-width:420px)]:py-1.5 [@media(max-height:760px)]:rounded-[1rem] [@media(max-height:760px)]:px-2.5 [@media(max-height:760px)]:py-1.5"
                  >
                    <Skeleton className="h-10 w-full rounded-[1rem] border-0 [@media(max-height:760px)]:h-8" />
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-border-subtle bg-bg-elevated p-4 [@media(max-height:760px)]:rounded-[1rem] [@media(max-height:760px)]:p-3">
                  <div className="space-y-3 [@media(max-height:760px)]:space-y-2">
                    <p className="text-sm leading-relaxed text-text-secondary [@media(max-height:760px)]:text-[12px] [@media(max-height:760px)]:leading-5">
                      Рейтинг появится, когда у вас и других участников появится
                      прогресс по стихам.
                    </p>
                    {/* {onOpenTraining ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onOpenTraining}
                        className="h-9 rounded-full px-4 text-xs [@media(max-height:760px)]:h-8 [@media(max-height:760px)]:px-3"
                      >
                        Открыть тренировку
                      </Button>
                    ) : null} */}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DashboardSurface>

      <Dialog open={isFullscreenOpen} onOpenChange={handleFullscreenOpenChange}>
        <DialogContent className="gap-0 p-0 sm:inset-4 sm:left-4 sm:top-4 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-h-none sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-[2rem] sm:border sm:border-border-subtle sm:p-0">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <DialogHeader
              className="border-b border-border-subtle px-4 pb-4 pt-5 sm:px-6"
              style={fullscreenHeaderStyle}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 text-left">
                  <DialogTitle className="text-left">
                    Таблица лидеров
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-left">
                    Полный рейтинг с пагинацией. Всего участников: {totalParticipants}.
                  </DialogDescription>
                </div>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full"
                    aria-label="Закрыть рейтинг"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </DialogHeader>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6"
              style={fullscreenBodyStyle}
            >
              <div className="space-y-3">
                {entries.length > 0 ? (
                  entries.map((entry) => (
                    <DashboardLeaderboardRow
                      key={`${entry.rank ?? 0}-${String(entry.telegramId ?? "") || leaderboardEntryDisplayName(entry)}`}
                      entry={entry}
                      currentUserTelegramId={currentUserTelegramId}
                      currentUserXp={currentUserXp}
                      currentUserDailyStreak={currentUserDailyStreak}
                      onOpenPlayerProfile={onOpenPlayerProfile}
                    />
                  ))
                ) : isLeaderboardLoading ? (
                  Array.from({ length: pageSize }).map((_, index) => (
                    <div
                      key={`leaderboard-dialog-skeleton-${index}`}
                      className="rounded-[1.35rem] border border-border-subtle bg-bg-elevated p-3"
                    >
                      <Skeleton className="h-12 w-full rounded-[1rem] border-0" />
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-border-subtle bg-bg-elevated p-4">
                    <div className="space-y-3">
                      <p className="text-sm leading-relaxed text-text-secondary">
                        Рейтинг появится, когда у вас и других участников появится
                        прогресс по стихам.
                      </p>
                      {onOpenTraining ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={onOpenTraining}
                          className="h-9 rounded-full px-4 text-xs"
                        >
                          Открыть тренировку
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className="border-t border-border-subtle px-4 py-4 sm:px-6"
              style={fullscreenFooterStyle}
            >
              <DashboardLeaderboardPagination
                currentPage={currentPage}
                derivedTotalPages={derivedTotalPages}
                isLeaderboardLoading={isLeaderboardLoading}
                showJumpToMe={showJumpToMe}
                onLeaderboardPageChange={onLeaderboardPageChange}
                onLeaderboardJumpToMe={onLeaderboardJumpToMe}
              />

              {shouldShowCurrentUserSnapshot ? (
                <div className="mt-3 border-t border-border-subtle pt-3">
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
                      <div className="truncate font-medium text-brand-primary">Вы</div>
                      <div className="mt-1 text-xs text-text-muted">
                        {apiCurrentUser?.rank ? `#${apiCurrentUser.rank}` : "Вне топа"} ·{" "}
                        {apiCurrentUser?.versesCount ?? 0} ·{" "}
                        {currentUserSnapshotDisplayStreakDays} дн. подряд
                      </div>
                    </div>
                    <div className="font-semibold text-text-primary">
                      {formatXp(currentUserSnapshotDisplayXp)}
                    </div>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
