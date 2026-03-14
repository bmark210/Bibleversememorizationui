"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import { cn } from "./utils";

interface ScrollShadowContainerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  /** Extra classes on the outer wrapper (the one with relative + shadows). */
  className?: string;
  /** Extra classes on the inner scrollable div. */
  scrollClassName?: string;
  /** Shadow height in px (default 28). */
  shadowSize?: number;
  /**
   * When true, native scroll is disabled (overflow:hidden).
   * Content is scrolled programmatically via swipe gestures
   * handled by the parent swipe handler (handleSwipeScroll).
   */
  swipeOnly?: boolean;
}

/**
 * Wraps children in an overflow-y-auto container with dynamic
 * top / bottom fade shadows that appear only when content is scrollable
 * in that direction.
 *
 * Also sets `data-scroll-shadow="true"` plus `data-at-top` / `data-at-bottom`
 * so parent swipe handlers can decide whether to allow card navigation.
 *
 * When `swipeOnly` is true, the container uses overflow:hidden and adds
 * `data-swipe-scroll="true"` so swipe handlers can programmatically
 * scroll it instead of switching cards.
 */
export function ScrollShadowContainer({
  children,
  className,
  scrollClassName,
  shadowSize = 28,
  swipeOnly = false,
  ...rest
}: ScrollShadowContainerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const threshold = 2; // rounding tolerance
    setAtTop(scrollTop <= threshold);
    setAtBottom(scrollTop + clientHeight >= scrollHeight - threshold);
  }, []);

  // Initial + resize measure
  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // also observe first child in case inner content size changes
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);

  const handleScroll = useCallback(() => {
    measure();
  }, [measure]);

  // For swipeOnly containers: smooth scrollTo may not fire onScroll reliably
  // in all browsers, so also re-measure after scroll animations settle.
  useEffect(() => {
    if (!swipeOnly) return;
    const el = scrollRef.current;
    if (!el) return;
    const onScrollEnd = () => measure();
    el.addEventListener("scrollend", onScrollEnd);
    return () => el.removeEventListener("scrollend", onScrollEnd);
  }, [swipeOnly, measure]);

  const showTopShadow = !atTop;
  const showBottomShadow = !atBottom;

  return (
    <div
      className={cn("relative min-h-0", className)}
      {...rest}
    >
      {/* Top shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-200"
        style={{
          height: shadowSize,
          opacity: showTopShadow ? 1 : 0,
          background:
            "linear-gradient(to bottom, var(--color-background, hsl(0 0% 100%)) 0%, transparent 100%)",
        }}
      />

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        data-scroll-shadow="true"
        data-swipe-scroll={swipeOnly || undefined}
        data-at-top={atTop}
        data-at-bottom={atBottom}
        className={cn(
          swipeOnly
            ? "overflow-hidden overscroll-contain h-full"
            : "overflow-y-auto overscroll-contain h-full",
          scrollClassName
        )}
        onScroll={handleScroll}
      >
        {children}
      </div>

      {/* Bottom shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-200"
        style={{
          height: shadowSize,
          opacity: showBottomShadow ? 1 : 0,
          background:
            "linear-gradient(to top, var(--color-background, hsl(0 0% 100%)) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

/**
 * Helper: given a touch target element, find the closest ancestor
 * with `data-scroll-shadow="true"` and check if swiping in the
 * given direction is blocked by remaining scroll.
 *
 * Returns `true` if swipe should be blocked (inner scroll not at boundary).
 */
export function isSwipeBlockedByScroll(
  target: HTMLElement | null,
  swipeDirection: 1 | -1
): boolean {
  if (!target) return false;

  const scrollable = target.closest<HTMLElement>(
    '[data-scroll-shadow="true"]'
  );
  if (!scrollable) return false;

  const { scrollTop, scrollHeight, clientHeight } = scrollable;
  const threshold = 2;
  const hasScroll = scrollHeight > clientHeight + threshold;
  if (!hasScroll) return false;

  // Swiping up (next card, step=1) → finger moves up → content needs to scroll down
  // Block if NOT at bottom
  if (swipeDirection === 1) {
    return scrollTop + clientHeight < scrollHeight - threshold;
  }

  // Swiping down (prev card, step=-1) → finger moves down → content needs to scroll up
  // Block if NOT at top
  return scrollTop > threshold;
}

/**
 * Helper for swipe-only scroll containers: given a touch target element,
 * find the closest ancestor with `data-swipe-scroll="true"` and
 * programmatically scroll it to the boundary in the swipe direction.
 *
 * Returns `true` if the swipe was consumed (content scrolled).
 * Returns `false` if the content is already at the boundary or
 * no swipe-scroll container was found — caller should proceed
 * with card navigation.
 */
export function handleSwipeScroll(
  target: HTMLElement | null,
  swipeDirection: 1 | -1
): boolean {
  if (!target) return false;

  const scrollable = target.closest<HTMLElement>(
    '[data-swipe-scroll="true"]'
  );
  if (!scrollable) return false;

  const { scrollTop, scrollHeight, clientHeight } = scrollable;
  const threshold = 2;
  const hasScroll = scrollHeight > clientHeight + threshold;
  if (!hasScroll) return false;

  if (swipeDirection === 1) {
    // Swipe up → next → scroll content down
    if (scrollTop + clientHeight >= scrollHeight - threshold) return false;
    scrollable.scrollTo({ top: scrollHeight, behavior: "smooth" });
    return true;
  }

  // Swipe down → prev → scroll content up
  if (scrollTop <= threshold) return false;
  scrollable.scrollTo({ top: 0, behavior: "smooth" });
  return true;
}
