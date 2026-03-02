'use client';

import { CalendarCheck2, Clock3, Repeat, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import type { DisplayVerseStatus } from '@/app/types/verseStatus';
import {
  REPEAT_THRESHOLD_FOR_MASTERED,
  TRAINING_STAGE_MASTERY_MAX,
} from '@/shared/training/constants';

export type TrainingContactToastPayload = {
  id: number;
  reference: string;
  message: string;
  hint?: string;
  tone: 'positive' | 'negative' | 'neutral';
};

export type TrainingCompletionToastCardPayload = {
  id: number;
  reference: string;
  status: DisplayVerseStatus;
  title: string;
  description: string;
  outcome: 'success' | 'fail';
  beforeProgressPercent: number;
  afterProgressPercent: number;
  masteryLevel: number;
  repetitions: number;
};

export type DailyGoalCompletionToastPayload = {
  dayKey: string;
  learningDone: number;
  learningTotal: number;
  reviewDone: number;
  reviewTotal: number;
  reviewSkipped: boolean;
  reviewPending: boolean;
};

const TRAINING_CONTACT_TOAST_ID = 'verse-gallery-training-contact';
const TRAINING_MILESTONE_TOAST_ID = 'verse-gallery-training-milestone';
const DAILY_GOAL_COMPLETION_TOAST_ID = 'daily-goal-completion';
const DEFAULT_TOAST_DURATION_MS = 3200;
const DEFAULT_MILESTONE_TOAST_DURATION_MS = 10000;
const DEFAULT_DAILY_GOAL_TOAST_DURATION_MS = 12000;

// ─── Contact toast ────────────────────────────────────────────────────────────
// Fully library-driven: Sonner handles enter/exit animation, auto-dismiss,
// swipe-to-dismiss and stacking. tone maps to success / error / neutral.

export function showTrainingContactToast(
  payload: TrainingContactToastPayload,
  options?: { durationMs?: number; toasterId?: string }
) {
  const durationMs = options?.durationMs ?? DEFAULT_TOAST_DURATION_MS;
  const description = payload.hint
    ? `${payload.reference}  ·  ${payload.hint}`
    : payload.reference;

  const shared = {
    id: TRAINING_CONTACT_TOAST_ID,
    description,
    duration: durationMs,
    toasterId: options?.toasterId,
  } as const;

  // No explicit dismiss — Sonner updates the existing toast in-place when the
  // same id is reused. Calling dismiss first starts an exit animation that
  // sweeps the newly created toast away before it can settle.
  if (payload.tone === 'positive') {
    toast.success(payload.message, shared);
  } else if (payload.tone === 'negative') {
    toast.error(payload.message, shared);
  } else {
    toast(payload.message, shared);
  }
}

// ─── Milestone toast ──────────────────────────────────────────────────────────
// Uses toast.custom() so the card is fully bespoke, while Sonner still handles
// enter/exit animations, auto-dismiss, swipe-to-dismiss and stacking.

function getMilestoneTheme(status: DisplayVerseStatus) {
  if (status === 'MASTERED') {
    return {
      label: 'Выучен',
      Icon: Trophy,
      shellBorder: 'border-amber-300/42',
      iconWrap:
        'border-amber-300/38 bg-gradient-to-br from-amber-300/22 via-amber-300/12 to-amber-300/6 text-amber-100',
      badge:
        'border-amber-300/38 bg-gradient-to-r from-amber-300/16 to-orange-300/10 text-amber-100',
      glow: 'bg-amber-300/22',
      line: 'from-amber-300/0 via-amber-300/65 to-orange-300/0',
      progress: 'from-amber-300 via-orange-300 to-emerald-200',
    } as const;
  }
  return {
    label: 'Повторение',
    Icon: Repeat,
    shellBorder: 'border-violet-300/42',
    iconWrap:
      'border-violet-300/36 bg-gradient-to-br from-violet-300/20 via-violet-300/10 to-sky-300/12 text-violet-100',
    badge:
      'border-violet-300/34 bg-gradient-to-r from-violet-300/16 to-sky-300/12 text-violet-100',
    glow: 'bg-violet-300/24',
    line: 'from-violet-300/0 via-violet-300/62 to-sky-300/0',
    progress: 'from-violet-300 via-sky-300 to-amber-200',
  } as const;
}

function TrainingMilestoneCard({
  payload,
  onClose,
}: {
  payload: TrainingCompletionToastCardPayload;
  onClose: () => void;
}) {
  const theme = getMilestoneTheme(payload.status);
  const Icon = theme.Icon;
  const progressDelta = payload.afterProgressPercent - payload.beforeProgressPercent;
  const deltaLabel =
    progressDelta > 0 ? `+${progressDelta}%` : progressDelta < 0 ? `${progressDelta}%` : '0%';
  const outcomeBadgeClassName =
    payload.outcome === 'success'
      ? 'border-emerald-300/36 bg-gradient-to-r from-emerald-300/16 to-emerald-200/10 text-emerald-100'
      : 'border-rose-300/36 bg-gradient-to-r from-rose-300/16 to-orange-300/10 text-rose-100';
  const outcomeLabel = payload.outcome === 'success' ? 'Прогресс есть' : 'Без прогресса';

  return (
    <div
      className={cn(
        'relative w-[min(94vw,40rem)] overflow-hidden rounded-[1.45rem] border bg-gradient-to-br from-[#2e1d10]/96 via-[#2b1f41]/95 to-[#173744]/94 px-4 py-4 text-zinc-100 shadow-[0_34px_90px_-38px_rgba(0,0,0,0.85)] backdrop-blur-xl',
        theme.shellBorder
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-8 -top-14 h-40 w-44 rounded-full blur-3xl',
          theme.glow
        )}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 left-14 h-40 w-56 rounded-full bg-sky-300/16 blur-3xl"
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-8 right-8 top-0 h-px bg-gradient-to-r',
          theme.line
        )}
      />
      <div className="space-y-3">
        <div className="pb-0.5">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
                theme.iconWrap
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold',
                    outcomeBadgeClassName
                  )}
                >
                  {outcomeLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('rounded-full border px-3 py-1 text-xs font-semibold', theme.badge)}
                >
                  {theme.label}
                </Badge>
              </div>
              <div className="text-left text-[2rem] font-semibold leading-[1.15] text-zinc-50 sm:text-[2.05rem]">
                {payload.title}
              </div>
              <div className="mt-2 text-left text-[1.04rem] leading-relaxed text-zinc-200/92">
                {payload.description}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="rounded-[1rem] border border-white/12 bg-black/30 px-3.5 py-2.5 backdrop-blur-md">
            <div className="text-sm font-semibold text-zinc-100/88">{payload.reference}</div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-sm text-zinc-300/86">
              <span>
                Ступень {payload.masteryLevel}/{TRAINING_STAGE_MASTERY_MAX} · Повторы{' '}
                {payload.repetitions}/{REPEAT_THRESHOLD_FOR_MASTERED}
              </span>
              <span className="font-semibold tabular-nums text-zinc-100">
                {payload.afterProgressPercent}% ({deltaLabel})
              </span>
            </div>
            <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out',
                  theme.progress
                )}
                style={{ width: `${payload.afterProgressPercent}%` }}
              />
            </div>
          </div>

          {payload.status === 'REVIEW' ? (
            <div className="flex items-center gap-2 text-sm text-zinc-300/82">
              <Clock3 className="h-3.5 w-3.5" />
              Стих перешёл на интервальное повторение.
            </div>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="h-10 rounded-xl border border-[#ebc992]/60 bg-[#d5ad72] px-4 text-base font-semibold text-[#2f2113] shadow-[0_18px_34px_-24px_rgba(255,201,131,0.85)] transition-colors hover:bg-[#dfba83]"
            onClick={onClose}
          >
            Понятно
          </Button>
        </div>
      </div>
    </div>
  );
}

