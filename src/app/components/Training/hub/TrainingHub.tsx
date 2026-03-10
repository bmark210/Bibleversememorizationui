"use client";

import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dumbbell, Play } from "lucide-react";
import type { Verse } from "@/app/App";
import type { UserDashboardStats } from "@/api/services/userStats";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
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

const ORDERS: TrainingOrder[] = ["updatedAt", "bible", "popularity"];
const ANCHOR_TRACKS: AnchorTrainingTrack[] = [
  "reference",
  "incipit",
  "context",
  "mixed",
];
const CORE_MODE_PRESETS: Array<{
  id: "learning" | "review" | "mixed";
  label: string;
  modes: CoreTrainingMode[];
}> = [
  {
    id: "learning",
    label: "Изучение",
    modes: ["learning"],
  },
  {
    id: "review",
    label: "Повторение",
    modes: ["review"],
  },
  {
    id: "mixed",
    label: "Все сразу",
    modes: ["learning", "review"],
  },
];

function matchesModes(
  current: CoreTrainingMode[],
  candidate: CoreTrainingMode[]
): boolean {
  return (
    current.length === candidate.length &&
    candidate.every((mode) => current.includes(mode))
  );
}

function getCorePresetCount(
  presetModes: CoreTrainingMode[],
  counts: ReturnType<typeof useTrainingHubState>
) {
  return getCountForModes(presetModes, counts);
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
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const counts = useTrainingHubState({ allVerses, dashboardStats });
  const coreAvailableCount = getCountForModes(selectedModes, counts);
  const anchorAvailableCount = getCountForMode("anchor", counts);
  const currentCount =
    selectedScenario === "anchor" ? anchorAvailableCount : coreAvailableCount;
  const hasVerses = currentCount > 0;
  const hasSelection =
    selectedScenario === "core" &&
    Boolean(selectionVerses && selectionVerses.length > 0);
  const activeCorePreset =
    CORE_MODE_PRESETS.find((preset) => matchesModes(selectedModes, preset.modes)) ??
    CORE_MODE_PRESETS[0];
  const sessionSummary =
    selectedScenario === "anchor"
      ? `${TRAINING_SCENARIO_LABELS.anchor} · ${ANCHOR_TRAINING_TRACK_LABELS[selectedAnchorTrack]}`
      : `${activeCorePreset.label} · ${TRAINING_ORDER_LABELS[selectedOrder]}`;
  const stickyBottomOffset = contentSafeAreaInset.bottom + 94;
  // const stickyStyle = {
  //   "--training-hub-sticky-bottom": `${stickyBottomOffset}px`,
  // } as CSSProperties;

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
    <div
      className="mx-auto max-w-2xl px-4 pb-52 pt-4 sm:px-6 sm:pt-6 md:pb-8 lg:px-8 lg:pt-8"
      style={{
        "--training-hub-sticky-bottom": `${stickyBottomOffset}px`,
      } as CSSProperties}
    >
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
          className="mb-4"
        >
          <div className="mb-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Dumbbell className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold text-primary">Тренировка</h1>
            </div>
            <span className="shrink-0 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary">
              {currentCount}
            </span>
          </div>
          <p className="text-sm text-foreground/50">
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
          className="rounded-[28px] border border-border/60 bg-card/55 p-3 backdrop-blur-xl sm:p-4"
        >
          <div className="grid gap-2 grid-cols-2">
            <ScenarioOption
              title={TRAINING_SCENARIO_LABELS.core}
              count={counts.learningCount + counts.reviewCount}
              isActive={selectedScenario === "core"}
              accent="core"
              onClick={() => onScenarioChange("core")}
            />
            <ScenarioOption
              title={TRAINING_SCENARIO_LABELS.anchor}
              count={anchorAvailableCount}
              isActive={selectedScenario === "anchor"}
              accent="anchor"
              onClick={() => onScenarioChange("anchor")}
            />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {selectedScenario === "core" ? (
              <motion.div
                key="core"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                className="mt-3 grid gap-3 rounded-[24px] border border-emerald-500/15 bg-emerald-500/[0.06] p-3"
              >
                <SectionLabel>Режим</SectionLabel>

                <div className="grid gap-2 sm:grid-cols-3">
                  {CORE_MODE_PRESETS.map((preset) => {
                    const isActive = matchesModes(selectedModes, preset.modes);
                    const count = getCorePresetCount(preset.modes, counts);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onModesChange(preset.modes)}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition-all duration-150",
                          isActive
                            ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-800 shadow-[0_12px_26px_-20px_rgba(16,185,129,0.85)] dark:text-emerald-300"
                            : "border-border/60 bg-background/75 text-foreground/65 hover:bg-background"
                        )}
                        aria-pressed={isActive}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">
                            {preset.label}
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
                      </button>
                    );
                  })}
                </div>

                <SectionLabel>Порядок</SectionLabel>

                <div className="flex flex-wrap gap-2">
                  {ORDERS.map((order) => {
                    const isActive = selectedOrder === order;
                    return (
                      <button
                        key={order}
                        type="button"
                        onClick={() => onOrderChange(order)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm font-medium transition-all duration-150",
                          isActive
                            ? "border-primary/30 bg-primary/10 text-primary shadow-[0_12px_28px_-24px_rgba(217,169,102,0.9)]"
                            : "border-border/60 bg-background/70 text-foreground/60 hover:bg-background"
                        )}
                        aria-pressed={isActive}
                      >
                        {TRAINING_ORDER_LABELS[order]}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="anchor"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                className="mt-3 grid gap-3 rounded-[24px] border border-amber-500/15 bg-amber-500/[0.06] p-3"
              >
                <SectionLabel>Формат</SectionLabel>

                <div className="grid grid-cols-2 gap-2">
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
                            ? "border-amber-500/35 bg-amber-500/12 text-amber-900 shadow-[0_12px_26px_-20px_rgba(245,158,11,0.9)] dark:text-amber-200"
                            : "border-border/60 bg-background/75 text-foreground/65 hover:bg-background"
                        )}
                        aria-pressed={isActive}
                      >
                        <div className="text-sm font-medium">
                          {ANCHOR_TRAINING_TRACK_LABELS[track]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {hasSelection && selectionVerses && (
          <motion.section
            variants={revealVariants}
            initial="hidden"
            animate="show"
            custom={0.08}
            className="mt-3 flex items-center justify-between gap-3 rounded-[20px] border border-primary/20 bg-primary/8 px-4 py-3"
          >
            <div className="text-sm text-foreground/70">
              <span className="font-medium text-primary">Подборка</span>
              <span className="text-foreground/60 ml-1.5">
                {selectionVerses.length} {pluralVerses(selectionVerses.length)}
              </span>
            </div>
            <button
              type="button"
              onClick={onStartSelection}
              className="rounded-xl bg-primary/12 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              Старт
            </button>
          </motion.section>
        )}

        <motion.div
          variants={revealVariants}
          initial="hidden"
          animate="show"
          custom={0.06}
          className="fixed inset-x-0 bottom-[var(--training-hub-sticky-bottom)] z-20 px-4 sm:px-6 md:sticky md:bottom-4 md:mt-5 md:px-0 lg:px-8"
        >
          <div className="mx-auto max-w-2xl">
            <div className="rounded-[26px] border border-primary/15 bg-background/88 p-3 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <span className="truncate text-sm font-medium text-foreground/78">
                  {hasVerses ? sessionSummary : "Нет доступных стихов"}
                </span>
                <span className="shrink-0 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary">
                  {currentCount} {pluralVerses(currentCount)}
                </span>
              </div>

              <Button
                type="button"
                size="lg"
                haptic="medium"
                disabled={!hasVerses}
                onClick={onStart}
                className="h-14 w-full gap-2 rounded-2xl text-base font-semibold shadow-[0_18px_36px_-24px_rgba(217,169,102,0.95)]"
              >
                <Play className="w-4 h-4" />
                Начать
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function ScenarioOption({
  title,
  count,
  isActive,
  accent,
  onClick,
}: {
  title: string;
  count: number;
  isActive: boolean;
  accent: "core" | "anchor";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "rounded-[24px] border px-4 py-3 text-left transition-all duration-200",
        isActive
          ? accent === "core"
            ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-900 shadow-[0_14px_34px_-26px_rgba(16,185,129,0.9)] dark:text-emerald-200"
            : "border-amber-500/25 bg-amber-500/[0.08] text-amber-900 shadow-[0_14px_34px_-26px_rgba(245,158,11,0.95)] dark:text-amber-200"
          : "border-border/60 bg-background/70 text-foreground/70 hover:bg-background"
      )}
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
            <span className="text-sm font-semibold">{title}</span>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium",
            isActive
              ? accent === "core"
                ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/25 bg-amber-500/12 text-amber-800 dark:text-amber-300"
              : "border-border/60 bg-background/45 text-foreground/50"
          )}
        >
          {count}
        </span>
      </div>
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/42">
      {children}
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
