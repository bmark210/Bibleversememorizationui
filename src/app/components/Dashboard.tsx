'use client'

import { useMemo } from 'react'
import { useTelegram } from '../contexts/TelegramContext'
import type { Verse } from '@/app/domain/verse'
import type { domain_UserDashboardStats } from '@/api/models/domain_UserDashboardStats'
import type { domain_UserLeaderboardResponse } from '@/api/models/domain_UserLeaderboardResponse'
import type { DashboardCompactFriendsActivityResponse } from '@/api/services/friendsActivity'
import {
  getVerseNextAvailabilityAt,
  getVerseProgressPercent,
  isVerseLearning,
  isVerseMastered,
  isVerseReview,
} from '@/shared/verseRules'
import { formatXp } from '@/shared/social/formatXp'
import { useCurrentUserStatsStore } from '@/app/stores/currentUserStatsStore'
import { cn } from './ui/utils'
import {
  DashboardFriendsActivityCard,
  DashboardLeaderboardCard,
  DashboardTrainingStatsCard,
  DashboardWelcomeSection,
} from './dashboard/DashboardSections'

/* ── Types ─────────────────────────────────────────────────────────── */

interface DashboardProps {
  todayVerses: Array<Verse>
  dashboardStats?: domain_UserDashboardStats | null
  isDashboardStatsLoading?: boolean
  dashboardLeaderboard?: domain_UserLeaderboardResponse | null
  isDashboardLeaderboardLoading?: boolean
  dashboardFriendsActivity?: DashboardCompactFriendsActivityResponse | null
  isDashboardFriendsActivityLoading?: boolean
  currentTelegramId?: string | null
  currentUserAvatarUrl?: string | null
  onOpenTraining?: () => void
  onOpenPlayerProfile?: (player: {
    telegramId: string
    name: string
    avatarUrl: string | null
  }) => void
  onLeaderboardWindowRequest?: (query: {
    offset?: number
    limit?: number
  }) => Promise<domain_UserLeaderboardResponse | null>
  isInitializingData?: boolean
}

type TodayVersesSummary = {
  learningVersesCount: number
  reviewVersesCount: number
  dueReviewCount: number
  masteredVerses: number
  averageTrainingProgressPercent: number
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function pluralizeDays(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return 'день'
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return 'дня'
  }
  return 'дней'
}

export function toMasteryPercent(masteryLevel: number, repetitions = 0) {
  return clampPercent(getVerseProgressPercent({
    flow: null,
    masteryLevel,
    repetitions,
  }))
}

function summarizeTodayVerses(todayVerses: Verse[]): TodayVersesSummary {
  const now = Date.now()

  const summary = todayVerses.reduce(
    (acc, verse) => {
      const progress = getVerseProgressPercent(verse)

      acc.progressTotal += progress

      if (isVerseLearning(verse)) {
        acc.learningVersesCount += 1
      }

      if (isVerseReview(verse)) {
        acc.reviewVersesCount += 1

        const nextReviewAt = getVerseNextAvailabilityAt(verse)
        if (!nextReviewAt) {
          acc.dueReviewCount += 1
        } else {
          const nextReviewTime = nextReviewAt.getTime()
          if (Number.isNaN(nextReviewTime) || nextReviewTime <= now) {
            acc.dueReviewCount += 1
          }
        }
      }

      if (isVerseMastered(verse)) {
        acc.masteredVerses += 1
      }

      return acc
    },
    {
      learningVersesCount: 0,
      reviewVersesCount: 0,
      dueReviewCount: 0,
      masteredVerses: 0,
      progressTotal: 0,
    },
  )

  return {
    learningVersesCount: summary.learningVersesCount,
    reviewVersesCount: summary.reviewVersesCount,
    dueReviewCount: summary.dueReviewCount,
    masteredVerses: summary.masteredVerses,
    averageTrainingProgressPercent:
      todayVerses.length > 0
        ? clampPercent(summary.progressTotal / todayVerses.length)
        : 0,
  }
}

/* ── Dashboard ─────────────────────────────────────────────────────── */

