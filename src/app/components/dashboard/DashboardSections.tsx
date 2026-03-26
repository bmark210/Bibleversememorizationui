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
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";
import { cn } from "../ui/utils";

/* ═══════════════════════════════════════════════════════════════════
   Responsive class tokens
   ═══════════════════════════════════════════════════════════════════
   Extracted from inline classes so every component reuses the same
   viewport-adaptive scale.  The custom variants (narrow, compact…)
   are defined in tailwind.css.                                       */

/** Padding inside every DashboardSurface card */
const SURFACE_PAD =
  "p-3.5 narrow:p-3 compact:p-3 compact-md:p-2.5 compact-sm:p-2 compact-xs:p-1.5 sm:p-4 lg:p-5";

/** Vertical gap between elements inside a section */
const SECTION_GAP =
  "gap-3.5 narrow:gap-3 compact:gap-3 compact-sm:gap-2.5 compact-xs:gap-2";

/** Gap inside 2×2 stats grid */
const GRID_GAP =
  "gap-2.5 narrow:gap-2 compact:gap-2 compact-sm:gap-1.5 compact-xs:gap-1 sm:gap-3";

/** Section heading (e.g. "Моя статистика", "Таблица лидеров") */
const HEADING_TEXT =
  "text-base narrow:text-[15px] compact:text-[15px] compact-sm:text-sm compact-xs:text-[13px] sm:text-lg";

/** Bottom margin below a section heading */
const HEADING_MB =
  "mb-2.5 narrow:mb-2 compact:mb-2 compact-sm:mb-1.5 compact-xs:mb-1 sm:mb-3";

/** Large hero heading */
const HERO_TEXT =
  "text-[clamp(1.8rem,5.8vw,2.65rem)] narrow:text-[clamp(1.55rem,7vw,2rem)] compact:text-[clamp(1.62rem,5.2vw,2.2rem)] compact-sm:text-[clamp(1.45rem,4.8vw,1.9rem)] compact-xs:text-[clamp(1.3rem,4.4vw,1.7rem)]";

/** Hero subtitle text */
const HERO_SUBTITLE =
  "text-[13px] leading-6 narrow:text-[12px] narrow:leading-5 compact:text-[12px] compact:leading-5 compact-md:line-clamp-1 compact-sm:mt-1.5 compact-sm:text-[11px] compact-sm:leading-[1.125rem] compact-xs:mt-1 compact-xs:text-[10px] compact-xs:leading-4 sm:text-sm sm:leading-relaxed";

/** User avatar in the welcome section */
const AVATAR_SIZE =
  "h-10 w-10 narrow:h-9 narrow:w-9 compact-sm:h-9 compact-sm:w-9 compact-xs:h-8 compact-xs:w-8 sm:h-11 sm:w-11";

/** CTA button sizing */
const CTA_BUTTON =
  "h-11 w-full rounded-[1.2rem] px-5 narrow:h-10 narrow:px-4 compact:h-10 compact-sm:h-9 compact-sm:px-4 compact-sm:text-sm compact-xs:h-8 compact-xs:text-[13px] sm:w-auto sm:min-w-[184px]";

/** Individual stat card padding */
const STAT_PAD =
  "px-3.5 py-3 narrow:px-3 narrow:py-2.5 compact:px-3 compact:py-2.5 compact-sm:rounded-[1rem] compact-sm:px-2.5 compact-sm:py-2 compact-xs:px-2 compact-xs:py-1.5 sm:rounded-[1.35rem] sm:px-4 sm:py-3.5";

/** Stat label text */
const STAT_LABEL =
  "text-[10px] narrow:text-[9px] compact:text-[9px] compact-sm:text-[8px]";

/** Stat value text */
const STAT_VALUE =
  "mt-1.5 text-[clamp(1.35rem,5vw,2rem)] narrow:mt-1 narrow:text-[clamp(1.12rem,4.4vw,1.5rem)] compact:mt-1 compact:text-[clamp(1.2rem,4.2vw,1.72rem)] compact-sm:text-[clamp(1.05rem,3.8vw,1.45rem)] compact-xs:text-[clamp(0.98rem,3.5vw,1.3rem)]";

