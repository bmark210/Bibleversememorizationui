'use client'

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BookPlus,
  CheckCircle2,
  ChevronRight,
  Compass,
  Crown,
  Dumbbell,
  Flame,
  Medal,
  Plus,
  Repeat,
  Settings2,
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
import type { DashboardDailyGoalCardModel } from '@/app/features/daily-goal/types';

interface DashboardProps {
  todayVerses: Array<Verse>;
  onStartTraining: () => void;
  onAddVerse: () => void;
  onViewAll: () => void;
  dailyGoal: DashboardDailyGoalCardModel;
  onStartDailyGoal: () => void;
  onResumeDailyGoal: () => void;
  onOpenTrainingPlanSettings: () => void;
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

export function Dashboard({
  todayVerses,
  onStartTraining,
  onAddVerse,
  onViewAll,
  dailyGoal,
  onStartDailyGoal,
  onResumeDailyGoal,
  onOpenTrainingPlanSettings,
}: DashboardProps) {
  const { user } = useTelegram();
  const shouldReduceMotion = useReducedMotion();
  const now = Date.now();

  const learningVersesCount = todayVerses.filter((verse) => verse.status === 'LEARNING').length;
  const reviewVersesCount = todayVerses.filter((verse) => verse.status === 'REVIEW').length;
  const dueReviewCount = todayVerses.filter((verse) => {
    if (verse.status !== 'REVIEW') return false;
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
      hint: `${learningVersesCount} в изучении · ${reviewVersesCount} повторений`,
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

  const dailyGoalProgressPercent =
    dailyGoal.ui.progressCounts.newTotal + dailyGoal.ui.progressCounts.reviewTotal > 0
      ? clampPercent(
          ((dailyGoal.ui.progressCounts.newDone + dailyGoal.ui.progressCounts.reviewDone) /
            Math.max(
              1,
              dailyGoal.ui.progressCounts.newTotal + dailyGoal.ui.progressCounts.reviewTotal
            )) *
            100
        )
      : 0;
  const dailyGoalPhaseLabel =
    dailyGoal.ui.phase === 'learning'
      ? 'Этап 1: Изучение'
      : dailyGoal.ui.phase === 'review'
        ? 'Этап 2: Повторение'
        : dailyGoal.ui.phase === 'completed'
          ? 'Цель выполнена'
          : 'Цель на сегодня';
  const dailyGoalActionLabel = dailyGoal.ui.isActive ? 'Продолжить цель' : 'Начать ежедневную цель';
  const dailyGoalActionHandler = dailyGoal.ui.isActive ? onResumeDailyGoal : onStartDailyGoal;

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

      <motion.div className="mb-5" variants={sectionVariants}>
        <Card
          data-tour-id="daily-goal-card"
          className="relative overflow-hidden rounded-3xl border-border/70 bg-gradient-to-br from-amber-400/10 via-background to-emerald-500/5 p-5 sm:p-6 gap-0"
        >
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -top-12 -right-8 h-36 w-36 rounded-full bg-amber-400/15 blur-3xl" />
            <div className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className="rounded-full px-3 py-1">Ежедневная цель</Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {dailyGoalPhaseLabel}
                  </Badge>
                  {dailyGoal.onboardingPending && (
                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-1 border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                    >
                      Новый сценарий
                    </Badge>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-semibold">План на сегодня</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {dailyGoal.needsFirstVerse
                    ? 'Добавьте первый стих, чтобы начать ежедневную цель и получить персональную тренировку.'
                    : dailyGoal.needsLearningVersesForGoal
                      ? 'Для выполнения ежедневной цели нужны стихи в статусе LEARNING. Добавьте новый стих или переведите существующий в изучение.'
                    : dailyGoal.ui.isCompleted
                      ? 'Отличная работа. Сегодняшняя цель закрыта.'
                      : dailyGoal.ui.isEmpty
                        ? 'Сегодня нет доступных стихов для полной цели. Можно скорректировать план или добавить новый стих.'
                        : dailyGoal.reviewStageWillBeSkipped
                          ? 'Сегодня этап повторения будет пропущен: нет стихов в статусе REVIEW. Достаточно завершить этап изучения.'
                          : 'Идём по шагам: сначала стихи в изучении, затем повторение.'}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-right min-w-[150px]">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Прогресс цели
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{dailyGoalProgressPercent}%</div>
              </div>
            </div>

            {!dailyGoal.needsFirstVerse && (
              <div className="mt-4 rounded-2xl border border-border/60 bg-background/55 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium">Выполнение по этапам</div>
                  <div className="text-xs text-muted-foreground">
                    Запрошено: {dailyGoal.requestedCounts.new} в изучении · {dailyGoal.requestedCounts.review} повторений
                  </div>
                </div>
                <Progress value={dailyGoalProgressPercent} className="h-2.5" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-emerald-700/80 dark:text-emerald-300/80">
                      Изучение
                    </div>
                    <div className="mt-1 font-semibold tabular-nums">
                      {dailyGoal.ui.progressCounts.newDone}/{dailyGoal.ui.progressCounts.newTotal}
                    </div>
                  </div>
                  <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-violet-700/80 dark:text-violet-300/80">
                      Повторение
                    </div>
                    <div className="mt-1 font-semibold tabular-nums">
                      {dailyGoal.ui.progressCounts.reviewDone}/{dailyGoal.ui.progressCounts.reviewTotal}
                    </div>
                  </div>
                </div>
                {dailyGoal.nextTargetReference && !dailyGoal.ui.isCompleted && !dailyGoal.ui.isEmpty ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/75 px-3 py-2 text-sm">
                    <Compass className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Следующий шаг:</span>
                    <span className="font-medium truncate">{dailyGoal.nextTargetReference}</span>
                  </div>
                ) : null}
                {dailyGoal.shortageHints.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dailyGoal.shortageHints.map((hint) => (
                      <Badge
                        key={hint}
                        variant="outline"
                        className="rounded-full px-3 py-1 border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      >
                        {hint}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {dailyGoal.needsFirstVerse ? (
                <>
                  <Button
                    type="button"
                    onClick={onAddVerse}
                    className="flex-1 sm:flex-initial rounded-2xl gap-2"
                    data-tour-id="daily-goal-add-first-verse"
                  >
                    <BookPlus className="w-4 h-4" />
                    Добавить первый стих
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onViewAll}
                    className="rounded-2xl gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Открыть раздел «Стихи»
                  </Button>
                </>
              ) : dailyGoal.needsLearningVersesForGoal ? (
                <>
                  <Button
                    type="button"
                    onClick={onAddVerse}
                    className="flex-1 sm:flex-initial rounded-2xl gap-2"
                  >
                    <BookPlus className="w-4 h-4" />
                    Добавить стих
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onViewAll}
                    className="rounded-2xl gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Открыть «Стихи»
                  </Button>
                </>
              ) : dailyGoal.ui.isCompleted ? (
                <>
                  <Button
                    type="button"
                    onClick={onViewAll}
                    className="flex-1 sm:flex-initial rounded-2xl gap-2"
                    data-tour-id="daily-goal-view-verses"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Цель выполнена
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onOpenTrainingPlanSettings}
                    className="rounded-2xl gap-2"
                    data-tour-id="daily-goal-open-plan-settings"
                  >
                    <Settings2 className="w-4 h-4" />
                    Настроить план
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={dailyGoalActionHandler}
                    disabled={!dailyGoal.canStart}
                    className="flex-1 sm:flex-initial rounded-2xl gap-2"
                    data-tour-id="daily-goal-start-cta"
                  >
                    <Target className="w-4 h-4" />
                    {dailyGoalActionLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onOpenTrainingPlanSettings}
                    className="rounded-2xl gap-2"
                    data-tour-id="daily-goal-plan-settings-cta"
                  >
                    <Settings2 className="w-4 h-4" />
                    Настроить план
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* <motion.div className="flex flex-col sm:flex-row gap-3 mb-8" variants={sectionVariants}>
        <Button
          onClick={onStartTraining}
          variant="default"
          size="lg"
          className="flex-1 py-3 sm:flex-initial rounded-3xl"
        >
          <Dumbbell className="w-4 h-4 mr-2" />
          Начать тренировку
        </Button>
      </motion.div> */}

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
