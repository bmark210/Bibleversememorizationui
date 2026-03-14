"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import {
  BookOpen,
  Brain,
  ChevronsRight,
  Layers,
  Lock,
  Play,
  Repeat,
  Shuffle,
  TextCursorInput,
  type LucideIcon,
} from "lucide-react";
import type { Verse } from "@/app/App";
import type { UserDashboardStats } from "@/api/services/userStats";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { triggerHaptic } from "@/app/lib/haptics";
import { useTelegramUiStore } from "@/app/stores/telegramUiStore";
import {
  useTrainingHubState,
  getCountForMode,
  getCountForModes,
} from "./useTrainingHubState";
import {
  getAnchorEligibleVerseCount,
  getCoreTrainingCountsFromVerses,
  getSelectableCountForCoreModes,
  getWaitingReviewCountForCoreModes,
} from "../coreTrainingAvailability";
import type {
  AnchorTrainingTrack,
  CoreTrainingMode,
  TrainingOrder,
  TrainingScenario,
} from "../types";
import {
  ANCHOR_TRAINING_TRACK_LABELS,
  // TRAINING_ORDER_LABELS,
  TRAINING_SCENARIO_LABELS,
} from "../types";
import { Button } from "../../ui/button";
// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from "../../ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { cn } from "../../ui/utils";

