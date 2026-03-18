'use client'

import { Brain, Repeat2 } from 'lucide-react';

import type { TrainingRatingStage } from './TrainingRatingButtons';

interface TrainingStageCornerProps {
  stage: TrainingRatingStage;
  progressPercent?: number | null;
}

export function TrainingStageCorner({
  stage,
  progressPercent,
}: TrainingStageCornerProps) {
  const Icon = stage === 'review' ? Repeat2 : Brain;
  const className =
    stage === 'review'
      ? 'border-violet-500/45 bg-violet-500/12 text-violet-600 dark:text-violet-300'
      : 'border-emerald-500/45 bg-emerald-500/12 text-emerald-600 dark:text-emerald-300';
  const resolvedProgress = Number.isFinite(progressPercent)
    ? Math.max(0, Math.min(100, Math.round(progressPercent ?? 0)))
    : 0;
  const label = `${
    stage === 'review' ? 'Этап повторения' : 'Этап изучения'
  }: ${resolvedProgress}%`;

  return (
    <span
      className={`absolute left-0 top-0 z-10 inline-flex h-6 min-w-12 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold tabular-nums ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{resolvedProgress}%</span>
    </span>
  );
}
