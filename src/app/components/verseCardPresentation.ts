import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import type {
  VerseCardColorConfig,
  VerseCardTone,
  VerseCardTonePalette,
} from "@/app/components/verseCardColorConfig";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { OWNED_COLLECTION_CARD_TONE } from "@/app/components/verseStatusVisuals";

type ResolveVerseActionToneParams = {
  displayStatus: DisplayVerseStatus;
  isCatalogMode?: boolean;
};

export function resolveVerseActionToneKey({
  displayStatus,
  isCatalogMode = false,
}: ResolveVerseActionToneParams): VerseCardTone {
  if (isCatalogMode) return "my";
  if (displayStatus === VerseStatus.MY) return "my";
  if (displayStatus === VerseStatus.QUEUE) return "queue";
  if (displayStatus === VerseStatus.STOPPED) return "stopped";
  if (displayStatus === "MASTERED") return "mastered";
  if (displayStatus === "REVIEW") return "review";
  if (displayStatus === "CATALOG") return "catalog";
  return "learning";
}

export function resolveVerseActionTonePalette(
  colorConfig: VerseCardColorConfig,
  params: ResolveVerseActionToneParams,
): VerseCardTonePalette {
  const toneKey = resolveVerseActionToneKey(params);
  return toneKey === "my"
    ? OWNED_COLLECTION_CARD_TONE
    : colorConfig.tones[toneKey];
}
