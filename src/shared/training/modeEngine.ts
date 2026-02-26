import { TRAINING_STAGE_MASTERY_MAX } from './constants';

export type TrainingModeRating = 0 | 1 | 2 | 3;

export enum TrainingModeId {
  ClickChunks = 1,
  ClickWordsHinted = 2,
  ClickWordsNoHints = 3,
  FirstLettersWithWordHints = 4,
  FirstLettersTapNoHints = 5,
  FirstLettersTyping = 6,
  FullRecall = 7,
}

export type TrainingModeIdValue = TrainingModeId;

export const TRAINING_MODE_PROGRESS_ORDER: TrainingModeId[] = [
  TrainingModeId.ClickChunks,
  TrainingModeId.ClickWordsHinted,
  TrainingModeId.ClickWordsNoHints,
  TrainingModeId.FirstLettersWithWordHints,
  TrainingModeId.FirstLettersTapNoHints,
  TrainingModeId.FirstLettersTyping,
  TrainingModeId.FullRecall,
];

export const TRAINING_MODE_SHIFT_BY_RATING: Record<TrainingModeRating, number> = {
  0: -1,
  1: 0,
  2: 1,
  3: 2,
};

export function shouldCountTrainingRepetition(rating: TrainingModeRating): boolean {
  // "Забыл" = attempt does not count as a successful repetition for repetition stats.
  return rating !== 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeRawMasteryLevel(raw: number | null | undefined): number {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return 0;
  return Math.max(0, Math.round(raw));
}

export function toTrainingStageMasteryLevel(rawMasteryLevel: number): number {
  return clamp(Math.round(rawMasteryLevel), 0, TRAINING_STAGE_MASTERY_MAX);
}

export function isTrainingReviewRawMastery(rawMasteryLevel: number): boolean {
  return normalizeRawMasteryLevel(rawMasteryLevel) >= TRAINING_STAGE_MASTERY_MAX;
}

export function getBaseTrainingModeForMastery(stageMasteryLevel: number): TrainingModeId {
  const masteryBaseModeMap: Record<number, TrainingModeId> = {
    0: TrainingModeId.ClickChunks,
    1: TrainingModeId.ClickWordsHinted,
    2: TrainingModeId.ClickWordsNoHints,
    3: TrainingModeId.FirstLettersWithWordHints,
    4: TrainingModeId.FirstLettersTapNoHints,
    5: TrainingModeId.FirstLettersTyping,
    6: TrainingModeId.FullRecall,
    7: TrainingModeId.FullRecall,
  };

  return masteryBaseModeMap[clamp(stageMasteryLevel, 0, TRAINING_STAGE_MASTERY_MAX)] ?? TrainingModeId.FullRecall;
}

export function getTrainingModeByShiftInProgressOrder(
  modeId: TrainingModeId,
  shift: number
): TrainingModeId | null {
  const index = TRAINING_MODE_PROGRESS_ORDER.indexOf(modeId);
  if (index < 0) return null;

  if (shift === 0) return modeId;

  if (shift > 0) {
    const nextIndex = index + shift;
    if (nextIndex >= TRAINING_MODE_PROGRESS_ORDER.length) {
      if (index < TRAINING_MODE_PROGRESS_ORDER.length - 1) {
        return TRAINING_MODE_PROGRESS_ORDER[TRAINING_MODE_PROGRESS_ORDER.length - 1];
      }
      return null;
    }
    return TRAINING_MODE_PROGRESS_ORDER[nextIndex];
  }

  return TRAINING_MODE_PROGRESS_ORDER[Math.max(0, index + shift)];
}

export function chooseTrainingModeId(params: {
  rawMasteryLevel: number;
  stageMasteryLevel: number;
  lastModeId: TrainingModeId | null;
}): TrainingModeId {
  const { rawMasteryLevel, stageMasteryLevel, lastModeId } = params;

  if (isTrainingReviewRawMastery(rawMasteryLevel)) {
    // Review mode is fixed to keyboard input of first letters.
    return TrainingModeId.FirstLettersTyping;
  }

  const base = getBaseTrainingModeForMastery(stageMasteryLevel);
  const baseIndex = TRAINING_MODE_PROGRESS_ORDER.indexOf(base);
  if (baseIndex < 0) return base;

  const candidates: TrainingModeId[] = [];
  for (let distance = 0; distance < TRAINING_MODE_PROGRESS_ORDER.length; distance += 1) {
    const left = baseIndex - distance;
    const right = baseIndex + distance;

    if (left >= 0) {
      const leftMode = TRAINING_MODE_PROGRESS_ORDER[left];
      if (!candidates.includes(leftMode)) candidates.push(leftMode);
    }

    if (distance > 0 && right < TRAINING_MODE_PROGRESS_ORDER.length) {
      const rightMode = TRAINING_MODE_PROGRESS_ORDER[right];
      if (!candidates.includes(rightMode)) candidates.push(rightMode);
    }
  }

  return candidates.find((modeId) => modeId !== lastModeId) ?? base;
}

export function getRemainingTrainingModesCount(params: {
  rawMasteryLevel: number;
  stageMasteryLevel: number;
}): number {
  if (isTrainingReviewRawMastery(params.rawMasteryLevel)) return 1;

  const base = getBaseTrainingModeForMastery(params.stageMasteryLevel);
  const baseIndex = TRAINING_MODE_PROGRESS_ORDER.indexOf(base);
  if (baseIndex < 0) return 1;

  return TRAINING_MODE_PROGRESS_ORDER.length - baseIndex;
}

/**
 * Применяет дельту мастерства с соблюдением инвариантов:
 * - LEARNING: rawMastery в [1, TRAINING_STAGE_MASTERY_MAX], переход в REVIEW только при достижении потолка.
 * - Не-LEARNING: rawMastery >= 0 без верхнего ограничения.
 */
export function applyMasteryDelta(params: {
  isLearningVerse: boolean;
  rawMasteryBefore: number;
  masteryDelta: number;
}): { rawMasteryAfter: number; graduatesToReview: boolean } {
  const { isLearningVerse, rawMasteryBefore, masteryDelta } = params;
  const raw = Math.round(rawMasteryBefore + masteryDelta);

  if (isLearningVerse) {
    const rawMasteryAfter = clamp(raw, 1, TRAINING_STAGE_MASTERY_MAX);
    const graduatesToReview = rawMasteryAfter >= TRAINING_STAGE_MASTERY_MAX;
    return { rawMasteryAfter, graduatesToReview };
  }

  const rawMasteryAfter = Math.max(0, raw);
  return { rawMasteryAfter, graduatesToReview: false };
}
