"use client";

import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BookOpen,
  Brain,
  Dumbbell,
  History,
  Play,
  Repeat,
  Sparkles,
  Target,
  TextCursorInput,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
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

type ScenarioVisualMeta = {
  icon: LucideIcon;
  activeButtonClassName: string;
  activeIconWrapClassName: string;
  activeBadgeClassName: string;
};

type TileVisualMeta = {
  icon: LucideIcon;
  panelClassName: string;
  activeButtonClassName: string;
  activeIconWrapClassName: string;
  activeCountClassName: string;
};

type ChipVisualMeta = {
  icon: LucideIcon;
  activeClassName: string;
  activeIconClassName: string;
};

const ORDERS: TrainingOrder[] = ["updatedAt", "bible", "popularity"];
const ANCHOR_TRACKS: AnchorTrainingTrack[] = [
  "reference",
  "incipit",
  "context",
  "mixed",
];

const SCENARIO_META: Record<TrainingScenario, ScenarioVisualMeta> = {
  core: {
    icon: Dumbbell,
    activeButtonClassName:
      "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-900 shadow-[0_14px_34px_-26px_rgba(16,185,129,0.9)] dark:text-emerald-200",
    activeIconWrapClassName:
      "border-emerald-500/20 bg-emerald-500/14 text-emerald-700 dark:text-emerald-300",
    activeBadgeClassName:
      "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  anchor: {
    icon: Target,
    activeButtonClassName:
      "border-amber-500/25 bg-amber-500/[0.08] text-amber-900 shadow-[0_14px_34px_-26px_rgba(245,158,11,0.95)] dark:text-amber-200",
    activeIconWrapClassName:
      "border-amber-500/20 bg-amber-500/14 text-amber-700 dark:text-amber-300",
    activeBadgeClassName:
      "border-amber-500/25 bg-amber-500/12 text-amber-800 dark:text-amber-300",
  },
};