interface TrainingHubProps {
  allVerses: Verse[];
  dashboardStats?: UserDashboardStats | null;
  telegramId?: string | null;
  suppressIntro?: boolean;
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

type CoreModePresetId = "learning" | "review" | "mixed";

type CoreModePreset = {
  id: CoreModePresetId;
  label: string;
  modes: CoreTrainingMode[];
  icon: LucideIcon;
  theme: AccentTheme;
};

type CorePresetState = CoreModePreset & {
  availableCount: number;
  selectableCount: number;
  waitingReviewCount: number;
  startable: boolean;
  disabled: boolean;
};

type AnchorTrackOption = {
  track: AnchorTrainingTrack;
  icon: LucideIcon;
  theme: AccentTheme;
};

type ScenarioTheme = {
  triggerClassName: string;
  countClassName: string;
};

type AccentTheme = {
  checkedItemClassName: string;
  checkedIconClassName: string;
  checkedTitleClassName: string;
  checkedSubtitleClassName: string;
  checkedIndicatorClassName: string;
  checkedDotClassName: string;
  summaryClassName: string;
  ctaClassName: string;
};

// const ORDERS: TrainingOrder[] = ["updatedAt", "bible", "popularity"];
const TRAINING_INTRO_STORAGE_PREFIX = "bible-memory.training.intro.v1";
const ANCHOR_MIN_REQUIRED = 10;

const SCENARIO_THEME: Record<TrainingScenario, ScenarioTheme> = {
  core: {
    triggerClassName:
      "group/tab h-auto rounded-[18px] border border-transparent px-3 py-3 text-foreground/65 data-[state=active]:border-emerald-500/25 data-[state=active]:bg-emerald-500/[0.08] data-[state=active]:text-emerald-900 dark:data-[state=active]:text-emerald-200",
    countClassName:
      "group-data-[state=active]/tab:text-emerald-700 dark:group-data-[state=active]/tab:text-emerald-300",
  },
  anchor: {
    triggerClassName:
      "group/tab h-auto rounded-[18px] border border-transparent px-3 py-3 text-foreground/65 data-[state=active]:border-amber-500/25 data-[state=active]:bg-amber-500/[0.08] data-[state=active]:text-amber-900 dark:data-[state=active]:text-amber-200",
    countClassName:
      "group-data-[state=active]/tab:text-amber-700 dark:group-data-[state=active]/tab:text-amber-300",
  },
};

const EMERALD_ACCENT: AccentTheme = {
  checkedItemClassName:
    "data-[state=checked]:border-emerald-500/30 data-[state=checked]:bg-emerald-500/[0.10] data-[state=checked]:shadow-[0_12px_26px_-20px_rgba(16,185,129,0.85)]",
  checkedIconClassName:
    "group-data-[state=checked]/radio:border-emerald-500/20 group-data-[state=checked]/radio:bg-emerald-500/14 group-data-[state=checked]/radio:text-emerald-700 dark:group-data-[state=checked]/radio:text-emerald-300",
  checkedTitleClassName:
    "group-data-[state=checked]/radio:text-emerald-800 dark:group-data-[state=checked]/radio:text-emerald-300",
  checkedSubtitleClassName:
    "group-data-[state=checked]/radio:text-emerald-700 dark:group-data-[state=checked]/radio:text-emerald-300",
  checkedIndicatorClassName:
    "group-data-[state=checked]/radio:border-emerald-500/30",
  checkedDotClassName: "bg-emerald-600 dark:bg-emerald-300",
  summaryClassName: "text-emerald-800 dark:text-emerald-300",
  ctaClassName:
    "border-emerald-500/30 bg-emerald-500/[0.10] text-emerald-900 shadow-[0_18px_36px_-24px_rgba(16,185,129,0.75)] dark:text-emerald-100",
};

const VIOLET_ACCENT: AccentTheme = {
  checkedItemClassName:
    "data-[state=checked]:border-violet-500/30 data-[state=checked]:bg-violet-500/[0.10] data-[state=checked]:shadow-[0_12px_26px_-20px_rgba(139,92,246,0.82)]",
  checkedIconClassName:
    "group-data-[state=checked]/radio:border-violet-500/20 group-data-[state=checked]/radio:bg-violet-500/14 group-data-[state=checked]/radio:text-violet-700 dark:group-data-[state=checked]/radio:text-violet-300",
  checkedTitleClassName:
    "group-data-[state=checked]/radio:text-violet-800 dark:group-data-[state=checked]/radio:text-violet-300",
  checkedSubtitleClassName:
    "group-data-[state=checked]/radio:text-violet-700 dark:group-data-[state=checked]/radio:text-violet-300",
  checkedIndicatorClassName:
    "group-data-[state=checked]/radio:border-violet-500/30",
  checkedDotClassName: "bg-violet-600 dark:bg-violet-300",
  summaryClassName: "text-violet-800 dark:text-violet-300",
  ctaClassName:
    "border-violet-500/30 bg-violet-500/[0.10] text-violet-900 shadow-[0_18px_36px_-24px_rgba(139,92,246,0.7)] dark:text-violet-100",
};

const PRIMARY_ACCENT: AccentTheme = {
  checkedItemClassName:
    "data-[state=checked]:border-primary/25 data-[state=checked]:bg-primary/[0.10] data-[state=checked]:shadow-[0_12px_26px_-20px_rgba(217,169,102,0.9)]",
  checkedIconClassName:
    "group-data-[state=checked]/radio:border-primary/15 group-data-[state=checked]/radio:bg-primary/12 group-data-[state=checked]/radio:text-primary",
  checkedTitleClassName: "group-data-[state=checked]/radio:text-primary",
  checkedSubtitleClassName: "group-data-[state=checked]/radio:text-primary/80",
  checkedIndicatorClassName:
    "group-data-[state=checked]/radio:border-primary/25",
  checkedDotClassName: "bg-primary",
  summaryClassName: "text-primary",
  ctaClassName:
    "border-primary/30 bg-primary/12 text-foreground/90 shadow-[0_18px_36px_-24px_rgba(217,169,102,0.95)] dark:bg-primary/50",
};

const SKY_ACCENT: AccentTheme = {
  checkedItemClassName:
    "data-[state=checked]:border-sky-500/30 data-[state=checked]:bg-sky-500/[0.10] data-[state=checked]:shadow-[0_12px_26px_-20px_rgba(14,165,233,0.72)]",
  checkedIconClassName:
    "group-data-[state=checked]/radio:border-sky-500/20 group-data-[state=checked]/radio:bg-sky-500/14 group-data-[state=checked]/radio:text-sky-700 dark:group-data-[state=checked]/radio:text-sky-300",
  checkedTitleClassName:
    "group-data-[state=checked]/radio:text-sky-800 dark:group-data-[state=checked]/radio:text-sky-300",
  checkedSubtitleClassName:
    "group-data-[state=checked]/radio:text-sky-700 dark:group-data-[state=checked]/radio:text-sky-300",
  checkedIndicatorClassName:
    "group-data-[state=checked]/radio:border-sky-500/30",
  checkedDotClassName: "bg-sky-600 dark:bg-sky-300",
  summaryClassName: "text-sky-800 dark:text-sky-300",
  ctaClassName:
    "border-sky-500/30 bg-sky-500/[0.10] text-sky-900 shadow-[0_18px_36px_-24px_rgba(14,165,233,0.68)] dark:text-sky-100",
};

const ROSE_ACCENT: AccentTheme = {
  checkedItemClassName:
    "data-[state=checked]:border-rose-500/30 data-[state=checked]:bg-rose-500/[0.10] data-[state=checked]:shadow-[0_12px_26px_-20px_rgba(244,63,94,0.72)]",
  checkedIconClassName:
    "group-data-[state=checked]/radio:border-rose-500/20 group-data-[state=checked]/radio:bg-rose-500/14 group-data-[state=checked]/radio:text-rose-700 dark:group-data-[state=checked]/radio:text-rose-300",
  checkedTitleClassName:
    "group-data-[state=checked]/radio:text-rose-800 dark:group-data-[state=checked]/radio:text-rose-300",
  checkedSubtitleClassName:
    "group-data-[state=checked]/radio:text-rose-700 dark:group-data-[state=checked]/radio:text-rose-300",
  checkedIndicatorClassName:
    "group-data-[state=checked]/radio:border-rose-500/30",
  checkedDotClassName: "bg-rose-600 dark:bg-rose-300",
  summaryClassName: "text-rose-800 dark:text-rose-300",
  ctaClassName:
    "border-rose-500/30 bg-rose-500/[0.10] text-rose-900 shadow-[0_18px_36px_-24px_rgba(244,63,94,0.68)] dark:text-rose-100",
};

const TEAL_ACCENT: AccentTheme = {
  checkedItemClassName:
    "data-[state=checked]:border-teal-500/30 data-[state=checked]:bg-teal-500/[0.10] data-[state=checked]:shadow-[0_12px_26px_-20px_rgba(20,184,166,0.72)]",
  checkedIconClassName:
    "group-data-[state=checked]/radio:border-teal-500/20 group-data-[state=checked]/radio:bg-teal-500/14 group-data-[state=checked]/radio:text-teal-700 dark:group-data-[state=checked]/radio:text-teal-300",
  checkedTitleClassName:
    "group-data-[state=checked]/radio:text-teal-800 dark:group-data-[state=checked]/radio:text-teal-300",
  checkedSubtitleClassName:
    "group-data-[state=checked]/radio:text-teal-700 dark:group-data-[state=checked]/radio:text-teal-300",
  checkedIndicatorClassName:
    "group-data-[state=checked]/radio:border-teal-500/30",
  checkedDotClassName: "bg-cyan-500 dark:bg-cyan-300",
  summaryClassName: "text-teal-800 dark:text-teal-300",
  ctaClassName:
    "border-teal-500/30 bg-teal-500/[0.10] text-teal-900 shadow-[0_18px_36px_-24px_rgba(20,184,166,0.68)] dark:text-teal-100",
};

// const ORDER_THEME: Record<TrainingOrder, OrderTheme> = {
//   updatedAt: {
//     triggerClassName:
//       "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300 shadow-[0_6px_18px_-12px_rgba(245,158,11,0.55)]",
//     contentClassName: "border-amber-500/20 bg-background/95 backdrop-blur-xl",
//     itemClassName:
//       "focus:bg-amber-500/8 focus:text-amber-800 dark:focus:text-amber-300 data-[state=checked]:bg-amber-500/10 data-[state=checked]:text-amber-800 dark:data-[state=checked]:text-amber-300",
//     hintClassName: "text-amber-700 dark:text-amber-300",
//   },
//   bible: {
//     triggerClassName:
//       "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300 shadow-[0_6px_18px_-12px_rgba(14,165,233,0.5)]",
//     contentClassName: "border-sky-500/20 bg-background/95 backdrop-blur-xl",
//     itemClassName:
//       "focus:bg-sky-500/8 focus:text-sky-700 dark:focus:text-sky-300 data-[state=checked]:bg-sky-500/10 data-[state=checked]:text-sky-700 dark:data-[state=checked]:text-sky-300",
//     hintClassName: "text-sky-700 dark:text-sky-300",
//   },
//   popularity: {
//     triggerClassName:
//       "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300 shadow-[0_6px_18px_-12px_rgba(244,63,94,0.5)]",
//     contentClassName: "border-rose-500/20 bg-background/95 backdrop-blur-xl",
//     itemClassName:
//       "focus:bg-rose-500/8 focus:text-rose-700 dark:focus:text-rose-300 data-[state=checked]:bg-rose-500/10 data-[state=checked]:text-rose-700 dark:data-[state=checked]:text-rose-300",
//     hintClassName: "text-rose-700 dark:text-rose-300",
//   },
// };

const CORE_MODE_PRESETS: CoreModePreset[] = [
  {
    id: "learning",
    label: "Изучение",
    modes: ["learning"],
    icon: Brain,
    theme: EMERALD_ACCENT,
  },
  {
    id: "review",
    label: "Повторение",
    modes: ["review"],
    icon: Repeat,
    theme: VIOLET_ACCENT,
  },
  {
    id: "mixed",
    label: "Все сразу",
    modes: ["learning", "review"],
    icon: Layers,
    theme: PRIMARY_ACCENT,
  },
];

const ANCHOR_TRACK_OPTIONS: AnchorTrackOption[] = [
  { track: "reference", icon: BookOpen, theme: SKY_ACCENT },
  { track: "incipit", icon: TextCursorInput, theme: ROSE_ACCENT },
  { track: "ending", icon: ChevronsRight, theme: VIOLET_ACCENT },
  { track: "context", icon: Brain, theme: TEAL_ACCENT },
  { track: "mixed", icon: Shuffle, theme: PRIMARY_ACCENT },
];

function matchesModes(
  current: CoreTrainingMode[],
  candidate: CoreTrainingMode[],
): boolean {
  return (
    current.length === candidate.length &&
    candidate.every((mode) => current.includes(mode))
  );
}

function triggerSelectionHaptic(isChanged: boolean) {
  triggerHaptic(isChanged ? "medium" : "light");
}

function getTrainingIntroStorageKey(telegramId?: string | null) {
  const normalizedTelegramId = telegramId?.trim() || "anonymous";
  return `${TRAINING_INTRO_STORAGE_PREFIX}:${normalizedTelegramId}`;
}

export function TrainingHub({
  allVerses,
  dashboardStats,
  telegramId = null,
  suppressIntro = false,
  selectionVerses,
  selectedScenario,
  selectedModes,
  selectedAnchorTrack,
  onScenarioChange,
  onModesChange,
  onAnchorTrackChange,
  onStart,
  onStartSelection,
}: TrainingHubProps) {
  const shouldReduceMotion = useReducedMotion();
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen,
  );
  // const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  const counts = useTrainingHubState({ allVerses, dashboardStats });
  const practiceCount = counts.learningCount + counts.dueReviewCount;
  const anchorTotalAvailableCount = useMemo(() => {
    if (allVerses.length > 0) {
      return getAnchorEligibleVerseCount(allVerses);
    }

    return getCountForMode("anchor", counts);
  }, [allVerses, counts]);
  const anchorAvailableCount = useMemo(() => {
    if (allVerses.length > 0) {
      return getAnchorEligibleVerseCount(allVerses);
    }

    return anchorTotalAvailableCount;
  }, [allVerses, anchorTotalAvailableCount]);
  const corePresetStates = useMemo<CorePresetState[]>(
    () =>
      CORE_MODE_PRESETS.map((preset) => {
        const availableCount = getCountForModes(preset.modes, counts);
        const selectableCount = getSelectableCountForCoreModes(
          preset.modes,
          counts,
        );
        const waitingReviewCount = getWaitingReviewCountForCoreModes(
          preset.modes,
          counts,
        );

        return {
          ...preset,
          availableCount,
          selectableCount,
          waitingReviewCount,
          startable: availableCount > 0,
          disabled: selectableCount === 0,
        };
      }),
    [counts],
  );
  const preferredCorePreset = useMemo(
    () => pickPreferredCorePreset(corePresetStates),
    [corePresetStates],
  );
  const selectedCorePreset = corePresetStates.find((preset) =>
    matchesModes(selectedModes, preset.modes),
  );
  const activeCorePreset = selectedCorePreset ?? preferredCorePreset;
  const activeAnchorTrack =
    ANCHOR_TRACK_OPTIONS.find(
      (option) => option.track === selectedAnchorTrack,
    ) ?? ANCHOR_TRACK_OPTIONS[0];
  const currentAccentTheme =
    selectedScenario === "anchor"
      ? activeAnchorTrack.theme
      : activeCorePreset.theme;
  // const activeOrderTheme = ORDER_THEME[selectedOrder];

