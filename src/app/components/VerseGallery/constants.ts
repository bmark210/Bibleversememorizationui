import {
  REPEAT_THRESHOLD_FOR_MASTERED,
  TRAINING_STAGE_MASTERY_MAX,
  TRAINING_SCORE_BY_RATING,
} from "@/shared/training/constants";
import { TRAINING_MODE_SHIFT_BY_RATING } from "@/shared/training/modeEngine";
import { TrainingModeRendererKey } from "@/app/components/training-session/TrainingModeRenderer";
import { TrainingModeId } from "@/shared/training/modeEngine";
import {
  Layers,
  MousePointerClick,
  ALargeSmall,
  Keyboard,
  PenLine,
  Mic,
} from "lucide-react";
import type { TrainingModeMeta, ModeId, Rating } from "./types";

export { REPEAT_THRESHOLD_FOR_MASTERED, TRAINING_STAGE_MASTERY_MAX };

export const MAX_MASTERY_LEVEL = TRAINING_STAGE_MASTERY_MAX;

export const MAX_DOTS = 12;
export const EMULATED_DOT_COUNT = 15;
export const SWIPE_HINT_KEY = "verse-swipe-hint-seen";

export const MODE_PIPELINE: Record<ModeId, TrainingModeMeta> = {
  [TrainingModeId.ClickChunks]: {
    label: "Выбор частей",
    shortLabel: "Части",
    description: "Нажимайте куски стиха в правильной последовательности.",
    renderer: TrainingModeRendererKey.ChunksOrder,
    icon: Layers,
    badgeClass:
      "border-brand-secondary/25 bg-brand-secondary/12 text-brand-secondary",
  },
  [TrainingModeId.ClickWordsHinted]: {
    label: "Выбор слов",
    shortLabel: "Слова+",
    description: "Часть слов уже открыта: нажимайте скрытые слова по порядку.",
    renderer: TrainingModeRendererKey.OrderHints,
    icon: MousePointerClick,
    badgeClass:
      "border-status-learning/25 bg-status-learning-soft text-status-learning",
  },
  [TrainingModeId.ClickWordsNoHints]: {
    label: "Выбор слов (без подсказок)",
    shortLabel: "Слова",
    description: "Нажимайте слова стиха по порядку без подсказок.",
    renderer: TrainingModeRendererKey.Order,
    icon: MousePointerClick,
    badgeClass:
      "border-status-review/25 bg-status-review-soft text-status-review",
  },
  [TrainingModeId.FirstLettersWithWordHints]: {
    label: "Выбор букв",
    shortLabel: "Буквы+",
    description: "Часть слов открыта: нажимайте первые буквы скрытых слов.",
    renderer: TrainingModeRendererKey.LettersHints,
    icon: ALargeSmall,
    badgeClass:
      "border-state-warning/25 bg-state-warning/12 text-state-warning",
  },
  [TrainingModeId.FirstLettersTapNoHints]: {
    label: "Выбор букв (без подсказок)",
    shortLabel: "Буквы",
    description: "Нажимайте первые буквы слов по порядку без подсказок.",
    renderer: TrainingModeRendererKey.LettersTap,
    icon: ALargeSmall,
    badgeClass: "border-brand-primary/20 bg-brand-primary/10 text-brand-primary",
  },
  [TrainingModeId.FirstLettersTyping]: {
    label: "Ввод букв",
    shortLabel: "Ввод",
    description: "Введите первые буквы слов по порядку.",
    renderer: TrainingModeRendererKey.LettersType,
    icon: Keyboard,
    badgeClass:
      "border-accent-incense/25 bg-accent-incense/12 text-accent-incense",
  },
  [TrainingModeId.FullRecall]: {
    label: "Полный ввод",
    shortLabel: "Пересказ",
    description: "Полный ввод стиха по памяти.",
    renderer: TrainingModeRendererKey.Typing,
    icon: PenLine,
    badgeClass:
      "border-status-paused/25 bg-status-paused-soft text-status-paused",
  },
  [TrainingModeId.VoiceRecall]: {
    label: "Голосовой ввод",
    shortLabel: "Голос",
    description: "Проговорите стих и проверьте распознавание.",
    renderer: TrainingModeRendererKey.VoiceTyping,
    icon: Mic,
    badgeClass:
      "border-status-community/25 bg-status-community-soft text-status-community",
  },
};

export const SCORE_BY_RATING: Record<Rating, number> = { ...TRAINING_SCORE_BY_RATING };
export const MODE_SHIFT_BY_RATING: Record<Rating, number> = TRAINING_MODE_SHIFT_BY_RATING;
