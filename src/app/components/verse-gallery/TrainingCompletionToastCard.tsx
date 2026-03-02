'use client';

import { Clock3, Repeat, Trophy } from 'lucide-react';
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

const TRAINING_CONTACT_TOAST_ID = 'verse-gallery-training-contact';
const TRAINING_MILESTONE_TOAST_ID = 'verse-gallery-training-milestone';
const DEFAULT_TOAST_DURATION_MS = 3200;
const DEFAULT_MILESTONE_TOAST_DURATION_MS = 10000;

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
      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : 'border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300';
  const outcomeLabel = payload.outcome === 'success' ? 'Прогресс есть' : 'Без прогресса';

  return (
    <div
      className={cn(
        'w-[min(94vw,40rem)] rounded-2xl border px-4 py-3 shadow-xl backdrop-blur',
        theme.content
      )}
    >
      <div className="space-y-3">
        <div className="pb-1">
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
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    outcomeBadgeClassName
                  )}
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
              <div className="text-left text-lg font-semibold leading-snug">{payload.title}</div>
              <div className="mt-1 text-left text-sm leading-relaxed text-muted-foreground">
                {payload.description}
              </div>
            </div>
          </div>
        </div>

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

        <div className="flex justify-end">
          <Button type="button" size="sm" className="h-8 px-3" onClick={onClose}>
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
