'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Minus,
  Repeat,
  Trophy,
  X,
} from 'lucide-react';
import { toast } from '@/app/lib/toast';
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

type TrainingCompletionToastCardProps = {
  payload: TrainingCompletionToastCardPayload | null;
  onClose: () => void;
  autoCloseMs?: number;
};

const TRAINING_CONTACT_TOAST_ID = 'verse-gallery-training-contact';
const DEFAULT_TOAST_DURATION_MS = 3200;
const DEFAULT_POPUP_AUTOCLOSE_MS = 10000;

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
  options?: { durationMs?: number }
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
    }
  );
}

function getPopupTheme(status: DisplayVerseStatus) {
  if (status === 'MASTERED') {
    return {
      label: 'Выучен',
      Icon: Trophy,
      shell:
        'border-amber-500/35 bg-gradient-to-br from-amber-500/16 via-background/95 to-amber-500/8 shadow-[0_28px_56px_rgba(0,0,0,0.34)]',
      iconWrap: 'border-amber-500/35 bg-amber-500/16 text-amber-700 dark:text-amber-300',
      badge: 'border-amber-500/35 bg-amber-500/14 text-amber-700 dark:text-amber-300',
      accentLine: 'from-amber-500/65 via-amber-400/70 to-amber-500/25',
      glow: 'from-amber-500/14 via-amber-500/6 to-transparent',
    } as const;
  }
  if (status === 'REVIEW') {
    return {
      label: 'Повторение',
      Icon: Repeat,
      shell:
        'border-cyan-500/30 bg-gradient-to-br from-cyan-500/12 via-background/95 to-cyan-500/5 shadow-[0_28px_56px_rgba(0,0,0,0.32)]',
      iconWrap: 'border-cyan-500/30 bg-cyan-500/14 text-cyan-700 dark:text-cyan-300',
      badge: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300',
      accentLine: 'from-cyan-500/60 via-cyan-400/65 to-cyan-500/22',
      glow: 'from-cyan-500/14 via-cyan-500/6 to-transparent',
    } as const;
  }
  return {
    label: 'Изучение',
    Icon: CheckCircle2,
    shell:
      'border-emerald-500/30 bg-gradient-to-br from-emerald-500/13 via-background/95 to-emerald-500/5 shadow-[0_28px_56px_rgba(0,0,0,0.32)]',
    iconWrap: 'border-emerald-500/30 bg-emerald-500/14 text-emerald-700 dark:text-emerald-300',
    badge: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    accentLine: 'from-emerald-500/60 via-emerald-400/65 to-emerald-500/22',
    glow: 'from-emerald-500/14 via-emerald-500/6 to-transparent',
  } as const;
}

export function TrainingCompletionToastCard({
  payload,
  onClose,
  autoCloseMs = DEFAULT_POPUP_AUTOCLOSE_MS,
}: TrainingCompletionToastCardProps) {
  useEffect(() => {
    if (!payload) return;
    const timeoutId = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(timeoutId);
  }, [payload?.id, onClose, autoCloseMs]);

  useEffect(() => {
    if (!payload) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [payload?.id, onClose]);

  return (
    <AnimatePresence>
      {payload ? (
        <motion.div
          key={payload.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute inset-0 bg-background/72 backdrop-blur-[3px]"
            aria-label="Закрыть окно результата тренировки"
          />

          <TrainingCompletionPopupBody payload={payload} onClose={onClose} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TrainingCompletionPopupBody({
  payload,
  onClose,
}: {
  payload: TrainingCompletionToastCardPayload;
  onClose: () => void;
}) {
  const theme = getPopupTheme(payload.status);
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
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Этап обучения обновлён"
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative z-[71] w-full max-w-2xl overflow-hidden rounded-[1.75rem] border p-5 sm:p-6',
        theme.shell
      )}
    >
      <div
        aria-hidden="true"
        className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', theme.glow)}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r',
          theme.accentLine
        )}
      />

      <div className="relative flex items-start gap-4">
        <div
          className={cn(
            'mt-0.5 grid h-12 w-12 shrink-0 place-items-center rounded-2xl border',
            theme.iconWrap
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-foreground/95">
                {payload.reference}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">Ключевой этап завершён</div>
            </div>
            <div className="flex items-center gap-2">
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Закрыть окно"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 text-lg font-semibold leading-snug">{payload.title}</div>
          <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {payload.description}
          </div>

          <div className="mt-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
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
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              Следующий шаг: закрепление через интервальные повторы.
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
