"use client";

import { useMemo } from "react";
import { useTelegram } from "../contexts/TelegramContext";
import type { Verse } from "@/app/domain/verse";
import type { bible_memory_db_internal_domain_UserDashboardStats as domain_UserDashboardStats } from "@/api/models/bible_memory_db_internal_domain_UserDashboardStats";
import {
  isVerseLearning,
  isVerseMastered,
  isVerseReview,
} from "@/shared/verseRules/index";
import { formatXp } from "@/shared/social/formatXp";
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";
import { cn } from "./ui/utils";
import {
  DashboardStreakCard,
  DashboardTrainingStatsCard,
  DashboardWelcomeSection,
} from "./dashboard/DashboardSections";

/* ── Types ─────────────────────────────────────────────────────────── */

interface DashboardProps {
  todayVerses: Array<Verse>;
  dashboardStats?: domain_UserDashboardStats | null;
  isDashboardStatsLoading?: boolean;
  currentTelegramId?: string | null;
  currentUserAvatarUrl?: string | null;
  onOpenTraining?: () => void;
  onOpenPlayerProfile?: (player: {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
  isInitializingData?: boolean;
}

type TodayVersesSummary = {
  learningVersesCount: number;
  reviewVersesCount: number;
  masteredVerses: number;
};

/* ── Helpers ────────────────────────────────────────────────────────── */

function summarizeTodayVerses(todayVerses: Verse[]): TodayVersesSummary {
  const summary = todayVerses.reduce(
    (acc, verse) => {
      if (isVerseLearning(verse)) {
        acc.learningVersesCount += 1;
      }

      if (isVerseReview(verse)) {
        acc.reviewVersesCount += 1;
      }

      if (isVerseMastered(verse)) {
        acc.masteredVerses += 1;
      }

      return acc;
    },
    {
      learningVersesCount: 0,
      reviewVersesCount: 0,
      masteredVerses: 0,
    },
  );

  return {
    learningVersesCount: summary.learningVersesCount,
    reviewVersesCount: summary.reviewVersesCount,
    masteredVerses: summary.masteredVerses,
  };
}

/* ── Dashboard ─────────────────────────────────────────────────────── */

export function Dashboard({
  todayVerses,
  dashboardStats = null,
  isDashboardStatsLoading = false,
  currentTelegramId = null,
  currentUserAvatarUrl = null,
  onOpenTraining,
  onOpenPlayerProfile,
  isInitializingData = false,
}: DashboardProps) {
  const { user } = useTelegram();
  const todaySummary = useMemo(
    () => summarizeTodayVerses(todayVerses),
    [todayVerses],
  );
  const isStatsPending = isDashboardStatsLoading && dashboardStats == null;
  const currentUserXp = useCurrentUserStatsStore((s) => s.xp);
  const currentUserDailyStreak = useCurrentUserStatsStore((s) => s.dailyStreak);

  const learningVerses =
    dashboardStats?.learningVerses ?? todaySummary.learningVersesCount;
  const reviewVerses =
    dashboardStats?.reviewVerses ?? todaySummary.reviewVersesCount;
  const masteredVersesCount =
    dashboardStats?.masteredCount ?? todaySummary.masteredVerses;
  const userXp = currentUserXp ?? dashboardStats?.xp ?? null;
  const dailyStreak =
    currentUserDailyStreak ?? dashboardStats?.dailyStreak ?? null;

  const statsCards = useMemo(
    () =>
      [
        {
          key: "xp",
          label: "XP",
          value: userXp != null ? formatXp(userXp) : null,
          isLoading: isStatsPending,
          tone: "neutral" as const,
        },
        {
          key: "learning",
          label: "Изучаю",
          value: `${Math.max(0, Math.round(learningVerses))}`,
          isLoading: isStatsPending,
          tone: "learning" as const,
        },
        {
          key: "review",
          label: "Повторяю",
          value: `${Math.max(0, Math.round(reviewVerses))}`,
          isLoading: isStatsPending,
          tone: "review" as const,
        },
        {
          key: "mastered",
          label: "Выученные",
          value: `${Math.max(0, Math.round(masteredVersesCount))}`,
          isLoading: isStatsPending,
          tone: "mastered" as const,
        },
      ] as const,
    [isStatsPending, learningVerses, masteredVersesCount, reviewVerses, userXp],
  );

  if (isInitializingData) {
    return <div className="min-h-0 flex-1" />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <section
        className={cn(
          "mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-cols-1 grid-rows-[auto_auto_auto] overflow-y-auto",
          "gap-3 px-3.5 py-3 sm:gap-4 sm:px-4 sm:py-4",
          "lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:grid-rows-[auto_auto]",
          "lg:px-5",
        )}
      >
        <div className="min-h-0 lg:col-start-1 lg:row-start-1">
          <DashboardWelcomeSection
            user={user}
            currentUserAvatarUrl={currentUserAvatarUrl}
            onOpenTraining={onOpenTraining}
            onOpenCurrentUserProfile={
              currentTelegramId && onOpenPlayerProfile
                ? () =>
                    onOpenPlayerProfile({
                      telegramId: currentTelegramId,
                      name: user?.firstName?.trim() || "Вы",
                      avatarUrl: currentUserAvatarUrl,
                    })
                : undefined
            }
          />
        </div>

        <div className="min-h-0 lg:col-start-2 lg:row-start-1">
          <DashboardStreakCard dailyStreak={dailyStreak} />
        </div>

        <div className="min-h-0 lg:col-span-2 lg:row-start-2">
          <DashboardTrainingStatsCard statsCards={statsCards} />
        </div>
      </section>
    </div>
  );
}
