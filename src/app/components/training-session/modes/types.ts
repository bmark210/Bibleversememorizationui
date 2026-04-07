'use client'

import { Verse } from "@/app/domain/verse";

// -1: забыл (forgot, learning only) | 0: сложно (hard/repeat) | 1: далее (continue/advance)
export type TrainingModeRating = -1 | 0 | 1;

export interface TrainingModeProps {
  verse: Verse;
  onRate: (rating: TrainingModeRating) => void;
  embedded?: boolean;
}

