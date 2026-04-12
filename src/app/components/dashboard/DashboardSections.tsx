"use client";

import React from "react";
import {
  ArrowUpRight,
  Crown,
  Medal,
  Play,
  Trophy,
  X,
} from "lucide-react";
import { Virtuoso, type ListRange, type VirtuosoHandle } from "react-virtuoso";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import type { bible_memory_db_internal_domain_UserLeaderboardEntry as domain_UserLeaderboardEntry } from "@/api/models/bible_memory_db_internal_domain_UserLeaderboardEntry";
import type { bible_memory_db_internal_domain_UserLeaderboardResponse as domain_UserLeaderboardResponse } from "@/api/models/bible_memory_db_internal_domain_UserLeaderboardResponse";
import {
  type DashboardCompactFriendActivityEntry,
  type DashboardCompactFriendsActivityResponse,
  FRIENDS_ACTIVITY_WINDOW_SIZE,
  fetchDashboardFriendsActivity,
} from "../../../api/services/friendsActivity";
import { LEADERBOARD_WINDOW_SIZE } from "../../../api/services/leaderboard";
import { formatXp } from "@/shared/social/formatXp";
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";
import { AppSurface } from "../ui/AppSurface";
import {
  AVATAR_SIZE,
  GRID_GAP,
  HEADING_MB,
  HEADING_TEXT,
  HERO_TEXT,
  ROW_GAP,
  SHOW_ME_BTN,
  STAT_LABEL,
  STAT_VALUE,
} from "../ui/responsiveTokens";
import { cn } from "../ui/utils";

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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function pluralizeDays(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return "день";
  if (
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 10 || count % 100 >= 20)
  ) {
    return "дня";
  }
  return "дней";
}

function pluralizeFriends(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return "друг";
  if (
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 10 || count % 100 >= 20)
  ) {
    return "друга";
  }
  return "друзей";
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

function leaderboardEntryDisplayName(
  entry: domain_UserLeaderboardEntry,
): string {
  const n = entry.name?.trim();
  if (n) return n;
  const nick = entry.nickname?.trim();
  if (nick) return nick.startsWith("@") ? nick : `@${nick}`;
  return entry.telegramId ?? "Игрок";
}