  const selectionCounts = useMemo(
    () =>
      selectionVerses && selectionVerses.length > 0
        ? getCoreTrainingCountsFromVerses(selectionVerses)
        : null,
    [selectionVerses],
  );
  const currentCount =
    selectedScenario === "anchor"
      ? anchorAvailableCount
      : getCountForModes(selectedModes, counts);
  const currentWaitingReviewCount =
    selectedScenario === "anchor"
      ? 0
      : getWaitingReviewCountForCoreModes(selectedModes, counts);
  const anchorLocked =
    selectedScenario === "anchor" && anchorAvailableCount < ANCHOR_MIN_REQUIRED;
  const reviewWaitingLocked =
    selectedScenario === "core" &&
    currentCount === 0 &&
    currentWaitingReviewCount > 0;
  const learningAndReviewingLocked =
    selectedScenario === "core" && currentCount === 0;
  const startLocked = anchorLocked || learningAndReviewingLocked;

  const hasSelection =
    selectedScenario === "core" &&
    Boolean(selectionVerses && selectionVerses.length > 0);
  const selectionAvailableCount =
    selectionCounts === null
      ? 0
      : getCountForModes(selectedModes, selectionCounts);
  const selectionWaitingReviewCount =
    selectionCounts === null
      ? 0
      : getWaitingReviewCountForCoreModes(selectedModes, selectionCounts);
  const selectionStartLocked = hasSelection && selectionAvailableCount === 0;
  const sessionSummary =
    selectedScenario === "anchor"
      ? `${TRAINING_SCENARIO_LABELS.anchor} · ${ANCHOR_TRAINING_TRACK_LABELS[selectedAnchorTrack]}`
      : `${TRAINING_SCENARIO_LABELS.core} · ${activeCorePreset.label}`;
  const startLabel =
    selectedScenario === "anchor" ? "Начать закрепление" : "Начать практику";
  const stickyBottomOffset = contentSafeAreaInset.bottom + 94;
  const lockedStartLabel =
    selectedScenario === "anchor"
      ? "Закрепление пока недоступно"
      : reviewWaitingLocked
        ? selectedModes.length === 1 && selectedModes[0] === "review"
          ? "Повторение на ожидании"
          : "Практика на ожидании"
        : "Практика пока недоступна";
  const lockedSummaryText =
    selectedScenario === "anchor"
      ? getAnchorLockMessage({
          currentCount: anchorAvailableCount,
          minRequired: ANCHOR_MIN_REQUIRED,
        })
      : reviewWaitingLocked
        ? getReviewWaitingMessage(
            currentWaitingReviewCount,
            counts.earliestWaitingReviewAt,
          )
        : getCoreLockMessage(selectedModes);