/** Compact leaderboard row padding */
const ROW_PAD =
  "rounded-[1.2rem] px-3 py-2 narrow:gap-2.5 narrow:px-2.5 narrow:py-1.5 compact:gap-2.5 compact:px-2.5 compact:py-1.5 compact-sm:gap-2 compact-sm:rounded-[1rem] compact-sm:px-2 compact-sm:py-1.5";

/** Compact rank badge */
const RANK_BADGE =
  "h-7 w-7 text-[11px] narrow:h-6 narrow:w-6 narrow:text-[10px] compact:h-6.5 compact:w-6.5 compact:text-[10px] compact-sm:h-6 compact-sm:w-6 compact-sm:text-[9px]";

/** Compact leaderboard avatar */
const ROW_AVATAR =
  "h-8 w-8 narrow:h-7 narrow:w-7 compact:h-7 compact:w-7 compact-sm:h-6.5 compact-sm:w-6.5";

/** Compact row name text */
const ROW_NAME =
  "text-[13px] narrow:text-[12px] compact:text-[12px] compact-sm:text-[11px]";

/** Compact row detail text */
const ROW_DETAIL =
  "text-[11px] narrow:text-[10px] compact:text-[10px] compact-sm:text-[9px]";

/** "Весь рейтинг" button sizing */
const FULL_RATING_BTN =
  "h-8 shrink-0 rounded-full px-3 text-[11px] narrow:h-7.5 narrow:px-2.5 narrow:text-[10px] compact:h-7.5 compact:px-2.5 compact:text-[10px] compact-sm:h-7 compact-sm:px-2 compact-sm:text-[9px] compact-xs:h-6.5";

/** Spacing between leaderboard rows */
const ROW_GAP =
  "space-y-2 narrow:space-y-1.5 compact:space-y-1.5 compact-sm:space-y-1";

/* ═══════════════════════════════════════════════════════════════════ */

const DASHBOARD_LEADERBOARD_PAGE_SIZE = 5;

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

/* ── Helpers ──────────────────────────────────────────────────────── */

type DashboardUser = {
  firstName: string;
  photoUrl?: string | null;
} | null;

type StatsCardItem = {
  key: string;
  label: string;
  value: string | null;
  isLoading?: boolean;
  tone?: "neutral" | "learning" | "review" | "mastered";
};

const DASHBOARD_WELCOME_SEEN_STORAGE_KEY =
  "bible-memory.dashboard-welcome-seen.v1";

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
      className: "border-border-default bg-bg-elevated text-text-secondary",
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

/* ── DashboardSurface ─────────────────────────────────────────────── */

function DashboardSurface({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "gap-0 h-fit rounded-[1.75rem] border-border-subtle bg-bg-overlay shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:rounded-[2rem]",
        SURFACE_PAD,
        className,
      )}
      {...props}
    />
  );
}

/* ── Welcome Section ──────────────────────────────────────────────── */

type DashboardWelcomeSectionProps = {
  user: DashboardUser;
  currentUserAvatarUrl?: string | null;
  learningVersesCount: number;
  dueReviewVerses: number;
  dailyStreak?: number | null;
  onOpenTraining?: () => void;
  onOpenCurrentUserProfile?: () => void;
};

