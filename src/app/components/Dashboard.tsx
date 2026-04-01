'use client'

import { useMemo } from 'react'
import { GraduationCap } from 'lucide-react'
import { useTelegram } from '../contexts/TelegramContext'
import type { Verse } from '@/app/domain/verse'
import type { domain_UserDashboardStats } from '@/api/models/domain_UserDashboardStats'
import type { domain_UserLeaderboardResponse } from '@/api/models/domain_UserLeaderboardResponse'
import type { DashboardCompactFriendsActivityResponse } from '@/api/services/friendsActivity'
import type { LearningCapacityResponse } from '@/app/components/Training/exam/types'
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
  learningCapacity?: LearningCapacityResponse | null
  dashboardLeaderboard?: domain_UserLeaderboardResponse | null
  isDashboardLeaderboardLoading?: boolean
  dashboardFriendsActivity?: DashboardCompactFriendsActivityResponse | null
  isDashboardFriendsActivityLoading?: boolean
  currentTelegramId?: string | null
  currentUserAvatarUrl?: string | null
  onOpenTraining?: () => void
  onOpenExam?: () => void
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
  learningCapacity = null,
  dashboardLeaderboard = null,
  isDashboardLeaderboardLoading = false,
  dashboardFriendsActivity = null,
  isDashboardFriendsActivityLoading = false,
  currentTelegramId = null,
  currentUserAvatarUrl = null,
  onOpenTraining,
  onOpenExam,
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
        // { key: 'review', label: 'Повторение', value: `${dueReviewVerses}`, tone: 'review' as const },
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

  const isCapacityFull =
    learningCapacity != null && !learningCapacity.canAddMore

  if (isInitializingData) {
    return <div className="min-h-0 flex-1" />
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {isCapacityFull && onOpenExam && (
        <div className="shrink-0 px-3 pt-2 sm:px-4 lg:px-5">
          <button
            type="button"
            onClick={onOpenExam}
            className="flex w-full items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left transition-colors hover:bg-amber-500/15"
          >
            <GraduationCap className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Слоты заполнены ({learningCapacity!.activeLearning}/{learningCapacity!.capacity})
              </p>
              <p className="text-xs text-text-muted">
                Пройдите экзамен, чтобы добавить новые стихи в изучение
              </p>
            </div>
          </button>
        </div>
      )}
    <section
      className={cn(
        'mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden',
        'gap-2 px-3 py-2 sm:gap-3 sm:py-3',
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

      <div className="grid min-h-0 grid-cols-1 grid-rows-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-2 sm:gap-3 lg:col-span-2 lg:row-start-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:grid-rows-1">
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