function leaderboardEntryXp(entry: domain_UserLeaderboardEntry): number {
  return Math.max(0, Math.round(entry.xp ?? entry.score ?? 0));
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
}: React.ComponentProps<typeof AppSurface>) {
  return (
    <AppSurface
      className={cn(
        "rounded-[1.8rem] p-4 narrow:px-3.5 narrow:py-3.5 sm:rounded-[1.95rem] sm:p-5 lg:p-5",
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
        "rounded-[1.35rem] border border-border-subtle bg-bg-elevated/70 px-3.5 py-3 shadow-[var(--shadow-soft)] sm:rounded-[1.45rem] sm:px-4 sm:py-3.5",
        className,
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
        {label}
      </div>
      <div className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-text-primary sm:text-base">
        {value}
      </div>
    </div>
  );
}

function DashboardFullscreenSafeHeader() {
  const { contentSafeAreaInset } = useTelegramSafeArea();

  return (
    <div
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
      <DialogContent
        hideOverlay
        className="!flex !flex-col inset-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-bg-surface p-0 sm:inset-0 sm:top-0 sm:left-0 sm:h-[100dvh] sm:max-h-none sm:w-screen sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-none sm:border-0 sm:p-0"
      >
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
                    autoFocus
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
  onOpenCurrentUserProfile?: () => void;
  onOpenTraining?: () => void;
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
        "h-12 w-12 narrow:h-10 narrow:w-10 sm:h-12 sm:w-12",
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

function WelcomeHeading({ firstName }: { firstName: string }) {
  return (
    <h1
      className={cn(
        "[font-family:var(--font-heading)] font-semibold tracking-tight text-brand-primary",
        HERO_TEXT,
        "text-[clamp(1.55rem,5vw,2rem)] narrow:text-[1.5rem]",
      )}
    >
      {`Привет, ${firstName}`}
    </h1>
  );
}

function WelcomeSubtitle({ hasUser }: { hasUser: boolean }) {
  return (
    <p className="max-w-[28rem] text-sm leading-relaxed text-text-secondary sm:text-[15px]">
      {hasUser
        ? "Продолжайте с того места, где остановились, и держите стихи в памяти."
        : "Откройте тренировку и продолжайте учить стихи в своём ритме."}
    </p>
  );
}

export const DashboardWelcomeSection = React.memo(
  function DashboardWelcomeSection({
    user,
    currentUserAvatarUrl,
    onOpenCurrentUserProfile,
    onOpenTraining,
  }: DashboardWelcomeSectionProps) {
    return (
      <DashboardSurface className="shrink-0 rounded-[1.9rem] sm:rounded-[2rem]">
        <div className="flex h-full flex-col gap-4 sm:gap-5">
          {user ? (
            onOpenCurrentUserProfile ? (
              <button
                type="button"
                onClick={onOpenCurrentUserProfile}
                className="flex items-center gap-3 text-left transition-[opacity,transform] hover:opacity-95 hover:translate-x-[1px] sm:gap-4"
                aria-label={`Открыть профиль ${user.firstName}`}
              >
                <WelcomeAvatar
                  currentUserAvatarUrl={currentUserAvatarUrl}
                  firstName={user.firstName}
                />
                <div className="min-w-0">
                  <WelcomeHeading firstName={user.firstName} />
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4">
                <WelcomeAvatar
                  currentUserAvatarUrl={currentUserAvatarUrl}
                  firstName={user.firstName}
                />
                <div className="min-w-0">
                  <WelcomeHeading firstName={user.firstName} />
                </div>
              </div>
            )
          ) : (
            <h1
              className={cn(
                "[font-family:var(--font-heading)] font-semibold tracking-tight text-brand-primary",
                HERO_TEXT,
                "text-[clamp(1.55rem,5vw,2rem)] narrow:text-[1.5rem]",
              )}
            >
              Главная
            </h1>
          )}

          <WelcomeSubtitle hasUser={Boolean(user)} />

          {onOpenTraining ? (
            <Button
              type="button"
              onClick={onOpenTraining}
              className="h-14 w-full rounded-[1.25rem] px-5 text-[15px] font-semibold shadow-[var(--shadow-soft)] sm:w-fit sm:min-w-[13rem] sm:px-6"
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Тренироваться
            </Button>
          ) : null}
        </div>
      </DashboardSurface>
    );
  },
);

/* ── Training Stats Card ──────────────────────────────────────────── */

type DashboardTrainingStatsCardProps = {
  statsCards: ReadonlyArray<StatsCardItem>;
};

export const DashboardTrainingStatsCard = React.memo(
  function DashboardTrainingStatsCard({
    statsCards,
  }: DashboardTrainingStatsCardProps) {
    return (
      <DashboardSurface className="shrink-0">
        <h3
          className={cn(
            "[font-family:var(--font-heading)] font-semibold tracking-tight text-text-primary",
            HEADING_TEXT,
            HEADING_MB,
            "text-[1.08rem] narrow:text-base sm:text-xl",
          )}
        >
          Статистика
        </h3>

        <div className={cn("grid grid-cols-2 sm:grid-cols-4", GRID_GAP)}>
          {statsCards.map((item) => {
            const tone = STAT_TONE_STYLES[item.tone ?? "neutral"];
            return (
              <div
                key={item.key}
                className={cn(
                  "flex min-h-[5.25rem] flex-col justify-center rounded-[1.35rem] border px-3 py-3.5 text-start shadow-[var(--shadow-soft)] sm:min-h-[6.8rem] sm:rounded-[1.45rem] sm:px-3.5 sm:py-4",
                  tone.panelClassName,
                )}
              >
                <div
                  className={cn(
                    "line-clamp-1 font-medium uppercase tracking-[0.15em]",
                    STAT_LABEL,
                    tone.labelClassName,
                  )}
                >
                  {item.label}
                </div>
                <div
                  className={cn(
                    "mt-1.5 font-semibold leading-tight tracking-tight",
                    STAT_VALUE,
                    tone.valueClassName,
                  )}
                >
                  {item.isLoading ? (
                    <Skeleton className="mx-auto h-10 w-16 rounded-xl border-0 sm:w-20" />
                  ) : item.value != null ? (
                    item.value
                  ) : (
                    <span className="text-[15px] font-medium text-text-muted">
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
  },
);

/* ── Streak Card ─────────────────────────────────────────────────── */

type DashboardStreakCardProps = {
  dailyStreak?: number | null;
};

export const DashboardStreakCard = React.memo(function DashboardStreakCard({
  dailyStreak,
}: DashboardStreakCardProps) {
  const streakDays = Math.max(0, Math.round(dailyStreak ?? 0));
  const streakCopy =
    streakDays > 0
      ? "Хороший ритм. Ещё один день закрепит привычку."
      : "Начните сегодня и соберите свою первую серию.";

  return (
    <DashboardSurface className="shrink-0 rounded-[1.9rem] sm:rounded-[2rem]">
      <div className="flex h-full flex-col justify-between gap-3 sm:gap-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Серия подряд
        </div>

        <div>
          <div className="text-[clamp(1.85rem,6vw,2.7rem)] font-semibold leading-none tracking-tight text-brand-primary">
            {streakDays} {pluralizeDays(streakDays)}
          </div>
          <p className="mt-2.5 max-w-[22rem] text-sm leading-relaxed text-text-secondary sm:text-[15px]">
            {streakCopy}
          </p>
        </div>
      </div>
    </DashboardSurface>
  );
});
DashboardStreakCard.displayName = "DashboardStreakCard";

/* ── Leaderboard Row ──────────────────────────────────────────────── */

type DashboardLeaderboardRowProps = {
  entry: domain_UserLeaderboardEntry;
  currentUserTelegramId: string | null;
  currentUserXp: number | null;
  onOpenPlayerProfile?: (player: DashboardPlayerPreview) => void;
  compact?: boolean;
  className?: string;
};

function DashboardLeaderboardRow({
  entry,
  currentUserTelegramId,
  currentUserXp,
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
        compact
          ? "rounded-[1.3rem] gap-3 px-3.5 py-2.5 narrow:gap-2.5 narrow:px-3 narrow:py-2.25"
          : "rounded-[1.35rem] px-3.5 py-3 sm:px-4",
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
          "h-8 w-8 text-xs",
          rankMarker.className,
        )}
        aria-hidden="true"
      >
        {RankIcon ? <RankIcon className="h-4 w-4" /> : <span>#{rank}</span>}
      </div>

      {/* Avatar */}
      <Avatar
        className={cn(
          "shrink-0 border border-border-subtle bg-bg-surface",
          "h-9 w-9",
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
            "truncate text-sm font-medium",
            isCurrentUser ? "text-brand-primary" : "text-text-primary",
          )}
        >
          {displayName}
        </div>
      </div>

      {/* XP */}
      <div className={cn("shrink-0 text-sm font-semibold text-text-primary")}>
        {formatXp(displayXp)}
      </div>
    </button>
  );
}

/* ── Friends Avatar Stack (overlapping avatars preview) ──────────── */

function FriendsAvatarStack({
  entries,
  onOpenPlayerProfile,
}: {
  entries: DashboardCompactFriendActivityEntry[];
  onOpenPlayerProfile?: (player: DashboardPlayerPreview) => void;
}) {
  const MAX_SHOWN = 4;
  const visibleEntries = entries.slice(0, MAX_SHOWN);
  const extraCount = Math.max(0, entries.length - MAX_SHOWN);

  if (visibleEntries.length === 0) return null;

  return (
    <div className="flex items-center">
      {visibleEntries.map((entry, index) => {
        const name = entry.name?.trim() || "Друг";
        const avatar = (
          <Avatar className="h-10 w-10 shrink-0 border-2 border-bg-overlay shadow-[var(--shadow-soft)] narrow:h-9 narrow:w-9">
            {entry.avatarUrl ? (
              <AvatarImage src={entry.avatarUrl} alt={name} />
            ) : null}
            <AvatarFallback className="bg-bg-elevated text-xs font-medium text-text-secondary">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        );
        return (
          <div
            key={String(entry.telegramId ?? index)}
            style={{
              marginLeft: index === 0 ? 0 : -10,
              zIndex: MAX_SHOWN - index,
            }}
          >
            {onOpenPlayerProfile ? (
              <button
                type="button"
                onClick={() =>
                  onOpenPlayerProfile({
                    telegramId: String(entry.telegramId ?? ""),
                    name,
                    avatarUrl: entry.avatarUrl?.trim()
                      ? entry.avatarUrl.trim()
                      : null,
                  })
                }
                className="block shrink-0 rounded-full"
                aria-label={`Открыть профиль ${name}`}
              >
                {avatar}
              </button>
            ) : (
              avatar
            )}
          </div>
        );
      })}
      {extraCount > 0 && (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-bg-overlay bg-bg-elevated text-[11px] font-semibold text-text-muted shadow-[var(--shadow-soft)] narrow:h-9 narrow:w-9"
          style={{ marginLeft: -10, zIndex: 0 }}
        >
          +{extraCount}
        </div>
      )}
    </div>
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

  return Array.from(
    { length: totalParticipants },
    (_, index) => previous[index] ?? null,
  );
}

function mergeLeaderboardWindow(
  previous: Array<domain_UserLeaderboardEntry | null>,
  leaderboard: domain_UserLeaderboardResponse,
) {
  const totalParticipants = Math.max(
    0,
    leaderboard.totalParticipants ?? previous.length,
  );
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

function clampLeaderboardOffset(
  offset: number,
  totalParticipants: number,
  windowSize: number,
) {
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

function getLeaderboardWindowCacheKey(offset: number, limit: number) {
  return `${Math.max(0, offset)}:${Math.max(1, limit)}`;
}

const LeaderboardVirtuosoList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(function LeaderboardVirtuosoList({ className, ...props }, ref) {
  return <div ref={ref} className={cn("pb-2", className)} {...props} />;
});

function DashboardLeaderboardRowSkeleton({
  isLast = false,
}: {
  isLast?: boolean;
}) {
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

export const DashboardLeaderboardCard = React.memo(
  function DashboardLeaderboardCard({
    leaderboard = null,
    isLeaderboardLoading = false,
    onOpenTraining,
    onOpenPlayerProfile,
    onLeaderboardWindowRequest,
  }: DashboardLeaderboardCardProps) {
    const currentUserTelegramId = useCurrentUserStatsStore((s) => s.telegramId);
    const currentUserXp = useCurrentUserStatsStore((s) => s.xp);
    const virtuosoRef = React.useRef<VirtuosoHandle | null>(null);
    const loadedOffsetsRef = React.useRef<Set<string>>(new Set());
    const pendingOffsetsRef = React.useRef<Set<string>>(new Set());
    const [cachedEntries, setCachedEntries] = React.useState<
      Array<domain_UserLeaderboardEntry | null>
    >(() => (leaderboard ? mergeLeaderboardWindow([], leaderboard) : []));
    const [totalParticipants, setTotalParticipants] = React.useState(
      Math.max(0, leaderboard?.totalParticipants ?? 0),
    );
    const [currentUserSnapshot, setCurrentUserSnapshot] =
      React.useState<LeaderboardCurrentUser | null>(
        leaderboard?.currentUser ?? null,
      );
    const [isShowMePending, setIsShowMePending] = React.useState(false);
    const [isDialogOpen, setIsDialogOpenState] = React.useState(false);
    const setIsDialogOpen = React.useCallback((open: boolean) => {
      setIsDialogOpenState(open);
    }, []);
    const windowSize = Math.max(1, LEADERBOARD_WINDOW_SIZE);

    const mergeWindowIntoState = React.useCallback(
      (nextWindow: domain_UserLeaderboardResponse) => {
        const resolvedTotalParticipants = Math.max(
          0,
          nextWindow.totalParticipants ?? 0,
        );
        const resolvedOffset = Math.max(0, nextWindow.offset ?? 0);
        const resolvedLimit = Math.max(
          1,
          nextWindow.limit ?? nextWindow.items?.length ?? 1,
        );

        loadedOffsetsRef.current.add(
          getLeaderboardWindowCacheKey(resolvedOffset, resolvedLimit),
        );
        setTotalParticipants(resolvedTotalParticipants);
        setCurrentUserSnapshot(nextWindow.currentUser ?? null);
        setCachedEntries((previous) =>
          mergeLeaderboardWindow(previous, nextWindow),
        );
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
        const requestKey = getLeaderboardWindowCacheKey(
          resolvedOffset,
          windowSize,
        );

        if (
          loadedOffsetsRef.current.has(requestKey) ||
          pendingOffsetsRef.current.has(requestKey)
        ) {
          return null;
        }

        pendingOffsetsRef.current.add(requestKey);

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
          pendingOffsetsRef.current.delete(requestKey);
        }
      },
      [
        mergeWindowIntoState,
        onLeaderboardWindowRequest,
        totalParticipants,
        windowSize,
      ],
    );

    React.useEffect(() => {
      if (!isDialogOpen || totalParticipants <= 0) return;
      void requestLeaderboardWindow(0);
    }, [isDialogOpen, requestLeaderboardWindow, totalParticipants]);

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

        for (
          let offset = firstOffset;
          offset <= lastOffset;
          offset += windowSize
        ) {
          void requestLeaderboardWindow(offset);
        }

        const nextOffset = lastOffset + windowSize;
        if (nextOffset < totalParticipants) {
          void requestLeaderboardWindow(nextOffset);
        }
      },
      [
        onLeaderboardWindowRequest,
        requestLeaderboardWindow,
        totalParticipants,
        windowSize,
      ],
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
    }, [
      currentUserSnapshot?.rank,
      requestLeaderboardWindow,
      totalParticipants,
      windowSize,
    ]);

    const sharedRowProps = {
      currentUserTelegramId,
      currentUserXp,
      onOpenPlayerProfile,
    };

    const canShowMe = Boolean(currentUserSnapshot?.rank);
    const currentUserRank =
      typeof currentUserSnapshot?.rank === "number" &&
      Number.isFinite(currentUserSnapshot.rank) &&
      currentUserSnapshot.rank > 0
        ? Math.max(1, Math.round(currentUserSnapshot.rank))
        : null;
    const previewParticipantsTotal = currentUserRank
      ? Math.max(totalParticipants, currentUserRank)
      : Math.max(0, totalParticipants);
    const previewTopPercent =
      currentUserRank && previewParticipantsTotal > 0
        ? Math.max(
            1,
            Math.ceil((currentUserRank / previewParticipantsTotal) * 100),
          )
        : null;
    const previewRankMarker = currentUserRank
      ? getRankMarker(currentUserRank)
      : null;
    const PreviewRankIcon = previewRankMarker?.icon ?? null;

    const renderLeaderboardRow = React.useCallback(
      (index: number) => {
        const entry = cachedEntries[index];

        if (!entry) {
          return (
            <DashboardLeaderboardRowSkeleton
              isLast={index === totalParticipants - 1}
            />
          );
        }

        return (
          <div
            className={cn(
              "px-0",
              index === totalParticipants - 1 ? "pb-0" : "pb-2",
            )}
          >
            <DashboardLeaderboardRow
              key={`${entry.rank ?? 0}-${String(entry.telegramId ?? "") || leaderboardEntryDisplayName(entry)}`}
              entry={entry}
              {...sharedRowProps}
            />
          </div>
        );
      },
      [cachedEntries, sharedRowProps, totalParticipants],
    );

    return (
      <>
        <DashboardSurface className="self-start flex min-h-[10rem] w-full flex-col gap-3 p-4 sm:min-h-[10.5rem] sm:p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h2
                className={cn(
                  "[font-family:var(--font-heading)] font-semibold tracking-tight text-text-primary",
                  HEADING_TEXT,
                )}
              >
                Таблица лидеров
              </h2>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 rounded-full p-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
              aria-label="Открыть таблицу лидеров"
            >
              <ArrowUpRight className="h-[1.05rem] w-[1.05rem]" />
            </Button>
          </div>

          <div className="flex flex-1 items-end border-t border-border-subtle/80 pt-3.5 sm:pt-4">
            {isLeaderboardLoading && currentUserRank == null ? (
              <div className="flex w-full items-end justify-between gap-3">
                <div className="min-w-0 space-y-2.5">
                  <Skeleton className="h-3 w-24 rounded-full border-0" />
                  <Skeleton className="h-11 w-24 rounded-[1rem] border-0" />
                  <Skeleton className="h-4 w-28 rounded-full border-0" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full border-0" />
              </div>
            ) : currentUserRank ? (
              <div className="flex w-full items-end justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {PreviewRankIcon ? (
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                          previewRankMarker?.className,
                        )}
                        aria-hidden="true"
                      >
                        <PreviewRankIcon className="h-3.5 w-3.5" />
                      </div>
                    ) : null}
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                      Ваше место
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="[font-family:var(--font-heading)] text-[clamp(2.15rem,9vw,3rem)] font-semibold leading-none tracking-tight text-text-primary">
                      #{currentUserRank}
                    </div>
                    <div className="mt-1.5 text-sm text-text-muted">
                      из {previewParticipantsTotal} участников
                    </div>
                  </div>
                </div>

                {previewTopPercent ? (
                  <div className="shrink-0 rounded-full border border-brand-primary/15 bg-status-mastered-soft px-3 py-1.5 text-xs font-semibold text-brand-primary">
                    Топ {previewTopPercent}%
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex w-full flex-col justify-center">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
                  Ваше место
                </div>
                <div className="mt-2 text-lg font-semibold leading-tight text-text-primary">
                  Пока вне таблицы
                </div>
                <div className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {previewParticipantsTotal > 0
                    ? `Сейчас в рейтинге ${previewParticipantsTotal} участников.`
                    : "Рейтинг появится после первых результатов."}
                </div>
                {onOpenTraining ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenTraining}
                    className="mt-3 h-9 w-fit rounded-full px-4 text-xs"
                  >
                    Открыть тренировку
                  </Button>
                ) : null}
              </div>
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
                  defaultItemHeight={80}
                  increaseViewportBy={LEADERBOARD_OVERSCAN}
                  overscan={LEADERBOARD_OVERSCAN}
                  components={{ List: LeaderboardVirtuosoList }}
                  computeItemKey={(index) => {
                    const entry = cachedEntries[index];
                    return entry
                      ? `${entry.rank ?? index + 1}-${String(entry.telegramId ?? "")}`
                      : `leaderboard-skeleton-${index}`;
                  }}
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
                      Рейтинг появится, когда у вас и других участников появится
                      прогресс по стихам.
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
  },
);

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
        {entry.avatarUrl ? (
          <AvatarImage src={entry.avatarUrl} alt={displayName} />
        ) : null}
        <AvatarFallback className="bg-bg-subtle text-xs text-text-secondary">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">
          {displayName}
        </div>
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

function DashboardFriendsActivityRowSkeleton({
  isLast = false,
}: {
  isLast?: boolean;
}) {
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

const FRIENDS_ACTIVITY_OVERSCAN = 160;

function createFriendsActivityCache(
  totalFriends: number,
  previous: Array<DashboardCompactFriendActivityEntry | null> = [],
) {
  if (totalFriends <= 0) {
    return [] as Array<DashboardCompactFriendActivityEntry | null>;
  }

  return Array.from(
    { length: totalFriends },
    (_, index) => previous[index] ?? null,
  );
}

function mergeFriendsActivityWindow(
  previous: Array<DashboardCompactFriendActivityEntry | null>,
  activity: DashboardCompactFriendsActivityResponse,
) {
  const totalFriends = Math.max(0, activity.friendsTotal ?? previous.length);
  const next = createFriendsActivityCache(totalFriends, previous);
  const offset = Math.max(0, activity.offset ?? 0);

  (activity.entries ?? []).forEach((entry, index) => {
    const targetIndex = offset + index;
    if (targetIndex >= 0 && targetIndex < next.length) {
      next[targetIndex] = entry;
    }
  });

  return next;
}

export const DashboardFriendsActivityCard = React.memo(
  function DashboardFriendsActivityCard({
    friendsActivity = null,
    isFriendsActivityLoading = false,
    currentTelegramId = null,
    onOpenPlayerProfile,
  }: DashboardFriendsActivityCardProps) {
    const [isDialogOpen, setIsDialogOpenState] = React.useState(false);
    const setIsDialogOpen = React.useCallback((open: boolean) => {
      setIsDialogOpenState(open);
    }, []);
    const dialogVirtuosoRef = React.useRef<VirtuosoHandle | null>(null);
    const loadedOffsetsRef = React.useRef<Set<number>>(new Set());
    const pendingOffsetsRef = React.useRef<Set<number>>(new Set());
    const [pendingDialogRequestCount, setPendingDialogRequestCount] =
      React.useState(0);
    const [cachedDialogEntries, setCachedDialogEntries] = React.useState<
      Array<DashboardCompactFriendActivityEntry | null>
    >(() =>
      friendsActivity ? mergeFriendsActivityWindow([], friendsActivity) : [],
    );
    const [dialogFriendsTotal, setDialogFriendsTotal] = React.useState(
      Math.max(0, friendsActivity?.friendsTotal ?? 0),
    );
    const friendsWindowSize = Math.max(1, FRIENDS_ACTIVITY_WINDOW_SIZE);
    const isDialogFriendsActivityLoading = pendingDialogRequestCount > 0;

    const mergeDialogWindowIntoState = React.useCallback(
      (
        nextWindow: DashboardCompactFriendsActivityResponse,
        options?: { markLoaded?: boolean },
      ) => {
        const resolvedOffset = Math.max(0, nextWindow.offset ?? 0);
        if (options?.markLoaded !== false) {
          loadedOffsetsRef.current.add(resolvedOffset);
        }
        setDialogFriendsTotal(Math.max(0, nextWindow.friendsTotal ?? 0));
        setCachedDialogEntries((previous) =>
          mergeFriendsActivityWindow(previous, nextWindow),
        );
      },
      [],
    );

    React.useEffect(() => {
      if (!friendsActivity) {
        loadedOffsetsRef.current.clear();
        pendingOffsetsRef.current.clear();
        setPendingDialogRequestCount(0);
        setCachedDialogEntries([]);
        setDialogFriendsTotal(0);
        return;
      }

      mergeDialogWindowIntoState(friendsActivity, { markLoaded: false });
    }, [friendsActivity, mergeDialogWindowIntoState]);

    const requestFriendsActivityWindow = React.useCallback(
      async (requestedOffset: number) => {
        if (!currentTelegramId) return null;

        const resolvedOffset = clampLeaderboardOffset(
          requestedOffset,
          dialogFriendsTotal,
          friendsWindowSize,
        );

        if (
          loadedOffsetsRef.current.has(resolvedOffset) ||
          pendingOffsetsRef.current.has(resolvedOffset)
        ) {
          return null;
        }

        pendingOffsetsRef.current.add(resolvedOffset);
        setPendingDialogRequestCount((current) => current + 1);

        try {
          const nextWindow = await fetchDashboardFriendsActivity({
            telegramId: currentTelegramId,
            limit: friendsWindowSize,
            offset: resolvedOffset,
          });
          mergeDialogWindowIntoState(nextWindow);
          return nextWindow;
        } catch (error) {
          console.error("Не удалось загрузить окно активности друзей:", error);
          return null;
        } finally {
          pendingOffsetsRef.current.delete(resolvedOffset);
          setPendingDialogRequestCount((current) => Math.max(0, current - 1));
        }
      },
      [
        currentTelegramId,
        dialogFriendsTotal,
        friendsWindowSize,
        mergeDialogWindowIntoState,
      ],
    );

    React.useEffect(() => {
      if (!isDialogOpen || !currentTelegramId) return;
      void requestFriendsActivityWindow(0);
    }, [currentTelegramId, isDialogOpen, requestFriendsActivityWindow]);

    const handleFriendsActivityRangeChanged = React.useCallback(
      ({ startIndex, endIndex }: ListRange) => {
        if (dialogFriendsTotal <= 0) return;

        const clampedStartIndex = Math.max(0, startIndex);
        const clampedEndIndex = Math.max(
          clampedStartIndex,
          Math.min(dialogFriendsTotal - 1, endIndex),
        );

        const firstOffset = getLeaderboardWindowOffsetForIndex(
          clampedStartIndex,
          dialogFriendsTotal,
          friendsWindowSize,
        );
        const lastOffset = getLeaderboardWindowOffsetForIndex(
          clampedEndIndex,
          dialogFriendsTotal,
          friendsWindowSize,
        );

        for (
          let offset = firstOffset;
          offset <= lastOffset;
          offset += friendsWindowSize
        ) {
          void requestFriendsActivityWindow(offset);
        }

        const nextOffset = lastOffset + friendsWindowSize;
        if (nextOffset < dialogFriendsTotal) {
          void requestFriendsActivityWindow(nextOffset);
        }
      },
      [dialogFriendsTotal, friendsWindowSize, requestFriendsActivityWindow],
    );

    const summaryFriendsTotal = Math.max(0, friendsActivity?.friendsTotal ?? 0);
    const summaryEntries = friendsActivity?.entries ?? [];
    const modalEntries = cachedDialogEntries;
    const modalHasRecordedActivity = modalEntries.some(
      (entry) => entry != null && Boolean(entry.lastActiveAt),
    );
    const showNoFriends =
      !isDialogFriendsActivityLoading &&
      !isFriendsActivityLoading &&
      dialogFriendsTotal === 0;
    const showNoActivity =
      !isDialogFriendsActivityLoading &&
      !isFriendsActivityLoading &&
      dialogFriendsTotal > 0 &&
      !modalHasRecordedActivity;

    return (
      <>
        <DashboardSurface className="self-start flex min-h-[6.5rem] w-full flex-col gap-3 p-4 sm:min-h-[9.5rem] sm:p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h2
                className={cn(
                  "[font-family:var(--font-heading)] font-semibold tracking-tight text-text-primary",
                  HEADING_TEXT,
                )}
              >
                Активность друзей
              </h2>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 rounded-full p-0"
              onClick={(e) => {
                e.stopPropagation();
                (document.activeElement as HTMLElement)?.blur();
                setIsDialogOpen(true);
              }}
              aria-label="Открыть активность друзей"
            >
              <ArrowUpRight className="h-[1.05rem] w-[1.05rem]" />
            </Button>
          </div>

          <div className="flex min-h-fit flex-1 items-center overflow-hidden">
            {isFriendsActivityLoading && summaryFriendsTotal === 0 ? (
              <Skeleton className="h-16 w-full rounded-[1.2rem] border-0" />
            ) : summaryEntries.length > 0 ? (
              <div className="flex w-full items-center justify-between gap-3.5 rounded-[1.25rem] shadow-[var(--shadow-soft)]">
                <FriendsAvatarStack
                  entries={summaryEntries}
                  onOpenPlayerProfile={onOpenPlayerProfile}
                />
                <div className="min-w-0 text-right">
                  <div className="text-base font-semibold text-text-primary narrow:text-[14px] sm:text-lg">
                    {summaryFriendsTotal}{" "}
                    {pluralizeFriends(summaryFriendsTotal)}
                  </div>
                </div>
              </div>
            ) : (
              <DashboardInfoTile
                label="Последний сигнал"
                value={
                  summaryFriendsTotal > 0 ? "Пока без активности" : "Нет друзей"
                }
                className="border-status-learning/20 bg-status-learning-soft/45 flex flex-col justify-center flex-1"
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
                <Virtuoso
                  ref={dialogVirtuosoRef}
                  className="h-full min-h-0 [scrollbar-gutter:stable]"
                  totalCount={dialogFriendsTotal}
                  defaultItemHeight={62}
                  increaseViewportBy={FRIENDS_ACTIVITY_OVERSCAN}
                  overscan={FRIENDS_ACTIVITY_OVERSCAN}
                  components={{ List: LeaderboardVirtuosoList }}
                  computeItemKey={(index) => {
                    const entry = modalEntries[index];
                    return entry
                      ? `${String(entry.telegramId ?? "")}-${entry.lastActiveAt ?? "idle"}-dialog`
                      : `friends-activity-skeleton-${index}`;
                  }}
                  rangeChanged={handleFriendsActivityRangeChanged}
                  itemContent={(index) => {
                    const entry = modalEntries[index];

                    if (!entry) {
                      return (
                        <DashboardFriendsActivityRowSkeleton
                          isLast={index === dialogFriendsTotal - 1}
                        />
                      );
                    }

                    return (
                      <div
                        className={cn(
                          "px-0",
                          index === dialogFriendsTotal - 1 ? "pb-0" : "pb-2",
                        )}
                      >
                        <DashboardFriendsActivityRow
                          entry={entry}
                          onOpenPlayerProfile={onOpenPlayerProfile}
                        />
                      </div>
                    );
                  }}
                />
              )}
            </div>
          </div>
        </DashboardFullscreenDialog>
      </>
    );
  },
);
