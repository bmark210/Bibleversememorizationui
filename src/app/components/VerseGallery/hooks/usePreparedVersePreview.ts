import { useEffect, useMemo } from "react";
import type { Verse } from "@/app/domain/verse";
import type { VersePreviewOverride } from "../types";
import { getPreparedVersePreview, type PreparedVersePreview } from "../previewModel";
import { mergePreviewOverrides } from "../utils";
import { warmUpText, buildFont } from "@/app/utils/textLayout";

// ---------------------------------------------------------------------------
// Literata font constants for VersePreviewCard body text.
// Must match usePreviewLineClamp:
//   text-[1.45rem] → 23px (mobile)
//   sm:text-[1.95rem] → 31px (desktop ≥640px)
// ---------------------------------------------------------------------------
const LITERATA_MOBILE_FONT = buildFont(Math.round(1.45 * 16), 'Literata');
const LITERATA_DESKTOP_FONT = buildFont(Math.round(1.95 * 16), 'Literata');

type Params = {
  verses: Verse[];
  activeIndex: number;
  previewOverrides: Map<string, VersePreviewOverride>;
  isAnchorEligible: boolean;
};

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function scheduleIdleWarmup(task: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleId = idleWindow.requestIdleCallback(() => task(), {
      timeout: 120,
    });
    return () => idleWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(task, 32);
  return () => window.clearTimeout(timeoutId);
}

function getPreparedPreviewAtIndex(
  verses: Verse[],
  index: number,
  previewOverrides: Map<string, VersePreviewOverride>,
  isAnchorEligible: boolean
): PreparedVersePreview | null {
  const verse = verses[index];
  if (!verse) return null;

  return getPreparedVersePreview(
    mergePreviewOverrides(verse, previewOverrides),
    isAnchorEligible
  );
}

export function usePreparedVersePreview({
  verses,
  activeIndex,
  previewOverrides,
  isAnchorEligible,
}: Params): PreparedVersePreview | null {
  const activePreview = useMemo(
    () =>
      getPreparedPreviewAtIndex(
        verses,
        activeIndex,
        previewOverrides,
        isAnchorEligible
      ),
    [activeIndex, isAnchorEligible, previewOverrides, verses]
  );

  useEffect(() => {
    const candidateIndexes = [
      activeIndex - 2,
      activeIndex - 1,
      activeIndex + 1,
      activeIndex + 2,
    ].filter((index) => index >= 0 && index < verses.length);

    if (candidateIndexes.length === 0) return;

    return scheduleIdleWarmup(() => {
      for (const index of candidateIndexes) {
        getPreparedPreviewAtIndex(
          verses,
          index,
          previewOverrides,
          isAnchorEligible
        );

        // Pre-warm pretext canvas cache for Literata at both breakpoint sizes
        // so the first lineClamp measurement returns instantly (no cold-path lag).
        const verseText = verses[index]?.text;
        if (verseText) {
          const quotedText = `«${verseText}»`;
          warmUpText(quotedText, LITERATA_MOBILE_FONT);
          warmUpText(quotedText, LITERATA_DESKTOP_FONT);
        }
      }
    });
  }, [activeIndex, isAnchorEligible, previewOverrides, verses]);

  return activePreview;
}
