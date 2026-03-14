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
    "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  MEDIUM:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  HARD:
    "border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-300",
  EXPERT:
    "border-rose-500/30 bg-rose-500/12 text-rose-700 dark:text-rose-300",
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
