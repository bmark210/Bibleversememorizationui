import { TRAINING_STAGE_MASTERY_MAX } from './constants';

// -1: забыл (forgot, learning only) | 0: сложно (hard/repeat) | 1: далее (continue/advance)
export type TrainingModeRating = -1 | 0 | 1;

export enum TrainingModeId {
  ClickChunks = 1,
  ClickWordsHinted = 2,
  ClickWordsNoHints = 3,
  FirstLettersWithWordHints = 4,
  FirstLettersTapNoHints = 5,
  FirstLettersTyping = 6,
  FullRecall = 7,
  VoiceRecall = 8,
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

export const REVIEW_TRAINING_MODE_ROTATION: TrainingModeId[] = [
  TrainingModeId.FirstLettersTyping, // rep 0: day 1
  TrainingModeId.FullRecall,         // rep 1: day 3
  TrainingModeId.VoiceRecall,        // rep 2: day 7
  TrainingModeId.FullRecall,         // rep 3: day 14
  TrainingModeId.VoiceRecall,        // rep 4: day 30
  TrainingModeId.FullRecall,         // rep 5: day 60
  TrainingModeId.FullRecall,         // rep 6: day 90
];

// Mode shift matches rating: -1→mode-1, 0→same mode, 1→mode+1
export const TRAINING_MODE_SHIFT_BY_RATING: Record<number, number> = {
  [-1]: -1,
  [0]: 0,
  [1]: 1,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getProgressModeAt(index: number): TrainingModeId | null {
  return TRAINING_MODE_PROGRESS_ORDER[index] ?? null;
}

function getReviewModeAt(index: number): TrainingModeId {
  return REVIEW_TRAINING_MODE_ROTATION[index] ?? TrainingModeId.FirstLettersTyping;
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
        return getProgressModeAt(TRAINING_MODE_PROGRESS_ORDER.length - 1);
      }
      return null;
    }
    return getProgressModeAt(nextIndex);
  }

  return getProgressModeAt(Math.max(0, index + shift));
}

export function getReviewModeByRepetition(repetitions: number): TrainingModeId {
  const normalizedRepetitions = Number.isFinite(repetitions)
    ? Math.max(0, Math.round(repetitions))
    : 0;
  const index = clamp(normalizedRepetitions, 0, REVIEW_TRAINING_MODE_ROTATION.length - 1);
  return getReviewModeAt(index);
}

// Mode is deterministic from mastery/repetitions — no lastModeId needed.
export function chooseTrainingModeId(params: {
  rawMasteryLevel: number;
  stageMasteryLevel: number;
  repetitions: number;
}): TrainingModeId {
  const { rawMasteryLevel, stageMasteryLevel, repetitions } = params;

  if (isTrainingReviewRawMastery(rawMasteryLevel)) {
    return getReviewModeByRepetition(repetitions);
  }

  return getBaseTrainingModeForMastery(stageMasteryLevel);
}

export function getRemainingTrainingModesCount(params: {
  rawMasteryLevel: number;
  stageMasteryLevel: number;
}): number {
  if (isTrainingReviewRawMastery(params.rawMasteryLevel)) {
    return REVIEW_TRAINING_MODE_ROTATION.length;
  }

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
