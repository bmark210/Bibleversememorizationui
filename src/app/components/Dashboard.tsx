'use client'

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ChevronRight,
  Crown,
  Dumbbell,
  Flame,
  Medal,
  Plus,
  Repeat,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { useTelegram } from '../contexts/TelegramContext';
import { Verse } from '@/app/App';

interface DashboardProps {
  todayVerses: Array<Verse>;
  onStartTraining: () => void;
  onAddVerse: () => void;
  onViewAll: () => void;
}

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  streakDays: number;
  weeklyRepetitions: number;
};

const MOCK_LEADERBOARD: Array<LeaderboardEntry> = [
  { id: '1', name: 'Алексей Джи', score: 98, streakDays: 37, weeklyRepetitions: 142 },
  { id: '2', name: 'Анна К.', score: 94, streakDays: 28, weeklyRepetitions: 128 },
  { id: '3', name: 'Павел М.', score: 91, streakDays: 21, weeklyRepetitions: 117 },
  { id: '4', name: 'Елена Т.', score: 88, streakDays: 16, weeklyRepetitions: 95 },
];

const MASTERY_LEVEL_MAX = 14;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function toMasteryPercent(masteryLevel: number) {
  return clampPercent((masteryLevel / MASTERY_LEVEL_MAX) * 100);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getRankBadge(rank: number) {
  if (rank === 1) {
    return {
      icon: Crown,
      className: 'border-amber-400/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
      chipClassName: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    };
  }
  if (rank === 2) {
    return {
      icon: Medal,
      className: 'border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-200',
      chipClassName: 'bg-slate-500/10 text-slate-700 dark:text-slate-200',
    };
  }
  return {
    icon: Trophy,
    className: 'border-orange-400/40 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    chipClassName: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  };
}

export function Dashboard({ todayVerses, onStartTraining, onAddVerse, onViewAll }: DashboardProps) {
  const { user } = useTelegram();
  const shouldReduceMotion = useReducedMotion();
  const now = Date.now();

  const newVersesCount = todayVerses.filter((verse) => verse.status === 'NEW').length;
  const reviewVersesCount = Math.max(0, todayVerses.length - newVersesCount);
  const dueReviewCount = todayVerses.filter((verse) => {
    if (verse.status !== 'LEARNING') return false;
    if (!verse.nextReviewAt) return true;
    const nextReviewTime = new Date(verse.nextReviewAt).getTime();
    return Number.isNaN(nextReviewTime) || nextReviewTime <= now;
  }).length;

  const totalRepetitions = todayVerses.reduce((sum, verse) => sum + (verse.repetitions ?? 0), 0);
  const avgMasteryPercent =
    todayVerses.length > 0
      ? clampPercent(
          todayVerses.reduce((sum, verse) => sum + toMasteryPercent(verse.masteryLevel), 0) /
            todayVerses.length
        )
      : 0;

  const bestVerse = todayVerses.reduce<Verse | null>((best, verse) => {
    if (!best) return verse;
    return toMasteryPercent(verse.masteryLevel) > toMasteryPercent(best.masteryLevel) ? verse : best;
  }, null);

  const statsCards = [
    {
      key: 'planned',
      label: 'В плане сегодня',
      value: `${todayVerses.length}`,
      hint: `${newVersesCount} новых · ${reviewVersesCount} повторений`,
      icon: Target,
      accent: 'from-primary/20 to-primary/5',
    },
    {
      key: 'mastery',
      label: 'Среднее освоение',
      value: `${avgMasteryPercent}%`,
      hint: bestVerse ? `Лучший стих: ${bestVerse.reference}` : 'Добавьте стихи для старта',
      icon: Sparkles,
      accent: 'from-emerald-500/20 to-emerald-500/5',
    },
    {
      key: 'reps',
      label: 'Повторения в подборке',
      value: `${totalRepetitions}`,
      hint: dueReviewCount > 0 ? `${dueReviewCount} к повторению сейчас` : 'Нет просроченных повторений',
      icon: Repeat,
      accent: 'from-amber-500/20 to-amber-500/5',
    },
    {
      key: 'streak',
      label: 'Серия тренировок',
      value: `${Math.max(1, Math.min(99, 7 + todayVerses.length))} дн.`,
      hint: 'Демо-показатель до подключения реальной статистики',
      icon: Flame,
      accent: 'from-rose-500/20 to-rose-500/5',
    },
  ] as const;

  const dashboardVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.07,
        delayChildren: shouldReduceMotion ? 0 : 0.03,
      },
    },
  };

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
  };

  const groupStaggerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.06,
        delayChildren: shouldReduceMotion ? 0 : 0.02,
      },
    },
  };

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
  };

  return (
    <motion.div
      className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto"
      initial="hidden"
      animate="show"
      variants={dashboardVariants}
    >
      {/* Welcome Section with Telegram User */}
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
          У вас {todayVerses.length} {todayVerses.length === 1 ? 'стих' : todayVerses.length < 5 ? 'стиха' : 'стихов'} для изучения сегодня.
        </p>
      </motion.div>

      <motion.div className="flex flex-col sm:flex-row gap-3 mb-8" variants={sectionVariants}>
        <Button
          onClick={onStartTraining}
          variant="default"
          size="lg"
          className="flex-1 py-3 sm:flex-initial rounded-3xl"
        >
          <Dumbbell className="w-4 h-4 mr-2" />
          Начать тренировку
        </Button>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-6 mb-8"
        variants={groupStaggerVariants}
      >
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
                  <Badge className="rounded-full px-3 py-1">Краткая статистика</Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    Сегодня
                  </Badge>
                </div>
                <h2 className="text-lg sm:text-xl font-semibold">Ваш тренировочный план</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Короткий обзор по подборке на текущую сессию.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-right">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Среднее освоение
                </div>
                <div className="text-2xl font-semibold mt-1">{avgMasteryPercent}%</div>
              </div>
            </div>

            <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-3" variants={groupStaggerVariants}>
              {statsCards.map((item) => {
                const Icon = item.icon;
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
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{item.hint}</p>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div className="mt-5 rounded-2xl border border-border/70 bg-background/60 p-4" variants={cardItemVariants}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-sm font-medium">Подготовка к тренировке</div>
                <div className="text-xs text-muted-foreground">
                  {todayVerses.length === 0 ? 'Нет стихов в плане' : `${todayVerses.length} стихов в сессии`}
                </div>
              </div>
              <Progress value={todayVerses.length === 0 ? 0 : Math.min(100, 25 + todayVerses.length * 8)} className="h-2.5" />
            </motion.div>
          </div>
          </Card>
        </motion.div>

        <motion.div variants={cardItemVariants}>
          <Card className="border-border/70 rounded-3xl p-5 sm:p-6 gap-0 bg-gradient-to-b from-background to-primary/5">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Рейтинг
                </Badge>
                <Badge className="rounded-full px-3 py-1">Топ недели</Badge>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">Лучшие игроки</h2>
              <p className="text-sm text-muted-foreground mt-1">
                По точности и регулярности тренировок.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-2.5">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
          </div>

          <motion.div className="space-y-3" variants={groupStaggerVariants}>
            {MOCK_LEADERBOARD.map((entry, index) => {
              const rank = index + 1;
              const rankBadge = getRankBadge(rank);
              const RankIcon = rankBadge.icon;

              return (
                <motion.div
                  key={entry.id}
                  variants={cardItemVariants}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 transition-colors hover:bg-accent/40"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${rankBadge.className}`}
                    aria-hidden="true"
                  >
                    <RankIcon className="h-4 w-4" />
                  </div>

                  <Avatar className="h-10 w-10 border border-border/60">
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
                    <div className="text-[11px] text-muted-foreground mt-1">точность</div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/50 p-4" variants={cardItemVariants}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Ваш шанс подняться в топ</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Завершите сегодняшнюю тренировку без ошибок для роста рейтинга.
                </div>
              </div>
              <Badge className="rounded-full px-3 py-1">{Math.max(55, avgMasteryPercent)} pts</Badge>
            </div>
          </motion.div>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
