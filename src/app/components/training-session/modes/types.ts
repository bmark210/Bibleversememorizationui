'use client'

import type { Verse as LegacyVerse } from '../../../data/mockData';

export type TrainingModeRating = 0 | 1 | 2 | 3;

export interface TrainingModeProps {
  verse: LegacyVerse;
  onRate: (rating: TrainingModeRating) => void;
  embedded?: boolean;
}

