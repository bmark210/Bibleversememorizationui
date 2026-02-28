import {
  REPEAT_THRESHOLD_FOR_MASTERED,
  TRAINING_STAGE_MASTERY_MAX,
} from "@/shared/training/constants";
import { TRAINING_MODE_SHIFT_BY_RATING } from "@/shared/training/modeEngine";
import { TrainingModeRendererKey } from "@/app/components/training-session/TrainingModeRenderer";
import { TrainingModeId } from "@/shared/training/modeEngine";
import type { TrainingModeMeta, ModeId, Rating } from "./types";

export { REPEAT_THRESHOLD_FOR_MASTERED, TRAINING_STAGE_MASTERY_MAX };

export const MAX_MASTERY_LEVEL = TRAINING_STAGE_MASTERY_MAX;

export const MAX_DOTS = 12;
export const EMULATED_DOT_COUNT = 15;
export const MAX_DOT_PROGRESS_TEXT_WIDTH_CLASS = "max-w-[46vw] sm:max-w-[240px]";
export const SWIPE_HINT_KEY = "verse-swipe-hint-seen";

export const MODE_PIPELINE: Record<ModeId, TrainingModeMeta> = {
  [TrainingModeId.ClickChunks]: {
    label: "Выбор частей",
    description: "Нажимайте куски стиха в правильной последовательности.",
    renderer: TrainingModeRendererKey.ChunksOrder,
    badgeClass: "border-lime-500/30 bg-lime-500/10 text-lime-700",
  },
  [TrainingModeId.ClickWordsHinted]: {
    label: "Выбор слов",
    description: "Часть слов уже открыта: нажимайте скрытые слова по порядку.",
    renderer: TrainingModeRendererKey.OrderHints,
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  },
  [TrainingModeId.ClickWordsNoHints]: {
    label: "Выбор слов (без подсказок)",
    description: "Нажимайте слова стиха по порядку без подсказок.",
    renderer: TrainingModeRendererKey.Order,
    badgeClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700",
  },
  [TrainingModeId.FirstLettersWithWordHints]: {
    label: "Выбор букв",
    description: "Часть слов открыта: нажимайте первые буквы скрытых слов.",
    renderer: TrainingModeRendererKey.LettersHints,
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
  [TrainingModeId.FirstLettersTapNoHints]: {
    label: "Выбор букв (без подсказок)",
    description: "Нажимайте первые буквы слов по порядку без подсказок.",
    renderer: TrainingModeRendererKey.LettersTap,
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  },
  [TrainingModeId.FirstLettersTyping]: {
    label: "Ввод букв",
    description: "Введите первые буквы слов по порядку.",
    renderer: TrainingModeRendererKey.LettersType,
    badgeClass: "border-violet-500/30 bg-violet-500/10 text-violet-700",
  },
  [TrainingModeId.FullRecall]: {
    label: "Полный ввод",
    description: "Полный ввод стиха по памяти.",
    renderer: TrainingModeRendererKey.Typing,
    badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  },
};

export const SCORE_BY_RATING: Record<Rating, number> = { 0: 35, 1: 60, 2: 84, 3: 96 };
export const MASTERY_DELTA_BY_RATING: Record<Rating, number> = { 0: -1, 1: 0, 2: 1, 3: 2 };
export const MODE_SHIFT_BY_RATING: Record<Rating, number> = TRAINING_MODE_SHIFT_BY_RATING;

export const SPACED_REPETITION_MS: Record<number, number> = {
  0: 10 * 60 * 1000,
  1: 60 * 60 * 1000,
  2: 6 * 60 * 60 * 1000,
  3: 24 * 60 * 60 * 1000,
  4: 3 * 24 * 60 * 60 * 1000,
  5: 3 * 24 * 60 * 60 * 1000,
  6: 3 * 24 * 60 * 60 * 1000,
  7: 3 * 24 * 60 * 60 * 1000,
  8: 3 * 24 * 60 * 60 * 1000,
};