const CORE_MODE_PRESETS: Array<{
  id: "learning" | "review" | "mixed";
  label: string;
  modes: CoreTrainingMode[];
  visual: TileVisualMeta;
}> = [
  {
    id: "learning",
    label: "Изучение",
    modes: ["learning"],
    visual: {
      icon: Brain,
      panelClassName:
        "mt-3 grid gap-3 rounded-[24px] border border-emerald-500/15 bg-emerald-500/[0.06] p-3",
      activeButtonClassName:
        "border-emerald-500/30 bg-emerald-500/[0.10] text-emerald-800 shadow-[0_12px_26px_-20px_rgba(16,185,129,0.85)] dark:text-emerald-300",
      activeIconWrapClassName:
        "border-emerald-500/20 bg-emerald-500/14 text-emerald-700 dark:text-emerald-300",
      activeCountClassName:
        "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    },
  },
  {
    id: "review",
    label: "Повторение",
    modes: ["review"],
    visual: {
      icon: Repeat,
      panelClassName:
        "mt-3 grid gap-3 rounded-[24px] border border-violet-500/15 bg-violet-500/[0.06] p-3",
      activeButtonClassName:
        "border-violet-500/30 bg-violet-500/[0.10] text-violet-800 shadow-[0_12px_26px_-20px_rgba(139,92,246,0.82)] dark:text-violet-300",
      activeIconWrapClassName:
        "border-violet-500/20 bg-violet-500/14 text-violet-700 dark:text-violet-300",
      activeCountClassName:
        "border-violet-500/20 bg-violet-500/12 text-violet-700 dark:text-violet-300",
    },
  },
  {
    id: "mixed",
    label: "Все сразу",
    modes: ["learning", "review"],
    visual: {
      icon: Sparkles,
      panelClassName:
        "mt-3 grid gap-3 rounded-[24px] border border-primary/15 bg-primary/[0.06] p-3",
      activeButtonClassName:
        "border-primary/25 bg-primary/[0.10] text-primary shadow-[0_12px_26px_-20px_rgba(217,169,102,0.9)]",
      activeIconWrapClassName:
        "border-primary/15 bg-primary/12 text-primary",
      activeCountClassName: "border-primary/15 bg-primary/10 text-primary",
    },
  },
];

const ORDER_META: Record<TrainingOrder, ChipVisualMeta> = {
  updatedAt: {
    icon: History,
    activeClassName:
      "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300 shadow-[0_12px_28px_-24px_rgba(245,158,11,0.6)]",
    activeIconClassName: "text-amber-700 dark:text-amber-300",
  },
  bible: {
    icon: BookOpen,
    activeClassName:
      "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300 shadow-[0_12px_28px_-24px_rgba(14,165,233,0.55)]",
    activeIconClassName: "text-sky-700 dark:text-sky-300",
  },
  popularity: {
    icon: TrendingUp,
    activeClassName:
      "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-[0_12px_28px_-24px_rgba(244,63,94,0.55)]",
    activeIconClassName: "text-rose-700 dark:text-rose-300",
  },
};

const ANCHOR_TRACK_META: Record<AnchorTrainingTrack, TileVisualMeta> = {
  reference: {
    icon: BookOpen,
    panelClassName:
      "mt-3 grid gap-3 rounded-[24px] border border-sky-500/15 bg-sky-500/[0.06] p-3",
    activeButtonClassName:
      "border-sky-500/30 bg-sky-500/[0.10] text-sky-800 shadow-[0_12px_26px_-20px_rgba(14,165,233,0.72)] dark:text-sky-300",
    activeIconWrapClassName:
      "border-sky-500/20 bg-sky-500/14 text-sky-700 dark:text-sky-300",
    activeCountClassName:
      "border-sky-500/20 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
  incipit: {
    icon: TextCursorInput,
    panelClassName:
      "mt-3 grid gap-3 rounded-[24px] border border-rose-500/15 bg-rose-500/[0.06] p-3",
    activeButtonClassName:
      "border-rose-500/30 bg-rose-500/[0.10] text-rose-800 shadow-[0_12px_26px_-20px_rgba(244,63,94,0.72)] dark:text-rose-300",
    activeIconWrapClassName:
      "border-rose-500/20 bg-rose-500/14 text-rose-700 dark:text-rose-300",
    activeCountClassName:
      "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
  context: {
    icon: Brain,
    panelClassName:
      "mt-3 grid gap-3 rounded-[24px] border border-teal-500/15 bg-teal-500/[0.06] p-3",
    activeButtonClassName:
      "border-teal-500/30 bg-teal-500/[0.10] text-teal-800 shadow-[0_12px_26px_-20px_rgba(20,184,166,0.72)] dark:text-teal-300",
    activeIconWrapClassName:
      "border-teal-500/20 bg-teal-500/14 text-teal-700 dark:text-teal-300",
    activeCountClassName:
      "border-teal-500/20 bg-teal-500/12 text-teal-700 dark:text-teal-300",
  },
  mixed: {
    icon: Sparkles,
    panelClassName:
      "mt-3 grid gap-3 rounded-[24px] border border-primary/15 bg-primary/[0.06] p-3",
    activeButtonClassName:
      "border-primary/25 bg-primary/[0.10] text-primary shadow-[0_12px_26px_-20px_rgba(217,169,102,0.9)]",
    activeIconWrapClassName:
      "border-primary/15 bg-primary/12 text-primary",
    activeCountClassName: "border-primary/15 bg-primary/10 text-primary",
  },
};

function matchesModes(
  current: CoreTrainingMode[],
  candidate: CoreTrainingMode[],
): boolean {
  return (
    current.length === candidate.length &&
    candidate.every((mode) => current.includes(mode))
  );
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
    CORE_MODE_PRESETS.find((preset) =>
      matchesModes(selectedModes, preset.modes),
    ) ?? CORE_MODE_PRESETS[0];
  const activeAnchorTrackVisual = ANCHOR_TRACK_META[selectedAnchorTrack];
  const currentVisual =
    selectedScenario === "anchor"
      ? activeAnchorTrackVisual
      : activeCorePreset.visual;
  const CurrentVisualIcon = currentVisual.icon;
  const sessionSummary =
    selectedScenario === "anchor"
      ? `${TRAINING_SCENARIO_LABELS.anchor} · ${ANCHOR_TRAINING_TRACK_LABELS[selectedAnchorTrack]}`
      : `${activeCorePreset.label} · ${TRAINING_ORDER_LABELS[selectedOrder]}`;
  const stickyBottomOffset = contentSafeAreaInset.bottom + 94;

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
      style={
        {
          "--training-hub-sticky-bottom": `${stickyBottomOffset}px`,
        } as CSSProperties
      }
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
              <Dumbbell className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold text-primary">Тренировка</h1>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                currentVisual.activeCountClassName,
              )}
            >
              <CurrentVisualIcon className="h-3.5 w-3.5" />
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
          <div className="grid sm:grid-cols-2 gap-2">
            <ScenarioOption
              scenario="core"
              title={TRAINING_SCENARIO_LABELS.core}
              count={counts.learningCount + counts.reviewCount}
              isActive={selectedScenario === "core"}
              onClick={() => onScenarioChange("core")}
            />
            <ScenarioOption
              scenario="anchor"
              title={TRAINING_SCENARIO_LABELS.anchor}
              count={anchorAvailableCount}
              isActive={selectedScenario === "anchor"}
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
                className={activeCorePreset.visual.panelClassName}
              >
                <SectionLabel>Режим</SectionLabel>

                <div className="grid gap-2 sm:grid-cols-3">
                  {CORE_MODE_PRESETS.map((preset) => (
                    <TileOption
                      key={preset.id}
                      label={preset.label}
                      count={getCountForModes(preset.modes, counts)}
                      icon={preset.visual.icon}
                      visual={preset.visual}
                      isActive={matchesModes(selectedModes, preset.modes)}
                      onClick={() => onModesChange(preset.modes)}
                    />
                  ))}
                </div>

                <SectionLabel>Порядок</SectionLabel>

                <div className="flex flex-wrap gap-2">
                  {ORDERS.map((order) => (
                    <ChipOption
                      key={order}
                      label={TRAINING_ORDER_LABELS[order]}
                      icon={ORDER_META[order].icon}
                      visual={ORDER_META[order]}
                      isActive={selectedOrder === order}
                      onClick={() => onOrderChange(order)}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="anchor"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
                className={activeAnchorTrackVisual.panelClassName}
              >
                <SectionLabel>Формат</SectionLabel>

                <div className="grid grid-cols-2 gap-2">
                  {ANCHOR_TRACKS.map((track) => (
                    <TileOption
                      key={track}
                      label={ANCHOR_TRAINING_TRACK_LABELS[track]}
                      icon={ANCHOR_TRACK_META[track].icon}
                      visual={ANCHOR_TRACK_META[track]}
                      isActive={selectedAnchorTrack === track}
                      onClick={() => onAnchorTrackChange(track)}
                    />
                  ))}
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
              <span className="ml-1.5 text-foreground/60">
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
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border",
                      currentVisual.activeIconWrapClassName,
                    )}
                  >
                    <CurrentVisualIcon className="h-4 w-4" />
                  </span>
                  <span className="truncate text-sm font-medium text-foreground/78">
                    {hasVerses ? sessionSummary : "Нет доступных стихов"}
                  </span>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    currentVisual.activeCountClassName,
                  )}
                >
                  {currentCount} {pluralVerses(currentCount)}
                </span>
              </div>

              <Button
                type="button"
                size="lg"
                haptic="medium"
                disabled={!hasVerses}
                onClick={onStart}
                className="h-14 w-full font-medium gap-2 border border-primary/30 bg-primary/12 text-foreground/90 dark:bg-primary/50 rounded-2xl text-base shadow-[0_18px_36px_-24px_rgba(217,169,102,0.95)]"
              >
                <Play className="h-4 w-4 text-foreground/90" />
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
  scenario,
  title,
  count,
  isActive,
  onClick,
}: {
  scenario: TrainingScenario;
  title: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const meta = SCENARIO_META[scenario];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "rounded-[24px] border px-3.5 py-3 text-left transition-all duration-200",
        isActive
          ? meta.activeButtonClassName
          : "border-border/60 bg-background/70 text-foreground/70 hover:bg-background",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-colors",
              isActive
                ? meta.activeIconWrapClassName
                : "border-border/60 bg-background/70 text-foreground/45",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            isActive
              ? meta.activeBadgeClassName
              : "border-border/60 bg-background/45 text-foreground/50",
          )}
        >
          {count}
        </span>
      </div>
    </button>
  );
}

function TileOption({
  label,
  count,
  icon: Icon,
  visual,
  isActive,
  onClick,
}: {
  label: string;
  count?: number;
  icon: LucideIcon;
  visual: TileVisualMeta;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-3 py-3 text-left transition-all duration-150",
        isActive
          ? visual.activeButtonClassName
          : "border-border/60 bg-background/75 text-foreground/65 hover:bg-background",
      )}
      aria-pressed={isActive}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors",
              isActive
                ? visual.activeIconWrapClassName
                : "border-border/60 bg-background/70 text-foreground/45",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-medium">{label}</span>
        </div>
        {typeof count === "number" && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium",
              isActive
                ? visual.activeCountClassName
                : "border-border/60 bg-background/45 text-foreground/45",
            )}
          >
            {count}
          </span>
        )}
      </div>
    </button>
  );
}

function ChipOption({
  label,
  icon: Icon,
  visual,
  isActive,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  visual: ChipVisualMeta;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? visual.activeClassName
          : "border-border/60 bg-background/70 text-foreground/60 hover:bg-background",
      )}
      aria-pressed={isActive}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isActive ? visual.activeIconClassName : "text-foreground/40",
        )}
      />
      {label}
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
