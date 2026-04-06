/**
 * textLayout.ts
 *
 * Shared utilities for computing text metrics via @chenglou/pretext —
 * without forcing browser reflows (no getBoundingClientRect / offsetHeight).
 *
 * API usage pattern:
 *   "cold path" — prepare() once per unique (text + font) pair
 *   "hot path"  — layout() is pure arithmetic, runs in microseconds
 */

import { prepare, prepareWithSegments, layout, layoutWithLines } from '@chenglou/pretext';

// ---------------------------------------------------------------------------
// Font helpers
// ---------------------------------------------------------------------------

/**
 * Build a CSS font string recognised by the pretext engine.
 *
 * @example
 *   buildFont(16)                    // "400 16px Inter"
 *   buildFont(14, 'Inter', 500)      // "500 14px Inter"
 *   buildFont(15, 'monospace')       // "400 15px monospace"
 */
export function buildFont(
  fontSize: number,
  fontFamily = 'Inter',
  fontWeight: number | string = 400,
): string {
  return `${fontWeight} ${fontSize}px ${fontFamily}`;
}

// ---------------------------------------------------------------------------
// Width measurement (single-line)
// ---------------------------------------------------------------------------

/**
 * Returns the rendered pixel width of `text` as a single unbroken line.
 *
 * Replaces:  `text.length * CHAR_WIDTH_PX` or hidden-span tricks.
 * Gain:      no DOM query, no forced reflow — pure canvas arithmetic.
 *
 * @returns 0 when text is empty or pretext throws (safe fallback).
 */
export function measureTextWidth(text: string, font: string): number {
  if (!text) return 0;
  try {
    const prepared = prepareWithSegments(text, font);
    // maxWidth = Infinity → no wrapping; lineHeight irrelevant for width
    const result = layoutWithLines(prepared, Number.POSITIVE_INFINITY, 1000);
    return result.lines[0]?.width ?? 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Height measurement (multi-line)
// ---------------------------------------------------------------------------

/**
 * Returns the total rendered height of `text` wrapped at `maxWidth`.
 *
 * Replaces:  rendering to a hidden div and reading scrollHeight.
 * Gain:      no DOM needed, works before the element is mounted.
 *
 * @param maxWidth   Available width in px (e.g. container clientWidth)
 * @param lineHeight Line height in px  (e.g. fontSize * 1.5)
 * @returns 0 when inputs are invalid or pretext throws.
 */
export function measureTextHeight(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number,
): number {
  if (!text || maxWidth <= 0 || lineHeight <= 0) return 0;
  try {
    const prepared = prepare(text, font);
    const { height } = layout(prepared, maxWidth, lineHeight);
    return height;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Combined layout measurement (line count + height)
// ---------------------------------------------------------------------------

/**
 * Returns both the number of wrapped lines and total rendered height of `text`.
 *
 * Use this when you need both values at once (avoids running `prepare` twice).
 *
 * @param maxWidth   Available width in px
 * @param lineHeight Line height in px
 * @returns `{ lineCount: 0, height: 0 }` when inputs are invalid.
 */
export function measureTextLayout(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number,
): { lineCount: number; height: number } {
  if (!text || maxWidth <= 0 || lineHeight <= 0) return { lineCount: 0, height: 0 };
  try {
    const prepared = prepare(text, font);
    return layout(prepared, maxWidth, lineHeight);
  } catch {
    return { lineCount: 0, height: 0 };
  }
}

// ---------------------------------------------------------------------------
// Warm-up (pre-heat font-metrics canvas cache)
// ---------------------------------------------------------------------------

/**
 * Pre-warms the canvas font-metrics cache for a (text, font) pair.
 *
 * Call this during idle time for text that will be measured soon so the
 * first real measurement call returns instantly.
 *
 * @param text Any representative text — e.g. the verse body.
 * @param font CSS font string, e.g. `buildFont(23, 'Literata')`.
 */
export function warmUpText(text: string, font: string): void {
  if (!text) return;
  try {
    prepare(text, font);
  } catch {
    // Best-effort pre-warm — ignore failures silently.
  }
}
