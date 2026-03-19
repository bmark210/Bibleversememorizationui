"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from "react";
import { motion } from "motion/react";
import {
  createVerticalTouchSwipeStart,
  getVerticalTouchSwipeStep,
  type VerticalTouchSwipeStart,
} from "@/shared/ui/verticalTouchSwipe";

import { cn } from "./ui/utils";

type VerseCardMinHeight = "auto" | "preview" | "training";
export type VerseCardPreviewTone =
  | "my"
  | "catalog"
  | "learning"
  | "review"
  | "mastered"
  | "stopped";

export type VerseCardTag = {
  id?: string;
  slug?: string;
  title: string;
};

export interface VerseCardProps {
  isActive?: boolean;
  header?: ReactNode;
  metaBadge?: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
  centerAction?: ReactNode;
  shellClassName?: string;
  contentClassName?: string;
  minHeight?: VerseCardMinHeight;
  bodyScrollable?: boolean;
  previewTone?: VerseCardPreviewTone;
  tags?: VerseCardTag[];
  activeTagSlugs?: Iterable<string> | null;
  onVerticalSwipeStep?: (step: 1 | -1) => void;
}

type CardTouchGestureContext = {
  swipeStart: VerticalTouchSwipeStart | null;
  startedInScrollableBody: boolean;
  scrollEl: HTMLElement | null;
  startScrollTop: number;
  maxScrollTop: number;
  scrollable: boolean;
  nestedScrollEl: HTMLElement | null;
};

type ScrollFadeState = {
  canScroll: boolean;
  showTop: boolean;
  showBottom: boolean;
};

const SCROLL_EDGE_EPSILON_PX = 2;
const SWIPE_TINY_OVERFLOW_MAX_SCROLL_PX = 56;
const MIN_SCROLLABLE_OVERFLOW_PX = 0.5;
const SWIPE_MIN_DISTANCE_DEFAULT_PX = 70;
const MAX_VISIBLE_TAGS = 2;
const CARD_SWIPE_IGNORE_SELECTOR = 'input, textarea, [contenteditable="true"]';
const CARD_NESTED_SCROLL_SELECTOR = '[data-card-swipe-ignore="true"]';

const MIN_HEIGHT_CLASS_BY_KIND: Record<VerseCardMinHeight, string> = {
  auto: "",
  preview: "h-[520px]",
  training: "h-[clamp(25rem,calc(100dvh-16rem),42rem)]",
};

const PREVIEW_TONE_CARD_CLASS: Record<VerseCardPreviewTone, string> = {
  my: "bg-gradient-to-br from-sky-500/8 via-card to-card",
  catalog: "bg-gradient-to-br from-slate-500/6 via-card to-card",
  learning: "bg-gradient-to-br from-emerald-500/8 via-card to-card",
  review: "bg-gradient-to-br from-violet-500/10 via-card to-card",
  mastered: "bg-gradient-to-br from-amber-400/14 via-card to-card",
  stopped: "bg-gradient-to-br from-rose-500/8 via-card to-card",
};

const PREVIEW_TONE_FRAME_CLASS: Record<VerseCardPreviewTone, string> = {
  my: "bg-sky-500/28",
  catalog: "bg-slate-500/24",
  learning: "bg-emerald-500/26",
  review: "bg-violet-500/30",
  mastered: "bg-amber-500/34",
  stopped: "bg-rose-500/26",
};

const PREVIEW_TONE_GLOW_CLASS: Record<VerseCardPreviewTone, string> = {
  my: "bg-sky-500/18",
  catalog: "bg-slate-500/12",
  learning: "bg-emerald-500/16",
  review: "bg-violet-500/18",
  mastered: "bg-amber-400/22",
  stopped: "bg-rose-500/16",
};

const PREVIEW_TONE_LINE_CLASS: Record<VerseCardPreviewTone, string> = {
  my: "from-sky-500/0 via-sky-500/35 to-sky-500/0",
  catalog: "from-slate-500/0 via-slate-500/25 to-slate-500/0",
  learning: "from-emerald-500/0 via-emerald-500/35 to-emerald-500/0",
  review: "from-violet-500/0 via-violet-500/35 to-violet-500/0",
  mastered: "from-amber-500/0 via-amber-500/45 to-amber-500/0",
  stopped: "from-rose-500/0 via-rose-500/35 to-rose-500/0",
};

