"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dumbbell, Play } from "lucide-react";
import type { Verse } from "@/app/App";
import type { UserDashboardStats } from "@/api/services/userStats";
import {
  useTrainingHubState,
  getCountForMode,
  getCountForModes,
} from "./useTrainingHubState";
import type {
  AnchorTrainingTrack,
  CoreTrainingMode,
  TrainingOrder,
  TrainingScenario,
} from "../types";
import {
  ANCHOR_TRAINING_TRACK_LABELS,
  TRAINING_MODE_LABELS,
  TRAINING_ORDER_LABELS,
  TRAINING_SCENARIO_LABELS,
} from "../types";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";

interface TrainingHubProps {
  allVerses: Verse[];
  dashboardStats?: UserDashboardStats | null;
  selectionVerses?: Verse[];
  selectedScenario: TrainingScenario;
  selectedModes: CoreTrainingMode[];
  selectedOrder: TrainingOrder;
  selectedAnchorTrack: AnchorTrainingTrack;
  onScenarioChange: (scenario: TrainingScenario) => void;
  onModesChange: (modes: CoreTrainingMode[]) => void;
  onOrderChange: (order: TrainingOrder) => void;
  onAnchorTrackChange: (track: AnchorTrainingTrack) => void;
  onStart: () => void;
  onStartSelection: () => void;
}

const CORE_MODES: CoreTrainingMode[] = ["learning", "review"];
const ORDERS: TrainingOrder[] = ["updatedAt", "bible", "popularity"];
const ANCHOR_TRACKS: AnchorTrainingTrack[] = [
  "reference",
  "incipit",
  "context",
  "mixed",
];

const CORE_MODE_HINTS: Record<CoreTrainingMode, string> = {
  learning: "Новые и слабые стихи",
  review: "То, что уже проходили",
};

const ORDER_HINTS: Record<TrainingOrder, string> = {
  updatedAt: "Сначала самые актуальные",
  bible: "По порядку книг Библии",
  popularity: "Сначала самые частые",
};

const ANCHOR_TRACK_HINTS: Record<AnchorTrainingTrack, string> = {
  reference: "Вспоминать ссылку",
  incipit: "Восстанавливать начало",
  context: "Узнавать по смыслу",
  mixed: "Чередовать все форматы",
};

function toggleMode(
  current: CoreTrainingMode[],
  mode: CoreTrainingMode
): CoreTrainingMode[] {
  if (current.includes(mode)) {
    const next = current.filter((item) => item !== mode);
    return next.length > 0 ? next : current;
  }

  return [...current, mode];
}

