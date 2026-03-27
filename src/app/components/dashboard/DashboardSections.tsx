"use client";

import React from "react";
import {
  ArrowUpRight,
  Crown,
  Dumbbell,
  Medal,
  Trophy,
  X,
} from "lucide-react";
import { Virtuoso, type ListRange, type VirtuosoHandle } from "react-virtuoso";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { Card } from "../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import type { domain_UserLeaderboardEntry } from "@/api/models/domain_UserLeaderboardEntry";
import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import type {
  DashboardCompactFriendActivityEntry,
  DashboardCompactFriendsActivityResponse,
} from "@/api/services/friendsActivity";
import {
  DASHBOARD_FRIENDS_ACTIVITY_LIMIT,
  fetchDashboardFriendsActivity,
} from "@/api/services/friendsActivity";
import { DASHBOARD_LEADERBOARD_WINDOW_SIZE } from "@/api/services/leaderboard";
import { formatXp } from "@/shared/social/formatXp";
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";
import { cn } from "../ui/utils";

/* ═══════════════════════════════════════════════════════════════════
   Responsive class tokens
   ═══════════════════════════════════════════════════════════════════
   Extracted from inline classes so every component reuses the same
   viewport-adaptive scale. Height-based compact shrink is disabled
   for Dashboard; only width-driven adjustments remain.               */

/** Padding inside every DashboardSurface card */
const SURFACE_PAD =
  "p-3.5 narrow:p-3 sm:p-4 lg:p-5";

/** Vertical gap between elements inside a section */
const SECTION_GAP =
  "gap-3.5 narrow:gap-3";

/** Gap inside 2×2 stats grid */
const GRID_GAP =
  "gap-2.5 narrow:gap-2 sm:gap-3";

/** Section heading (e.g. "Моя статистика", "Таблица лидеров") */
const HEADING_TEXT =
  "px-1 text-base narrow:text-[15px] sm:text-lg";

/** Bottom margin below a section heading */
const HEADING_MB =
  "px-1 mb-2.5 narrow:mb-2 sm:mb-3";

/** Large hero heading */
const HERO_TEXT =
  "px-1 text-[clamp(1.8rem,5.8vw,2.65rem)] narrow:text-[clamp(1.55rem,7vw,2rem)]";

/** Hero subtitle text */
const HERO_SUBTITLE =
  "px-1 text-[13px] leading-6 narrow:text-[12px] narrow:leading-5 sm:text-sm sm:leading-relaxed";

/** User avatar in the welcome section */
const AVATAR_SIZE =
  "h-10 w-10 narrow:h-9 narrow:w-9 sm:h-11 sm:w-11";

/** CTA button sizing */
const CTA_BUTTON =
  "h-11 w-full rounded-[1.2rem] px-5 narrow:h-10 narrow:px-4 sm:w-auto sm:min-w-[184px]";

/** Individual stat card padding */
const STAT_PAD =
  "px-3.5 py-3 narrow:px-3 narrow:py-2.5 sm:rounded-[1.35rem] sm:px-4 sm:py-3.5";

/** Stat label text */
const STAT_LABEL =
  "text-[10px] narrow:text-[9px]";

/** Stat value text */
const STAT_VALUE =
  "mt-1.5 text-[clamp(1.35rem,5vw,2rem)] narrow:mt-1 narrow:text-[clamp(1.12rem,4.4vw,1.5rem)]";

/** Compact leaderboard row padding */
const ROW_PAD =
  "rounded-[1.2rem] px-3 py-2 narrow:gap-2.5 narrow:px-2.5 narrow:py-1.75";

/** Compact rank badge */
const RANK_BADGE =
  "h-7 w-7 text-[11px] narrow:h-6.5 narrow:w-6.5 narrow:text-[10px]";

/** Compact leaderboard avatar */
const ROW_AVATAR =
  "h-8 w-8 narrow:h-7 narrow:w-7";

/** Compact row name text */
const ROW_NAME =
  "text-[13px] narrow:text-[12px]";

/** Compact row detail text */
const ROW_DETAIL =
  "text-[11px] narrow:text-[10px]";

/** "Показать меня" button sizing */
const SHOW_ME_BTN =
  "h-8 shrink-0 rounded-full px-3 text-[11px] narrow:h-7.5 narrow:px-2.5 narrow:text-[10px]";

