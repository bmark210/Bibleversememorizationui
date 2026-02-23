"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Verse } from "@/app/App";
import { TRAINING_STAGE_MASTERY_MAX } from '@/shared/training/constants';

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
  isFirst: _isFirst,
  isLast: _isLast,
  onNavigate: _onNavigate,
  onHaptic: _onHaptic,
  centerAction,
  topBadge,
}: VerseCardProps) {
  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">
      {/* ── CARD ── */}
      <motion.div
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
            <span className="text-2xl font-bold text-primary">{Math.min(Math.round(verse.masteryLevel / TRAINING_STAGE_MASTERY_MAX * 100), 100)}%</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              key={`${verse.id}-${isActive}`}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(verse.masteryLevel / TRAINING_STAGE_MASTERY_MAX * 100, 100)}%` }}
              transition={{ duration: 0.85, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </div>
        </div>

        <div className="z-10 absolute top-[-30px] left-1/2 -translate-x-1/2 h-fit pointer-events-none">
          {topBadge}
        </div>

        {/* Swipe hint */}
        {/* {isActive && (
          <p className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/60 whitespace-nowrap">
            Листать ↕
          </p>
        )} */}
      </motion.div>
    </div>
  );
}
