'use client'

import type { Verse as LegacyVerse } from '../../data/mockData';
import { ModeClickChunksExercise } from './modes/ClickChunksExercise';
import { ModeClickWordsHintedExercise } from './modes/ClickWordsHintedExercise';
import { ModeClickWordsExercise } from './modes/ClickWordsExercise';
import { ModeFirstLettersHintedExercise } from './modes/FirstLettersHintedExercise';
import { ModeFirstLettersKeyboardExercise } from './modes/FirstLettersKeyboardExercise';
import { ModeFirstLettersTapExercise } from './modes/FirstLettersTapExercise';
import { ModeFullRecallExercise } from './modes/FullRecallExercise';
import type { TrainingModeRating } from './modes/types';

export enum TrainingModeRendererKey {
  ChunksOrder = 'chunks-order',
  OrderHints = 'order-hints',
  LettersTap = 'letters-tap',
  LettersType = 'letters-type',
  Order = 'order',
  LettersHints = 'letters-hints',
  Typing = 'typing',
}

interface TrainingModeRendererProps {
  renderer: TrainingModeRendererKey;
  verse: LegacyVerse;
  onRate: (rating: TrainingModeRating) => void;
}

export function TrainingModeRenderer({
  renderer,
  verse,
  onRate,
}: TrainingModeRendererProps) {
  if (renderer === TrainingModeRendererKey.ChunksOrder) {
    return <ModeClickChunksExercise verse={verse} onRate={onRate} />;
  }

  if (renderer === TrainingModeRendererKey.LettersTap) {
    return <ModeFirstLettersTapExercise verse={verse} onRate={onRate} />;
  }

  if (renderer === TrainingModeRendererKey.LettersType) {
    return <ModeFirstLettersKeyboardExercise verse={verse} onRate={onRate} />;
  }

  if (renderer === TrainingModeRendererKey.OrderHints) {
    return <ModeClickWordsHintedExercise verse={verse} onRate={onRate} />;
  }

  if (renderer === TrainingModeRendererKey.Order) {
    return <ModeClickWordsExercise verse={verse} onRate={onRate} />;
  }

  if (renderer === TrainingModeRendererKey.LettersHints) {
    return <ModeFirstLettersHintedExercise verse={verse} onRate={onRate} />;
  }

  return <ModeFullRecallExercise verse={verse} onRate={onRate} />;
}
