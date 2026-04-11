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
  /** Whether to render top/bottom fade shadows. */
  showShadows?: boolean;
  /** When true — only the top shadow is rendered (no bottom shadow). */
  topOnly?: boolean;
  /** Shadow height in px (default 28). */
  shadowSize?: number;
  /** Background colour for the fade gradient (defaults to bg-elevated → background). */
  shadowBg?: string;
  /** Optional cue rendered above bottom shadow while more content is available below. */
  bottomCue?: ReactNode;
  /** Extra classes for the optional bottom cue wrapper. */
  bottomCueClassName?: string;
  /**
   * When true, native scroll is disabled (overflow:hidden).
   * Content is scrolled programmatically via swipe gestures
   * handled by the parent swipe handler (handleSwipeScroll).
   */
  swipeOnly?: boolean;
  /**
   * Shadow rendering style:
   * - "gradient" (default) — absolute div with background gradient overlay
   * - "inset" — inset box-shadow on the outer wrapper; color-agnostic, works on any background
   */
  shadowStyle?: 'gradient' | 'inset';
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
  showShadows = true,
  topOnly = false,
  shadowSize = 28,
  shadowBg = 'var(--bg-app)',
  bottomCue,
  bottomCueClassName,
  swipeOnly = false,
  shadowStyle = 'gradient',
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

  const showTopShadow = showShadows && !atTop;
  const showBottomShadow = showShadows && !topOnly && !atBottom;

  const isInset = shadowStyle === 'inset';

  return (
    <div
      className={cn("relative min-h-0", className)}
      style={
        isInset
          ? {
              boxShadow: showTopShadow
                ? 'inset 0 10px 14px -10px rgba(0,0,0,0.12)'
                : 'inset 0 10px 14px -10px rgba(0,0,0,0)',
              transition: 'box-shadow 0.3s ease',
            }
          : undefined
      }
      {...rest}
    >
      {/* Top shadow — gradient mode only */}
      {showShadows && !isInset ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-200"
          style={{
            height: shadowSize,
            opacity: showTopShadow ? 1 : 0,
            background: `linear-gradient(to bottom, ${shadowBg} 0%, transparent 100%)`,
          }}
        />
      ) : null}

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

      {/* Bottom shadow — gradient mode only */}
      {showShadows && !topOnly && !isInset ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-200"
          style={{
            height: shadowSize,
            opacity: showBottomShadow ? 1 : 0,
            background: `linear-gradient(to top, ${shadowBg} 0%, transparent 100%)`,
          }}
        />
      ) : null}

      {bottomCue ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center transition-all duration-200",
            showBottomShadow
              ? "translate-y-0 opacity-100"
              : "translate-y-1 opacity-0",
            bottomCueClassName
          )}
        >
          {bottomCue}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Helper: given a touch target element, find the closest ancestor
 * with `data-scroll-shadow="true"` and check if swiping in the
 * given direction is blocked by remaining scroll.
 *
 * Elements marked with `data-swipe-through="true"` are excluded
 * from blocking — swipe always passes through to card navigation.
 *
 * Returns `true` if swipe should be blocked (inner scroll not at boundary).
 */
export function isSwipeBlockedByScroll(
  target: HTMLElement | null,
  swipeDirection: 1 | -1
): boolean {
  if (!target) return false;

  // Swipe always passes through from elements marked as passthrough
  if (target.closest('[data-swipe-through="true"]')) return false;

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
 * Helper for swipe-scroll containers: given a touch target element,
 * find the closest ancestor with `data-swipe-scroll="true"` and
 * programmatically scroll it by a chunk in the swipe direction.
 *
 * Elements marked with `data-swipe-through="true"` are excluded —
 * swipe always passes through to card navigation.
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

  // Swipe always passes through from elements marked as passthrough
  if (target.closest('[data-swipe-through="true"]')) return false;

  const scrollable = target.closest<HTMLElement>(
    '[data-swipe-scroll="true"]'
  );
  if (!scrollable) return false;

  const { scrollTop, scrollHeight, clientHeight } = scrollable;
  const threshold = 2;
  const hasScroll = scrollHeight > clientHeight + threshold;
  if (!hasScroll) return false;

  // Scroll by ~40% of visible height for a gentle, slow-paced feel
  const scrollStep = Math.max(clientHeight * 0.4, 60);

  if (swipeDirection === 1) {
    // Swipe up → next → scroll content down
    if (scrollTop + clientHeight >= scrollHeight - threshold) return false;
    scrollable.scrollTo({
      top: Math.min(scrollTop + scrollStep, scrollHeight - clientHeight),
      behavior: "smooth",
    });
    return true;
  }

  // Swipe down → prev → scroll content up
  if (scrollTop <= threshold) return false;
  scrollable.scrollTo({
    top: Math.max(scrollTop - scrollStep, 0),
    behavior: "smooth",
  });
  return true;
}
