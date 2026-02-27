'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Repeat, Trophy, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import type { DisplayVerseStatus } from '@/app/types/verseStatus';

export type TrainingCompletionToastCardPayload = {
  id: number;
  reference: string;
  status: DisplayVerseStatus;
  title: string;
  description: string;
};

type TrainingCompletionToastCardProps = {
  toast: TrainingCompletionToastCardPayload | null;
  onDismiss: () => void;
  bottomOffset?: number;
  durationMs?: number;
};

function getToastTheme(status: DisplayVerseStatus) {
  if (status === 'MASTERED') {
    return {
      label: 'Выучен',
      Icon: Trophy,
      shell:
        'border-amber-500/30 bg-gradient-to-br from-amber-500/14 via-background/95 to-amber-500/8 shadow-[0_18px_40px_rgba(0,0,0,0.32)]',
      iconWrap: 'border-amber-500/30 bg-amber-500/14 text-amber-700 dark:text-amber-300',
      badge: 'border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300',
      accentLine: 'from-amber-500/55 via-amber-400/60 to-amber-500/25',
    } as const;
  }
  if (status === 'REVIEW') {
    return {
      label: 'Повторение',
      Icon: Repeat,
      shell:
        'border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-background/95 to-violet-500/4 shadow-[0_18px_40px_rgba(0,0,0,0.28)]',
      iconWrap: 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
      badge: 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
      accentLine: 'from-violet-500/45 via-violet-400/50 to-violet-500/20',
    } as const;
  }
  return {
    label: 'Изучение',
    Icon: CheckCircle2,
    shell:
      'border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-background/95 to-emerald-500/4 shadow-[0_18px_40px_rgba(0,0,0,0.28)]',
    iconWrap: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    badge: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    accentLine: 'from-emerald-500/45 via-emerald-400/50 to-emerald-500/20',
  } as const;
}

export function TrainingCompletionToastCard({
  toast,
  onDismiss,
  bottomOffset = 72,
  durationMs = 3000,
}: TrainingCompletionToastCardProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss, durationMs]);

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.id}
          className="pointer-events-none fixed inset-x-0 z-[70] px-4 sm:px-6"
          style={{ bottom: bottomOffset }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          aria-live="polite"
          aria-atomic="true"
        >
          <motion.div
            drag="x"
            dragDirectionLock
            dragSnapToOrigin
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500) {
                onDismiss();
              }
            }}
            className={cn(
              'pointer-events-auto mx-auto w-full max-w-md rounded-2xl border p-3.5 backdrop-blur-xl',
              getToastTheme(toast.status).shell
            )}
          >
            <TrainingCompletionToastCardBody toast={toast} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TrainingCompletionToastCardBody({
  toast,
}: {
  toast: TrainingCompletionToastCardPayload;
}) {
  const theme = getToastTheme(toast.status);
  const Icon = theme.Icon;

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r',
          theme.accentLine
        )}
      />
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border', theme.iconWrap)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground/95">{toast.reference}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Статус обновлён</div>
            </div>
            <Badge variant="outline" className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px]', theme.badge)}>
              {theme.label}
            </Badge>
          </div>
          <div className="mt-2 text-sm font-medium leading-snug">{toast.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{toast.description}</div>
        </div>
      </div>
    </div>
  );
}

