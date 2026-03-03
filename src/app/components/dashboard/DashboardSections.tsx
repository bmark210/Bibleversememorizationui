'use client'

import React from 'react'
import { motion } from 'motion/react'
import type { Variants } from 'motion/react'
import { Crown, Medal, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '../ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { Badge } from '../ui/badge'
import type {
  DashboardLeaderboard as DashboardLeaderboardData,
  LeaderboardEntry,
} from '@/api/services/leaderboard'

type DashboardUser = {
  firstName: string
  photoUrl?: string | null
} | null

type StatsCardItem = {
  key: string
  label: string
  value: string
  hint: string
  icon: LucideIcon
  iconColor: string
  accent: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function getRankBadge(rank: number) {
  if (rank === 1) {
    return {
      icon: Crown,
      className: 'border-amber-400/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
      chipClassName: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    }
  }
  if (rank === 2) {
    return {
      icon: Medal,
      className: 'border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-200',
      chipClassName: 'bg-slate-500/10 text-slate-700 dark:text-slate-200',
    }
  }
  return {
    icon: Trophy,
    className: 'border-orange-400/40 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    chipClassName: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  }
}

type DashboardWelcomeSectionProps = {
  user: DashboardUser
  todayVersesCount: number
  sectionVariants: Variants
}

export function DashboardWelcomeSection({
  user,
  todayVersesCount,
  sectionVariants,
}: DashboardWelcomeSectionProps) {
  return (
    <motion.div className="mb-8" variants={sectionVariants}>
      {user ? (
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-16 w-16">
            {user.photoUrl ? (
              <AvatarImage src={user.photoUrl} alt={user.firstName} />
            ) : (
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {user.firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h1 className="mb-1">С возвращением, {user.firstName}!</h1>
          </div>
        </div>
      ) : (
        <h1 className="mb-2">С возвращением!</h1>
      )}
      <p className="text-muted-foreground">
        У вас {todayVersesCount} {todayVersesCount === 1 ? 'стих' : todayVersesCount < 5 ? 'стиха' : 'стихов'} для изучения сегодня.
      </p>
    </motion.div>
  )
}

type DashboardTrainingStatsCardProps = {
  avgMasteryPercent: number
  todayVersesCount: number
  statsCards: ReadonlyArray<StatsCardItem>
  cardItemVariants: Variants
  groupStaggerVariants: Variants
}

export function DashboardTrainingStatsCard({
  avgMasteryPercent,
  todayVersesCount,
  statsCards,
  cardItemVariants,
  groupStaggerVariants,
}: DashboardTrainingStatsCardProps) {
  return (
    <motion.div variants={cardItemVariants}>
      <Card className="relative overflow-hidden border-border/70 rounded-3xl bg-gradient-to-br from-primary/10 via-background to-amber-500/5 p-5 sm:p-6 gap-0">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-primary/15 blur-2xl" />
          <div className="absolute -bottom-20 left-0 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />
        </div>

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {/* <Badge className="rounded-full px-3 py-1">Краткая статистика</Badge> */}
                {/* <Badge variant="outline" className="rounded-full px-3 py-1">
                  Сегодня
                </Badge> */}
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">Статистика сегодня</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Короткий обзор по подборке на текущую сессию.
              </p>
            </div>
            {/* <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-right">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Среднее освоение
              </div>
              <div className="text-2xl font-semibold mt-1">{avgMasteryPercent}%</div>
            </div> */}
          </div>

          <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-3" variants={groupStaggerVariants}>
            {statsCards.map((item) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.key}
                  variants={cardItemVariants}
                  className={`rounded-2xl border border-border/70 bg-gradient-to-br ${item.accent} p-4 backdrop-blur-sm`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="mt-2 text-2xl font-semibold">{item.value}</div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/70 p-2">
                      <Icon className={`h-4 w-4 ${item.iconColor}`} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{item.hint}</p>
                </motion.div>
              )
            })}
          </motion.div>

          {/* <motion.div className="mt-5 rounded-2xl border border-border/70 bg-background/60 p-4" variants={cardItemVariants}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-sm font-medium">Подготовка к тренировке</div>
              <div className="text-xs text-muted-foreground">
                {todayVersesCount === 0 ? 'Нет стихов в плане' : `${todayVersesCount} стихов в сессии`}
              </div>
            </div>
            <Progress value={todayVersesCount === 0 ? 0 : Math.min(100, 25 + todayVersesCount * 8)} className="h-2.5" />
          </motion.div> */}
        </div>
      </Card>
    </motion.div>
  )
}

type DashboardLeaderboardCardProps = {
  avgMasteryPercent: number
  leaderboard?: DashboardLeaderboardData | null
  isLeaderboardLoading?: boolean
  cardItemVariants: Variants
  groupStaggerVariants: Variants
}

export function DashboardLeaderboardCard({
  avgMasteryPercent,
  leaderboard = null,
  isLeaderboardLoading = false,
  cardItemVariants,
  groupStaggerVariants,
}: DashboardLeaderboardCardProps) {
  const entries = leaderboard?.entries ?? []
  const currentUser = leaderboard?.currentUser ?? null
  const totalParticipants = leaderboard?.totalParticipants ?? entries.length

  const footerTitle = currentUser?.rank
    ? `Ваша позиция: #${currentUser.rank} из ${Math.max(totalParticipants, currentUser.rank)}`
    : totalParticipants > 0
      ? 'Вы пока вне рейтинга'
      : 'Рейтинг заполняется'

  const footerHint = currentUser
    ? `${currentUser.weeklyRepetitions} повторений за неделю · серия ${currentUser.streakDays} дн.`
    : 'Тренируйтесь регулярно, чтобы подняться в таблице лидеров.'

  const footerScore = currentUser ? `${currentUser.score}%` : `${Math.max(0, Math.min(100, avgMasteryPercent))}%`

  return (
    <motion.div variants={cardItemVariants}>
      <Card className="border-border/70 rounded-3xl p-5 sm:p-6 gap-0 bg-gradient-to-b from-background to-primary/5">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Лучшие игроки</h2>
            <p className="text-sm text-muted-foreground mt-1">
              По точности и регулярности тренировок.
            </p>
          </div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Рейтинг
              </Badge>
            </div>
        </div>

        <motion.div className="space-y-3" variants={groupStaggerVariants}>
          {entries.length > 0 ? entries.map((entry) => {
            const rank = entry.rank
            const rankBadge = getRankBadge(rank)
            const RankIcon = rankBadge.icon

            return (
              <motion.div
                key={entry.telegramId}
                variants={cardItemVariants}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                  entry.isCurrentUser
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border/70 bg-background/70 hover:bg-accent/40'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${rankBadge.className}`}
                  aria-hidden="true"
                >
                  <RankIcon className="h-4 w-4" />
                </div>

                <Avatar className="h-10 w-10 border border-border/60">
                  {entry.avatarUrl ? (
                    <AvatarImage src={entry.avatarUrl} alt={entry.name} />
                  ) : null}
                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                    {getInitials(entry.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{entry.name}</div>
                    <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] ${rankBadge.chipClassName}`}>
                      #{rank}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{entry.weeklyRepetitions} повторений за неделю</span>
                    <span>{entry.streakDays} дн. подряд</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold leading-none">{entry.score}%</div>
                  <div className="text-[11px] text-muted-foreground mt-1">рейтинг</div>
                </div>
              </motion.div>
            )
          }) : (
            <motion.div
              variants={cardItemVariants}
              className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground"
            >
              {isLeaderboardLoading
                ? 'Обновляем рейтинг...'
                : 'Пока нет данных для таблицы лидеров. Добавьте стихи и начните тренировки.'}
            </motion.div>
          )}
        </motion.div>

        <motion.div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/50 p-4" variants={cardItemVariants}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{footerTitle}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {footerHint}
              </div>
            </div>
            <Badge className="rounded-full px-3 py-1">{footerScore}</Badge>
          </div>
        </motion.div>
      </Card>
    </motion.div>
  )
}
