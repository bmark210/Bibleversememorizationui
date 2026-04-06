'use client'

import { ArrowDownIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { ScrollShadowContainer } from '@/app/components/ui/ScrollShadowContainer';
import { cn } from '@/app/components/ui/utils';

export const TRAINING_SCROLL_BOTTOM_CUE = (
  <span className="rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted shadow-[var(--shadow-soft)] backdrop-blur-sm">
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
        'min-h-0 flex flex-1 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated px-3 pt-3 shadow-[var(--shadow-soft)]',
        className
      )}
    >
      <div
        className={cn(
          'mb-2 flex shrink-0 items-center justify-between gap-2 text-xs text-text-muted',
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
  neutral: 'border-border-subtle bg-bg-subtle text-text-secondary',
  warning: 'border-state-warning/30 bg-state-warning/12 text-state-warning',
  danger: 'border-status-paused/25 bg-status-paused-soft text-status-paused',
  success: 'border-status-learning/25 bg-status-learning-soft text-status-learning',
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