  useEffect(() => {
    if (selectedScenario !== "core") return;
    if (matchesModes(selectedModes, preferredCorePreset.modes)) return;
    if (
      selectedCorePreset &&
      !selectedCorePreset.disabled &&
      (selectedCorePreset.startable || !preferredCorePreset.startable)
    ) {
      return;
    }
    onModesChange(preferredCorePreset.modes);
  }, [
    onModesChange,
    preferredCorePreset.modes,
    preferredCorePreset.startable,
    selectedCorePreset,
    selectedModes,
    selectedScenario,
  ]);

  const markTrainingIntroAsSeen = useCallback(() => {
    if (typeof window === "undefined") {
      setIsAboutDialogOpen(false);
      return;
    }

    try {
      window.localStorage.setItem(getTrainingIntroStorageKey(telegramId), "1");
    } catch {
      // ignore storage errors
    }

    setIsAboutDialogOpen(false);
  }, [telegramId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (suppressIntro) {
        window.localStorage.setItem(getTrainingIntroStorageKey(telegramId), "1");
        setIsAboutDialogOpen(false);
        return;
      }

      const storageKey = getTrainingIntroStorageKey(telegramId);
      const hasSeenIntro = window.localStorage.getItem(storageKey) === "1";
      if (!hasSeenIntro) {
        setIsAboutDialogOpen(true);
      }
    } catch {
      if (!suppressIntro) {
        setIsAboutDialogOpen(true);
      }
    }
  }, [suppressIntro, telegramId]);

  const handleAboutDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setIsAboutDialogOpen(true);
        return;
      }

      markTrainingIntroAsSeen();
    },
    [markTrainingIntroAsSeen],
  );

  // const handleAboutDialogOpen = useCallback(() => {
  //   setIsAboutDialogOpen(true);
  // }, []);

  const handleScenarioChange = (value: string) => {
    const nextScenario = value as TrainingScenario;
    triggerSelectionHaptic(nextScenario !== selectedScenario);
    onScenarioChange(nextScenario);
  };

  const handleCorePresetChange = (value: string) => {
    const nextPreset = CORE_MODE_PRESETS.find((preset) => preset.id === value);
    if (!nextPreset) return;

    triggerSelectionHaptic(!matchesModes(selectedModes, nextPreset.modes));
    onModesChange(nextPreset.modes);
  };

  const handleAnchorTrackChange = (value: string) => {
    const nextTrack = value as AnchorTrainingTrack;
    triggerSelectionHaptic(nextTrack !== selectedAnchorTrack);
    onAnchorTrackChange(nextTrack);
  };

  // const handleAdvancedOpenChange = (open: boolean) => {
  //   triggerHaptic("light");
  //   setIsAdvancedOpen(open);
  // };

  // const handleOrderChange = (value: string) => {
  //   const nextOrder = value as TrainingOrder;
  //   triggerSelectionHaptic(nextOrder !== selectedOrder);
  //   onOrderChange(nextOrder);
  // };

  return (
    <>
      <AlertDialog
        open={isAboutDialogOpen}
        onOpenChange={handleAboutDialogOpenChange}
      >
        <AlertDialogContent className="overflow-hidden rounded-3xl border-border/70 bg-gradient-to-br from-emerald-500/12 via-background to-amber-500/10 p-0 shadow-2xl backdrop-blur-xl">
          <div className="relative px-6 py-6 sm:px-7">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-emerald-500/18 blur-2xl" />
              <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-amber-500/18 blur-2xl" />
            </div>

            <AlertDialogHeader className="relative gap-3">
              <AlertDialogTitle className="text-xl text-primary">
                Раздел «Тренировка»
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-foreground/80">
                Здесь вы выбираете сценарий сессии под текущую задачу: пройти
                новые карточки, закрыть повторения или закрепить уже знакомые
                стихи.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="relative mt-4 rounded-2xl border border-border/90 bg-background/40 p-3 text-xs leading-relaxed text-foreground/75">
              <p>
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  Практика
                </span>{" "}
                подходит для изучения и повторения.
              </p>
              <p className="mt-2">
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  Закрепление
                </span>{" "}
                проверяет ссылку, начало стиха, конец стиха, контекст и смешанный формат.
              </p>
            </div>

            <AlertDialogFooter className="relative mt-5">
              <AlertDialogAction
                className="h-10 rounded-xl border border-border/90 bg-background/40 px-5 text-sm font-medium text-foreground/75"
                onClick={markTrainingIntroAsSeen}
              >
                Понятно
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div
        className={cn(
          "mx-auto h-full w-full p-4 sm:pt-6 md:pb-8 lg:pt-8",
          isTelegramFullscreen ? "" : "pt-3 sm:pt-5 lg:pt-7",
        )}
        style={
          {
            "--training-hub-sticky-bottom": `${stickyBottomOffset}px`,
          } as CSSProperties
        }
      >
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.18,
            ease: "easeOut",
          }}
          className="flex h-full flex-col gap-4 "
        >
          {isTelegramFullscreen ? null : (
            <header className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-semibold text-primary">
                  Тренировка
                </h1>
              </div>
            </header>
          )}

          <section data-tour="training-scenarios" className="rounded-[28px] border border-border/60 bg-card/55 p-3 backdrop-blur-xl sm:p-4">
            <Tabs
              value={selectedScenario}
              onValueChange={handleScenarioChange}
              className="gap-4"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-[22px] border border-border/60 bg-background/45 p-1">
                <TabsTrigger
                  data-tour="training-scenario-core"
                  value="core"
                  className={SCENARIO_THEME.core.triggerClassName}
                >
                  <ScenarioTabLabel
                    title={TRAINING_SCENARIO_LABELS.core}
                    count={practiceCount}
                    countClassName={SCENARIO_THEME.core.countClassName}
                  />
                </TabsTrigger>
                <TabsTrigger
                  data-tour="training-scenario-anchor"
                  value="anchor"
                  className={SCENARIO_THEME.anchor.triggerClassName}
                >
                  <ScenarioTabLabel
                    title={TRAINING_SCENARIO_LABELS.anchor}
                    count={anchorTotalAvailableCount}
                    countClassName={SCENARIO_THEME.anchor.countClassName}
                  />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4">
              <AnimatePresence mode="wait" initial={false}>
                {selectedScenario === "core" ? (
                  <motion.div
                    data-tour="training-core-presets"
                    key="core"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      shouldReduceMotion ? undefined : { opacity: 0, y: -4 }
                    }
                    transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
                  >
                    <SectionLabel>Режим практики</SectionLabel>
                    <RadioGroupPrimitive.Root
                      value={activeCorePreset.id}
                      onValueChange={handleCorePresetChange}
                      aria-label="Режим практики"
                      className="mt-2 grid gap-2 sm:grid-cols-3"
                    >
                      {corePresetStates.map((preset) => (
                        <RadioCardOption
                          key={preset.id}
                          value={preset.id}
                          title={preset.label}
                          subtitle={getModeAvailabilityLabel(preset)}
                          icon={preset.icon}
                          theme={preset.theme}
                          disabled={preset.disabled}
                        />
                      ))}
                    </RadioGroupPrimitive.Root>
                  </motion.div>
                ) : (
                  <motion.div
                    data-tour="training-anchor-presets"
                    key="anchor"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      shouldReduceMotion ? undefined : { opacity: 0, y: -4 }
                    }
                    transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
                  >
                    <SectionLabel>Формат закрепления</SectionLabel>
                    <RadioGroupPrimitive.Root
                      value={selectedAnchorTrack}
                      onValueChange={handleAnchorTrackChange}
                      aria-label="Формат закрепления"
                      className="mt-2 grid sm:grid-cols-2 gap-2"
                    >
                      {ANCHOR_TRACK_OPTIONS.map((option) => (
                        <RadioCardOption
                          key={option.track}
                          value={option.track}
                          title={ANCHOR_TRAINING_TRACK_LABELS[option.track]}
                          icon={option.icon}
                          theme={option.theme}
                          compact
                        />
                      ))}
                    </RadioGroupPrimitive.Root>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {hasSelection && selectionVerses ? (
            <section className="mt-3 flex items-center justify-between gap-3 rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 backdrop-blur-xl">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground/78">
                  Подборка
                </p>
                <p className="text-xs text-foreground/50">
                  {getSelectionSummaryText({
                    totalCount: selectionVerses.length,
                    availableCount: selectionAvailableCount,
                    waitingReviewCount: selectionWaitingReviewCount,
                    selectedModes,
                  })}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                haptic="medium"
                disabled={selectionStartLocked}
                onClick={onStartSelection}
                className="rounded-xl border-border/60 bg-background/70 text-foreground/78 hover:bg-background"
              >
                Начать
              </Button>
            </section>
          ) : null}

          {/* {selectedScenario === "core" ? (
          <Collapsible
            open={isAdvancedOpen}
            onOpenChange={handleAdvancedOpenChange}
            className="rounded-[24px] border border-border/60 bg-card/45 backdrop-blur-xl"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground/80 mb-1">
                  Дополнительно
                </p>
                <p className="text-xs">
                  Порядок: {TRAINING_ORDER_LABELS[selectedOrder]}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-foreground/45 transition-transform duration-200",
                  isAdvancedOpen && "rotate-180",
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border/50 px-4 py-4">
              <div className="space-y-2">
                <SectionLabel>Порядок карточек</SectionLabel>
                <Select
                  value={selectedOrder}
                  onOpenChange={handleOrderOpenChange}
                  onValueChange={handleOrderChange}
                >
                  <SelectTrigger
                    aria-label="Порядок карточек"
                    className={cn(
                      "h-11 rounded-2xl backdrop-blur-lg transition-colors",
                      activeOrderTheme.triggerClassName,
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={activeOrderTheme.contentClassName}>
                    {ORDERS.map((order) => (
                      <SelectItem
                        key={order}
                        value={order}
                        className={ORDER_THEME[order].itemClassName}
                      >
                        {TRAINING_ORDER_LABELS[order]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null} */}

          <div className="mx-auto w-full flex-1 content-end">
            <div
              data-tour="training-start-cta"
              className={cn(
                "rounded-[26px] border bg-background/88 p-3 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.25)] backdrop-blur-2xl",
                anchorLocked
                  ? "border-foreground/10"
                  : currentAccentTheme.summaryClassName,
              )}
            >
              <p
                className={cn(
                  "mb-3 px-1 text-sm font-medium",
                  anchorLocked
                    ? "text-foreground/50"
                    : currentAccentTheme.summaryClassName,
                )}
              >
                {sessionSummary}
              </p>

              {startLocked ? (
                <div className="space-y-3">
                  <Button
                    type="button"
                    size="lg"
                    disabled
                    className="h-14 w-full gap-2 rounded-2xl border border-primary/20 !bg-card px-5 text-sm font-medium text-foreground shadow-none"
                  >
                    <Lock className="h-4 w-4" />
                    {lockedStartLabel}
                  </Button>
                  <p className="px-1 text-xs leading-relaxed text-foreground/55">
                    {lockedSummaryText}
                  </p>
                </div>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  haptic="medium"
                  data-tour="training-start-button"
                  onClick={onStart}
                  className={cn(
                    "h-14 flex-1 w-full gap-2 rounded-2xl text-base",
                    "rounded-2xl px-5 border text-sm font-medium !shadow-none",
                    currentAccentTheme.ctaClassName,
                  )}
                >
                  <Play className="h-4 w-4" />
                  {startLabel}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function ScenarioTabLabel({
  title,
  count,
  countClassName,
}: {
  title: string;
  count: number;
  countClassName?: string;
}) {
  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span className="truncate text-sm font-medium">{title}</span>
      <span
        className={cn("text-xs font-medium text-foreground/45", countClassName)}
      >
        {count}
      </span>
    </span>
  );
}

function RadioCardOption({
  value,
  title,
  subtitle,
  icon: Icon,
  theme,
  disabled = false,
  compact = true,
}: {
  value: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  theme: AccentTheme;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        "group/radio w-full rounded-[22px] border border-border/60 bg-background/55 p-4 text-left transition-all duration-150 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] disabled:cursor-not-allowed",
        !disabled && "hover:bg-background/80",
        theme.checkedItemClassName,
        disabled &&
          "border-border/45 bg-background/35 text-foreground/40 shadow-none",
        compact && "px-3 py-3",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            data-slot="radio-card-icon"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/75 text-foreground/50 transition-colors",
              theme.checkedIconClassName,
              disabled &&
                "border-border/40 bg-background/55 text-foreground/35",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                "block truncate text-sm font-medium text-foreground/82",
                theme.checkedTitleClassName,
                disabled && "text-foreground/42",
              )}
            >
              {title}
            </span>
            {subtitle ? (
              <span
                className={cn(
                  "mt-1 block text-xs leading-relaxed text-foreground/50",
                  theme.checkedSubtitleClassName,
                  disabled && "text-foreground/35",
                )}
              >
                {subtitle}
              </span>
            ) : null}
          </span>
        </div>

        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80",
            theme.checkedIndicatorClassName,
            disabled && "border-border/45 bg-background/60 opacity-60",
          )}
        >
          <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
            <span
              className={cn("h-2 w-2 rounded-full", theme.checkedDotClassName)}
            />
          </RadioGroupPrimitive.Indicator>
        </span>
      </div>
    </RadioGroupPrimitive.Item>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/42">
      {children}
    </div>
  );
}

