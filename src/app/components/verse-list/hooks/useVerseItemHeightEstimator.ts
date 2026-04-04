'use client'

import { useMemo } from 'react';
import { buildFont, measureTextHeight } from '@/app/utils/textLayout';
import type { Verse } from '@/app/domain/verse';

// ---------------------------------------------------------------------------
// Verse card layout constants (must mirror the actual card CSS)
// ---------------------------------------------------------------------------

/** Horizontal padding on each side of a verse card (px-4 = 16px × 2). */
const CARD_PADDING_H = 32;

/**
 * Fixed vertical space consumed by non-text elements:
 *   reference line  ≈ 22px
 *   status badge    ≈ 24px
 *   action row      ≈ 40px
 *   card padding    ≈ 32px (pt-4 pb-5 = ~36px, rounded down)
 *   dividers/gaps   ≈  8px
 */
const CARD_FIXED_HEIGHT = 126;

/** pb-3 wrapper added by VerseVirtualizedList around every item. */
const ITEM_WRAPPER_BOTTOM_PADDING = 12;

/**
 * Verse body text settings.
 * Cards render verse text at ~14px / line-height 1.57 (≈ leading-relaxed).
 */
const VERSE_FONT_SIZE = 14;
const VERSE_LINE_HEIGHT = Math.round(VERSE_FONT_SIZE * 1.57); // ≈ 22px
const VERSE_FONT = buildFont(VERSE_FONT_SIZE);

/** Minimum card height (matches the skeleton min-h-[164px]). */
const MIN_CARD_HEIGHT = 164;

// ---------------------------------------------------------------------------
// Core estimator
// ---------------------------------------------------------------------------

/**
 * Computes an estimated pixel height for a verse card.
 *
 * The calculation is:
 *   fixed_chrome + text_height + bottom_wrapper_padding
 *
 * `text_height` is computed by @chenglou/pretext — no DOM needed.
 *
 * @param verse          The verse being rendered
 * @param containerWidth Pixel width of the scroll container (clientWidth)
 */
export function estimateVerseCardHeight(
  verse: Verse,
  containerWidth: number,
): number {
  if (!verse.text || containerWidth <= 0) return MIN_CARD_HEIGHT;

  const textAreaWidth = Math.max(80, containerWidth - CARD_PADDING_H);
  const textHeight = measureTextHeight(
    verse.text,
    VERSE_FONT,
    textAreaWidth,
    VERSE_LINE_HEIGHT,
  );

  if (textHeight <= 0) return MIN_CARD_HEIGHT;

  return Math.max(
    MIN_CARD_HEIGHT,
    CARD_FIXED_HEIGHT + textHeight + ITEM_WRAPPER_BOTTOM_PADDING,
  );
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * Returns a stable `getEstimatedHeight(verse)` callback that uses pretext
 * to estimate each verse card's height before it is rendered.
 *
 * Recalculates only when `items` or `containerWidth` changes.
 *
 * Usage:
 * ```tsx
 * const getEstimatedHeight = useVerseItemHeightEstimator(items, containerWidth);
 * // Pass to VerseVirtualizedList:
 * <VerseVirtualizedList getItemHeightEstimate={getEstimatedHeight} ... />
 * ```
 */
export function useVerseItemHeightEstimator(
  items: readonly Verse[],
  containerWidth: number,
): (verse: Verse) => number {
  // Build a lookup map keyed by externalVerseId so the callback is O(1).
  const heightMap = useMemo(() => {
    if (containerWidth <= 0) return new Map<string, number>();

    const map = new Map<string, number>();
    for (const verse of items) {
      map.set(verse.externalVerseId, estimateVerseCardHeight(verse, containerWidth));
    }
    return map;
  }, [items, containerWidth]);

  // The returned callback is memoised: a new reference is only created when
  // `heightMap` itself changes (i.e. when items or containerWidth changed).
  return useMemo(
    () => (verse: Verse) =>
      heightMap.get(verse.externalVerseId) ?? MIN_CARD_HEIGHT,
    [heightMap],
  );
}
