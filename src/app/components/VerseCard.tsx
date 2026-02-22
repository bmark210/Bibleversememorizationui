"use client";

import type { ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useDrag } from "@use-gesture/react";
import { Play, Square, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Verse } from "@/app/App";
import { VerseStatus } from "@/generated/prisma";

/* ===================== CONSTANTS ===================== */

const SWIPE_X = 110;   // px — trigger status/delete
const HINT_X  = 50;    // px — show hint
const SWIPE_Y = 80;    // px — trigger navigation
// @use-gesture/react reports velocity in px/ms → 0.6 px/ms = 600 px/s
const VEL_Y   = 0.6;

/* ===================== HELPERS ===================== */

const getSwipeActions = (status: VerseStatus) => {
  const canDelete = status === VerseStatus.STOPPED;
  let rightAction: { next: VerseStatus; label: string; icon: typeof Play } | null = null;
  if (status === VerseStatus.NEW)
    rightAction = { next: VerseStatus.LEARNING, label: "Начать изучение", icon: Play };
  else if (status === VerseStatus.LEARNING)
    rightAction = { next: VerseStatus.STOPPED, label: "Приостановить", icon: Square };
  else if (status === VerseStatus.STOPPED)
    rightAction = { next: VerseStatus.LEARNING, label: "Возобновить", icon: Play };
  return { rightAction, canDelete };
};

/* ===================== TYPES ===================== */

export interface VerseCardProps {
  verse: Verse;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<void>;
  onRequestDelete: () => void;
  showFeedback: (message: string, type: "success" | "error") => void;
  onNavigate: (dir: "prev" | "next") => void;
  onHaptic?: (style: "light" | "medium" | "heavy" | "success" | "error" | "warning") => void;
  horizontalActionsEnabled?: boolean;
  centerAction?: ReactNode;
}

/* ===================== COMPONENT ===================== */

