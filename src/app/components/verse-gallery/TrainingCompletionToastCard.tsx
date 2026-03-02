'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Minus,
  Repeat,
  Trophy,
} from 'lucide-react';
import { toast } from '@/app/lib/toast';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
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

type TrainingCompletionToastCardProps = {
  payload: TrainingCompletionToastCardPayload | null;
  onClose: () => void;
};

const TRAINING_CONTACT_TOAST_ID = 'verse-gallery-training-contact';
const DEFAULT_TOAST_DURATION_MS = 3200;

function getContactToneTheme(tone: TrainingContactToastPayload['tone']) {
  if (tone === 'positive') {
    return {
      Icon: ArrowUpRight,
      icon: 'text-emerald-700 dark:text-emerald-300',
      shell: 'border-emerald-500/25 bg-emerald-500/8',
    } as const;
  }
  if (tone === 'negative') {
    return {
      Icon: ArrowDownRight,
      icon: 'text-rose-700 dark:text-rose-300',
      shell: 'border-rose-500/25 bg-rose-500/8',
    } as const;
  }
  return {
    Icon: Minus,
    icon: 'text-muted-foreground',
    shell: 'border-border/70 bg-background/95',
  } as const;
}

export function showTrainingContactToast(
  payload: TrainingContactToastPayload,
  options?: { durationMs?: number; toasterId?: string }
) {
  const durationMs = options?.durationMs ?? DEFAULT_TOAST_DURATION_MS;
  const theme = getContactToneTheme(payload.tone);
  const Icon = theme.Icon;

  toast.dismiss(TRAINING_CONTACT_TOAST_ID);
  toast.custom(
    () => (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          'w-[min(92vw,24rem)] rounded-xl border px-3 py-2.5 shadow-lg backdrop-blur',
          theme.shell
        )}
      >
        <div className="flex items-start gap-2.5">
          <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', theme.icon)} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] text-muted-foreground">{payload.reference}</div>
            <div className="mt-0.5 text-sm font-medium leading-tight">{payload.message}</div>
            {payload.hint ? (
              <div className="mt-0.5 text-xs leading-tight text-muted-foreground">{payload.hint}</div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    {
      id: TRAINING_CONTACT_TOAST_ID,
      position: 'top-center',
      duration: durationMs,
      toasterId: options?.toasterId,
    }
  );
}

function getMilestoneTheme(status: DisplayVerseStatus) {
  if (status === 'MASTERED') {
    return {
      label: 'Выучен',
      Icon: Trophy,
      content:
        'border-amber-500/45 bg-gradient-to-br from-amber-500/8 via-background to-amber-500/4',
      iconWrap: 'border-amber-500/35 bg-amber-500/16 text-amber-700 dark:text-amber-300',
      badge: 'border-amber-500/35 bg-amber-500/14 text-amber-700 dark:text-amber-300',
    } as const;
  }
  return {
    label: 'Повторение',
    Icon: Repeat,
    content: 'border-cyan-500/40 bg-gradient-to-br from-cyan-500/8 via-background to-cyan-500/4',
    iconWrap: 'border-cyan-500/30 bg-cyan-500/14 text-cyan-700 dark:text-cyan-300',
    badge: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300',
  } as const;
}

export function TrainingCompletionToastCard({ payload, onClose }: TrainingCompletionToastCardProps) {
  if (!payload) return null;

  const theme = getMilestoneTheme(payload.status);
  const Icon = theme.Icon;
  const progressDelta = payload.afterProgressPercent - payload.beforeProgressPercent;
  const deltaLabel =
    progressDelta > 0 ? `+${progressDelta}%` : progressDelta < 0 ? `${progressDelta}%` : '0%';
  const outcomeBadgeClassName =
    payload.outcome === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : 'border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300';
  const outcomeLabel = payload.outcome === 'success' ? 'Прогресс есть' : 'Без прогресса';

  return (
    <AlertDialog open={true}>
      <AlertDialogContent
        aria-label="Ключевой этап завершён"
        className={cn(
          'z-[120] sm:max-w-[40rem] border shadow-2xl',
          theme.content
        )}
      >
        <AlertDialogHeader className="pb-1">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl border',
                theme.iconWrap
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn('rounded-full px-3 py-1 text-xs font-medium', outcomeBadgeClassName)}
                >
                  {outcomeLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('rounded-full px-3 py-1 text-xs font-medium', theme.badge)}
                >
                  {theme.label}
                </Badge>
              </div>
              <AlertDialogTitle className="text-left text-lg leading-snug">
                {payload.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1 text-left text-sm leading-relaxed">
                {payload.description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-background/65 px-3 py-2">
            <div className="text-xs text-muted-foreground">{payload.reference}</div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Ступень {payload.masteryLevel}/{TRAINING_STAGE_MASTERY_MAX} · Повторы{' '}
                {payload.repetitions}/{REPEAT_THRESHOLD_FOR_MASTERED}
              </span>
              <span className="font-semibold tabular-nums text-foreground/85">
                {payload.afterProgressPercent}% ({deltaLabel})
              </span>
            </div>
            <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted/40">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary/85 transition-[width] duration-500 ease-out"
                style={{ width: `${payload.afterProgressPercent}%` }}
              />
            </div>
          </div>

          {payload.status === 'REVIEW' ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              Стих перешёл на интервальное повторение.
            </div>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogAction type="button" className="w-full sm:w-auto" onClick={onClose}>
            Понятно
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
