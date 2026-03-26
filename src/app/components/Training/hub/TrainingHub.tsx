"use client";

import { useEffect, useMemo, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import {
  Bone,
  BookOpen,
  Brain,
  Check,
  FlipHorizontal,
  KeyRound,
  Layers,
  Link2,
  ListEnd,
  ListStart,
  Lock,
  PenLine,
  Play,
  Repeat,
  VenetianMask,
  type LucideIcon,
} from "lucide-react";
import type { Verse } from "@/app/domain/verse";
import type { bible_memory_db_internal_domain_UserDashboardStats } from "@/api/models/bible_memory_db_internal_domain_UserDashboardStats";
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
  AnchorModeGroup,
  CoreTrainingMode,
  TrainingScenario,
} from "../types";
import {
  ALL_ANCHOR_MODE_GROUPS,
  ANCHOR_MODE_GROUP_LABELS,
  TRAINING_SCENARIO_LABELS,
} from "../types";
import { Button } from "../../ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { cn } from "../../ui/utils";

interface TrainingHubProps {
  allVerses: Verse[];
  dashboardStats?: bible_memory_db_internal_domain_UserDashboardStats | null;
  selectionVerses?: Verse[];
  selectedScenario: TrainingScenario;
  selectedModes: CoreTrainingMode[];
  selectedAnchorModes: AnchorModeGroup[];
  onScenarioChange: (scenario: TrainingScenario) => void;
  onModesChange: (modes: CoreTrainingMode[]) => void;
  onAnchorModesChange: (modes: AnchorModeGroup[]) => void;
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

const ANCHOR_MIN_REQUIRED = 10;

const ANCHOR_MODE_GROUP_ICONS: Record<AnchorModeGroup, LucideIcon> = {
  "reference-v1": Link2,
  "reference-v2": KeyRound,
  incipit: ListStart,
  ending: ListEnd,
  "context-v1": BookOpen,
  "context-v2": PenLine,
  "broken-mirror": FlipHorizontal,
  "skeleton-verse": Bone,
  "impostor-word": VenetianMask,
};

const SCENARIO_THEME: Record<TrainingScenario, ScenarioTheme> = {
  core: {
    triggerClassName:
      "group/tab h-auto rounded-[18px] border border-transparent px-3 py-3 text-text-secondary data-[state=active]:border-status-learning/25 data-[state=active]:bg-status-learning-soft data-[state=active]:text-status-learning",
    countClassName:
      "group-data-[state=active]/tab:text-status-learning",
  },
  anchor: {
    triggerClassName:
      "group/tab h-auto rounded-[18px] border border-transparent px-3 py-3 text-text-secondary data-[state=active]:border-status-mastered/25 data-[state=active]:bg-status-mastered-soft data-[state=active]:text-status-mastered",
    countClassName:
      "group-data-[state=active]/tab:text-status-mastered",
  },
};

const EMERALD_ACCENT: AccentTheme = {
  checkedItemClassName:
    "data-[state=checked]:border-status-learning/30 data-[state=checked]:bg-status-learning-soft data-[state=checked]:shadow-[var(--shadow-soft)]",
  checkedIconClassName:
    "group-data-[state=checked]/radio:border-status-learning/20 group-data-[state=checked]/radio:bg-status-learning-soft group-data-[state=checked]/radio:text-status-learning",
  checkedTitleClassName:
    "group-data-[state=checked]/radio:text-status-learning",
  checkedSubtitleClassName:
    "group-data-[state=checked]/radio:text-status-learning/85",
  checkedIndicatorClassName:
    "group-data-[state=checked]/radio:border-status-learning/30",
  checkedDotClassName: "bg-status-learning",
  summaryClassName: "text-status-learning",
  ctaClassName:
    "border-status-learning bg-status-learning text-text-inverse hover:bg-status-learning",
};

const VIOLET_ACCENT: AccentTheme = {
  checkedItemClassName:
    "data-[state=checked]:border-status-review/30 data-[state=checked]:bg-status-review-soft data-[state=checked]:shadow-[var(--shadow-soft)]",
  checkedIconClassName:
    "group-data-[state=checked]/radio:border-status-review/20 group-data-[state=checked]/radio:bg-status-review-soft group-data-[state=checked]/radio:text-status-review",
  checkedTitleClassName:
    "group-data-[state=checked]/radio:text-status-review",
  checkedSubtitleClassName:
    "group-data-[state=checked]/radio:text-status-review/85",
  checkedIndicatorClassName:
    "group-data-[state=checked]/radio:border-status-review/30",
  checkedDotClassName: "bg-status-review",
  summaryClassName: "text-status-review",
  ctaClassName:
    "border-status-review bg-status-review text-text-inverse hover:bg-status-review",
};

const PRIMARY_ACCENT: AccentTheme = {
  checkedItemClassName:
    "data-[state=checked]:border-brand-primary/25 data-[state=checked]:bg-status-mastered-soft data-[state=checked]:shadow-[var(--shadow-soft)]",
  checkedIconClassName:
    "group-data-[state=checked]/radio:border-brand-primary/15 group-data-[state=checked]/radio:bg-status-mastered-soft group-data-[state=checked]/radio:text-brand-primary",
  checkedTitleClassName: "group-data-[state=checked]/radio:text-brand-primary",
  checkedSubtitleClassName: "group-data-[state=checked]/radio:text-brand-primary/80",
  checkedIndicatorClassName:
    "group-data-[state=checked]/radio:border-brand-primary/25",
  checkedDotClassName: "bg-brand-primary",
  summaryClassName: "text-brand-primary",
  ctaClassName:
    "border-brand-primary bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover hover:border-brand-primary-hover",
};


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

const ANCHOR_ACCENT = PRIMARY_ACCENT;

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

export function TrainingHub({
  allVerses,
  dashboardStats,
  selectionVerses,
  selectedScenario,
  selectedModes,
  selectedAnchorModes,
  onScenarioChange,
  onModesChange,
  onAnchorModesChange,
  onStart,
  onStartSelection,
}: TrainingHubProps) {
  const shouldReduceMotion = useReducedMotion();
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen,
  );

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
  const currentAccentTheme =
    selectedScenario === "anchor"
      ? ANCHOR_ACCENT
      : activeCorePreset.theme;

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
      ? TRAINING_SCENARIO_LABELS.anchor
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