export function TrainingHub({
  allVerses,
  dashboardStats,
  selectionVerses,
  selectedScenario,
  selectedModes,
  selectedOrder,
  selectedAnchorTrack,
  onScenarioChange,
  onModesChange,
  onOrderChange,
  onAnchorTrackChange,
  onStart,
  onStartSelection,
}: TrainingHubProps) {
  const shouldReduceMotion = useReducedMotion();
  const counts = useTrainingHubState({ allVerses, dashboardStats });
  const coreAvailableCount = getCountForModes(selectedModes, counts);
  const anchorAvailableCount = getCountForMode("anchor", counts);
  const currentCount =
    selectedScenario === "anchor" ? anchorAvailableCount : coreAvailableCount;
  const hasVerses = currentCount > 0;
  const hasSelection =
    selectedScenario === "core" &&
    Boolean(selectionVerses && selectionVerses.length > 0);

  // const modesSummary = selectedModes
  //   .map((mode) => TRAINING_MODE_LABELS[mode].toLowerCase())
  //   .join(" + ");

  // const sessionSummary =
  //   selectedScenario === "anchor"
  //     ? `${TRAINING_SCENARIO_LABELS.anchor.toLowerCase()} · ${ANCHOR_TRAINING_TRACK_LABELS[
  //         selectedAnchorTrack
  //       ].toLowerCase()}`
  //     : `${modesSummary} · ${TRAINING_ORDER_LABELS[selectedOrder].toLowerCase()}`;

  const startLabel =
    selectedScenario === "anchor" ? "Начать закрепление" : "Начать тренировку";

  const revealVariants = {
    hidden: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : 10,
    },
    show: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.22,
        delay,
        ease: "easeOut" as const,
      },
    }),
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
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

        <motion.section
          variants={revealVariants}
          initial="hidden"
          animate="show"
          custom={0.04}
          className="mb-6"
        >
          {/* <div className="mb-3 flex items-end justify-between gap-3"> */}
            {/* <div>
              <p className="text-xs font-medium text-foreground/50 uppercase tracking-wide">
                Сценарий тренировки
              </p>
              <p className="mt-1 text-sm text-foreground/55">
                Сначала выберите тип сессии, затем настройте только нужные
                параметры.
              </p>
            </div> */}
          {/* </div> */}

          <div className="space-y-3">
            <ScenarioCard
              title={TRAINING_SCENARIO_LABELS.core}
              description="Работа по статусу стиха. Можно запустить только изучение, только повторение или оба режима вместе."
              count={counts.learningCount + counts.reviewCount}
              isActive={selectedScenario === "core"}
              accent="core"
              onSelect={() => onScenarioChange("core")}
            >
              <AnimatePresence initial={false}>
                {selectedScenario === "core" && (
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                    className="mt-4 grid gap-3"
                  >
                    <div className="rounded-2xl border border-emerald-500/15 bg-background/55 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground/85">
                            Что включить
                          </p>
                          <p className="text-xs text-foreground/50">
                            Можно выбрать один режим или оба сразу.
                          </p>
                        </div>
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          {coreAvailableCount} {pluralVerses(coreAvailableCount)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {CORE_MODES.map((mode) => {
                          const isActive = selectedModes.includes(mode);
                          const count = getCountForMode(mode, counts);
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() =>
                                onModesChange(toggleMode(selectedModes, mode))
                              }
                              className={cn(
                                "rounded-2xl border px-3 py-2.5 text-left transition-all duration-150",
                                isActive
                                  ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-800 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.85)] dark:text-emerald-300"
                                  : "border-border/60 bg-background/70 text-foreground/65 hover:bg-muted/50"
                              )}
                              aria-pressed={isActive}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {TRAINING_MODE_LABELS[mode]}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[11px]",
                                    isActive
                                      ? "bg-emerald-500/12 text-emerald-800/85 dark:text-emerald-200/90"
                                      : "bg-foreground/5 text-foreground/45"
                                  )}
                                >
                                  {count}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-current/70">
                                {CORE_MODE_HINTS[mode]}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-primary/10 bg-background/55 p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground/85">
                          Сортировка
                        </p>
                        <p className="text-xs text-foreground/50">
                          Определяет, в каком порядке пойдут карточки.
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {ORDERS.map((order) => {
                          const isActive = selectedOrder === order;
                          return (
                            <button
                              key={order}
                              type="button"
                              onClick={() => onOrderChange(order)}
                              className={cn(
                                "rounded-2xl border px-3 py-2.5 text-left transition-all duration-150",
                                isActive
                                  ? "border-primary/30 bg-primary/10 text-primary shadow-[0_12px_28px_-20px_rgba(217,169,102,0.9)]"
                                  : "border-border/60 bg-background/70 text-foreground/65 hover:bg-muted/50"
                              )}
                              aria-pressed={isActive}
                            >
                              <div className="text-sm font-medium">
                                {TRAINING_ORDER_LABELS[order]}
                              </div>
                              <p className="mt-1 text-[11px] text-current/70">
                                {ORDER_HINTS[order]}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </ScenarioCard>

            <ScenarioCard
              title={TRAINING_SCENARIO_LABELS.anchor}
              description="Отдельная сессия для закрепления уже знакомых стихов через ссылки, первые слова и контекст."
              count={anchorAvailableCount}
              isActive={selectedScenario === "anchor"}
              accent="anchor"
              onSelect={() => onScenarioChange("anchor")}
            >
              <AnimatePresence initial={false}>
                {selectedScenario === "anchor" && (
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                    className="mt-4 rounded-2xl border border-amber-500/15 bg-background/55 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground/85">
                          Подрежим закрепления
                        </p>
                        <p className="text-xs text-foreground/50">
                          Выберите один формат или используйте смешанный режим.
                        </p>
                      </div>
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                        {anchorAvailableCount} {pluralVerses(anchorAvailableCount)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {ANCHOR_TRACKS.map((track) => {
                        const isActive = selectedAnchorTrack === track;
                        return (
                          <button
                            key={track}
                            type="button"
                            onClick={() => onAnchorTrackChange(track)}
                            className={cn(
                              "rounded-2xl border px-3 py-3 text-left transition-all duration-150",
                              isActive
                                ? "border-amber-500/35 bg-amber-500/12 text-amber-900 shadow-[0_10px_26px_-18px_rgba(245,158,11,0.9)] dark:text-amber-200"
                                : "border-border/60 bg-background/70 text-foreground/65 hover:bg-muted/50"
                            )}
                            aria-pressed={isActive}
                          >
                            <div className="text-sm font-medium">
                              {ANCHOR_TRAINING_TRACK_LABELS[track]}
                            </div>
                            <p className="mt-1 text-[11px] text-current/70">
                              {ANCHOR_TRACK_HINTS[track]}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </ScenarioCard>
          </div>
        </motion.section>

        <motion.div
          variants={revealVariants}
          initial="hidden"
          animate="show"
          custom={0.06}
          className="mb-5"
        >
          {/* <div className="mb-3 rounded-3xl border border-primary/15 bg-[linear-gradient(135deg,rgba(217,169,102,0.12),rgba(255,255,255,0.03))] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary/70">
              Готово к запуску
            </p>
            <p className="mt-1 text-sm text-foreground/78">
              {hasVerses
                ? `${currentCount} ${pluralVerses(currentCount)} · ${sessionSummary}`
                : "Нет стихов для выбранного сценария"}
            </p>
          </div> */}

          <Button
            type="button"
            size="lg"
            haptic="medium"
            disabled={!hasVerses}
            onClick={onStart}
            className="w-full rounded-2xl text-base font-semibold h-14 gap-2"
          >
            <Play className="w-4 h-4" />
            {startLabel}
          </Button>
        </motion.div>

        {hasSelection && selectionVerses && (
          <motion.div
            variants={revealVariants}
            initial="hidden"
            animate="show"
            custom={0.08}
            className="rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 flex items-center justify-between gap-3"
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
      </motion.div>
    </div>
  );
}

function ScenarioCard({
  title,
  description,
  count,
  isActive,
  accent,
  onSelect,
  children,
}: {
  title: string;
  description: string;
  count: number;
  isActive: boolean;
  accent: "core" | "anchor";
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border backdrop-blur-xl transition-all duration-200",
        isActive
          ? accent === "core"
            ? "border-emerald-500/25 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(217,169,102,0.08)_58%,rgba(255,255,255,0.02))] shadow-[0_16px_44px_-28px_rgba(16,185,129,0.9)]"
            : "border-amber-500/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.08)_50%,rgba(255,255,255,0.02))] shadow-[0_16px_44px_-28px_rgba(245,158,11,0.95)]"
          : "border-border/60 bg-card/55 hover:border-border/85 hover:bg-card/80"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full px-4 py-4 text-left sm:px-5"
        aria-pressed={isActive}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border",
                  isActive
                    ? accent === "core"
                      ? "border-emerald-500 bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.12)]"
                      : "border-amber-500 bg-amber-500 shadow-[0_0_0_5px_rgba(245,158,11,0.14)]"
                    : "border-foreground/20 bg-transparent"
                )}
                aria-hidden="true"
              />
              <h2 className="text-base font-semibold text-foreground/90">
                {title}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/60">
              {description}
            </p>
          </div>

          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium",
              isActive
                ? accent === "core"
                  ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/25 bg-amber-500/12 text-amber-800 dark:text-amber-300"
                : "border-border/60 bg-background/45 text-foreground/50"
            )}
          >
            {count} {pluralVerses(count)}
          </span>
        </div>
      </button>

      <div className={cn("px-4 sm:px-5", isActive && "pb-4")}>{children}</div>
    </div>
  );
}

function pluralVerses(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "стих";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
    return "стиха";
  }
  return "стихов";
}
