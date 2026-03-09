"use client";

import { motion, useReducedMotion } from "motion/react";
import { Dumbbell, Filter, Play } from "lucide-react";
import type { Verse } from "@/app/App";
import type { UserDashboardStats } from "@/api/services/userStats";
import { useTrainingHubState, getCountForMode, getCountForModes } from "./useTrainingHubState";
import type { TrainingMode, TrainingOrder } from "../types";
import { TRAINING_MODE_LABELS, TRAINING_ORDER_LABELS } from "../types";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";

interface TrainingHubProps {
  allVerses: Verse[];
  dashboardStats?: UserDashboardStats | null;
  selectionVerses?: Verse[];
  selectedModes: TrainingMode[];
  selectedOrder: TrainingOrder;
  onModesChange: (modes: TrainingMode[]) => void;
  onOrderChange: (order: TrainingOrder) => void;
  onStart: () => void;
  onStartSelection: () => void;
  onRequestVerseSelection: () => void;
}

const MODES: TrainingMode[] = ["learning", "review", "anchor"];
const ORDERS: TrainingOrder[] = ["updatedAt", "bible", "popularity"];

const MODE_ACCENT: Record<TrainingMode, string> = {
  learning: "border-emerald-500/40 bg-emerald-500/14 text-emerald-700 dark:text-emerald-300",
  review: "border-violet-500/40 bg-violet-500/14 text-violet-700 dark:text-violet-300",
  anchor: "border-amber-500/40 bg-amber-500/14 text-amber-800 dark:text-amber-300",
};

function toggleMode(current: TrainingMode[], mode: TrainingMode): TrainingMode[] {
  if (current.includes(mode)) {
    const next = current.filter((m) => m !== mode);
    return next.length > 0 ? next : current; // prevent empty selection
  }
  return [...current, mode];
}

export function TrainingHub({
  allVerses,
  dashboardStats,
  selectionVerses,
  selectedModes,
  selectedOrder,
  onModesChange,
  onOrderChange,
  onStart,
  onStartSelection,
  onRequestVerseSelection,
}: TrainingHubProps) {
  const shouldReduceMotion = useReducedMotion();
  const counts = useTrainingHubState({ allVerses, dashboardStats });
  const currentCount = getCountForModes(selectedModes, counts);
  const hasVerses = currentCount > 0;
  const hasSelection = selectionVerses && selectionVerses.length > 0;

  const modesSummary = selectedModes
    .map((m) => TRAINING_MODE_LABELS[m].toLowerCase())
    .join(" + ");

  const revealVariants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 10 },
    show: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.22, delay, ease: "easeOut" as const },
    }),
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Header */}
        <motion.div
          variants={revealVariants}
          initial="hidden"
          animate="show"
          custom={0.02}
          className="mb-6"
        >
          <div className="flex items-center gap-2.5 mb-1">
            <Dumbbell className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold text-primary">Тренировка</h1>
          </div>
          <p className="text-sm text-foreground/55">
            {counts.allCount > 0
              ? `${counts.allCount} ${pluralVerses(counts.allCount)} доступно`
              : "Добавьте стихи, чтобы начать тренировку"}
          </p>
        </motion.div>

        {/* Mode selector — multi-select */}
        <motion.div
          variants={revealVariants}
          initial="hidden"
          animate="show"
          custom={0.04}
          className="mb-5"
        >
          <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-2">
            Режим <span className="normal-case font-normal opacity-70">(можно выбрать несколько)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {MODES.map((mode) => {
              const count = getCountForMode(mode, counts);
              const isActive = selectedModes.includes(mode);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onModesChange(toggleMode(selectedModes, mode))}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150",
                    isActive
                      ? MODE_ACCENT[mode]
                      : "border-border/60 bg-muted/30 text-foreground/60 hover:bg-muted/50"
                  )}
                >
                  {TRAINING_MODE_LABELS[mode]}
                  {count > 0 && (
                    <span className={cn(
                      "ml-1.5 text-xs",
                      isActive ? "opacity-80" : "opacity-50"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Order selector */}
        <motion.div
          variants={revealVariants}
          initial="hidden"
          animate="show"
          custom={0.06}
          className="mb-6"
        >
          <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide mb-2">Очерёдность</p>
          <div className="flex flex-wrap gap-2">
            {ORDERS.map((order) => {
              const isActive = selectedOrder === order;
              return (
                <button
                  key={order}
                  type="button"
                  onClick={() => onOrderChange(order)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "border-primary/40 bg-primary/12 text-primary"
                      : "border-border/60 bg-muted/30 text-foreground/60 hover:bg-muted/50"
                  )}
                >
                  {TRAINING_ORDER_LABELS[order]}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Start button */}
        <motion.div
          variants={revealVariants}
          initial="hidden"
          animate="show"
          custom={0.08}
          className="mb-5"
        >
          <Button
            type="button"
            size="lg"
            haptic="medium"
            disabled={!hasVerses}
            onClick={onStart}
            className="w-full rounded-2xl text-base font-semibold h-14 gap-2"
          >
            <Play className="w-4 h-4" />
            Начать тренировку
          </Button>
          {hasVerses && (
            <p className="text-center text-xs text-foreground/45 mt-2">
              {currentCount} {pluralVerses(currentCount)} · {modesSummary} · {TRAINING_ORDER_LABELS[selectedOrder].toLowerCase()}
            </p>
          )}
          {!hasVerses && (
            <p className="text-center text-xs text-foreground/40 mt-2">
              Нет стихов для выбранных режимов
            </p>
          )}
        </motion.div>

        {/* Selection banner (if selection is ready) */}
        {hasSelection && (
          <motion.div
            variants={revealVariants}
            initial="hidden"
            animate="show"
            custom={0.09}
            className="mb-4 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="text-sm">
              <span className="font-medium text-primary">Подборка готова</span>
              <span className="text-foreground/60 ml-1.5">
                {selectionVerses.length} {pluralVerses(selectionVerses.length)}
              </span>
            </div>
            <button
              type="button"
              onClick={onStartSelection}
              className="text-xs font-semibold text-primary bg-primary/12 rounded-xl px-3 py-1.5 hover:bg-primary/20 transition-colors"
            >
              Начать
            </button>
          </motion.div>
        )}

        {/* Divider + selection link */}
        <motion.div
          variants={revealVariants}
          initial="hidden"
          animate="show"
          custom={0.1}
        >
          <div className="border-t border-border/40 pt-4">
            <button
              type="button"
              onClick={onRequestVerseSelection}
              className="w-full text-left rounded-2xl border border-border/60 bg-muted/20 p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-foreground/50 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground/80">Подборка из Стихов</p>
                  <p className="text-xs text-foreground/45 mt-0.5">
                    Настройте фильтры в разделе Стихи — весь набор станет тренировочным
                  </p>
                </div>
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function pluralVerses(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "стих";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "стиха";
  return "стихов";
}
