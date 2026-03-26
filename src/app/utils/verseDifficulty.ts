import {
  VERSE_DIFFICULTY_SHORT_LABELS_RU,
  coerceVerseDifficultyLevel,
  type VerseDifficultyLevel,
} from "@/shared/verses/difficulty";

export const VERSE_DIFFICULTY_BADGE_CLASSNAMES: Record<
  VerseDifficultyLevel,
  string
> = {
  EASY:
    "border-border-default bg-bg-elevated text-text-secondary",
  MEDIUM:
    "border-status-review/25 bg-status-review-soft text-status-review",
  HARD:
    "border-status-mastered/25 bg-status-mastered-soft text-status-mastered",
  EXPERT:
    "border-status-paused/25 bg-status-paused-soft text-status-paused",
};

export function normalizeVerseDifficultyLevel(
  value: unknown
): VerseDifficultyLevel {
  return coerceVerseDifficultyLevel(value);
}

export function getVerseDifficultyLabel(value: unknown): string {
  const level = normalizeVerseDifficultyLevel(value);
  return VERSE_DIFFICULTY_SHORT_LABELS_RU[level];
}

export function getVerseDifficultyBadgeClassName(value: unknown): string {
  const level = normalizeVerseDifficultyLevel(value);
  return VERSE_DIFFICULTY_BADGE_CLASSNAMES[level];
}
