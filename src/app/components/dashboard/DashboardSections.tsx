"use client";

import React from "react";
import {
  Crown,
  Dumbbell,
  Medal,
  Trophy,
} from "lucide-react";
import { Virtuoso, type ListRange, type VirtuosoHandle } from "react-virtuoso";
import { Card } from "../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import type { domain_UserLeaderboardEntry } from "@/api/models/domain_UserLeaderboardEntry";
import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import { DASHBOARD_LEADERBOARD_WINDOW_SIZE } from "@/api/services/leaderboard";
import { formatXp } from "@/shared/social/formatXp";
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
  "p-3 narrow:p-3 compact:p-2.75 compact-md:p-2.5 compact-sm:p-2.5 compact-xs:p-2.25 sm:p-3.5 lg:p-4";

/** Vertical gap between elements inside a section */
const SECTION_GAP =
  "gap-3 narrow:gap-2.5 compact:gap-2.5 compact-sm:gap-2 compact-xs:gap-2";

/** Gap inside 2×2 stats grid */
const GRID_GAP =
  "gap-2.5 narrow:gap-2 compact:gap-2 compact-sm:gap-2 compact-xs:gap-2 sm:gap-3";

/** Section heading (e.g. "Моя статистика", "Таблица лидеров") */
const HEADING_TEXT =
  "px-1 text-[15px] narrow:text-[14px] compact:text-[14px] compact-sm:text-[13px] compact-xs:text-[13px] sm:text-base";

/** Bottom margin below a section heading */
const HEADING_MB =
  "px-1 mb-2 narrow:mb-2 compact:mb-1.5 compact-sm:mb-1.5 compact-xs:mb-1.5 sm:mb-2.5";

/** Large hero heading */
const HERO_TEXT =
  "px-1 text-[clamp(1.6rem,5vw,2.25rem)] narrow:text-[clamp(1.42rem,6.4vw,1.86rem)] compact:text-[clamp(1.48rem,4.8vw,1.95rem)] compact-sm:text-[clamp(1.32rem,4.3vw,1.72rem)] compact-xs:text-[clamp(1.26rem,4.1vw,1.58rem)]";

/** Hero subtitle text */
const HERO_SUBTITLE =
  "px-1 text-[12px] leading-5 narrow:text-[11px] narrow:leading-[1.125rem] compact:text-[11px] compact:leading-[1.125rem] compact-md:line-clamp-1 compact-sm:mt-1 compact-sm:text-[10px] compact-sm:leading-4 compact-xs:mt-1 compact-xs:text-[10px] compact-xs:leading-4 sm:text-[13px] sm:leading-5";

/** User avatar in the welcome section */
const AVATAR_SIZE =
  "h-10 w-10 narrow:h-9 narrow:w-9 compact-sm:h-9 compact-sm:w-9 compact-xs:h-9 compact-xs:w-9 sm:h-11 sm:w-11";

/** CTA button sizing */
const CTA_BUTTON =
  "h-10 w-full rounded-[1.1rem] px-4 narrow:h-10 narrow:px-4 compact:h-9 compact-sm:h-9 compact-sm:px-3.5 compact-sm:text-sm compact-xs:h-[2.125rem] compact-xs:px-3 compact-xs:text-sm sm:w-auto sm:min-w-[168px]";

/** Individual stat card padding */
const STAT_PAD =
  "px-3 py-2.75 narrow:px-2.75 narrow:py-2.25 compact:px-2.75 compact:py-2.25 compact-sm:rounded-[0.95rem] compact-sm:px-2.5 compact-sm:py-2 compact-xs:px-2.5 compact-xs:py-2 sm:rounded-[1.25rem] sm:px-3.5 sm:py-3";

/** Stat label text */
const STAT_LABEL =
  "text-[10px] narrow:text-[9px] compact:text-[9px] compact-sm:text-[8px] compact-xs:text-[8px]";

/** Stat value text */
const STAT_VALUE =
  "mt-1 text-[clamp(1.18rem,4.2vw,1.72rem)] narrow:text-[clamp(1.05rem,4vw,1.38rem)] compact:text-[clamp(1.1rem,3.9vw,1.5rem)] compact-sm:text-[clamp(1rem,3.6vw,1.28rem)] compact-xs:text-[clamp(0.96rem,3.5vw,1.2rem)]";

