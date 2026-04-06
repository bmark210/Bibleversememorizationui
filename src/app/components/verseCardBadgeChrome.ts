import type { VerseCardColorConfig } from "@/app/components/verseCardColorConfig";

export function getVerseTagChromeClassName(
  colorConfig: VerseCardColorConfig,
): string {
  return colorConfig.tagClassName;
}

export function getVerseTagInteractiveChromeClassName(
  colorConfig: VerseCardColorConfig,
): string {
  return `${colorConfig.tagClassName} ${colorConfig.tagInteractiveClassName}`;
}

export function getVerseSocialChromeClassName(
  colorConfig: VerseCardColorConfig,
): string {
  return colorConfig.socialChipClassName;
}

export function getVerseSocialInteractiveChromeClassName(
  colorConfig: VerseCardColorConfig,
): string {
  return `${colorConfig.socialChipClassName} ${colorConfig.socialChipInteractiveClassName}`;
}