function getModeAvailabilityLabel(preset: CorePresetState) {
  if (preset.availableCount > 0 && preset.waitingReviewCount > 0) {
    return `${preset.availableCount} сейчас · ${getWaitingReviewShortLabel(
      preset.waitingReviewCount,
    )}`;
  }

  if (preset.availableCount > 0) {
    return `${preset.availableCount} ${pluralVerses(preset.availableCount)}`;
  }

  if (preset.waitingReviewCount > 0) {
    return preset.waitingReviewCount === 1
      ? "1 стих ждет времени"
      : `${preset.waitingReviewCount} ${pluralVerses(preset.waitingReviewCount)} ждут времени`;
  }

  return "Пока нет стихов";
}

function getWaitingReviewShortLabel(waitingReviewCount: number) {
  return waitingReviewCount === 1 ? "1 ждет" : `${waitingReviewCount} ждут`;
}

function pickPreferredCorePreset(presets: CorePresetState[]) {
  return (
    presets.find((preset) => preset.id === "mixed" && preset.startable) ??
    presets.find((preset) => preset.startable) ??
    presets.find((preset) => preset.id === "mixed" && !preset.disabled) ??
    presets.find((preset) => !preset.disabled) ??
    presets.find((preset) => preset.id === "mixed") ??
    presets[0]
  );
}

