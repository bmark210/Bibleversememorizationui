'use client'

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Brain, Flame, Play, Repeat, Target, Trophy } from 'lucide-react'
import { useTelegram } from '../contexts/TelegramContext'
import { Verse } from '@/app/App'
import type { DashboardLeaderboard as DashboardLeaderboardData } from '@/api/services/leaderboard'
import type { UserDashboardStats } from '@/api/services/userStats'
import type { DashboardFriendsActivity as DashboardFriendsActivityData } from '@/api/services/friends'
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from '@/shared/training/constants'
import { Button } from './ui/button'
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
  onStartTraining: () => void
  onAddVerse: () => void
  onViewAll: () => void
  onOpenTrainingPlanSettings: () => void
  isInitializingData?: boolean
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

export function Dashboard({
  todayVerses,
  dashboardStats = null,
  isDashboardStatsLoading = false,
  dashboardLeaderboard = null,
  isDashboardLeaderboardLoading = false,
  dashboardFriendsActivity = null,
  isDashboardFriendsActivityLoading = false,
  onStartTraining,
  onAddVerse: _onAddVerse,
  onViewAll: _onViewAll,
  onOpenTrainingPlanSettings: _onOpenTrainingPlanSettings,
  isInitializingData = false,
}: DashboardProps) {
  const { user } = useTelegram()
  const shouldReduceMotion = useReducedMotion()
  const now = Date.now()

  const learningVersesCount = todayVerses.filter((verse) => verse.status === 'LEARNING').length
  const reviewVersesCount = todayVerses.filter((verse) => verse.status === 'REVIEW').length
  const dueReviewCount = todayVerses.filter((verse) => {
    if (verse.status !== 'REVIEW') return false
    if (!verse.nextReviewAt) return true
    const nextReviewTime = new Date(verse.nextReviewAt).getTime()
    return Number.isNaN(nextReviewTime) || nextReviewTime <= now
  }).length

  const fallbackTotalRepetitions = todayVerses.reduce(
    (sum, verse) => sum + (verse.repetitions ?? 0),
    0
  )
  const fallbackMasteredVerses = todayVerses.filter(
    (verse) => verse.status === 'MASTERED'
  ).length
  const fallbackAvgRatingPercent =
    todayVerses.length > 0
      ? clampPercent(
          todayVerses.reduce(
            (sum, verse) =>
              sum + toMasteryPercent(verse.masteryLevel, verse.repetitions),
            0
          ) /
            todayVerses.length
        )
      : 0

  const fallbackBestVerse = todayVerses.reduce<Verse | null>((best, verse) => {
    if (!best) return verse
    return toMasteryPercent(verse.masteryLevel, verse.repetitions) >
      toMasteryPercent(best.masteryLevel, best.repetitions)
      ? verse
      : best
  }, null)

  const avgRatingPercent =
    dashboardStats?.averageProgressPercent ?? fallbackAvgRatingPercent
  const totalRepetitions =
    dashboardStats?.totalRepetitions ?? fallbackTotalRepetitions
  const masteredVerses =
    dashboardStats?.masteredVerses ?? fallbackMasteredVerses
  const dueReviewVerses = dashboardStats?.dueReviewVerses ?? dueReviewCount
  const bestVerseReference =
    dashboardStats?.bestVerseReference ?? fallbackBestVerse?.reference ?? null
  const dailyStreak = dashboardStats?.dailyStreak ?? 0

  const statsCards = [
    {
      key: 'planned',
      label: 'Активность',
      value: `${todayVerses.length} ${formatWordsCount(todayVerses.length)}`,
      hint: `${learningVersesCount} ${formatWordsCount(learningVersesCount)} в изучении, ${reviewVersesCount} ${formatWordsCount(reviewVersesCount)} к повторению`,
      icon: Target,
      accent: 'from-primary/35 to-primary/10',
      iconColor: 'text-primary',
      textColor: 'text-primary/70',
    },
    {
      key: 'reps',
      label: 'Повторения в подборке',
      value: `${totalRepetitions}`,
      hint: dueReviewVerses > 0 ? `${dueReviewVerses} к повторению сейчас` : 'Нет просроченных повторений',
      icon: Repeat,
      accent: 'from-violet-500/30 to-violet-500/10',
      iconColor: 'text-violet-500',
      textColor: 'text-violet-500/70',
    },
    {
      key: 'mastery',
      label: 'Средний рейтинг',
      value: `${avgRatingPercent}%`,
      hint: bestVerseReference
        ? `Баланс прогресса, навыков и регулярности. Лучший стих: ${bestVerseReference}`
        : isDashboardStatsLoading
          ? 'Загружаем вашу статистику...'
          : 'Добавьте стихи для старта',
      icon: Brain,
      accent: 'from-success/35 to-success/10',
      iconColor: 'text-success',
      textColor: 'text-success/70',
    },
    {
      key: 'mastered',
      label: 'Выучено',
      value: `${masteredVerses}`,
      hint: masteredVerses > 0 ? 'Стихи, закреплённые в долгой памяти' : 'Пока нет выученных стихов',
      icon: Trophy,
      accent: 'from-amber-500/35 to-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-300',
      textColor: 'text-amber-500/70',
    },
    {
      key: 'streak',
      label: 'Серия тренировок',
      value: `${dailyStreak} дн.`,
      hint: isDashboardStatsLoading ? 'Обновляем прогресс...' : 'Ваш лучший непрерывный ритм',
      icon: Flame,
      accent: 'from-rose-500/30 to-rose-500/10',
      iconColor: 'text-rose-500',
      textColor: 'text-rose-400/70',
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
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
            sectionVariants={sectionVariants}
          />

          <motion.div className="mb-6" variants={sectionVariants}>
            <Button type="button" size="lg" onClick={onStartTraining} className="w-full text-primary sm:w-auto border border-primary/10 bg-input-background rounded-2xl">
              <Brain className="h-4 w-4" />
              Начать изучение
            </Button>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-6 mb-8"
            variants={groupStaggerVariants}
          >
            <DashboardTrainingStatsCard
              avgRatingPercent={avgRatingPercent}
              todayVersesCount={todayVerses.length}
              statsCards={statsCards}
              cardItemVariants={cardItemVariants}
              groupStaggerVariants={groupStaggerVariants}
            />
            <div className="space-y-6">
              <DashboardLeaderboardCard
                avgRatingPercent={avgRatingPercent}
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


function formatWordsCount(count: number) {
  if (count === 0) return 'стихов'
  if (count === 1) return 'стих'
  if (count < 5) return 'стиха'
  return 'стихов'
}