function WelcomeAvatar({
  currentUserAvatarUrl,
  firstName,
}: {
  currentUserAvatarUrl?: string | null;
  firstName: string;
}) {
  return (
    <Avatar
      className={cn(
        AVATAR_SIZE,
        "border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]",
      )}
    >
      {currentUserAvatarUrl ? (
        <AvatarImage src={currentUserAvatarUrl} alt={firstName} />
      ) : (
        <AvatarFallback className="bg-status-mastered-soft text-brand-primary">
          {firstName.charAt(0).toUpperCase()}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

function WelcomeHeading({
  isFirstAppVisit,
  firstName,
}: {
  isFirstAppVisit: boolean;
  firstName: string;
}) {
  return (
    <h1
      className={cn(
        "[font-family:var(--font-heading)] font-semibold tracking-tight text-brand-primary",
        HERO_TEXT,
      )}
    >
      {isFirstAppVisit ? `Привет, ${firstName}` : `С возвращением`}
    </h1>
  );
}

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
      setIsFirstAppVisit(
        window.localStorage.getItem(DASHBOARD_WELCOME_SEEN_STORAGE_KEY) !== "1",
      );
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

  return (
    <DashboardSurface className="shrink-0 rounded-[1.9rem] sm:rounded-[2rem]">
      <div className={cn("flex flex-col lg:flex-row lg:items-center lg:justify-between", SECTION_GAP)}>
        <div className="min-w-0">
          {user ? (
            onOpenCurrentUserProfile ? (
              <button
                type="button"
                onClick={onOpenCurrentUserProfile}
                className="flex items-center gap-3 text-left transition-[opacity,transform] hover:opacity-95 hover:translate-x-[1px]"
                aria-label={`Открыть профиль ${user.firstName}`}
              >
                <WelcomeAvatar
                  currentUserAvatarUrl={currentUserAvatarUrl}
                  firstName={user.firstName}
                />
                <WelcomeHeading
                  isFirstAppVisit={isFirstAppVisit}
                  firstName={user.firstName}
                />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <WelcomeAvatar
                  currentUserAvatarUrl={currentUserAvatarUrl}
                  firstName={user.firstName}
                />
                <WelcomeHeading
                  isFirstAppVisit={isFirstAppVisit}
                  firstName={user.firstName}
                />
              </div>
            )
          ) : (
            <h1
              className={cn(
                "[font-family:var(--font-heading)] font-semibold tracking-tight text-brand-primary",
                HERO_TEXT,
              )}
            >
              С возвращением
            </h1>
          )}

          <p className={cn("mt-2 line-clamp-2 max-w-2xl text-text-secondary", HERO_SUBTITLE)}>
            {heroMessage}
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          haptic="medium"
          onClick={onOpenTraining}
          className={cn(CTA_BUTTON, "shadow-[var(--shadow-floating)]")}
        >
          <Dumbbell className="h-4 w-4" />
          Тренировка
        </Button>
      </div>
    </DashboardSurface>
  );
});

/* ── Training Stats Card ──────────────────────────────────────────── */

type DashboardTrainingStatsCardProps = {
  statsCards: ReadonlyArray<StatsCardItem>;
};

export const DashboardTrainingStatsCard = React.memo(function DashboardTrainingStatsCard({
  statsCards,
}: DashboardTrainingStatsCardProps) {
  return (
    <DashboardSurface className="shrink-0">
      <h3
        className={cn(
          "[font-family:var(--font-heading)] font-semibold tracking-tight text-text-primary",
          HEADING_TEXT,
          HEADING_MB,
        )}
      >
        Моя статистика
      </h3>

      <div className={cn("grid grid-cols-2", GRID_GAP)}>
        {statsCards.map((item) => {
          const tone = STAT_TONE_STYLES[item.tone ?? "neutral"];
          return (
            <div
              key={item.key}
              className={cn(
                "rounded-[1.2rem] border shadow-[var(--shadow-soft)]",
                STAT_PAD,
                tone.panelClassName,
              )}
            >
              <div
                className={cn(
                  "font-medium uppercase tracking-[0.15em]",
                  STAT_LABEL,
                  tone.labelClassName,
                )}
              >
                {item.label}
              </div>
              <div
                className={cn(
                  "font-semibold leading-tight tracking-tight",
                  STAT_VALUE,
                  tone.valueClassName,
                )}
              >
                {item.isLoading ? (
                  <Skeleton className="h-8 w-16 rounded-xl border-0" />
                ) : item.value != null ? (
                  item.value
                ) : (
                  <span className="text-sm font-medium text-text-muted">Нет данных</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardSurface>
  );
});

/* ── Leaderboard Row ──────────────────────────────────────────────── */

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
  const isCurrentUser =
    entryTelegramId !== "" && entryTelegramId === currentUserTelegramId;
  const displayXp =
    isCurrentUser && currentUserXp != null
      ? currentUserXp
      : leaderboardEntryXp(entry);
  const displayStreakDays =
    isCurrentUser && currentUserDailyStreak != null
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
        compact ? ROW_PAD : "rounded-[1.35rem] px-3.5 py-3 sm:px-4",
        isCurrentUser
          ? "border-brand-primary/20 bg-status-mastered-soft"
          : "border-border-subtle bg-bg-elevated hover:border-brand-primary/20 hover:bg-bg-surface",
      )}
      aria-label={`Открыть профиль ${displayName}`}
    >
      {/* Rank badge */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border font-semibold",
          compact ? RANK_BADGE : "h-8 w-8 text-xs",
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

      {/* Avatar */}
      <Avatar
        className={cn(
          "shrink-0 border border-border-subtle bg-bg-surface",
          compact ? ROW_AVATAR : "h-9 w-9",
        )}
      >
        {entry.avatarUrl ? (
          <AvatarImage src={entry.avatarUrl} alt={displayName} />
        ) : null}
        <AvatarFallback className="bg-bg-subtle text-xs text-text-secondary">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      {/* Name & details */}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate font-medium",
            compact ? ROW_NAME : "text-sm",
            isCurrentUser ? "text-brand-primary" : "text-text-primary",
          )}
        >
          {displayName}
        </div>
        <div
          className={cn(
            "mt-0.5 text-text-muted",
            compact ? ROW_DETAIL : "text-xs",
          )}
        >
          {leaderboardEntryWeeklyReps(entry)} · {displayStreakDays} дн. подряд
        </div>
      </div>

      {/* XP */}
      <div
        className={cn(
          "shrink-0 font-semibold text-text-primary",
          compact ? ROW_NAME : "text-sm",
        )}
      >
        {formatXp(displayXp)}
      </div>
    </button>
  );
}

/* ── Leaderboard Pagination ───────────────────────────────────────── */

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
          {[
            { label: "Первая страница", icon: ChevronsLeft, page: 1, disabled: currentPage <= 1 },
            { label: "Предыдущая страница", icon: ChevronLeft, page: currentPage - 1, disabled: currentPage <= 1 },
            { label: "Следующая страница", icon: ChevronRight, page: currentPage + 1, disabled: currentPage >= derivedTotalPages },
            { label: "Последняя страница", icon: ChevronsRight, page: derivedTotalPages, disabled: currentPage >= derivedTotalPages },
          ].map(({ label, icon: Icon, page, disabled }) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl"
              disabled={isLeaderboardLoading || disabled}
              aria-label={label}
              onClick={() => onLeaderboardPageChange(page)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
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

/* ── Leaderboard Card ─────────────────────────────────────────────── */

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
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const currentUserTelegramId = useCurrentUserStatsStore((s) => s.telegramId);
  const currentUserXp = useCurrentUserStatsStore((s) => s.xp);
  const currentUserDailyStreak = useCurrentUserStatsStore((s) => s.dailyStreak);

  const entries = leaderboard?.items ?? [];
  const apiCurrentUser = leaderboard?.currentUser ?? null;
  const pageSize = leaderboard?.pageSize ?? DASHBOARD_LEADERBOARD_PAGE_SIZE;
  const totalParticipants = leaderboard?.totalParticipants ?? 0;

  const derivedTotalPages =
    leaderboard?.totalPages ??
    (totalParticipants > 0
      ? Math.max(1, Math.ceil(totalParticipants / pageSize))
      : 1);

  const currentPage = Math.min(Math.max(1, leaderboard?.page ?? 1), derivedTotalPages);
  const showPagination = Boolean(onLeaderboardPageChange) && derivedTotalPages > 1;

  const isCurrentUserInEntries =
    currentUserTelegramId != null &&
    entries.some((e) => String(e.telegramId ?? "") === currentUserTelegramId);

  const currentUserRank = apiCurrentUser?.rank;
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
    !isCurrentUserInEntries;

  const currentUserSnapshotDisplayXp =
    currentUserXp ?? Math.max(0, Math.round(apiCurrentUser?.xp ?? 0));
  const currentUserSnapshotDisplayStreakDays = currentUserDailyStreak ?? 0;

  // Safe-area-aware styles for the fullscreen dialog
  const fullscreenHeaderStyle = React.useMemo(
    () => ({
      paddingTop: contentSafeAreaInset.top > 0
        ? `calc(${contentSafeAreaInset.top}px + 1.25rem)`
        : undefined,
      paddingLeft: contentSafeAreaInset.left > 0
        ? `calc(${contentSafeAreaInset.left}px + 1rem)`
        : undefined,
      paddingRight: contentSafeAreaInset.right > 0
        ? `calc(${contentSafeAreaInset.right}px + 1rem)`
        : undefined,
    }),
    [contentSafeAreaInset.left, contentSafeAreaInset.right, contentSafeAreaInset.top],
  );

  const fullscreenSideStyle = React.useMemo(
    () => ({
      paddingLeft: contentSafeAreaInset.left > 0
        ? `calc(${contentSafeAreaInset.left}px + 1rem)`
        : undefined,
      paddingRight: contentSafeAreaInset.right > 0
        ? `calc(${contentSafeAreaInset.right}px + 1rem)`
        : undefined,
    }),
    [contentSafeAreaInset.left, contentSafeAreaInset.right],
  );

  const fullscreenFooterStyle = React.useMemo(
    () => ({
      ...fullscreenSideStyle,
      paddingBottom: contentSafeAreaInset.bottom > 0
        ? `calc(${contentSafeAreaInset.bottom}px + 1rem)`
        : undefined,
    }),
    [contentSafeAreaInset.bottom, fullscreenSideStyle],
  );

  const handleFullscreenOpen = React.useCallback(() => {
    if (onLeaderboardPageChange && currentPage !== 1) onLeaderboardPageChange(1);
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

  const sharedRowProps = {
    currentUserTelegramId,
    currentUserXp,
    currentUserDailyStreak,
    onOpenPlayerProfile,
  };

  return (
    <>
      {/* Inline card */}
      <DashboardSurface className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className={cn("flex items-start justify-between gap-3", HEADING_MB)}>
          <h2
            className={cn(
              "[font-family:var(--font-heading)] font-semibold tracking-tight text-text-primary",
              HEADING_TEXT,
            )}
          >
            Таблица лидеров
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={FULL_RATING_BTN}
            onClick={handleFullscreenOpen}
          >
            Весь рейтинг
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-2">
          <div className={ROW_GAP}>
            {entries.length > 0
              ? entries.map((entry) => (
                  <DashboardLeaderboardRow
                    key={`${entry.rank ?? 0}-${String(entry.telegramId ?? "") || leaderboardEntryDisplayName(entry)}`}
                    entry={entry}
                    compact
                    {...sharedRowProps}
                  />
                ))
              : isLeaderboardLoading
                ? Array.from({ length: 3 }, (_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="rounded-[1.2rem] border border-border-subtle bg-bg-elevated px-3 py-2 narrow:px-2.5 narrow:py-1.5 compact-sm:rounded-[1rem] compact-sm:px-2.5 compact-sm:py-1.5"
                    >
                      <Skeleton className="h-10 w-full rounded-[1rem] border-0 compact-sm:h-8" />
                    </div>
                  ))
                : (
                    <div className="rounded-[1.35rem] border border-dashed border-border-subtle bg-bg-elevated p-4 compact-sm:rounded-[1rem] compact-sm:p-3">
                      <p className="text-sm leading-relaxed text-text-secondary compact-sm:text-[12px] compact-sm:leading-5">
                        Рейтинг появится, когда у вас и других участников появится
                        прогресс по стихам.
                      </p>
                    </div>
                  )}
          </div>
        </div>
      </DashboardSurface>

      {/* Fullscreen leaderboard dialog */}
      <Dialog open={isFullscreenOpen} onOpenChange={handleFullscreenOpenChange}>
        <DialogContent className="gap-0 p-0 sm:inset-4 sm:left-4 sm:top-4 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-h-none sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-[2rem] sm:border sm:border-border-subtle sm:p-0">
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <DialogHeader
              className="border-b border-border-subtle px-4 pb-4 pt-5 sm:px-6"
              style={fullscreenHeaderStyle}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 text-left">
                  <DialogTitle className="text-left">Таблица лидеров</DialogTitle>
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
              style={fullscreenSideStyle}
            >
              <div className="space-y-3">
                {entries.length > 0
                  ? entries.map((entry) => (
                      <DashboardLeaderboardRow
                        key={`${entry.rank ?? 0}-${String(entry.telegramId ?? "") || leaderboardEntryDisplayName(entry)}`}
                        entry={entry}
                        {...sharedRowProps}
                      />
                    ))
                  : isLeaderboardLoading
                    ? Array.from({ length: pageSize }, (_, i) => (
                        <div
                          key={`dialog-skeleton-${i}`}
                          className="rounded-[1.35rem] border border-border-subtle bg-bg-elevated p-3"
                        >
                          <Skeleton className="h-12 w-full rounded-[1rem] border-0" />
                        </div>
                      ))
                    : (
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
