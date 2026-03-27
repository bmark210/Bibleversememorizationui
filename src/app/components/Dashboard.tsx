'use client'

import { useMemo } from 'react'
import { useTelegram } from '../contexts/TelegramContext'
import type { Verse } from '@/app/domain/verse'
import { normalizeVerseFlow } from '@/shared/domain/verseFlow'
import type { domain_UserDashboardStats } from '@/api/models/domain_UserDashboardStats'
import type { domain_UserLeaderboardResponse } from '@/api/models/domain_UserLeaderboardResponse'
import type { DashboardCompactFriendsActivityResponse } from '@/api/services/friendsActivity'
import { computeVerseTotalProgressPercent } from '@/shared/training/verseTotalProgress'
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
  return clampPercent(computeVerseTotalProgressPercent(masteryLevel, repetitions))
}

function summarizeTodayVerses(todayVerses: Verse[]): TodayVersesSummary {
  const now = Date.now()

  const summary = todayVerses.reduce(
    (acc, verse) => {
      const progress = toMasteryPercent(verse.masteryLevel, verse.repetitions)
      const flow = normalizeVerseFlow(verse.flow)

      acc.progressTotal += progress

      if (flow?.code === 'LEARNING' || verse.status === 'LEARNING') {
        acc.learningVersesCount += 1
      }

      if (
        flow?.code === 'REVIEW_DUE' ||
        flow?.code === 'REVIEW_WAITING' ||
        verse.status === 'REVIEW'
      ) {
        acc.reviewVersesCount += 1

        if (flow?.code === 'REVIEW_DUE' || !verse.nextReviewAt) {
          acc.dueReviewCount += 1
        } else {
          const nextReviewTime = new Date(verse.nextReviewAt).getTime()
          if (Number.isNaN(nextReviewTime) || nextReviewTime <= now) {
            acc.dueReviewCount += 1
          }
        }
      }

      if (flow?.code === 'MASTERED' || verse.status === 'MASTERED') {
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
  const userXp = currentUserXp ?? dashboardStats?.xp ?? null
  const dailyStreak = currentUserDailyStreak ?? dashboardStats?.dailyStreak ?? null

  const statsCards = useMemo(
    () =>
      [
        { key: 'active', label: 'Активность', value: `${learningVerses + dueReviewVerses} стиха`, tone: 'learning' as const },
        { key: 'review', label: 'Повторение', value: `${dueReviewVerses}`, tone: 'review' as const },
        { key: 'xp', label: 'XP', value: userXp != null ? formatXp(userXp) : null, isLoading: isStatsPending, tone: 'neutral' as const },
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
    [dailyStreak, dueReviewVerses, isStatsPending, learningVerses, userXp],
  )

  if (isInitializingData) {
    return <div className="min-h-0 flex-1" />
  }

  return (
    <section
      className={cn(
        'mx-auto grid h-full min-h-0 w-full max-w-5xl grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden short-phone:h-auto short-phone:min-h-full short-phone:grid-rows-[auto_auto_auto] short-phone:overflow-visible',
        'gap-3 px-3 py-3',
        'narrow:gap-3 narrow:px-3 narrow:py-3',
        'lg:grid-cols-[minmax(0,1.05fr)_minmax(19rem,0.95fr)] lg:grid-rows-[auto_minmax(0,1fr)]',
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

      <div className="grid min-h-0 grid-cols-1 grid-rows-[minmax(0,1.4fr)_minmax(0,0.6fr)] gap-3 short-phone:min-h-fit short-phone:grid-rows-[auto_auto] lg:col-span-2 lg:row-start-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:grid-rows-1">
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
  )
}
