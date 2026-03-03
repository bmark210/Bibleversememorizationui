'use client'

import React, { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Bell, Moon, Palette, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { toast } from '@/app/lib/toast';
import {
  fetchUserNotificationSettings,
  updateUserNotificationSettings,
} from '@/api/services/userNotifications';

type Theme = 'light' | 'dark';

type TrainingBatchPreferences = {
  newVersesCount: number;
  reviewVersesCount: number;
};

interface ProfileProps {
  telegramId?: string | null;
  theme: Theme;
  onToggleTheme: () => void;
  trainingBatchPreferences: TrainingBatchPreferences | null;
  selectedNewVersesCount: number;
  selectedReviewVersesCount: number;
  newVerseOptions: readonly number[];
  reviewVerseOptions: readonly number[];
  onNewVersesCountChange: (value: number) => void;
  onReviewVersesCountChange: (value: number) => void;
  onSaveTrainingPlan: () => void | Promise<void>;
  isSavingTrainingPlan?: boolean;
  dailyStreak?: number;
}

const WEEKLY_GOAL_OPTIONS = [50, 100, 150, 200, 300, 500] as const;

function getClientTimezone(): string {
  if (typeof window === 'undefined') return 'UTC';
  const value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return typeof value === 'string' && value.trim() ? value : 'UTC';
}

export function Profile({
  telegramId,
  theme,
  onToggleTheme,
}: ProfileProps) {
  const shouldReduceMotion = useReducedMotion();
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [weeklyGoal, setWeeklyGoal] = useState<string>('100');
  const [botConnected, setBotConnected] = useState(false);
  const [botStartLink, setBotStartLink] = useState<string | null>(null);
  const [openAppUrl, setOpenAppUrl] = useState('');
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const applyNotificationState = useCallback((payload: {
    reminderEnabled: boolean;
    reminderTime: string;
    weeklyGoal: number;
    botConnected: boolean;
    botStartLink: string | null;
    openAppUrl: string;
  }) => {
    setRemindersEnabled(payload.reminderEnabled);
    setReminderTime(payload.reminderTime);
    setWeeklyGoal(String(payload.weeklyGoal));
    setBotConnected(payload.botConnected);
    setBotStartLink(payload.botStartLink);
    setOpenAppUrl(payload.openAppUrl);
  }, []);

  useEffect(() => {
    if (!telegramId) {
      applyNotificationState({
        reminderEnabled: false,
        reminderTime: '20:00',
        weeklyGoal: 100,
        botConnected: false,
        botStartLink: null,
        openAppUrl: '',
      });
      return;
    }

    let isMounted = true;
    setIsLoadingNotifications(true);

    void (async () => {
      try {
        const settings = await fetchUserNotificationSettings(telegramId);
        if (!isMounted) return;
        applyNotificationState(settings);
      } catch (error) {
        console.error('Не удалось загрузить настройки уведомлений:', error);
        if (!isMounted) return;
        toast.error('Не удалось загрузить настройки профиля');
      } finally {
        if (isMounted) {
          setIsLoadingNotifications(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [telegramId, applyNotificationState]);

  const handleSaveNotifications = async () => {
    if (!telegramId) {
      toast.error('Telegram ID не найден');
      return;
    }

    setIsSavingNotifications(true);
    try {
      const settings = await updateUserNotificationSettings(telegramId, {
        reminderEnabled: remindersEnabled,
        reminderTime,
        weeklyGoal: Number(weeklyGoal),
        reminderTimezone: getClientTimezone(),
      });
      applyNotificationState(settings);
      toast.success('Настройки сохранены', {
        description: 'Напоминания и цель недели обновлены.',
      });
    } catch (error) {
      console.error('Не удалось сохранить настройки уведомлений:', error);
      toast.error(
        error instanceof Error ? error.message : 'Не удалось сохранить настройки'
      );
    } finally {
      setIsSavingNotifications(false);
    }
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
        duration: shouldReduceMotion ? 0 : 0.24,
        ease: 'easeOut' as const,
      },
    },
  };

  const isBusy = isLoadingNotifications || isSavingNotifications;

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
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: shouldReduceMotion ? 0 : 0.06,
                delayChildren: shouldReduceMotion ? 0 : 0.02,
              },
            },
          }}
          className="space-y-6"
        >
          <motion.div className="mb-2" variants={sectionVariants}>
            <h1 className="mb-1">Профиль</h1>
            <p className="text-muted-foreground">
              Оформление приложения и напоминания для регулярных тренировок.
            </p>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <Card className="relative overflow-hidden border-border/70 rounded-3xl bg-gradient-to-br from-primary/10 via-background to-amber-500/5 p-5 sm:p-6 gap-0">
              <div className="pointer-events-none absolute inset-0 opacity-65">
                <div className="absolute -top-20 -right-14 h-48 w-48 rounded-full bg-primary/15 blur-2xl" />
                <div className="absolute -bottom-16 left-0 h-36 w-36 rounded-full bg-amber-500/10 blur-2xl" />
              </div>

              <div className="relative space-y-4">
                <h3 className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Оформление
                </h3>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="space-y-1">
                    <Label className="text-sm">Тема приложения</Label>
                    <p className="text-sm text-muted-foreground">
                      Сейчас активна {theme === 'dark' ? 'тёмная' : 'светлая'} тема.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onToggleTheme}
                    className="gap-2 rounded-full border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60"
                    aria-label={`Переключить на ${theme === 'light' ? 'тёмную' : 'светлую'} тему`}
                  >
                    <Sun className={`w-4 h-4 ${theme === 'dark' ? 'hidden' : 'block'}`} />
                    <Moon className={`w-4 h-4 ${theme === 'dark' ? 'block' : 'hidden'}`} />
                    <span>{theme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={sectionVariants}>
            <Card className="border-border/70 rounded-3xl p-5 sm:p-6 gap-0 bg-gradient-to-b from-background to-emerald-500/5">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Напоминания и цели
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Напоминания в Telegram отправляются только для стихов, которые уже ждут повторения.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-border/70 bg-background/65 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-muted-foreground">
                      Статус бота:{' '}
                      <span className={botConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                        {botConnected ? 'Подключен' : 'Не подключен'}
                      </span>
                    </div>

                    {botStartLink ? (
                      <Button asChild type="button" variant="outline" size="sm">
                        <a href={botStartLink} target="_blank" rel="noreferrer">
                          Открыть бота
                        </a>
                      </Button>
                    ) : null}
                  </div>
                  {!botConnected && openAppUrl ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      После команды <code>/start</code> бот покажет кнопку открытия приложения: {openAppUrl}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Ежедневные напоминания</Label>
                    <p className="text-sm text-muted-foreground">
                      По умолчанию выключены. Включите, чтобы получать напоминания в Telegram.
                    </p>
                  </div>
                  <Switch
                    checked={remindersEnabled}
                    onCheckedChange={setRemindersEnabled}
                    disabled={isBusy}
                    aria-label="Включить ежедневные напоминания"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="reminder-time" className="text-sm">
                    Время напоминания
                  </Label>
                  <Input
                    id="reminder-time"
                    type="time"
                    value={reminderTime}
                    disabled={!remindersEnabled || isBusy}
                    onChange={(event) => setReminderTime(event.target.value)}
                    className="max-w-[180px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Часовой пояс будет сохранён автоматически: {getClientTimezone()}.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="weekly-goal" className="text-sm">
                    Цель повторений на неделю
                  </Label>
                  <Select
                    value={weeklyGoal}
                    onValueChange={setWeeklyGoal}
                    disabled={isBusy}
                  >
                    <SelectTrigger id="weekly-goal" className="max-w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKLY_GOAL_OPTIONS.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value} повторений
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/65 p-3 text-sm text-muted-foreground">
                  Напоминание придёт только когда в вашей очереди есть стихи на повторение.
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => void handleSaveNotifications()}
                    disabled={isBusy || !telegramId}
                  >
                    {isSavingNotifications
                      ? 'Сохраняем...'
                      : isLoadingNotifications
                        ? 'Загрузка...'
                        : 'Сохранить'}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
