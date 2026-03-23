'use client'

import { ArrowDownIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { ScrollShadowContainer } from '@/app/components/ui/ScrollShadowContainer';
import { cn } from '@/app/components/ui/utils';

export const TRAINING_SCROLL_BOTTOM_CUE = (
  <span className="rounded-full border border-border/50 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/60 shadow-sm backdrop-blur-sm">
    <ArrowDownIcon className="size-3" />
  </span>
);

interface TrainingExerciseSectionProps {
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
  scrollable?: boolean;
  shadowSize?: number;
  bottomCue?: ReactNode;
  scrollClassName?: string;
}

export function TrainingExerciseSection({
  title,
  meta,
  children,
  className,
  headerClassName,
  bodyClassName,
  contentClassName,
  scrollable = false,
  shadowSize = 40,
  bottomCue = TRAINING_SCROLL_BOTTOM_CUE,
  scrollClassName,
}: TrainingExerciseSectionProps) {
  return (
    <div
      className={cn(
        'min-h-0 flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/70 px-3 pt-3',
        className
      )}
    >
      <div
        className={cn(
          'mb-2 flex shrink-0 items-center justify-between gap-2 text-xs text-muted-foreground',
          headerClassName
        )}
      >
        <span>{title}</span>
        {meta}
      </div>

      <div className={cn('min-h-0 flex-1', bodyClassName)}>
        {scrollable ? (
          <ScrollShadowContainer
            className="min-h-0 h-full"
            scrollClassName={cn(
              'h-full overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]',
              scrollClassName
            )}
            shadowSize={shadowSize}
            bottomCue={bottomCue}
          >
            <div className={contentClassName}>{children}</div>
          </ScrollShadowContainer>
        ) : (
          <div className={contentClassName}>{children}</div>
        )}
      </div>
    </div>
  );
}

interface TrainingMetricBadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
  className?: string;
}

export function getRemainingMistakesTone(
  remainingMistakes: number
): NonNullable<TrainingMetricBadgeProps['tone']> {
  if (remainingMistakes <= 1) return 'danger';
  if (remainingMistakes <= 3) return 'warning';
  return 'neutral';
}

const METRIC_TONE_CLASSNAME: Record<NonNullable<TrainingMetricBadgeProps['tone']>, string> = {
  neutral: 'border-border/60 bg-background/55 text-foreground/65',
  warning: 'border-amber-500/35 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300',
  danger: 'border-rose-500/35 bg-rose-500/[0.08] text-rose-700 dark:text-rose-200',
  success: 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300',
};

export function TrainingMetricBadge({
  children,
  tone = 'neutral',
  className,
}: TrainingMetricBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
        METRIC_TONE_CLASSNAME[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
