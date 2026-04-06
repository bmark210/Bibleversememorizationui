'use client'

import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { buildFont, measureTextLayout } from '@/app/utils/textLayout';

// ---------------------------------------------------------------------------
// CSS constants — must mirror VersePreviewCard body text classes:
//
//   font-verse          → Literata
//   text-[1.45rem]      → 23 px  (mobile, root 16 px)
//   sm:text-[1.95rem]   → 31 px  (sm breakpoint ≥ 640 px)
//   leading-[1.8]       → lineHeight = fontSize × 1.8
//   px-2                → 8 px horizontal padding each side of body div
// ---------------------------------------------------------------------------

const FONT_FAMILY = 'Literata';
const FONT_WEIGHT = 400;
const ROOT_FONT_SIZE_PX = 16;
const FONT_SIZE_MOBILE_PX = Math.round(1.45 * ROOT_FONT_SIZE_PX); // 23 px
const FONT_SIZE_DESKTOP_PX = Math.round(1.95 * ROOT_FONT_SIZE_PX); // 31 px
const LEADING = 1.8;
const LINE_HEIGHT_MOBILE_PX = Math.round(FONT_SIZE_MOBILE_PX * LEADING); // ≈ 41 px
const LINE_HEIGHT_DESKTOP_PX = Math.round(FONT_SIZE_DESKTOP_PX * LEADING); // ≈ 56 px

/** Horizontal padding inside the body container (px-2 = 8px × 2 sides). */
const BODY_PADDING_H = 16;
/** Width at which the Tailwind `sm:` breakpoint activates. */
const SM_BREAKPOINT_PX = 640;
/** Minimum clamp value — always show at least 2 lines. */
const MIN_LINE_CLAMP = 2;
/** Initial / SSR fallback clamp. */
const INITIAL_LINE_CLAMP = 8;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Computes the `-webkit-line-clamp` value for the verse preview body text.
 *
 * **What this replaces:**
 * The old inline `useEffect` called `window.getComputedStyle(textEl).lineHeight`
 * and `.fontSize` — two forced browser reflows per resize event.
 * This hook instead derives font metrics from CSS constants and uses
 * `@chenglou/pretext` to measure the actual line count without any DOM queries.
 *
 * **How it works:**
 * 1. ResizeObserver on `bodyRef` fires whenever the body area changes size.
 * 2. `availableHeight` comes from `bodyRef.current.clientHeight` (one layout
 *    read, same as before — unavoidable to know the available space).
 * 3. `lineHeight` is computed from the known CSS constants — no `getComputedStyle`.
 * 4. `measureTextLayout` (pretext) computes the actual number of lines the verse
 *    text wraps to at the current width — no hidden DOM element needed.
 * 5. The clamp = `min(linesFromText, floor(availableHeight / lineHeight))` so
 *    we never show a truncation indicator when the text already fits.
 *
 * @param verseText   The verse body string (without surrounding quotes).
 * @param isFocusMode When `true` the text is fully visible — clamping is off.
 * @param bodyRef     Ref to the wrapper `<div>` that constrains the text height.
 */
export function usePreviewLineClamp(
  verseText: string,
  isFocusMode: boolean,
  bodyRef: RefObject<HTMLDivElement | null>,
): number {
  const [lineClamp, setLineClamp] = useState(INITIAL_LINE_CLAMP);

  useEffect(() => {
    if (isFocusMode || typeof window === 'undefined') return;

    const bodyEl = bodyRef.current;
    if (!bodyEl) return;

    let rafId: number | null = null;

    const updateLineClamp = () => {
      const el = bodyRef.current;
      if (!el) return;

      const availableHeight = el.clientHeight;
      if (availableHeight <= 0) return;

      const containerWidth = el.clientWidth;
      const isDesktop = containerWidth >= SM_BREAKPOINT_PX;
      const fontSizePx = isDesktop ? FONT_SIZE_DESKTOP_PX : FONT_SIZE_MOBILE_PX;
      const lineHeightPx = isDesktop ? LINE_HEIGHT_DESKTOP_PX : LINE_HEIGHT_MOBILE_PX;

      // Maximum lines that physically fit in the available height — no reflow.
      const maxFitLines = Math.max(MIN_LINE_CLAMP, Math.floor(availableHeight / lineHeightPx));

      // Actual wrapped line count via pretext — no DOM queries.
      const font = buildFont(fontSizePx, FONT_FAMILY, FONT_WEIGHT);
      const textWidth = Math.max(80, containerWidth - BODY_PADDING_H);
      const { lineCount } = measureTextLayout(
        `«${verseText}»`,
        font,
        textWidth,
        lineHeightPx,
      );

      // Cap at the actual line count so we never show a phantom clamp indicator
      // when the text is already shorter than the available height.
      const nextClamp =
        lineCount > 0 ? Math.min(maxFitLines, lineCount) : maxFitLines;

      setLineClamp((prev) => (prev === nextClamp ? prev : nextClamp));
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateLineClamp();
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleUpdate())
        : null;

    resizeObserver?.observe(bodyEl);
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [bodyRef, isFocusMode, verseText]);

  return lineClamp;
}