/** Compact leaderboard row padding */
const ROW_PAD =
  "rounded-[1.05rem] px-2.75 py-1.75 narrow:gap-2.5 narrow:px-2.5 narrow:py-1.5 compact:gap-2.25 compact:px-2.5 compact:py-1.5 compact-sm:gap-2 compact-sm:rounded-[0.95rem] compact-sm:px-2.25 compact-sm:py-1.5 compact-xs:px-2.25 compact-xs:py-1.5";

/** Compact rank badge */
const RANK_BADGE =
  "h-7 w-7 text-[11px] narrow:h-6.5 narrow:w-6.5 narrow:text-[10px] compact:h-6.5 compact:w-6.5 compact:text-[10px] compact-sm:h-6.5 compact-sm:w-6.5 compact-sm:text-[9px] compact-xs:h-6.5 compact-xs:w-6.5";

/** Compact leaderboard avatar */
const ROW_AVATAR =
  "h-8 w-8 narrow:h-7 narrow:w-7 compact:h-7 compact:w-7 compact-sm:h-7 compact-sm:w-7 compact-xs:h-7 compact-xs:w-7";

/** Compact row name text */
const ROW_NAME =
  "text-[12px] narrow:text-[11px] compact:text-[11px] compact-sm:text-[10px] compact-xs:text-[10px]";

/** Compact row detail text */
const ROW_DETAIL =
  "text-[10px] narrow:text-[9px] compact:text-[9px] compact-sm:text-[8px] compact-xs:text-[8px]";

/** "Показать меня" button sizing */
const SHOW_ME_BTN =
  "h-7.5 shrink-0 rounded-full px-3 text-[10px] narrow:h-7 narrow:px-2.5 narrow:text-[9px] compact:h-7 compact:px-2.5 compact:text-[9px] compact-sm:h-6.5 compact-sm:px-2.25 compact-sm:text-[9px] compact-xs:h-6.5 compact-xs:px-2.25";

/** Spacing between leaderboard rows */
const ROW_GAP =
  "space-y-2 narrow:space-y-1.5 compact:space-y-1.5 compact-sm:space-y-1.5 compact-xs:space-y-1.5";

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
        "gap-0 min-h-0 rounded-[1.55rem] border-border-subtle bg-bg-overlay shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:rounded-[1.8rem]",
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
                  <span className="text-xs font-medium text-text-muted compact-sm:text-[11px]">Нет данных</span>
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
        className={cn(
          "rounded-[1.2rem] border border-border-subtle bg-bg-surface/80 shadow-[var(--shadow-soft)]",
          ROW_PAD,
        )}
        aria-hidden="true"
      >
        <Skeleton className="h-10 w-full rounded-[1rem] border-0 compact-sm:h-8" />
      </div>
    </div>
  );
}

type DashboardLeaderboardCardProps = {
  leaderboard?: domain_UserLeaderboardResponse | null;
  isLeaderboardLoading?: boolean;
  onOpenTraining?: () => void;
  onOpenPlayerProfile?: (player: {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
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

  const leaderboardSubtitle =
    totalParticipants > 0
      ? currentUserSnapshot?.rank
        ? `Ваше место #${currentUserSnapshot.rank} из ${totalParticipants}`
        : `${totalParticipants} участников`
      : "Рейтинг появится, когда у участников появится прогресс.";

  const canShowMe = Boolean(currentUserSnapshot?.rank);

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
            compact
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
    <DashboardSurface className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
          <p className="mt-1 px-1 text-[11px] text-text-muted narrow:text-[10px] compact:text-[10px] compact-sm:text-[9px] compact-xs:hidden">
            {leaderboardSubtitle}
          </p>
        </div>

        {canShowMe ? (
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
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[1.2rem] border border-border-subtle bg-bg-elevated/60 px-2 py-1.75 shadow-[var(--shadow-soft)] compact-sm:rounded-[0.95rem] compact-sm:px-1.75 compact-sm:py-1.5">
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
          <div className="flex h-full min-h-[180px] flex-col justify-center rounded-[1.1rem] border border-dashed border-border-subtle bg-bg-surface/60 p-4 text-left compact-sm:min-h-[160px] compact-sm:p-3">
            <div className="space-y-3 compact-sm:space-y-2">
              <p className="text-sm leading-relaxed text-text-secondary compact-sm:text-[12px] compact-sm:leading-5">
                Рейтинг появится, когда у вас и других участников появится прогресс по
                стихам.
              </p>
              {onOpenTraining ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenTraining}
                  className="h-9 w-fit rounded-full px-4 text-xs compact-sm:h-8 compact-sm:px-3"
                >
                  Открыть тренировку
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </DashboardSurface>
  );
});
