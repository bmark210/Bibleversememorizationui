"use client";

import { animate, motion, PanInfo, useMotionValue, useTransform } from "motion/react";
import { Play, Square, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Verse } from "@/app/App";
import { VerseStatus } from "@/generated/prisma";

/* ===================== CONSTANTS ===================== */

const SWIPE_X = 110; // px — trigger status/delete
const HINT_X  = 50;  // px — show hint
const SWIPE_Y = 80;  // px — trigger navigation
const VEL_Y   = 600; // px/s — fast-flick threshold

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
}: VerseCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const { rightAction, canDelete } = getSwipeActions(verse.status);

  /* ─── X transforms (horizontal — action hints) ─── */
  const bgColor = useTransform(
    x,
    [-SWIPE_X, -HINT_X, 0, HINT_X, SWIPE_X],
    [
      canDelete ? "#dc2626" : "rgba(0,0,0,0)",
      canDelete ? "rgba(220,38,38,0.12)" : "rgba(0,0,0,0)",
      "rgba(0,0,0,0)",
      rightAction ? "rgba(16,185,129,0.12)" : "rgba(0,0,0,0)",
      rightAction ? "#10b981" : "rgba(0,0,0,0)",
    ]
  );
  const xHintOpacity  = useTransform(x, [-SWIPE_X, -HINT_X, 0, HINT_X, SWIPE_X], [1, 0.6, 0, 0.6, 1]);
  const leftIconScale  = useTransform(x, [0, -HINT_X], [0.8, 1]);
  const rightIconScale = useTransform(x, [HINT_X, 0], [1, 0.8]);

  /* ─── Y transforms (vertical — navigation hints) ─── */
  const upHintOpacity   = useTransform(y, [0, -30, -SWIPE_Y], [0, 0.5, 1]);   // drag up → next
  const downHintOpacity = useTransform(y, [0,  30,  SWIPE_Y], [0, 0.5, 1]);  // drag down → prev

  /* ─── Drag end ─── */
  const resetX = () => animate(x, 0, { type: "spring", stiffness: 500, damping: 50 });
  const resetY = () => animate(y, 0, { type: "spring", stiffness: 400, damping: 38 });

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);

    if (absY > absX) {
      /* ── VERTICAL ── navigate */
      if (offset.y < -SWIPE_Y || velocity.y < -VEL_Y) {
        if (!isLast) { onHaptic?.("light"); onNavigate("next"); }
      } else if (offset.y > SWIPE_Y || velocity.y > VEL_Y) {
        if (!isFirst) { onHaptic?.("light"); onNavigate("prev"); }
      }
      resetY();
    } else {
      /* ── HORIZONTAL ── action */
      try {
        if (offset.x > SWIPE_X && rightAction) {
          await onStatusChange(verse, rightAction.next);
          onHaptic?.("success");
          showFeedback(rightAction.label, "success");
        } else if (offset.x < -SWIPE_X && canDelete) {
          onHaptic?.("warning");
          onRequestDelete();
        }
      } catch {
        onHaptic?.("error");
        showFeedback("Произошла ошибка", "error");
      }
      resetX();
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">

      {/* ── NEXT hint (drag up) ── */}
      {!isLast && (
        <motion.div
          style={{ opacity: upHintOpacity }}
          className="absolute -top-9 left-0 right-0 flex justify-center pointer-events-none"
        >
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/70 px-3 py-1 rounded-full backdrop-blur-sm">
            <ChevronUp className="h-3 w-3" /> Следующий
          </span>
        </motion.div>
      )}

      {/* ── SWIPE X background layer ── */}
      <motion.div
        style={{ backgroundColor: bgColor, opacity: xHintOpacity }}
        className="absolute inset-0 rounded-[3rem] flex items-center justify-between px-8 sm:px-14 pointer-events-none"
      >
        {canDelete && (
          <motion.div style={{ scale: leftIconScale }} className="flex flex-col items-center gap-1.5 text-white">
            <Trash2 className="w-7 h-7" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Удалить</span>
          </motion.div>
        )}
        <div className="flex-1" />
        {rightAction && (
          <motion.div style={{ scale: rightIconScale }} className="flex flex-col items-center gap-1.5 text-white">
            <rightAction.icon className="w-7 h-7" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-center max-w-[90px]">
              {rightAction.label}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* ── CARD ── */}
      <motion.div
        drag={isActive}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragDirectionLock
        dragElastic={{
          left:   canDelete   ? 0.22 : 0.03,
          right:  rightAction ? 0.22 : 0.03,
          top:    !isLast  ? 0.28 : 0.04,
          bottom: !isFirst ? 0.28 : 0.04,
        }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, y, touchAction: 'none' }}
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
        {isActive && (
          <p className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/60 whitespace-nowrap">
            ← действия · листать ↕ →
          </p>
        )}
      </motion.div>

      {/* ── PREV hint (drag down) ── */}
      {!isFirst && (
        <motion.div
          style={{ opacity: downHintOpacity }}
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
