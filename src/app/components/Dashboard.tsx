'use client'

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTelegram } from '../contexts/TelegramContext'
import { Verse } from '@/app/App'
import type { DashboardLeaderboard as DashboardLeaderboardData } from '@/api/services/leaderboard'
import type { UserDashboardStats } from '@/api/services/userStats'
import type { DashboardFriendsActivity as DashboardFriendsActivityData } from '@/api/services/friends'
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from '@/shared/training/constants'
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
  onOpenTraining?: () => void
  isInitializingData?: boolean
}

type TodayVersesSummary = {
  learningVersesCount: number
  reviewVersesCount: number
  dueReviewCount: number
  masteredVerses: number
  averageProgressPercent: number
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
    averageProgressPercent:
      todayVerses.length > 0
        ? clampPercent(summary.progressTotal / todayVerses.length)
        : 0,
  }
}

export function Dashboard({
  todayVerses,
  dashboardStats = null,
  isDashboardStatsLoading: _isDashboardStatsLoading = false,
  dashboardLeaderboard = null,
  isDashboardLeaderboardLoading = false,
  dashboardFriendsActivity = null,
  isDashboardFriendsActivityLoading = false,
  onOpenTraining,
  isInitializingData = false,
}: DashboardProps) {
  const { user } = useTelegram()
  const shouldReduceMotion = useReducedMotion()
  const todaySummary = summarizeTodayVerses(todayVerses)

  const avgRatingPercent =
    dashboardStats?.averageProgressPercent ?? todaySummary.averageProgressPercent
  const masteredVerses =
    dashboardStats?.masteredVerses ?? todaySummary.masteredVerses
  const dueReviewVerses = dashboardStats?.dueReviewVerses ?? todaySummary.dueReviewCount
  const dailyStreak = dashboardStats?.dailyStreak ?? 0

  const statsCards = [
    {
      key: 'learning',
      label: 'Изучение',
      value: `${todaySummary.learningVersesCount}`,
      tone: 'learning' as const,
    },
    {
      key: 'review',
      label: 'Повторение',
      value: `${dueReviewVerses}`,
      tone: 'review' as const,
    },
    {
      key: 'progress',
      label: 'Прогресс',
      value: `${avgRatingPercent}%`,
      tone: 'neutral' as const,
    },
    {
      key: 'mastered',
      label: 'Выучено',
      value: `${masteredVerses}`,
      tone: 'mastered' as const,
    },
  ] as const

  const dashboardVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.07,
        delayChildren: shouldReduceMotion ? 0 : 0.03,
      },
    },
  }

  const sectionVariants = {
    hidden: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : 12,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.26,
        ease: 'easeOut' as const,
      },
    },
  }

  const groupStaggerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.06,
        delayChildren: shouldReduceMotion ? 0 : 0.02,
      },
    },
  }

  const cardItemVariants = {
    hidden: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : 10,
      scale: shouldReduceMotion ? 1 : 0.99,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.22,
        ease: 'easeOut' as const,
      },
    },
  }

  if (isInitializingData) {
    return <div className="min-h-[60vh]" />
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <motion.div
        {...(shouldReduceMotion
          ? {}
          : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.2, ease: 'easeOut' as const },
            })}
      >
        <motion.div initial="hidden" animate="show" variants={dashboardVariants}>
          <DashboardWelcomeSection
            user={user}
            todayVersesCount={todayVerses.length}
            dueReviewVerses={dueReviewVerses}
            dailyStreak={dailyStreak}
            onOpenTraining={onOpenTraining}
            sectionVariants={sectionVariants}
          />

          <motion.div
            className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.85fr)]"
            variants={groupStaggerVariants}
          >
            <DashboardTrainingStatsCard
              statsCards={statsCards}
              cardItemVariants={cardItemVariants}
              groupStaggerVariants={groupStaggerVariants}
            />
            <div className="space-y-5">
              <DashboardLeaderboardCard
                leaderboard={dashboardLeaderboard}
                isLeaderboardLoading={isDashboardLeaderboardLoading}
                cardItemVariants={cardItemVariants}
                groupStaggerVariants={groupStaggerVariants}
              />
              <DashboardFriendsActivityCard
                friendsActivity={dashboardFriendsActivity}
                isFriendsActivityLoading={isDashboardFriendsActivityLoading}
                cardItemVariants={cardItemVariants}
                groupStaggerVariants={groupStaggerVariants}
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