export function Dashboard({
  todayVerses,
  dashboardStats = null,
  isDashboardStatsLoading = false,
  dashboardLeaderboard = null,
  isDashboardLeaderboardLoading = false,
  dashboardFriendsActivity = null,
  isDashboardFriendsActivityLoading = false,
  currentTelegramId = null,
  currentUserAvatarUrl = null,
  onOpenTraining,
  onOpenPlayerProfile,
  onLeaderboardWindowRequest,
  isInitializingData = false,
}: DashboardProps) {
  const { user } = useTelegram()
  const todaySummary = useMemo(() => summarizeTodayVerses(todayVerses), [todayVerses])
  const isStatsPending = isDashboardStatsLoading && dashboardStats == null
  const currentUserXp = useCurrentUserStatsStore((s) => s.xp)
  const currentUserDailyStreak = useCurrentUserStatsStore((s) => s.dailyStreak)

  const learningVerses =
    dashboardStats?.learningVerses ?? todaySummary.learningVersesCount
  const dueReviewVerses = dashboardStats?.dueReviewVerses ?? todaySummary.dueReviewCount
  const masteredVerses =
    dashboardStats?.masteredCount ?? todaySummary.masteredVerses
  const userXp = currentUserXp ?? dashboardStats?.xp ?? null
  const dailyStreak = currentUserDailyStreak ?? dashboardStats?.dailyStreak ?? null

  const statsCards = useMemo(
    () =>
      [
        { key: 'xp', label: 'XP', value: userXp != null ? formatXp(userXp) : null, isLoading: isStatsPending, tone: 'neutral' as const },
        { key: 'active', label: 'Активно', value: `${learningVerses + dueReviewVerses}`, tone: 'learning' as const },
        { key: 'mastered', label: 'Выучено', value: `${masteredVerses}`, tone: 'review' as const },
        {
          key: 'streak',
          label: 'Серия',
          value:
            dailyStreak != null
              ? `${dailyStreak} ${pluralizeDays(dailyStreak)}`
              : null,
          isLoading: isStatsPending,
          tone: 'mastered' as const,
        },
      ] as const,
    [dailyStreak, dueReviewVerses, isStatsPending, learningVerses, masteredVerses, userXp],
  )

  if (isInitializingData) {
    return <div className="min-h-0 flex-1" />
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
   
    <section
      className={cn(
        'mx-auto grid min-h-0 w-full max-w-5xl flex-1 content-start grid-cols-1 grid-rows-[auto_auto_auto] overflow-y-auto',
        'gap-2 px-3 py-2 sm:gap-3 sm:py-3',
        'lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:grid-rows-[auto_auto]',
        'sm:px-4 lg:px-5',
      )}
    >
      <div className="min-h-0 lg:col-start-1 lg:row-start-1">
        <DashboardWelcomeSection
          user={user}
          currentUserAvatarUrl={currentUserAvatarUrl}
          learningVersesCount={learningVerses}
          dueReviewVerses={dueReviewVerses}
          dailyStreak={dailyStreak}
          onOpenTraining={onOpenTraining}
          onOpenCurrentUserProfile={
            currentTelegramId && onOpenPlayerProfile
              ? () =>
                  onOpenPlayerProfile({
                    telegramId: currentTelegramId,
                    name: user?.firstName?.trim() || 'Вы',
                    avatarUrl: currentUserAvatarUrl,
                  })
              : undefined
          }
        />
      </div>

      <div className="min-h-0 lg:col-start-2 lg:row-start-1">
        <DashboardTrainingStatsCard statsCards={statsCards} />
      </div>

      <div className="grid min-h-0 grid-cols-1 gap-2 sm:gap-3 lg:col-span-2 lg:row-start-2 lg:grid-cols-[minmax(15rem,0.78fr)_minmax(18rem,1.22fr)] lg:items-start">
        <DashboardLeaderboardCard
          leaderboard={dashboardLeaderboard}
          isLeaderboardLoading={isDashboardLeaderboardLoading}
          onOpenTraining={onOpenTraining}
          onOpenPlayerProfile={onOpenPlayerProfile}
          onLeaderboardWindowRequest={onLeaderboardWindowRequest}
        />
        <DashboardFriendsActivityCard
          friendsActivity={dashboardFriendsActivity}
          isFriendsActivityLoading={isDashboardFriendsActivityLoading}
          currentTelegramId={currentTelegramId}
          onOpenPlayerProfile={onOpenPlayerProfile}
        />
      </div>
    </section>

    </div>
  )
}