export function showTrainingMilestoneToast(
  payload: TrainingCompletionToastCardPayload,
  options?: { durationMs?: number; toasterId?: string }
) {
  const durationMs = options?.durationMs ?? DEFAULT_MILESTONE_TOAST_DURATION_MS;
  toast.custom(
    (toastId) => (
      <TrainingMilestoneCard
        payload={payload}
        onClose={() => toast.dismiss(toastId)}
      />
    ),
    {
      id: TRAINING_MILESTONE_TOAST_ID,
      duration: durationMs,
      toasterId: options?.toasterId,
    }
  );
}

function formatDayKey(dayKey: string): string {
  const [yearRaw, monthRaw, dayRaw] = dayKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return dayKey;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return dayKey;

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function DailyGoalCompletionToastCard({
  payload,
  onClose,
}: {
  payload: DailyGoalCompletionToastPayload;
  onClose: () => void;
}) {
  return (
    <div className="relative w-[min(94vw,40rem)] overflow-hidden rounded-[1.45rem] border border-emerald-300/44 bg-gradient-to-br from-[#2e1e10]/96 via-[#22314b]/95 to-[#1c3528]/95 px-4 py-4 text-zinc-100 shadow-[0_34px_90px_-38px_rgba(0,0,0,0.85)] backdrop-blur-xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-44 rounded-full bg-emerald-300/22 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-14 left-12 h-40 w-56 rounded-full bg-sky-300/18 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-emerald-300/0 via-emerald-300/65 to-sky-300/0"
      />

      <div className="space-y-3.5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] border border-amber-300/40 bg-gradient-to-br from-amber-300/25 via-amber-300/10 to-amber-300/6 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border border-emerald-300/36 bg-gradient-to-r from-emerald-300/18 to-sky-300/12 px-3 py-1 text-xs font-semibold text-emerald-100"
              >
                Цель дня закрыта
              </Badge>
            </div>
            <div className="text-left text-[2rem] font-semibold leading-[1.15] text-zinc-50 sm:text-[2.05rem]">
              Ежедневная цель выполнена
            </div>
            <div className="mt-2 flex items-center gap-2 text-[1.02rem] text-zinc-200/92">
              <CalendarCheck2 className="h-4 w-4" />
              {formatDayKey(payload.dayKey)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="rounded-[1rem] border border-emerald-300/32 bg-emerald-300/10 px-3.5 py-2.5">
            <div className="text-xs uppercase tracking-[0.11em] text-emerald-100/78">Изучение</div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
              {payload.learningDone}/{payload.learningTotal}
            </div>
          </div>
          <div className="rounded-[1rem] border border-violet-300/30 bg-violet-300/10 px-3.5 py-2.5">
            <div className="text-xs uppercase tracking-[0.11em] text-violet-100/78">
              {payload.reviewSkipped ? 'Повторение (пропущено)' : payload.reviewPending ? 'Повторение (не готово)' : 'Повторение'}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
              {payload.reviewSkipped ? 'Пропущено' : payload.reviewPending ? 'Позже' : `${payload.reviewDone}/${payload.reviewTotal}`}
            </div>
          </div>
        </div>

        <div className="rounded-[1rem] border border-white/12 bg-black/28 px-3.5 py-2.5 text-sm text-zinc-300/86">
          Прогресс сохранён. Можно продолжать тренировку.
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="h-10 rounded-xl border border-[#ebc992]/60 bg-[#d5ad72] px-4 text-base font-semibold text-[#2f2113] shadow-[0_18px_34px_-24px_rgba(255,201,131,0.85)] transition-colors hover:bg-[#dfba83]"
            onClick={onClose}
          >
            Отлично
          </Button>
        </div>
      </div>
    </div>
  );
}

export function showDailyGoalCompletionToast(
  payload: DailyGoalCompletionToastPayload,
  options?: { durationMs?: number; toasterId?: string }
) {
  const durationMs = options?.durationMs ?? DEFAULT_DAILY_GOAL_TOAST_DURATION_MS;
  toast.custom(
    (toastId) => (
      <DailyGoalCompletionToastCard
        payload={payload}
        onClose={() => toast.dismiss(toastId)}
      />
    ),
    {
      id: `${DAILY_GOAL_COMPLETION_TOAST_ID}-${payload.dayKey}`,
      duration: durationMs,
      toasterId: options?.toasterId,
    }
  );
}