export function VerseCard({
  isActive = true,
  header,
  metaBadge,
  body,
  footer,
  centerAction,
  shellClassName,
  contentClassName,
  minHeight = "training",
  bodyScrollable = false,
  previewTone,
  tags,
  activeTagSlugs = null,
  onVerticalSwipeStep,
}: VerseCardProps) {
  const enableTapScale = !bodyScrollable;
  const isPreviewToneActive = Boolean(previewTone);
  const tone = previewTone ?? "learning";
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const touchGestureRef = useRef<CardTouchGestureContext | null>(null);
  const activeTagSlugSet = useMemo(() => {
    const next = new Set<string>();
    if (!activeTagSlugs) return next;
    for (const rawSlug of activeTagSlugs) {
      const slug = String(rawSlug ?? "").trim();
      if (!slug) continue;
      next.add(slug);
    }
    return next;
  }, [activeTagSlugs]);
  const normalizedTags = useMemo(() => {
    if (!Array.isArray(tags) || tags.length === 0) return [] as VerseCardTag[];
    const seen = new Set<string>();
    const next: VerseCardTag[] = [];
    for (const tag of tags) {
      const title = String(tag?.title ?? "").trim();
      if (!title) continue;
      const key = String(tag?.id ?? tag?.slug ?? title.toLowerCase());
      if (seen.has(key)) continue;
      seen.add(key);
      next.push({
        id: tag?.id,
        slug: tag?.slug,
        title,
      });
    }
    return next;
  }, [tags]);
  const displayedTags = useMemo(() => {
    if (activeTagSlugSet.size === 0) return normalizedTags;
    return normalizedTags.filter((tag) => {
      const slug = String(tag.slug ?? "").trim();
      return Boolean(slug) && activeTagSlugSet.has(slug);
    });
  }, [normalizedTags, activeTagSlugSet]);
  const visibleTags = useMemo(
    () => displayedTags.slice(0, MAX_VISIBLE_TAGS),
    [displayedTags]
  );
  const hiddenTagsCount = Math.max(0, displayedTags.length - visibleTags.length);
  const [scrollFadeState, setScrollFadeState] = useState<ScrollFadeState>({
    canScroll: false,
    showTop: false,
    showBottom: false,
  });

  const getAdaptiveSwipeDetectionOptions = useCallback((maxScrollTop: number) => {
    if (maxScrollTop > 0 && maxScrollTop <= SWIPE_TINY_OVERFLOW_MAX_SCROLL_PX) {
      // Tiny overflows need a much shorter reverse gesture, otherwise "swipe back"
      // feels ignored because the user naturally moves the finger only a little.
      return {
        minVerticalDistance: Math.max(8, Math.min(16, Math.round(maxScrollTop * 0.4) + 4)),
        verticalDominanceRatio: 0.9,
      } as const;
    }

    return {
      minVerticalDistance: SWIPE_MIN_DISTANCE_DEFAULT_PX,
      verticalDominanceRatio: 1.2,
    } as const;
  }, []);

  const getFallbackTinyOverflowSwipeStep = useCallback(
    (
      start: VerticalTouchSwipeStart | null,
      e: ReactTouchEvent<HTMLDivElement>,
      maxScrollTop: number
    ): 1 | -1 | null => {
      if (!start || start.ignore) return null;
      if (maxScrollTop <= 0 || maxScrollTop > SWIPE_TINY_OVERFLOW_MAX_SCROLL_PX) return null;

      const touch = e.changedTouches[0];
      if (!touch) return null;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const tinyThreshold = Math.max(6, Math.min(14, Math.round(maxScrollTop * 0.45) + 4));

      if (absDy < tinyThreshold) return null;
      if (absDy < absDx * 0.55) return null;

      return dy < 0 ? 1 : -1;
    },
    []
  );

  const updateScrollFadeState = useCallback(() => {
    const el = bodyScrollRef.current;
    if (!bodyScrollable || !el) {
      setScrollFadeState((prev) =>
        prev.canScroll || prev.showTop || prev.showBottom
          ? { canScroll: false, showTop: false, showBottom: false }
          : prev
      );
      return;
    }

    const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
    const canScroll = maxScrollTop > 2;
    const showTop = canScroll && el.scrollTop > 2;
    const showBottom = canScroll && el.scrollTop < maxScrollTop - 2;

    setScrollFadeState((prev) =>
      prev.canScroll === canScroll && prev.showTop === showTop && prev.showBottom === showBottom
        ? prev
        : { canScroll, showTop, showBottom }
    );
  }, [bodyScrollable]);

  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (!onVerticalSwipeStep) return;

    const swipeStart = createVerticalTouchSwipeStart(e, {
      ignoreSelector: CARD_SWIPE_IGNORE_SELECTOR,
    });
    const target = e.target as HTMLElement | null;
    const nestedScrollEl =
      target?.closest(CARD_NESTED_SCROLL_SELECTOR) instanceof HTMLElement
        ? (target.closest(CARD_NESTED_SCROLL_SELECTOR) as HTMLElement)
        : null;
    const scrollEl = nestedScrollEl ?? (bodyScrollable ? bodyScrollRef.current : null);

    const startedInScrollableBody = Boolean(!nestedScrollEl && scrollEl && target && scrollEl.contains(target));
    const maxScrollTop = scrollEl ? Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight) : 0;

    touchGestureRef.current = {
      swipeStart,
      startedInScrollableBody,
      scrollEl,
      startScrollTop: scrollEl?.scrollTop ?? 0,
      maxScrollTop,
      scrollable: maxScrollTop > 0,
      nestedScrollEl,
    };
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (!onVerticalSwipeStep) return;

    const context = touchGestureRef.current;
    touchGestureRef.current = null;

    const liveMaxScrollTop =
      context?.scrollEl
        ? Math.max(context.maxScrollTop, Math.max(0, context.scrollEl.scrollHeight - context.scrollEl.clientHeight))
        : context?.maxScrollTop ?? 0;

    const step =
      getVerticalTouchSwipeStep(
        context?.swipeStart ?? null,
        e,
        getAdaptiveSwipeDetectionOptions(liveMaxScrollTop)
      ) ??
      getFallbackTinyOverflowSwipeStep(context?.swipeStart ?? null, e, liveMaxScrollTop);
    if (!step) return;

    if (context?.nestedScrollEl && context.scrollEl) {
      const scrollEl = context.scrollEl;
      const maxScrollTop = Math.max(
        liveMaxScrollTop,
        Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
      );

      if (maxScrollTop <= MIN_SCROLLABLE_OVERFLOW_PX) {
        onVerticalSwipeStep(step);
        return;
      }

      const currentScrollTop = scrollEl.scrollTop;
      const atTop = currentScrollTop <= SCROLL_EDGE_EPSILON_PX;
      const atBottom = currentScrollTop >= maxScrollTop - SCROLL_EDGE_EPSILON_PX;

      if ((step === 1 && atBottom) || (step === -1 && atTop)) {
        onVerticalSwipeStep(step);
      }
      return;
    }

    // Native scroll: only navigate when user was ALREADY at the boundary
    // before the swipe started. This prevents navigating on the same gesture
    // that scrolled content to the edge.
    if (context?.startedInScrollableBody && context.scrollEl) {
      const maxScrollTop = Math.max(
        liveMaxScrollTop,
        Math.max(0, context.scrollEl.scrollHeight - context.scrollEl.clientHeight)
      );

      if (maxScrollTop <= MIN_SCROLLABLE_OVERFLOW_PX) {
        onVerticalSwipeStep(step);
        return;
      }

      const wasAtTop = context.startScrollTop <= SCROLL_EDGE_EPSILON_PX;
      const wasAtBottom = context.startScrollTop >= maxScrollTop - SCROLL_EDGE_EPSILON_PX;

      if ((step === 1 && wasAtBottom) || (step === -1 && wasAtTop)) {
        onVerticalSwipeStep(step);
      }
      return;
    }

    onVerticalSwipeStep(step);
  };

  useEffect(() => {
    if (!bodyScrollable) {
      setScrollFadeState((prev) =>
        prev.canScroll || prev.showTop || prev.showBottom
          ? { canScroll: false, showTop: false, showBottom: false }
          : prev
      );
      return;
    }

    const el = bodyScrollRef.current;
    if (!el || typeof window === "undefined") return;

    let rafId: number | null = null;
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateScrollFadeState();
      });
    };

    const handleScroll = () => {
      scheduleUpdate();
    };
    const handleResize = () => scheduleUpdate();

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleUpdate())
        : null;
    resizeObserver?.observe(el);
    if (el.firstElementChild instanceof HTMLElement) {
      resizeObserver?.observe(el.firstElementChild);
    }

    scheduleUpdate();

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [bodyScrollable, updateScrollFadeState]);

  useEffect(() => {
    if (!bodyScrollable || typeof window === "undefined") return;
    const rafId = window.requestAnimationFrame(() => {
      updateScrollFadeState();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [bodyScrollable, body, contentClassName, header, footer, centerAction, minHeight, updateScrollFadeState]);

  return (
    <div className={cn("relative mx-auto w-full min-w-0 max-w-2xl select-none overflow-x-hidden", shellClassName)}>
      <motion.div
        whileTap={enableTapScale ? { scale: 0.985 } : undefined}
        onTouchStart={onVerticalSwipeStep ? handleTouchStart : undefined}
        onTouchEnd={onVerticalSwipeStep ? handleTouchEnd : undefined}
        className={cn(
          "relative z-10 w-full rounded-[3rem] p-[1px] overflow-hidden [backface-visibility:hidden] [transform:translateZ(0)]",
          "[-webkit-mask-image:-webkit-radial-gradient(white,black)] [mask-image:radial-gradient(white,black)]",
          "shadow-[0_18px_45px_-20px_rgba(0,0,0,0.24)]",
          isPreviewToneActive ? PREVIEW_TONE_FRAME_CLASS[tone] : "bg-border/50",
          onVerticalSwipeStep && "overscroll-none",
          "transition-[opacity,transform] duration-300",
          MIN_HEIGHT_CLASS_BY_KIND[minHeight],
          isActive ? "opacity-100 scale-100" : "opacity-60 scale-95"
        )}
      >
        <div
          className={cn(
            "relative h-full min-w-0 rounded-[calc(3rem-1px)] bg-card overflow-hidden overflow-x-hidden",
            "p-6 sm:p-10 flex flex-col",
            "transition-[opacity,transform] duration-300",
            isPreviewToneActive && PREVIEW_TONE_CARD_CLASS[tone],
            "[background-clip:padding-box]"
          )}
        >
        {isPreviewToneActive && (
          <>
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute left-10 right-10 top-0 h-px bg-gradient-to-r",
                PREVIEW_TONE_LINE_CLASS[tone]
              )}
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute -top-10 left-1/2 h-24 w-[70%] -translate-x-1/2 rounded-full blur-3xl",
                PREVIEW_TONE_GLOW_CLASS[tone]
              )}
            />
          </>
        )}

        {header ? <div className="mb-2 min-w-0 flex-shrink-0">{header}</div> : null}

        {metaBadge ? (
          <div className="mb-1 min-w-0 flex-shrink-0 flex justify-center">
            {metaBadge}
          </div>
        ) : null}

        {visibleTags.length > 0 ? (
          <div className="mb-3 min-w-0 flex-shrink-0">
            <div className="relative w-full overflow-hidden rounded-xl">
              <div className="flex w-full items-center justify-center gap-1.5 overflow-hidden px-1 py-0.5">
                {visibleTags.map((tag, index) => (
                  <span
                    key={tag.id ?? tag.slug ?? `${tag.title}-${index}`}
                    title={tag.title}
                    className={cn(
                      "inline-flex min-w-0 max-w-[min(44vw,11rem)] shrink items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide overflow-hidden",
                      "border-border/60 bg-muted/35 text-muted-foreground"
                    )}
                  >
                    <span className="block w-full truncate overflow-hidden">#{tag.title}</span>
                  </span>
                ))}
                {hiddenTagsCount > 0 ? (
                  <span
                    aria-label={`еще ${hiddenTagsCount} тегов`}
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
                      "border-border/60 bg-muted/35 text-muted-foreground"
                    )}
                  >
                    +{hiddenTagsCount}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="relative flex-1 min-h-0 min-w-0">
          <div
            ref={bodyScrollRef}
            data-verse-card-scroll-body={bodyScrollable ? "true" : undefined}
            className={cn(
              "h-full min-h-0",
              bodyScrollable &&
                "overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]",
              bodyScrollable && "touch-pan-y",
              contentClassName
            )}
            style={
              bodyScrollable && scrollFadeState.canScroll
                ? {
                    maskImage: `linear-gradient(to bottom, ${scrollFadeState.showTop ? "transparent" : "black"} 0%, black ${scrollFadeState.showTop ? "36px" : "0px"}, black calc(100% - ${scrollFadeState.showBottom ? "36px" : "0px"}), ${scrollFadeState.showBottom ? "transparent" : "black"} 100%)`,
                    WebkitMaskImage: `linear-gradient(to bottom, ${scrollFadeState.showTop ? "transparent" : "black"} 0%, black ${scrollFadeState.showTop ? "36px" : "0px"}, black calc(100% - ${scrollFadeState.showBottom ? "36px" : "0px"}), ${scrollFadeState.showBottom ? "transparent" : "black"} 100%)`,
                  }
                : undefined
            }
          >
            {body}
          </div>
        </div>

        {centerAction ? (
          <div className="mt-4 mb-2 flex min-w-0 flex-shrink-0 justify-center">{centerAction}</div>
        ) : null}

        {footer ? <div className="mt-6 min-w-0 flex-shrink-0">{footer}</div> : null}
        </div>
      </motion.div>
    </div>
  );
}
