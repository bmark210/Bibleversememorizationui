'use client'

import { useMemo } from 'react'
import { useTelegram } from '../contexts/TelegramContext'
import { Verse } from '@/app/App'
import { normalizeVerseFlow } from '@/shared/domain/verseFlow'
import type { domain_DashboardFriendsActivityResponse } from '@/api/models/domain_DashboardFriendsActivityResponse'
import type { domain_UserDashboardStats } from '@/api/models/domain_UserDashboardStats'
import type { domain_UserLeaderboardResponse } from '@/api/models/domain_UserLeaderboardResponse'
import { computeVerseTotalProgressPercent } from '@/shared/training/verseTotalProgress'
import { formatXp } from '@/shared/social/formatXp'
import { useCurrentUserStatsStore } from '@/app/stores/currentUserStatsStore'
import {
  DashboardFriendsActivityCard,
  DashboardLeaderboardCard,
  DashboardTrainingStatsCard,
  DashboardWelcomeSection,
} from './dashboard/DashboardSections'

interface DashboardProps {
  todayVerses: Array<Verse>
  dashboardStats?: domain_UserDashboardStats | null
  isDashboardStatsLoading?: boolean
  dashboardLeaderboard?: domain_UserLeaderboardResponse | null
  isDashboardLeaderboardLoading?: boolean
  dashboardFriendsActivity?: domain_DashboardFriendsActivityResponse | null
  isDashboardFriendsActivityLoading?: boolean
  currentTelegramId?: string | null
  currentUserAvatarUrl?: string | null
  onOpenTraining?: () => void
  onOpenProfile?: () => void
  onOpenPlayerProfile?: (player: {
    telegramId: string
    name: string
    avatarUrl: string | null
  }) => void
  isInitializingData?: boolean
}

type TodayVersesSummary = {
  learningVersesCount: number
  reviewVersesCount: number
  dueReviewCount: number
  masteredVerses: number
  averageTrainingProgressPercent: number
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
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
    }
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
  onOpenProfile,
  onOpenPlayerProfile,
  isInitializingData = false,
}: DashboardProps) {
  const { user } = useTelegram()
  const todaySummary = useMemo(() => summarizeTodayVerses(todayVerses), [todayVerses])
  const isStatsPending = isDashboardStatsLoading && dashboardStats == null
  const currentUserXp = useCurrentUserStatsStore((state) => state.xp)
  const currentUserMasteredVerses = useCurrentUserStatsStore(
    (state) => state.masteredVerses,
  )
  const currentUserDailyStreak = useCurrentUserStatsStore(
    (state) => state.dailyStreak,
  )

  const learningVerses =
    dashboardStats?.learningVerses ?? todaySummary.learningVersesCount
  const dueReviewVerses = dashboardStats?.dueReviewVerses ?? todaySummary.dueReviewCount
  const userXp = currentUserXp ?? dashboardStats?.xp ?? null
  const masteredVerses =
    currentUserMasteredVerses ?? dashboardStats?.masteredCount ?? null
  const dailyStreak = currentUserDailyStreak ?? dashboardStats?.dailyStreak ?? null

  const statsCards = useMemo(
    () =>
      [
        {
          key: 'learning',
          label: 'Изучение',
          value: `${learningVerses}`,
          tone: 'learning' as const,
        },
        {
          key: 'review',
          label: 'Повторение',
          value: `${dueReviewVerses}`,
          tone: 'review' as const,
        },
        {
          key: 'xp',
          label: 'XP',
          value: userXp != null ? formatXp(userXp) : null,
          isLoading: isStatsPending,
          tone: 'neutral' as const,
        },
        {
          key: 'mastered',
          label: 'Выучено',
          value: masteredVerses != null ? `${masteredVerses}` : null,
          isLoading: isStatsPending,
          tone: 'mastered' as const,
        },
      ] as const,
    [dueReviewVerses, isStatsPending, learningVerses, masteredVerses, userXp]
  )

  if (isInitializingData) {
    return <div className="min-h-[60vh]" />
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.85fr)]">
        <DashboardTrainingStatsCard statsCards={statsCards} />
        <div className="space-y-5">
          <DashboardLeaderboardCard
            leaderboard={dashboardLeaderboard}
            isLeaderboardLoading={isDashboardLeaderboardLoading}
            onOpenTraining={onOpenTraining}
            onOpenPlayerProfile={onOpenPlayerProfile}
          />
          <DashboardFriendsActivityCard
            friendsActivity={dashboardFriendsActivity}
            isFriendsActivityLoading={isDashboardFriendsActivityLoading}
            onOpenProfile={onOpenProfile}
            onOpenPlayerProfile={onOpenPlayerProfile}
          />
        </div>
      </div>
    </div>
  )
}