/** Spacing between leaderboard rows */
const ROW_GAP =
  "space-y-2 narrow:space-y-1.5";

/* ═══════════════════════════════════════════════════════════════════ */

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

type DashboardPlayerPreview = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
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

function pluralizeDays(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return "день";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return "дня";
  }
  return "дней";
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatFriendLastActive(lastActiveAt?: string | null) {
  if (!lastActiveAt) return "Без активности";

  const parsed = new Date(lastActiveAt);
  if (Number.isNaN(parsed.getTime())) return "Без активности";

  const todayStart = startOfLocalDay(new Date());
  const dateStart = startOfLocalDay(parsed);
  const diffDays = Math.max(
    0,
    Math.round((todayStart.getTime() - dateStart.getTime()) / 86_400_000),
  );

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  return `${diffDays} ${pluralizeDays(diffDays)} назад`;
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
        "gap-0 min-h-0 rounded-[1.55rem] border-border-subtle bg-bg-overlay shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:rounded-[1.8rem]",
        SURFACE_PAD,
        className,
      )}
      {...props}
    />
  );
}

function DashboardInfoTile({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.2rem] border border-border-subtle bg-bg-elevated/70 px-3 py-2 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
        {label}
      </div>
      <div className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-text-primary sm:text-[15px]">
        {value}
      </div>
    </div>
  );
}

function DashboardFullscreenSafeHeader() {
  const { contentSafeAreaInset } = useTelegramSafeArea();

  return (
    <div
      aria-hidden="true"
      className="border-b border-border-subtle bg-bg-overlay/95 backdrop-blur-2xl"
      style={{ paddingTop: `${contentSafeAreaInset.top}px` }}
    >
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-h-10 items-center justify-center" />
      </div>
    </div>
  );
}

