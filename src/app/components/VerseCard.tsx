"use client";

import type { ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useDrag } from "@use-gesture/react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Verse } from "@/app/App";

/* ===================== CONSTANTS ===================== */

const SWIPE_Y = 80;    // px — trigger navigation
// @use-gesture/react reports velocity in px/ms → 0.6 px/ms = 600 px/s
const VEL_Y   = 0.6;

/* ===================== TYPES ===================== */

export interface VerseCardProps {
  verse: Verse;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onNavigate: (dir: "prev" | "next") => void;
  onHaptic?: (style: "light" | "medium" | "heavy" | "success" | "error" | "warning") => void;
  centerAction?: ReactNode;
  topBadge?: ReactNode;
}

/* ===================== COMPONENT ===================== */

export function VerseCard({
  verse,
  isActive,
  isFirst,
  isLast,
  onNavigate,
  onHaptic,
  centerAction,
  topBadge,
}: VerseCardProps) {
  const y = useMotionValue(0);

  /* ─── Y transforms (vertical — navigation hints) ─── */
  const upHintOpacity   = useTransform(y, [0, -30, -SWIPE_Y], [0, 0.5, 1]);
  const upHintScale     = useTransform(y, [0, -SWIPE_Y], [0.9, 1.1]);
  const downHintOpacity = useTransform(y, [0,  30,  SWIPE_Y], [0, 0.5, 1]);
  const downHintScale   = useTransform(y, [0, SWIPE_Y], [0.9, 1.1]);

  /* ─── Snap back helpers ─── */
  const resetY = () => animate(y, 0, { type: "spring", stiffness: 400, damping: 38 } as const);

  const handleVerticalSwipeProgress = (offsetY: number, triggered: boolean) => {
    y.set(offsetY);
    if (!triggered && Math.abs(offsetY) > SWIPE_Y) {
      onHaptic?.("light");
      return true;
    }
    if (triggered && Math.abs(offsetY) < SWIPE_Y * 0.8) {
      return false;
    }
    return triggered;
  };

  const handleVerticalSwipeEnd = (offsetY: number, velocityY: number) => {
    if (offsetY < -SWIPE_Y || velocityY < -VEL_Y) {
      if (!isLast) {
        onHaptic?.("medium");
        onNavigate("next");
      }
    } else if (offsetY > SWIPE_Y || velocityY > VEL_Y) {
      if (!isFirst) {
        onHaptic?.("medium");
        onNavigate("prev");
      }
    }
    resetY();
  };

  /* ─── useDrag — vertical-only navigation ─── */
  const bind = useDrag(
    ({ movement: [, my], last, velocity: [, vy], memo }) => {
      if (!isActive) return memo;

      memo = memo ?? { triggered: false };

      if (!last) {
        memo.triggered = handleVerticalSwipeProgress(my, memo.triggered);
      } else {
        handleVerticalSwipeEnd(my, vy);
      }

      return memo;
    },
    {
      enabled: isActive,
      filterTaps: true,
      threshold: 8,
      from: () => [0, y.get()],
      pointer: { touch: true },
    }
  );

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">
      
      {/* ── NEXT hint (drag up) ── */}
      {!isLast && (
        <motion.div
          style={{ opacity: upHintOpacity, scale: upHintScale }}
          className="absolute -top-9 left-0 right-0 flex justify-center pointer-events-none z-50"
        >
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/70 px-3 py-1 rounded-full backdrop-blur-sm">
            <ChevronUp className="h-3 w-3" /> Следующий
          </span>
        </motion.div>
      )}

      {/* ── CARD ── */}
      <motion.div
        {...(bind() as Record<string, unknown>)}
        style={{ y, touchAction: "none" }}
        whileTap={{ scale: 0.985 }}
        className={`
          relative z-10 w-full h-[520px]
          bg-gradient-to-br from-card to-card/80
          backdrop-blur-sm rounded-[3rem]
          border-2 border-border/50
          shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]
          p-8 sm:p-12 flex flex-col
          transition-[opacity,transform] duration-300
          ${isActive ? "opacity-100 scale-100" : "opacity-60 scale-95"}
        `}
      >
        {/* Reference */}
        <div className="flex-shrink-0 text-center space-y-3 mb-6">
          <h2 className="text-3xl sm:text-4xl font-serif italic text-primary/90 font-bold">
            {verse.reference}
          </h2>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto" />
        </div>

        {/* Text */}
        <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
          <p className="text-xl sm:text-2xl leading-relaxed text-foreground/90 italic text-center line-clamp-[9] font-light">
            «{verse.text}»
          </p>
        </div>

        {/* Center action (e.g. CTA button) */}
        {centerAction && (
          <div className="flex-shrink-0 mt-2 mb-2 flex justify-center">
            {centerAction}
          </div>
        )}

        {/* Progress */}
        <div className="flex-shrink-0 mt-6 space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Прогресс освоения
            </span>
            <span className="text-2xl font-bold text-primary">{Math.round(verse.masteryLevel / 14 * 100)}%</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              key={`${verse.id}-${isActive}`}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${verse.masteryLevel / 14 * 100}%` }}
              transition={{ duration: 0.85, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </div>
        </div>

        <div className="z-10 absolute top-[-30px] left-1/2 -translate-x-1/2 pointer-events-none">
          {topBadge}
        </div>

        {/* Swipe hint */}
        {/* {isActive && (
          <p className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/60 whitespace-nowrap">
            Листать ↕
          </p>
        )} */}
      </motion.div>

      {/* ── PREV hint (drag down) ── */}
      {!isFirst && (
        <motion.div
          style={{ opacity: downHintOpacity, scale: downHintScale }}
          className="absolute -bottom-9 left-0 right-0 flex justify-center pointer-events-none z-50"
        >
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/70 px-3 py-1 rounded-full backdrop-blur-sm">
            <ChevronDown className="h-3 w-3" /> Предыдущий
          </span>
        </motion.div>
      )}
    </div>
  );
}