function getAnchorLockMessage(params: {
  currentCount: number;
  minRequired: number;
}) {
  const { currentCount, minRequired } = params;

  return `Нужно минимум ${minRequired} ${pluralVerses(minRequired)} в статусах повторения или выученных. Сейчас доступно: ${currentCount}.`;
}

function getCoreLockMessage(selectedModes: CoreTrainingMode[]) {
  if (selectedModes.length === 1 && selectedModes[0] === "learning") {
    return "Для изучения пока нет стихов.";
  }

  if (selectedModes.length === 1 && selectedModes[0] === "review") {
    return "Для повторения пока нет стихов.";
  }

  return "Добавьте хотя бы один стих в изучение или дождитесь доступного повторения.";
}

function getSelectionSummaryText(params: {
  totalCount: number;
  availableCount: number;
  waitingReviewCount: number;
  selectedModes: CoreTrainingMode[];
}) {
  const { totalCount, availableCount, waitingReviewCount, selectedModes } =
    params;

  if (availableCount > 0) {
    return `${totalCount} ${pluralVerses(totalCount)} в готовом наборе`;
  }

  if (waitingReviewCount > 0) {
    return getReviewWaitingMessage(waitingReviewCount, null);
  }

  if (selectedModes.length === 1 && selectedModes[0] === "learning") {
    return "В подборке нет стихов для изучения";
  }

  if (selectedModes.length === 1 && selectedModes[0] === "review") {
    return "В подборке нет стихов для повторения";
  }

  return "В подборке нет стихов для текущего режима";
}

function getReviewWaitingMessage(
  waitingReviewCount: number,
  earliestWaitingReviewAt: Date | null,
) {
  const countLabel =
    waitingReviewCount === 1
      ? "1 стих еще ждет времени для повторения."
      : `${waitingReviewCount} ${pluralVerses(waitingReviewCount)} еще ждут времени для повторения.`;

  const unlockLabel = formatNextReviewWindow(earliestWaitingReviewAt);
  return unlockLabel ? `${countLabel} ${unlockLabel}` : countLabel;
}

function formatNextReviewWindow(nextReviewAt: Date | null) {
  if (!nextReviewAt) return null;

  const dateLabel = nextReviewAt.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
  const timeLabel = nextReviewAt.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Ближайшее повторение откроется ${dateLabel} в ${timeLabel}.`;
}

function pluralVerses(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "стих";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
    return "стиха";
  }
  return "стихов";
}
