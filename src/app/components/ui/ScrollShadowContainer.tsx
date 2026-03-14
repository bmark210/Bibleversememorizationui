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
}

/**
 * Wraps children in an overflow-y-auto container with dynamic
 * top / bottom fade shadows that appear only when content is scrollable
 * in that direction.
 *
 * Also sets `data-scroll-shadow="true"` plus `data-at-top` / `data-at-bottom`
 * so parent swipe handlers can decide whether to allow card navigation.
 */
export function ScrollShadowContainer({
  children,
  className,
  scrollClassName,
  shadowSize = 28,
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
        data-at-top={atTop}
        data-at-bottom={atBottom}
        className={cn("overflow-y-auto overscroll-contain h-full", scrollClassName)}
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