function DashboardFullscreenDialog({
  open,
  onOpenChange,
  title,
  actions,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col inset-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-bg-surface p-0 sm:inset-0 sm:top-0 sm:left-0 sm:h-[100dvh] sm:max-h-none sm:w-screen sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-none sm:border-0 sm:p-0">
        <DashboardFullscreenSafeHeader />

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border-subtle bg-bg-overlay/80 backdrop-blur-2xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-5 lg:px-6">
              <div className="min-w-0">
                <DialogTitle>{title}</DialogTitle>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {actions}
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-full px-3 sm:px-4"
                  >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Закрыть</span>
                  </Button>
                </DialogClose>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
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
      ? `Сегодня: ${dueReviewVerses} к повторению • ${learningVersesCount} ${pluralizeVerses(learningVersesCount)} в изучении.`
      : dueReviewVerses > 0
        ? `Сегодня к повторению: ${dueReviewVerses} ${pluralizeVerses(dueReviewVerses)}.`
        : learningVersesCount > 0
          ? `В активной практике: ${learningVersesCount} ${pluralizeVerses(learningVersesCount)}.`
          : "Откройте тренировку и выберите следующую сессию.";

  return (
    <DashboardSurface className="shrink-0 rounded-[1.7rem] sm:rounded-[1.9rem]">
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

          <p className={cn("mt-1.5 line-clamp-2 max-w-2xl text-text-secondary", HERO_SUBTITLE)}>
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

      <div className={cn("grid grid-cols-3", GRID_GAP)}>
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
  onOpenPlayerProfile?: (player: DashboardPlayerPreview) => void;
  compact?: boolean;
  className?: string;
};

function DashboardLeaderboardRow({
  entry,
  currentUserTelegramId,
  currentUserXp,
  currentUserDailyStreak,
  onOpenPlayerProfile,
  compact = false,
  className,
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
        "flex w-full items-center gap-2.5 border text-left shadow-[var(--shadow-soft)] transition-[background-color,border-color,color]",
        compact ? ROW_PAD : "rounded-[1.35rem] px-3.5 py-3 sm:px-4",
        isCurrentUser
          ? "border-brand-primary/20 bg-status-mastered-soft"
          : "border-border-subtle bg-bg-elevated hover:border-brand-primary/20 hover:bg-bg-surface",
        className,
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
            "mt-0.5 line-clamp-1 text-text-muted",
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

/* ── Leaderboard Card ─────────────────────────────────────────────── */

type LeaderboardCurrentUser = NonNullable<
  domain_UserLeaderboardResponse["currentUser"]
>;

const LEADERBOARD_OVERSCAN = 160;

function createLeaderboardCache(
  totalParticipants: number,
  previous: Array<domain_UserLeaderboardEntry | null> = [],
) {
  if (totalParticipants <= 0) {
    return [] as Array<domain_UserLeaderboardEntry | null>;
  }

  return Array.from({ length: totalParticipants }, (_, index) => previous[index] ?? null);
}

function mergeLeaderboardWindow(
  previous: Array<domain_UserLeaderboardEntry | null>,
  leaderboard: domain_UserLeaderboardResponse,
) {
  const totalParticipants = Math.max(0, leaderboard.totalParticipants ?? previous.length);
  const next = createLeaderboardCache(totalParticipants, previous);
  const offset = Math.max(0, leaderboard.offset ?? 0);

  (leaderboard.items ?? []).forEach((entry, index) => {
    const targetIndex = offset + index;
    if (targetIndex >= 0 && targetIndex < next.length) {
      next[targetIndex] = entry;
    }
  });

  return next;
}

function clampLeaderboardOffset(offset: number, totalParticipants: number, windowSize: number) {
  const maxOffset = Math.max(0, totalParticipants - windowSize);
  return Math.min(Math.max(0, offset), maxOffset);
}

function getLeaderboardWindowOffsetForIndex(
  index: number,
  totalParticipants: number,
  windowSize: number,
) {
  return clampLeaderboardOffset(
    Math.floor(Math.max(0, index) / windowSize) * windowSize,
    totalParticipants,
    windowSize,
  );
}

const LeaderboardVirtuosoList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(function LeaderboardVirtuosoList({ className, ...props }, ref) {
  return <div ref={ref} className={cn("pb-2", className)} {...props} />;
});

function DashboardLeaderboardRowSkeleton({ isLast = false }: { isLast?: boolean }) {
  return (
    <div className={cn("px-0", isLast ? "pb-0" : "pb-2")}>
      <div
        className="rounded-[1.35rem] border border-border-subtle bg-bg-surface/80 px-3.5 py-3 shadow-[var(--shadow-soft)]"
        aria-hidden="true"
      >
        <Skeleton className="h-12 w-full rounded-[1rem] border-0" />
      </div>
    </div>
  );
}

type DashboardLeaderboardCardProps = {
  leaderboard?: domain_UserLeaderboardResponse | null;
  isLeaderboardLoading?: boolean;
  onOpenTraining?: () => void;
  onOpenPlayerProfile?: (player: DashboardPlayerPreview) => void;
  onLeaderboardWindowRequest?: (query: {
    offset?: number;
    limit?: number;
  }) => Promise<domain_UserLeaderboardResponse | null>;
};

export const DashboardLeaderboardCard = React.memo(function DashboardLeaderboardCard({
  leaderboard = null,
  isLeaderboardLoading = false,
  onOpenTraining,
  onOpenPlayerProfile,
  onLeaderboardWindowRequest,
}: DashboardLeaderboardCardProps) {
  const currentUserTelegramId = useCurrentUserStatsStore((s) => s.telegramId);
  const currentUserXp = useCurrentUserStatsStore((s) => s.xp);
  const currentUserDailyStreak = useCurrentUserStatsStore((s) => s.dailyStreak);
  const virtuosoRef = React.useRef<VirtuosoHandle | null>(null);
  const loadedOffsetsRef = React.useRef<Set<number>>(new Set());
  const pendingOffsetsRef = React.useRef<Set<number>>(new Set());
  const [cachedEntries, setCachedEntries] = React.useState<
    Array<domain_UserLeaderboardEntry | null>
  >(() => (leaderboard ? mergeLeaderboardWindow([], leaderboard) : []));
  const [totalParticipants, setTotalParticipants] = React.useState(
    Math.max(0, leaderboard?.totalParticipants ?? 0),
  );
  const [currentUserSnapshot, setCurrentUserSnapshot] =
    React.useState<LeaderboardCurrentUser | null>(leaderboard?.currentUser ?? null);
  const [isShowMePending, setIsShowMePending] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const windowSize = Math.max(1, leaderboard?.limit ?? DASHBOARD_LEADERBOARD_WINDOW_SIZE);

  const mergeWindowIntoState = React.useCallback(
    (nextWindow: domain_UserLeaderboardResponse) => {
      const resolvedTotalParticipants = Math.max(0, nextWindow.totalParticipants ?? 0);
      const resolvedOffset = Math.max(0, nextWindow.offset ?? 0);

      loadedOffsetsRef.current.add(resolvedOffset);
      setTotalParticipants(resolvedTotalParticipants);
      setCurrentUserSnapshot(nextWindow.currentUser ?? null);
      setCachedEntries((previous) => mergeLeaderboardWindow(previous, nextWindow));
    },
    [],
  );

  React.useEffect(() => {
    if (!leaderboard) {
      loadedOffsetsRef.current.clear();
      pendingOffsetsRef.current.clear();
      setCachedEntries([]);
      setTotalParticipants(0);
      setCurrentUserSnapshot(null);
      return;
    }

    mergeWindowIntoState(leaderboard);
  }, [leaderboard, mergeWindowIntoState]);

  const requestLeaderboardWindow = React.useCallback(
    async (requestedOffset: number) => {
      if (!onLeaderboardWindowRequest) return null;

      const resolvedOffset = clampLeaderboardOffset(
        requestedOffset,
        totalParticipants,
        windowSize,
      );

      if (
        loadedOffsetsRef.current.has(resolvedOffset) ||
        pendingOffsetsRef.current.has(resolvedOffset)
      ) {
        return null;
      }

      pendingOffsetsRef.current.add(resolvedOffset);

      try {
        const nextWindow = await onLeaderboardWindowRequest({
          offset: resolvedOffset,
          limit: windowSize,
        });

        if (nextWindow) {
          mergeWindowIntoState(nextWindow);
        }

        return nextWindow;
      } finally {
        pendingOffsetsRef.current.delete(resolvedOffset);
      }
    },
    [mergeWindowIntoState, onLeaderboardWindowRequest, totalParticipants, windowSize],
  );

  const handleRangeChanged = React.useCallback(
    ({ startIndex, endIndex }: ListRange) => {
      if (!onLeaderboardWindowRequest || totalParticipants <= 0) return;

      const clampedStartIndex = Math.max(0, startIndex);
      const clampedEndIndex = Math.max(
        clampedStartIndex,
        Math.min(totalParticipants - 1, endIndex),
      );

      const firstOffset = getLeaderboardWindowOffsetForIndex(
        clampedStartIndex,
        totalParticipants,
        windowSize,
      );
      const lastOffset = getLeaderboardWindowOffsetForIndex(
        clampedEndIndex,
        totalParticipants,
        windowSize,
      );

      for (let offset = firstOffset; offset <= lastOffset; offset += windowSize) {
        void requestLeaderboardWindow(offset);
      }

      const nextOffset = lastOffset + windowSize;
      if (nextOffset < totalParticipants) {
        void requestLeaderboardWindow(nextOffset);
      }
    },
    [onLeaderboardWindowRequest, requestLeaderboardWindow, totalParticipants, windowSize],
  );

  const handleShowMe = React.useCallback(async () => {
    if (!currentUserSnapshot?.rank) return;

    const targetIndex = Math.max(0, currentUserSnapshot.rank - 1);
    const targetOffset = getLeaderboardWindowOffsetForIndex(
      targetIndex,
      totalParticipants,
      windowSize,
    );

    setIsShowMePending(true);
    try {
      await requestLeaderboardWindow(targetOffset);
      virtuosoRef.current?.scrollToIndex({
        index: targetIndex,
        align: "center",
        behavior: "smooth",
      });
    } finally {
      setIsShowMePending(false);
    }
  }, [currentUserSnapshot?.rank, requestLeaderboardWindow, totalParticipants, windowSize]);

  const sharedRowProps = {
    currentUserTelegramId,
    currentUserXp,
    currentUserDailyStreak,
    onOpenPlayerProfile,
  };

  const leaderEntry = React.useMemo(
    () =>
      cachedEntries.find(
        (entry): entry is domain_UserLeaderboardEntry => entry != null,
      ) ?? leaderboard?.items?.[0] ?? null,
    [cachedEntries, leaderboard],
  );

  const canShowMe = Boolean(currentUserSnapshot?.rank);
  const leaderboardSummary = totalParticipants > 0
    ? currentUserSnapshot?.rank
      ? `Ваше место #${currentUserSnapshot.rank} из ${totalParticipants}`
      : `${totalParticipants} участников в общем рейтинге`
    : "XP и серия формируют общий рейтинг участников.";
  const leaderSummary = leaderEntry
    ? `${leaderboardEntryDisplayName(leaderEntry)} · ${formatXp(leaderboardEntryXp(leaderEntry))}`
    : "Лидер появится после первых результатов";
  const placementSummary = currentUserSnapshot?.rank
    ? `#${currentUserSnapshot.rank} из ${totalParticipants}`
    : totalParticipants > 0
      ? `${totalParticipants} участников`
      : "Пока без участников";

  const renderLeaderboardRow = React.useCallback(
    (index: number) => {
      const entry = cachedEntries[index];

      if (!entry) {
        return <DashboardLeaderboardRowSkeleton isLast={index === totalParticipants - 1} />;
      }

      return (
        <div className={cn("px-0", index === totalParticipants - 1 ? "pb-0" : "pb-2")}>
          <DashboardLeaderboardRow
            key={`${entry.rank ?? 0}-${String(entry.telegramId ?? "") || leaderboardEntryDisplayName(entry)}`}
            entry={entry}
            {...sharedRowProps}
          />
        </div>
      );
    },
    [
      cachedEntries,
      sharedRowProps,
      totalParticipants,
    ],
  );

  return (
    <>
      <DashboardSurface className="flex min-h-0 flex-1 flex-col justify-between">
        <div className={cn("flex items-start justify-between gap-3", HEADING_MB)}>
          <div className="min-w-0">
            <h2
              className={cn(
                "[font-family:var(--font-heading)] font-semibold tracking-tight text-text-primary",
                HEADING_TEXT,
              )}
            >
              Таблица лидеров
            </h2>
            <p className="mt-1 px-1 text-[11px] text-text-muted narrow:text-[10px]">
              {leaderboardSummary}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 rounded-full px-4 text-xs"
            onClick={() => setIsDialogOpen(true)}
          >
            Открыть
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-2.5 flex-1">
          {isLeaderboardLoading && totalParticipants === 0 ? (
            <>
              <Skeleton className="h-[84px] rounded-[1.2rem] border-0" />
              <Skeleton className="h-[84px] rounded-[1.2rem] border-0" />
            </>
          ) : (
            <>
              <DashboardInfoTile
                label="Лидер"
                value={leaderSummary}
                className="border-status-mastered/20 bg-status-mastered-soft/65 flex-1"
              />
              <DashboardInfoTile
                className="flex-1"
                label={currentUserSnapshot?.rank ? "Ваше место" : "Рейтинг"}
                value={placementSummary}
              />
            </>
          )}
        </div>
      </DashboardSurface>

      <DashboardFullscreenDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Таблица лидеров"
        actions={
          canShowMe ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={SHOW_ME_BTN}
              disabled={isLeaderboardLoading || isShowMePending}
              onClick={handleShowMe}
            >
              Показать меня
            </Button>
          ) : undefined
        }
      >
        <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-4 py-4 sm:px-5 lg:px-6">
          <div className="min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-border-subtle bg-bg-overlay p-3 shadow-[var(--shadow-floating)] sm:p-4">
            {totalParticipants > 0 ? (
              <Virtuoso
                ref={virtuosoRef}
                className="h-full min-h-0 [scrollbar-gutter:stable]"
                totalCount={totalParticipants}
                increaseViewportBy={LEADERBOARD_OVERSCAN}
                overscan={LEADERBOARD_OVERSCAN}
                components={{ List: LeaderboardVirtuosoList }}
                rangeChanged={handleRangeChanged}
                itemContent={renderLeaderboardRow}
              />
            ) : isLeaderboardLoading ? (
              <div className={cn("h-full overflow-hidden", ROW_GAP)}>
                {Array.from({ length: 5 }, (_, index) => (
                  <DashboardLeaderboardRowSkeleton
                    key={`leaderboard-skeleton-${index}`}
                    isLast={index === 4}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[220px] flex-col justify-center rounded-[1.25rem] border border-dashed border-border-subtle bg-bg-surface/60 p-5 text-left">
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-text-secondary">
                    Рейтинг появится, когда у вас и других участников появится прогресс по
                    стихам.
                  </p>
                  {onOpenTraining ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenTraining}
                      className="h-10 w-fit rounded-full px-4 text-xs"
                    >
                      Открыть тренировку
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardFullscreenDialog>
    </>
  );
});

/* ── Friends Activity Card ────────────────────────────────────────── */

type DashboardFriendsActivityCardProps = {
  friendsActivity?: DashboardCompactFriendsActivityResponse | null;
  isFriendsActivityLoading?: boolean;
  currentTelegramId?: string | null;
  onOpenPlayerProfile?: (player: DashboardPlayerPreview) => void;
};

function DashboardFriendsActivityRow({
  entry,
  onOpenPlayerProfile,
}: {
  entry: DashboardCompactFriendActivityEntry;
  onOpenPlayerProfile?: (player: DashboardPlayerPreview) => void;
}) {
  const displayName = entry.name?.trim() || "Друг";

  return (
    <button
      type="button"
      onClick={() =>
        onOpenPlayerProfile?.({
          telegramId: String(entry.telegramId ?? ""),
          name: displayName,
          avatarUrl: entry.avatarUrl?.trim() ? entry.avatarUrl.trim() : null,
        })
      }
      className="flex w-full items-center gap-3 rounded-[1.2rem] border border-border-subtle bg-bg-elevated px-3 py-2.5 text-left shadow-[var(--shadow-soft)] transition-[background-color,border-color,color] hover:border-brand-primary/15 hover:bg-bg-surface"
      aria-label={`Открыть профиль ${displayName}`}
    >
      <Avatar className="h-9 w-9 shrink-0 border border-border-subtle bg-bg-surface">
        {entry.avatarUrl ? <AvatarImage src={entry.avatarUrl} alt={displayName} /> : null}
        <AvatarFallback className="bg-bg-subtle text-xs text-text-secondary">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">{displayName}</div>
        <div className="mt-0.5 text-xs text-text-muted">
          {formatFriendLastActive(entry.lastActiveAt)}
        </div>
      </div>

      <div className="shrink-0 rounded-full border border-status-mastered/20 bg-status-mastered-soft px-2.5 py-1 text-[11px] font-semibold text-status-mastered">
        {entry.dailyStreak} {pluralizeDays(entry.dailyStreak)}
      </div>
    </button>
  );
}

function DashboardFriendsActivityRowSkeleton({ isLast = false }: { isLast?: boolean }) {
  return (
    <div className={cn("px-0", isLast ? "pb-0" : "pb-2")}>
      <div
        className="rounded-[1.2rem] border border-border-subtle bg-bg-surface/80 px-3 py-2.5 shadow-[var(--shadow-soft)]"
        aria-hidden="true"
      >
        <Skeleton className="h-11 w-full rounded-[1rem] border-0" />
      </div>
    </div>
  );
}

export const DashboardFriendsActivityCard = React.memo(function DashboardFriendsActivityCard({
  friendsActivity = null,
  isFriendsActivityLoading = false,
  currentTelegramId = null,
  onOpenPlayerProfile,
}: DashboardFriendsActivityCardProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogFriendsActivity, setDialogFriendsActivity] =
    React.useState<DashboardCompactFriendsActivityResponse | null>(friendsActivity);
  const [isDialogFriendsActivityLoading, setIsDialogFriendsActivityLoading] =
    React.useState(false);

  React.useEffect(() => {
    setDialogFriendsActivity(friendsActivity);
  }, [friendsActivity]);

  React.useEffect(() => {
    if (!isDialogOpen || !currentTelegramId) return;

    let isCancelled = false;
    const requestedLimit = Math.max(
      friendsActivity?.friendsTotal ?? 0,
      DASHBOARD_FRIENDS_ACTIVITY_LIMIT,
    );

    setIsDialogFriendsActivityLoading(true);

    void fetchDashboardFriendsActivity({
      telegramId: currentTelegramId,
      limit: requestedLimit,
    })
      .then((nextFriendsActivity) => {
        if (!isCancelled) {
          setDialogFriendsActivity(nextFriendsActivity);
        }
      })
      .catch((error) => {
        console.error("Не удалось загрузить полный список активности друзей:", error);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsDialogFriendsActivityLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    currentTelegramId,
    friendsActivity?.friendsTotal,
    isDialogOpen,
  ]);

  const summaryFriendsTotal = Math.max(0, friendsActivity?.friendsTotal ?? 0);
  const summaryEntries = friendsActivity?.entries ?? [];
  const latestActiveEntry =
    summaryEntries.find((entry) => Boolean(entry.lastActiveAt)) ?? summaryEntries[0] ?? null;

  const modalFriendsActivity = dialogFriendsActivity ?? friendsActivity;
  const modalFriendsTotal = Math.max(0, modalFriendsActivity?.friendsTotal ?? 0);
  const modalEntries = modalFriendsActivity?.entries ?? [];
  const modalHasRecordedActivity = modalEntries.some((entry) => Boolean(entry.lastActiveAt));
  const showNoFriends =
    !isDialogFriendsActivityLoading && !isFriendsActivityLoading && modalFriendsTotal === 0;
  const showNoActivity =
    !isDialogFriendsActivityLoading &&
    !isFriendsActivityLoading &&
    modalFriendsTotal > 0 &&
    !modalHasRecordedActivity;

  return (
    <>
      <DashboardSurface className="flex min-h-0 flex-1 flex-col justify-between">
        <div className={cn("flex items-start justify-between gap-3", HEADING_MB)}>
          <div className="min-w-0">
            <h2
              className={cn(
                "[font-family:var(--font-heading)] font-semibold tracking-tight text-text-primary",
                HEADING_TEXT,
              )}
            >
              Активность друзей
            </h2>
            {/* <p className="mt-1 px-1 text-[11px] text-text-muted narrow:text-[10px]">
              {summarySubtitle}
            </p> */}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 rounded-full px-4 text-xs"
            onClick={() => setIsDialogOpen(true)}
          >
            Открыть
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>

        <div>
          {isFriendsActivityLoading && summaryFriendsTotal === 0 ? (
            <Skeleton className="h-[84px] rounded-[1.2rem] border-0" />
          ) : (
            <DashboardInfoTile
              label="Последний сигнал"
              value={
                latestActiveEntry
                  ? `${latestActiveEntry.name} · ${formatFriendLastActive(latestActiveEntry.lastActiveAt)}`
                  : summaryFriendsTotal > 0
                    ? "Пока без недавней активности"
                    : "Нет друзей"
              }
              className="border-status-learning/20 bg-status-learning-soft/45"
            />
          )}
        </div>
      </DashboardSurface>

      <DashboardFullscreenDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Активность друзей"
      >
        <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-4 py-4 sm:px-5 lg:px-6">
          <div className="min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-border-subtle bg-bg-overlay p-3 shadow-[var(--shadow-floating)] sm:p-4">
            {isDialogFriendsActivityLoading && modalEntries.length === 0 ? (
              <div className={cn("h-full overflow-hidden", ROW_GAP)}>
                {Array.from({ length: 5 }, (_, index) => (
                  <DashboardFriendsActivityRowSkeleton
                    key={`friends-activity-dialog-skeleton-${index}`}
                    isLast={index === 4}
                  />
                ))}
              </div>
            ) : showNoFriends || showNoActivity ? (
              <div className="flex h-full min-h-[220px] flex-col justify-center rounded-[1.25rem] border border-dashed border-border-subtle bg-bg-surface/60 p-5 text-left">
                <p className="text-sm leading-relaxed text-text-secondary">
                  {showNoFriends
                    ? "Добавьте друзей, чтобы видеть их активность."
                    : "Пока без недавней активности."}
                </p>
              </div>
            ) : (
              <div className="h-full min-h-0 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                <div>
                  {modalEntries.map((entry, index) => (
                    <div
                      key={`${String(entry.telegramId ?? "")}-${entry.lastActiveAt ?? "idle"}-dialog`}
                      className={cn(
                        "px-0",
                        index === modalEntries.length - 1 ? "pb-0" : "pb-2",
                      )}
                    >
                      <DashboardFriendsActivityRow
                        entry={entry}
                        onOpenPlayerProfile={onOpenPlayerProfile}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardFullscreenDialog>
    </>
  );
});
