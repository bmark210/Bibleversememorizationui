"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent as ReactTouchEvent } from "react";
import { motion } from "motion/react";
import {
  createVerticalTouchSwipeStart,
  getVerticalTouchSwipeStep,
  type VerticalTouchSwipeStart,
} from "@/shared/ui/verticalTouchSwipe";

import { cn } from "./ui/utils";

type VerseCardMinHeight = "auto" | "preview" | "training";
export type VerseCardPreviewTone = "new" | "learning" | "review" | "stopped";

export interface VerseCardProps {
  isActive?: boolean;
  header?: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
  centerAction?: ReactNode;
  shellClassName?: string;
  contentClassName?: string;
  minHeight?: VerseCardMinHeight;
  bodyScrollable?: boolean;
  previewTone?: VerseCardPreviewTone;
  onVerticalSwipeStep?: (step: 1 | -1) => void;
}

type CardTouchGestureContext = {
  swipeStart: VerticalTouchSwipeStart | null;
  startedInScrollableBody: boolean;
  scrollEl: HTMLElement | null;
  startScrollTop: number;
  maxScrollTop: number;
  scrollable: boolean;
};

type ScrollFadeState = {
  canScroll: boolean;
  showTop: boolean;
  showBottom: boolean;
};

const MIN_HEIGHT_CLASS_BY_KIND: Record<VerseCardMinHeight, string> = {
  auto: "",
  preview: "h-[520px]",
  training: "h-[clamp(24rem,calc(100dvh-18rem),39rem)]",
};

const PREVIEW_TONE_CARD_CLASS: Record<VerseCardPreviewTone, string> = {
  new: "border-sky-500/20 bg-gradient-to-br from-sky-500/8 via-card to-card/85",
  learning: "border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-card to-card/85",
  review: "border-violet-500/22 bg-gradient-to-br from-violet-500/10 via-card to-card/85",
  stopped: "border-rose-500/20 bg-gradient-to-br from-rose-500/8 via-card to-card/85",
};

const PREVIEW_TONE_GLOW_CLASS: Record<VerseCardPreviewTone, string> = {
  new: "bg-sky-500/18",
  learning: "bg-emerald-500/16",
  review: "bg-violet-500/18",
  stopped: "bg-rose-500/16",
};

const PREVIEW_TONE_LINE_CLASS: Record<VerseCardPreviewTone, string> = {
  new: "from-sky-500/0 via-sky-500/35 to-sky-500/0",
  learning: "from-emerald-500/0 via-emerald-500/35 to-emerald-500/0",
  review: "from-violet-500/0 via-violet-500/35 to-violet-500/0",
  stopped: "from-rose-500/0 via-rose-500/35 to-rose-500/0",
};

