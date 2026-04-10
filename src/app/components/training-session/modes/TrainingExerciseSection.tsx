'use client'

import { ArrowDownIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { ScrollShadowContainer } from '@/app/components/ui/ScrollShadowContainer';
import { cn } from '@/app/components/ui/utils';
import {
  TRAINING_SECTION_INSET_MD,
  TRAINING_STACK_GAP_SM,
} from '../trainingActionTokens';

export const TRAINING_SCROLL_BOTTOM_CUE = (
  <span className="rounded-full border border-border-subtle bg-bg-elevated px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted backdrop-blur-sm">
    <ArrowDownIcon className="size-3.5" />
  </span>
);

interface TrainingExerciseSectionProps {
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
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
  style,
  headerClassName,
  bodyClassName,
  contentClassName,
  scrollable = false,
  shadowSize = 40,
  bottomCue = TRAINING_SCROLL_BOTTOM_CUE,
  scrollClassName,
}: TrainingExerciseSectionProps) {
  const hasFixedHeight =
    style?.height != null || style?.minHeight != null || style?.maxHeight != null;

  return (
    <div
      className={cn(
        `min-h-0 flex flex-col overflow-hidden rounded-3xl border border-border-subtle bg-bg-elevated ${TRAINING_SECTION_INSET_MD}`,
        hasFixedHeight ? 'flex-none shrink-0' : 'flex-[1_1_0]',
        className
      )}
      style={style}
    >
      <div
        className={cn(
          `mb-3 flex shrink-0 items-center justify-between text-sm text-text-secondary ${TRAINING_STACK_GAP_SM}`,
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
        'inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]',
        METRIC_TONE_CLASSNAME[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
