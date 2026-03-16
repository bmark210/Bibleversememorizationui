'use client'

import { useMemo } from 'react'
import { useTelegram } from '../contexts/TelegramContext'
import { Verse } from '@/app/App'
import type { DashboardLeaderboard as DashboardLeaderboardData } from '@/api/services/leaderboard'
import type { UserDashboardStats } from '@/api/services/userStats'
import type { DashboardFriendsActivity as DashboardFriendsActivityData } from '@/api/services/friends'
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from '@/shared/training/constants'
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
  dashboardStats?: UserDashboardStats | null
  isDashboardStatsLoading?: boolean
  dashboardLeaderboard?: DashboardLeaderboardData | null
  isDashboardLeaderboardLoading?: boolean
  dashboardFriendsActivity?: DashboardFriendsActivityData | null
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
  const totalProgress = Math.min(
    Math.max(0, Math.round(masteryLevel)) + Math.max(0, Math.round(repetitions)),
    TOTAL_REPEATS_AND_STAGE_MASTERY_MAX
  )
  return clampPercent((totalProgress / TOTAL_REPEATS_AND_STAGE_MASTERY_MAX) * 100)
}

function summarizeTodayVerses(todayVerses: Verse[]): TodayVersesSummary {
  const now = Date.now()

  const summary = todayVerses.reduce(
    (acc, verse) => {
      const progress = toMasteryPercent(verse.masteryLevel, verse.repetitions)

      acc.progressTotal += progress

      if (verse.status === 'LEARNING') {
        acc.learningVersesCount += 1
      }

      if (verse.status === 'REVIEW') {
        acc.reviewVersesCount += 1

        if (!verse.nextReviewAt) {
          acc.dueReviewCount += 1
        } else {
          const nextReviewTime = new Date(verse.nextReviewAt).getTime()
          if (Number.isNaN(nextReviewTime) || nextReviewTime <= now) {
            acc.dueReviewCount += 1
          }
        }
      }

      if (verse.status === 'MASTERED') {
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
  const { user, initDataUnsafe, platform } = useTelegram()
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
    currentUserMasteredVerses ?? dashboardStats?.masteredVerses ?? null
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

      {/* ── DEBUG: Telegram User Data ── */}
      <details className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-muted-foreground">
          DEBUG: Telegram User Data
        </summary>
        <div className="mt-2 space-y-2 font-mono text-[11px] leading-relaxed">
          <div>
            <span className="font-semibold text-foreground/70">platform:</span>{' '}
            {platform}
          </div>
          <div className="border-t border-border/40 pt-2">
            <div className="mb-1 font-semibold text-foreground/70">
              initDataUnsafe.user (raw):
            </div>
            {initDataUnsafe?.user ? (
              <div className="space-y-0.5 pl-2">
                {Object.entries(initDataUnsafe.user).map(([key, value]) => (
                  <div key={key} className="break-all">
                    <span className="text-primary/80">{key}:</span>{' '}
                    <span className="text-foreground/90">
                      {value === undefined ? '(undefined)' : value === null ? '(null)' : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-destructive">initDataUnsafe.user отсутствует</span>
            )}
          </div>
          <div className="border-t border-border/40 pt-2">
            <div className="mb-1 font-semibold text-foreground/70">
              Parsed user (context):
            </div>
            {user ? (
              <div className="space-y-0.5 pl-2">
                <div><span className="text-primary/80">id:</span> {user.id}</div>
                <div><span className="text-primary/80">firstName:</span> {user.firstName || '(empty)'}</div>
                <div><span className="text-primary/80">lastName:</span> {user.lastName ?? '(undefined)'}</div>
                <div><span className="text-primary/80">username:</span> {user.username ?? '(undefined)'}</div>
                <div className="break-all">
                  <span className="text-primary/80">photoUrl:</span>{' '}
                  {user.photoUrl ? (
                    <span className="text-green-600">{user.photoUrl}</span>
                  ) : (
                    <span className="text-destructive">{user.photoUrl === undefined ? '(undefined)' : '(empty string)'}</span>
                  )}
                </div>
                <div><span className="text-primary/80">isPremium:</span> {String(user.isPremium ?? '(undefined)')}</div>
              </div>
            ) : (
              <span className="text-destructive">user = null</span>
            )}
          </div>
          {user?.photoUrl && (
            <div className="border-t border-border/40 pt-2">
              <div className="mb-1 font-semibold text-foreground/70">Avatar preview:</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.photoUrl}
                alt="avatar"
                className="h-12 w-12 rounded-full border border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).alt = 'Failed to load avatar'
                }}
              />
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