export function VerseCard({
  isActive = true,
  header,
  body,
  footer,
  centerAction,
  shellClassName,
  contentClassName,
  minHeight = "training",
  bodyScrollable = false,
  previewTone,
  onVerticalSwipeStep,
}: VerseCardProps) {
  const enableTapScale = !bodyScrollable;
  const isPreviewToneActive = Boolean(previewTone);
  const tone = previewTone ?? "learning";
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const touchGestureRef = useRef<CardTouchGestureContext | null>(null);
  const [scrollFadeState, setScrollFadeState] = useState<ScrollFadeState>({
    canScroll: false,
    showTop: false,
    showBottom: false,
  });

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

  const scrollCardContentBySwipeStep = (scrollEl: HTMLElement, step: 1 | -1) => {
    const delta = Math.max(96, Math.round(scrollEl.clientHeight * 0.72));
    const offset = step === 1 ? delta : -delta;
    const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    const nextTop = Math.max(0, Math.min(scrollEl.scrollTop + offset, maxScrollTop));

    try {
      scrollEl.scrollTo({ top: nextTop, behavior: "smooth" });
      return;
    } catch {
      scrollEl.scrollTop = nextTop;
    }
  };

  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (!onVerticalSwipeStep) return;

    const swipeStart = createVerticalTouchSwipeStart(e);
    const target = e.target as HTMLElement | null;
    const scrollEl = bodyScrollable ? bodyScrollRef.current : null;
    const startedInScrollableBody = Boolean(scrollEl && target && scrollEl.contains(target));
    const maxScrollTop = scrollEl ? Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight) : 0;

    touchGestureRef.current = {
      swipeStart,
      startedInScrollableBody,
      scrollEl,
      startScrollTop: scrollEl?.scrollTop ?? 0,
      maxScrollTop,
      scrollable: maxScrollTop > 0,
    };
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (!onVerticalSwipeStep) return;

    const context = touchGestureRef.current;
    touchGestureRef.current = null;

    const step = getVerticalTouchSwipeStep(context?.swipeStart ?? null, e);
    if (!step) return;

    if (context?.startedInScrollableBody) {
      if (!context.scrollEl || !context.scrollable) {
        onVerticalSwipeStep(step);
        return;
      }

      const atTop = context.startScrollTop <= 1;
      const atBottom = context.startScrollTop >= context.maxScrollTop - 1;

      // Boundary handoff: at scroll edges, swipe navigates to adjacent card.
      if ((step === 1 && atBottom) || (step === -1 && atTop)) {
        onVerticalSwipeStep(step);
        return;
      }

      scrollCardContentBySwipeStep(context.scrollEl, step);
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

    const onScroll = () => scheduleUpdate();
    const onResize = () => scheduleUpdate();

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

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
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
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
    <div className={cn("relative w-full max-w-2xl mx-auto select-none", shellClassName)}>
      <motion.div
        whileTap={enableTapScale ? { scale: 0.985 } : undefined}
        onTouchStart={onVerticalSwipeStep ? handleTouchStart : undefined}
        onTouchEnd={onVerticalSwipeStep ? handleTouchEnd : undefined}
        className={cn(
          "relative z-10 w-full bg-gradient-to-br from-card to-card/80",
          "backdrop-blur-sm rounded-[3rem] border-2 border-border/50",
          "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]",
          "p-6 sm:p-10 flex flex-col overflow-hidden",
          "transition-[opacity,transform] duration-300",
          isPreviewToneActive && PREVIEW_TONE_CARD_CLASS[tone],
          MIN_HEIGHT_CLASS_BY_KIND[minHeight],
          isActive ? "opacity-100 scale-100" : "opacity-60 scale-95"
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

        {header ? <div className="flex-shrink-0 mb-2">{header}</div> : null}

        <div className="relative flex-1 min-h-0">
          <div
            ref={bodyScrollRef}
            data-verse-card-scroll-body={bodyScrollable ? "true" : undefined}
            className={cn(
              "h-full min-h-0",
              bodyScrollable && "overflow-y-auto overscroll-contain touch-pan-y pr-1 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]",
              contentClassName
            )}
          >
            {body}
          </div>

          {bodyScrollable && (
            <>
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-7 transition-[opacity,transform] duration-250 ease-out",
                  "bg-gradient-to-b from-card via-card/78 via-35% to-transparent",
                  scrollFadeState.canScroll && scrollFadeState.showTop
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-1 opacity-0"
                )}
              />
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 h-14 transition-[opacity,transform] duration-250 ease-out",
                  "bg-gradient-to-t from-card via-card/88 via-card/58 via-45% to-transparent",
                  scrollFadeState.canScroll && scrollFadeState.showBottom
                    ? "translate-y-0 opacity-100"
                    : "translate-y-1 opacity-0"
                )}
              />
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-x-4 bottom-1 h-8 rounded-[1.25rem] blur-xl transition-opacity duration-250",
                  "bg-black/20 dark:bg-black/30",
                  scrollFadeState.canScroll && scrollFadeState.showBottom ? "opacity-100" : "opacity-0"
                )}
              />
            </>
          )}
        </div>

        {centerAction ? (
          <div className="flex-shrink-0 mt-4 mb-2 flex justify-center">{centerAction}</div>
        ) : null}

        {footer ? <div className="flex-shrink-0 mt-6">{footer}</div> : null}
      </motion.div>
    </div>
  );
}
