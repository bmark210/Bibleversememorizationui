import type { VerseCardColorConfig } from "@/app/components/verseCardColorConfig";

export function getVerseBadgeChromeClassName(
  colorConfig: VerseCardColorConfig,
): string {
  return colorConfig.tagClassName;
}

export function getVerseBadgeInteractiveChromeClassName(
  colorConfig: VerseCardColorConfig,
): string {
  return `${colorConfig.tagClassName} ${colorConfig.tagInteractiveClassName}`;
}