export function VerseCard({
  verse,
  isActive,
  isFirst,
  isLast,
  onStatusChange,
  onRequestDelete,
  showFeedback,
  onNavigate,
  onHaptic,
  horizontalActionsEnabled = true,
  centerAction,
}: VerseCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const { rightAction, canDelete } = getSwipeActions(verse.status);

  // Scale: each icon grows only in its own swipe direction
  const actionIconScale  = useTransform(x, [0,  HINT_X,  SWIPE_X], [0.8, 1.1, 1.2]);
  const deleteIconScale  = useTransform(x, [-SWIPE_X, -HINT_X, 0], [1.2, 1.1, 0.8]);
  // Opacity: each icon is invisible in the wrong direction
  const actionIconOpacity = useTransform(x, [0,  HINT_X,  SWIPE_X], [0, 0.7, 1]);
  const deleteIconOpacity = useTransform(x, [-SWIPE_X, -HINT_X, 0], [1, 0.7, 0]);

  /* ─── Y transforms (vertical — navigation hints) ─── */
  const upHintOpacity   = useTransform(y, [0, -30, -SWIPE_Y], [0, 0.5, 1]);
  const upHintScale     = useTransform(y, [0, -SWIPE_Y], [0.9, 1.1]);
  const downHintOpacity = useTransform(y, [0,  30,  SWIPE_Y], [0, 0.5, 1]);
  const downHintScale   = useTransform(y, [0, SWIPE_Y], [0.9, 1.1]);

  /* ─── Snap back helpers ─── */
  const resetX = () => animate(x, 0, { type: "spring", stiffness: 500, damping: 50 } as const);
  const resetY = () => animate(y, 0, { type: "spring", stiffness: 400, damping: 38 } as const);

  const handleHorizontalSwipeProgress = (offsetX: number, triggered: boolean) => {
    if (!horizontalActionsEnabled) return false;
    x.set(offsetX);
    if (!triggered && Math.abs(offsetX) > SWIPE_X) {
      onHaptic?.("light");
      return true;
    }
    if (triggered && Math.abs(offsetX) < SWIPE_X * 0.8) {
      return false;
    }
    return triggered;
  };

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

  const handleHorizontalSwipeEnd = (offsetX: number) => {
    if (!horizontalActionsEnabled) {
      resetX();
      return;
    }
    (async () => {
      try {
        if (offsetX > SWIPE_X && rightAction) {
          onHaptic?.("success");
          await onStatusChange(verse, rightAction.next);
          showFeedback(rightAction.label, "success");
        } else if (offsetX < -SWIPE_X && canDelete) {
          onHaptic?.("warning");
          onRequestDelete();
        }
      } catch {
        onHaptic?.("error");
        showFeedback("Произошла ошибка", "error");
      }
    })();
    resetX();
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

  /* ─── useDrag — separate horizontal/vertical logic with axis lock per gesture ─── */
  const bind = useDrag(
    ({ movement: [mx, my], last, velocity: [, vy], memo }) => {
      if (!isActive) return memo;

      memo = memo ?? { axis: null as "x" | "y" | null, triggered: false };
      const currentAxis = memo.axis ?? (
        horizontalActionsEnabled
          ? (Math.abs(mx) >= Math.abs(my) ? "x" : "y")
          : "y"
      );

      if (!last) {
        if (currentAxis === "x") {
          memo.triggered = handleHorizontalSwipeProgress(mx, memo.triggered);
          y.set(0);
        } else {
          memo.triggered = handleVerticalSwipeProgress(my, memo.triggered);
          x.set(0);
        }
      } else {
        if (currentAxis === "x") {
          handleHorizontalSwipeEnd(mx);
        } else {
          handleVerticalSwipeEnd(my, vy);
        }
      }

      return { ...memo, axis: currentAxis };
    },
    {
      enabled: isActive,
      filterTaps: true,
      threshold: 8,
      from: () => [x.get(), y.get()],
      pointer: { touch: true },
    }
  );

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">

      {/* ── NEXT hint (drag up) ── */}
      {!isLast && (
        <motion.div
          style={{ opacity: upHintOpacity, scale: upHintScale }}
          className="absolute -top-9 left-0 right-0 flex justify-center pointer-events-none"
        >
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/70 px-3 py-1 rounded-full backdrop-blur-sm">
            <ChevronUp className="h-3 w-3" /> Следующий
          </span>
        </motion.div>
      )}

      {/* ── SWIPE X background layer ── */}
      {horizontalActionsEnabled && (
        <motion.div
          className="absolute inset-0 rounded-[3rem] flex items-center justify-between px-8 sm:px-14 pointer-events-none"
          aria-hidden="true"
        >
          {/* LEFT — revealed when card moves RIGHT → rightAction */}
          {rightAction && (
            <motion.div
              style={{ scale: actionIconScale, opacity: actionIconOpacity }}
              className="flex flex-col items-center gap-1.5 text-white"
              role="img"
              aria-label={rightAction.label}
            >
              <rightAction.icon className="w-7 h-7" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-center max-w-[90px]">
                {rightAction.label}
              </span>
            </motion.div>
          )}
          <div className="flex-1" />
          {/* RIGHT — revealed when card moves LEFT → delete */}
          {canDelete && (
            <motion.div
              style={{ scale: deleteIconScale, opacity: deleteIconOpacity }}
              className="flex flex-col items-center gap-1.5 text-white"
              role="img"
              aria-label="Удалить стих"
            >
              <Trash2 className="w-7 h-7" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Удалить</span>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── CARD ── */}
      <motion.div
        {...(bind() as Record<string, unknown>)}
        style={{ x, y, touchAction: "none" }}
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
            <span className="text-2xl font-bold text-primary">{verse.masteryLevel}%</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              key={`${verse.id}-${isActive}`}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${verse.masteryLevel}%` }}
              transition={{ duration: 0.85, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </div>
        </div>

        {/* Swipe hint */}
        {isActive && horizontalActionsEnabled && (
          <p className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/60 whitespace-nowrap">
            ← действия · листать ↕ →
          </p>
        )}
      </motion.div>

      {/* ── PREV hint (drag down) ── */}
      {!isFirst && (
        <motion.div
          style={{ opacity: downHintOpacity, scale: downHintScale }}
          className="absolute -bottom-9 left-0 right-0 flex justify-center pointer-events-none"
        >
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/70 px-3 py-1 rounded-full backdrop-blur-sm">
            <ChevronDown className="h-3 w-3" /> Предыдущий
          </span>
        </motion.div>
      )}
    </div>
  );
}
