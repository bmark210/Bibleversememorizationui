'use client'

import { Verse } from "@/app/domain/verse";

export type TrainingModeRating = 0 | 1 | 2 | 3;

export interface TrainingModeProps {
  verse: Verse;
  onRate: (rating: TrainingModeRating) => void;
  embedded?: boolean;
}

