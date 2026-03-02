'use client'

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Flame, Repeat, Sparkles, Target } from 'lucide-react'
import { useTelegram } from '../contexts/TelegramContext'
import { Verse } from '@/app/App'
import {
  DashboardLeaderboardCard,
  DashboardTrainingStatsCard,
  DashboardWelcomeSection,
} from './dashboard/DashboardSections'

interface DashboardProps {
  todayVerses: Array<Verse>
  onStartTraining: () => void
  onAddVerse: () => void
  onViewAll: () => void
  onOpenTrainingPlanSettings: () => void
  isInitializingData?: boolean
}

const MASTERY_LEVEL_MAX = 14

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function toMasteryPercent(masteryLevel: number) {
  return clampPercent((masteryLevel / MASTERY_LEVEL_MAX) * 100)
}

export function Dashboard({
  todayVerses,
  onStartTraining: _onStartTraining,
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

  const totalRepetitions = todayVerses.reduce((sum, verse) => sum + (verse.repetitions ?? 0), 0)
  const avgMasteryPercent =
    todayVerses.length > 0
      ? clampPercent(
          todayVerses.reduce((sum, verse) => sum + toMasteryPercent(verse.masteryLevel), 0) /
            todayVerses.length
        )
      : 0

  const bestVerse = todayVerses.reduce<Verse | null>((best, verse) => {
    if (!best) return verse
    return toMasteryPercent(verse.masteryLevel) > toMasteryPercent(best.masteryLevel) ? verse : best
  }, null)

  const statsCards = [
    {
      key: 'planned',
      label: 'В плане сегодня',
      value: `${todayVerses.length}`,
      hint: `${learningVersesCount} в изучении · ${reviewVersesCount} повторений`,
      icon: Target,
      accent: 'from-primary/40 to-primary/30',
    },
    {
      key: 'mastery',
      label: 'Среднее освоение',
      value: `${avgMasteryPercent}%`,
      hint: bestVerse ? `Лучший стих: ${bestVerse.reference}` : 'Добавьте стихи для старта',
      icon: Sparkles,
      accent: 'from-emerald-500/40 to-emerald-500/30',
    },
    {
      key: 'reps',
      label: 'Повторения в подборке',
      value: `${totalRepetitions}`,
      hint: dueReviewCount > 0 ? `${dueReviewCount} к повторению сейчас` : 'Нет просроченных повторений',
      icon: Repeat,
      accent: 'from-amber-500/40 to-amber-500/30',
    },
    {
      key: 'streak',
      label: 'Серия тренировок',
      value: `${Math.max(1, Math.min(99, 7 + todayVerses.length))} дн.`,
      hint: 'Демо-показатель до подключения реальной статистики',
      icon: Flame,
      accent: 'from-rose-500/40 to-rose-500/30',
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

          <motion.div
            className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-6 mb-8"
            variants={groupStaggerVariants}
          >
            <DashboardTrainingStatsCard
              avgMasteryPercent={avgMasteryPercent}
              todayVersesCount={todayVerses.length}
              statsCards={statsCards}
              cardItemVariants={cardItemVariants}
              groupStaggerVariants={groupStaggerVariants}
            />
            <DashboardLeaderboardCard
              avgMasteryPercent={avgMasteryPercent}
              cardItemVariants={cardItemVariants}
              groupStaggerVariants={groupStaggerVariants}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