  return (
    <div
        className={cn(
          "mx-auto flex h-full w-full flex-col overflow-y-auto",
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
          className="flex min-h-0 flex-1 flex-col p-4"
        >
          {/* Fixed top: header + tabs */}
          <div className="shrink-0">
            <div className="flex flex-col gap-4">
              {isTelegramFullscreen ? (null) : (
                <header className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <h1 className="[font-family:var(--font-heading)] text-3xl font-semibold tracking-tight text-brand-primary">
                      Тренировка
                    </h1>
                  </div>
                </header>
              )}

              <section data-tour="training-scenarios" className="rounded-[2rem] border border-border-subtle bg-bg-overlay p-3 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-4">
                <Tabs
                  value={selectedScenario}
                  onValueChange={handleScenarioChange}
                  className="gap-4"
                >
                  <TabsList className="grid h-auto w-full grid-cols-2 rounded-[22px] p-1">
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
              </section>
            </div>
          </div>

          {/* Mode list */}
          <div className="my-2 overflow-y-auto rounded-[1.8rem] border border-border-subtle bg-bg-elevated px-4 pb-4 pt-4 shadow-[var(--shadow-soft)] backdrop-blur-2xl">
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
                  <SectionLabel>Режимы игр</SectionLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                  {ALL_ANCHOR_MODE_GROUPS.map((group) => {
                    const isChecked = selectedAnchorModes.includes(group);
                    const Icon = ANCHOR_MODE_GROUP_ICONS[group];
                    return (
                      <button
                        key={group}
                        type="button"
                        aria-pressed={isChecked}
                        onClick={() => {
                          const next = isChecked
                            ? selectedAnchorModes.filter((g) => g !== group)
                            : [...selectedAnchorModes, group];
                          if (next.length > 0) {
                            triggerHaptic(isChecked ? "light" : "medium");
                            onAnchorModesChange(next);
                          }
                        }}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all duration-150",
                          "outline-none focus-visible:border-brand-primary/30 focus-visible:ring-[3px] focus-visible:ring-focus-ring",
                          isChecked
                            ? "border-status-mastered/30 bg-status-mastered-soft text-status-mastered shadow-[var(--shadow-soft)]"
                            : "border-border-subtle bg-bg-surface text-text-secondary hover:border-brand-primary/20 hover:bg-bg-elevated",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                            isChecked
                              ? "border-status-mastered/30 bg-status-mastered-soft text-status-mastered"
                              : "border-border-subtle bg-bg-subtle text-text-muted group-hover:border-brand-primary/20 group-hover:text-text-secondary",
                          )}
                        >
                          <Icon
                            className="h-[17px] w-[17px]"
                            strokeWidth={2}
                            aria-hidden
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block text-[13px] font-semibold leading-tight tracking-tight",
                              isChecked
                                ? "text-status-mastered"
                                : "text-text-primary",
                            )}
                          >
                            {ANCHOR_MODE_GROUP_LABELS[group]}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                            isChecked
                              ? "border-status-mastered/40 bg-brand-primary text-brand-primary-foreground"
                              : "border-border-subtle bg-bg-subtle opacity-70",
                          )}
                          aria-hidden
                        >
                          {isChecked ? (
                            <Check className="h-3 w-3" strokeWidth={3} />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {hasSelection && selectionVerses ? (
              <section className="mt-3 flex items-center justify-between gap-3 rounded-[1.4rem] border border-border-subtle bg-bg-surface px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    Подборка
                  </p>
                  <p className="text-xs text-text-secondary">
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
                  className="rounded-xl"
                >
                  Начать
                </Button>
              </section>
            ) : null}
          </div>

<div className="flex-1 content-end">

          {/* Bottom: start card */}
          <div
            className={cn(
              "mb-2 rounded-[1.8rem] border border-border-subtle bg-bg-overlay p-3 shadow-[var(--shadow-floating)] backdrop-blur-2xl",
              anchorLocked
                ? "text-text-muted"
                : currentAccentTheme.summaryClassName,
            )}
          >
            <p
              className={cn(
                "mb-3 px-1 text-sm font-medium",
                anchorLocked
                  ? "text-text-muted"
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
                  className="h-14 w-full gap-2 rounded-2xl border border-border-subtle !bg-bg-surface px-5 text-sm font-medium text-text-muted shadow-none"
                >
                  <Lock className="h-4 w-4" />
                  {lockedStartLabel}
                </Button>
                <p className="px-1 text-xs leading-relaxed text-text-secondary">
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
                  "h-14 w-full gap-2 rounded-2xl border px-5 text-sm font-medium !shadow-none",
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
        className={cn("text-xs font-medium text-text-muted", countClassName)}
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
        "group/radio w-full rounded-[22px] border border-border-subtle bg-bg-surface p-4 text-left transition-all duration-150 outline-none focus-visible:border-brand-primary focus-visible:ring-[3px] focus-visible:ring-focus-ring disabled:cursor-not-allowed",
        !disabled && "hover:border-brand-primary/20 hover:bg-bg-elevated",
        theme.checkedItemClassName,
        disabled &&
          "border-border-subtle bg-bg-subtle text-text-muted shadow-none",
        compact && "px-3 py-3",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            data-slot="radio-card-icon"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-bg-subtle text-text-muted transition-colors",
              theme.checkedIconClassName,
              disabled &&
                "border-border-subtle bg-bg-subtle text-text-muted",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                "block truncate text-sm font-medium text-text-primary",
                theme.checkedTitleClassName,
                disabled && "text-text-muted",
              )}
            >
              {title}
            </span>
            {subtitle ? (
              <span
                className={cn(
                  "mt-1 block text-xs leading-relaxed text-text-secondary",
                  theme.checkedSubtitleClassName,
                  disabled && "text-text-muted",
                )}
              >
                {subtitle}
              </span>
            ) : null}
          </span>
        </div>

        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated",
            theme.checkedIndicatorClassName,
            disabled && "border-border-subtle bg-bg-subtle opacity-60",
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
    <div className="px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
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
