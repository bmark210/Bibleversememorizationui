'use client'

import type { TrainingRatingStage } from './TrainingRatingButtons';

interface TrainingStageCornerProps {
  stage: TrainingRatingStage;
  progressPercent?: number | null;
}

export function TrainingStageCorner({
  progressPercent,
}: TrainingStageCornerProps) {
  return (
    <span
      className={`absolute left-0 top-0 z-10 h-6 w-6 text-primary/70 font-bold tabular-nums tracking-[-0.04em]`}
    >
      <span>{progressPercent}%</span>
    </span>
  );
}
