"use client";

import { useEffect, useMemo } from "react";
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
import type { ChapterFilter } from "@/app/types/chapter";
import { BIBLE_BOOKS, getBibleBookNameRu } from "@/app/types/bible";
import { parseExternalVerseId } from "@/shared/bible/externalVerseId";
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
  AnchorSubScenario,
  CoreTrainingMode,
  FlashcardMode,
  TrainingScenario,
} from "../types";
import {
  ALL_ANCHOR_MODE_GROUPS,
  ALL_FLASHCARD_MODES,
  ANCHOR_MODE_GROUP_LABELS,
  FLASHCARD_MODE_DESCRIPTIONS,
  FLASHCARD_MODE_LABELS,
} from "../types";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";

interface TrainingHubProps {
  allVerses: Verse[];
  dashboardStats?: bible_memory_db_internal_domain_UserDashboardStats | null;
  selectionVerses?: Verse[];
  selectedScenario: TrainingScenario;
  selectedModes: CoreTrainingMode[];
  selectedAnchorModes: AnchorModeGroup[];
  selectedAnchorSubScenario: AnchorSubScenario;
  selectedFlashcardMode: FlashcardMode;
  chapterFilter: ChapterFilter;
  onScenarioChange: (scenario: TrainingScenario) => void;
  onModesChange: (modes: CoreTrainingMode[]) => void;
  onAnchorModesChange: (modes: AnchorModeGroup[]) => void;
  onAnchorSubScenarioChange: (sub: AnchorSubScenario) => void;
  onFlashcardModeChange: (mode: FlashcardMode) => void;
  onChapterFilterChange: (filter: ChapterFilter) => void;
  onStart: () => void;
  onStartFlashcard: () => void;
  onStartSelection: () => void;
}

type CoreModePresetId = "learning" | "review" | "mixed";

type CoreModePreset = {
  id: CoreModePresetId;
  label: string;
  modes: CoreTrainingMode[];
  icon: LucideIcon;
};

type CorePresetState = CoreModePreset & {
  availableCount: number;
  selectableCount: number;
  waitingReviewCount: number;
  startable: boolean;
  disabled: boolean;
};

const ANCHOR_MIN_REQUIRED = 1;

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

const CORE_MODE_PRESETS: CoreModePreset[] = [
  {
    id: "learning",
    label: "Изучение",
    modes: ["learning"],
    icon: Brain,
  },
  {
    id: "review",
    label: "Повторение",
    modes: ["review"],
    icon: Repeat,
  },
  {
    id: "mixed",
    label: "Все сразу",
    modes: ["learning", "review"],
    icon: Layers,
  },
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

export function TrainingHub({
  allVerses,
  dashboardStats,
  selectionVerses,
  selectedScenario,
  selectedModes,
  selectedAnchorModes,
  selectedAnchorSubScenario,
  selectedFlashcardMode,
  chapterFilter,
  onScenarioChange,
  onModesChange,
  onAnchorModesChange,
  onAnchorSubScenarioChange,
  onFlashcardModeChange,
  onChapterFilterChange,
  onStart,
  onStartFlashcard,
  onStartSelection,
}: TrainingHubProps) {
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen,
  );

  // Chapter filter: compute verse count for the selected chapter
  const chapterVerseCount = useMemo(() => {
    if (!chapterFilter) return null;
    return allVerses.filter((v) => {
      const p = parseExternalVerseId(v.externalVerseId);
      return p?.book === chapterFilter.bookId && p?.chapter === chapterFilter.chapterNo;
    }).length;
  }, [allVerses, chapterFilter]);

  const canonicalBookIds = useMemo(
    () => Object.keys(BIBLE_BOOKS).map(Number).filter((id) => id >= 1 && id <= 66).sort((a, b) => a - b),
    [],
  );

  const counts = useTrainingHubState({ allVerses, dashboardStats });
  const practiceCount = counts.learningCount + counts.dueReviewCount;
  const anchorInteractiveCount = useMemo(() => {
    if (allVerses.length > 0) {
      return getAnchorEligibleVerseCount(allVerses);
    }
    return getCountForMode("anchor", counts);
  }, [allVerses, counts]);
  const flashcardAvailableCount = counts.flashcardCount;
  const anchorScenarioCount = Math.max(
    anchorInteractiveCount,
    flashcardAvailableCount,
  );
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

  const selectionCounts = useMemo(
    () =>
      selectionVerses && selectionVerses.length > 0
        ? getCoreTrainingCountsFromVerses(selectionVerses)
        : null,
    [selectionVerses],
  );
  const currentCount =
    selectedScenario === "anchor"
      ? selectedAnchorSubScenario === "flashcard"
        ? flashcardAvailableCount
        : anchorInteractiveCount
      : getCountForModes(selectedModes, counts);
  const currentWaitingReviewCount =
    selectedScenario === "anchor"
      ? 0
      : getWaitingReviewCountForCoreModes(selectedModes, counts);
  const anchorLocked =
    selectedScenario === "anchor" && currentCount < ANCHOR_MIN_REQUIRED;
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
      ? selectedAnchorSubScenario === "flashcard"
        ? "Карточки"
        : "Игры"
      : `Практика · ${activeCorePreset.label}`;

  const startLabel =
    selectedScenario === "anchor"
      ? selectedAnchorSubScenario === "flashcard"
        ? "Начать карточки"
        : "Начать игры"
      : "Начать практику";

  const lockedStartLabel =
    selectedScenario === "anchor"
      ? selectedAnchorSubScenario === "flashcard"
        ? "Карточки пока недоступны"
        : "Игры пока недоступны"
      : reviewWaitingLocked
        ? selectedModes.length === 1 && selectedModes[0] === "review"
          ? "Повторение на ожидании"
          : "Практика на ожидании"
        : "Практика пока недоступна";

  const lockedSummaryText =
    selectedScenario === "anchor"
      ? selectedAnchorSubScenario === "flashcard"
        ? getFlashcardLockMessage(flashcardAvailableCount)
        : getAnchorLockMessage({
            currentCount: anchorInteractiveCount,
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

  const handleScenarioChange = (value: TrainingScenario) => {
    triggerSelectionHaptic(value !== selectedScenario);
    onScenarioChange(value);
  };

  const handleCorePresetChange = (value: string) => {
    const nextPreset = CORE_MODE_PRESETS.find((preset) => preset.id === value);
    if (!nextPreset) return;
    triggerSelectionHaptic(!matchesModes(selectedModes, nextPreset.modes));
    onModesChange(nextPreset.modes);
  };

  return (
    <div className="mx-auto flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      {!isTelegramFullscreen && (
        <header className="shrink-0 px-5 pb-2 pt-4">
          <h1 className="[font-family:var(--font-heading)] text-2xl font-semibold tracking-tight text-brand-primary">
            Тренировка
          </h1>
        </header>
      )}

      {/* Segmented control: Практика | Игры */}
      <div className="shrink-0 px-4 py-3">
        <div
          data-tour="training-scenarios"
          className="flex gap-1 rounded-[18px] bg-bg-subtle p-1"
        >
          {(["core", "anchor"] as TrainingScenario[]).map((scenario) => {
            const isActive = selectedScenario === scenario;
            const label = scenario === "core" ? "Практика" : "Игры";
            const count =
              scenario === "core" ? practiceCount : anchorScenarioCount;
            return (
              <button
                key={scenario}
                type="button"
                data-tour={`training-scenario-${scenario}`}
                onClick={() => handleScenarioChange(scenario)}
                className={cn(
                  "flex flex-1 items-center justify-between gap-2 rounded-[14px] px-4 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-bg-surface text-text-primary shadow-[var(--shadow-soft)]"
                    : "text-text-muted hover:text-text-secondary",
                )}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs font-medium tabular-nums transition-colors",
                      isActive ? "text-brand-primary" : "text-text-muted",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        {selectedScenario === "core" ? (
          /* ── Practice modes ─────────────────────────────────── */
          <RadioGroupPrimitive.Root
            data-tour="training-core-presets"
            value={activeCorePreset.id}
            onValueChange={handleCorePresetChange}
            aria-label="Режим практики"
            className="overflow-hidden rounded-[22px] border border-border-subtle bg-bg-surface"
          >
            {corePresetStates.map((preset, index) => {
              const Icon = preset.icon;
              const isSelected = matchesModes(selectedModes, preset.modes);
              return (
                <RadioGroupPrimitive.Item
                  key={preset.id}
                  value={preset.id}
                  disabled={preset.disabled}
                  className={cn(
                    "group/radio w-full text-left outline-none transition-colors duration-150",
                    index > 0 && "border-t border-border-subtle",
                    !preset.disabled && "hover:bg-bg-elevated",
                    preset.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                        isSelected
                          ? "bg-brand-primary/10 text-brand-primary"
                          : "bg-bg-subtle text-text-muted",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium leading-snug",
                          isSelected ? "text-text-primary" : "text-text-primary",
                          preset.disabled && "text-text-muted",
                        )}
                      >
                        {preset.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-snug text-text-muted">
                        {getModeAvailabilityLabel(preset)}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isSelected
                          ? "border-brand-primary"
                          : "border-border-default",
                        preset.disabled && "opacity-40",
                      )}
                    >
                      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                        <span className="block h-2.5 w-2.5 rounded-full bg-brand-primary" />
                      </RadioGroupPrimitive.Indicator>
                    </span>
                  </div>
                </RadioGroupPrimitive.Item>
              );
            })}
          </RadioGroupPrimitive.Root>
        ) : (
          /* ── Games / Anchor modes ───────────────────────────── */
          <div
            data-tour="training-anchor-presets"
            className="flex flex-col gap-3"
          >
            {/* Sub-scenario switcher: Интерактивные | Карточки */}
            <div className="flex gap-1 rounded-[18px] bg-bg-subtle p-1">
              {(["interactive", "flashcard"] as AnchorSubScenario[]).map(
                (sub) => {
                  const isActive = selectedAnchorSubScenario === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => {
                        triggerHaptic(isActive ? "light" : "medium");
                        onAnchorSubScenarioChange(sub);
                      }}
                      className={cn(
                        "flex-1 rounded-[14px] py-2.5 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-bg-surface text-text-primary shadow-[var(--shadow-soft)]"
                          : "text-text-muted hover:text-text-secondary",
                      )}
                    >
                      {sub === "interactive" ? "Интерактивные" : "Карточки"}
                    </button>
                  );
                },
              )}
            </div>

            {/* Interactive modes list */}
            {selectedAnchorSubScenario === "interactive" && (
              <div className="overflow-hidden rounded-[22px] border border-border-subtle bg-bg-surface">
                {ALL_ANCHOR_MODE_GROUPS.map((group, index) => {
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
                        "flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors duration-150",
                        index > 0 && "border-t border-border-subtle",
                        "hover:bg-bg-elevated focus-visible:bg-bg-elevated",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                          isChecked
                            ? "bg-brand-primary/10 text-brand-primary"
                            : "bg-bg-subtle text-text-muted",
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>

                      <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-text-primary">
                        {ANCHOR_MODE_GROUP_LABELS[group]}
                      </span>

                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          isChecked
                            ? "border-brand-primary bg-brand-primary"
                            : "border-border-default",
                        )}
                      >
                        {isChecked && (
                          <Check
                            className="h-3 w-3 text-brand-primary-foreground"
                            strokeWidth={3}
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Flashcard modes list */}
            {selectedAnchorSubScenario === "flashcard" && (
              <div className="overflow-hidden rounded-[22px] border border-border-subtle bg-bg-surface">
                {ALL_FLASHCARD_MODES.map((fMode, index) => {
                  const isSelected = selectedFlashcardMode === fMode;
                  return (
                    <button
                      key={fMode}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        triggerHaptic(isSelected ? "light" : "medium");
                        onFlashcardModeChange(fMode);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3.5 text-left outline-none transition-colors duration-150",
                        index > 0 && "border-t border-border-subtle",
                        "hover:bg-bg-elevated",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-text-primary">
                          {FLASHCARD_MODE_LABELS[fMode]}
                        </p>
                        <p className="mt-0.5 text-xs leading-snug text-text-muted">
                          {FLASHCARD_MODE_DESCRIPTIONS[fMode]}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          isSelected
                            ? "border-brand-primary"
                            : "border-border-default",
                        )}
                      >
                        {isSelected && (
                          <span className="block h-2.5 w-2.5 rounded-full bg-brand-primary" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Chapter filter row — only for core scenario */}
        {selectedScenario === "core" && (
          <div className="mt-3 overflow-hidden rounded-[22px] border border-border-subtle bg-bg-surface">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium text-text-primary">Глава</p>
              {chapterFilter && (
                <button
                  type="button"
                  onClick={() => onChapterFilterChange(null)}
                  className="text-xs font-medium text-brand-primary"
                >
                  Сбросить
                </button>
              )}
            </div>
            <div className="flex gap-2 border-t border-border-subtle px-4 py-3">
              <select
                value={chapterFilter?.bookId ?? ""}
                onChange={(e) => {
                  const bookId = Number(e.target.value);
                  if (!bookId) {
                    onChapterFilterChange(null);
                    return;
                  }
                  onChapterFilterChange({ bookId, chapterNo: 1 });
                }}
                className="flex-1 rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2 text-sm text-text-primary outline-none"
              >
                <option value="">Все книги</option>
                {canonicalBookIds.map((id) => (
                  <option key={id} value={id}>
                    {getBibleBookNameRu(id)}
                  </option>
                ))}
              </select>

              {chapterFilter && (
                <select
                  value={chapterFilter.chapterNo}
                  onChange={(e) => {
                    onChapterFilterChange({
                      bookId: chapterFilter.bookId,
                      chapterNo: Number(e.target.value),
                    });
                  }}
                  className="w-24 rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2 text-sm text-text-primary outline-none"
                >
                  {Array.from(
                    { length: BIBLE_BOOKS[chapterFilter.bookId]?.chapters ?? 1 },
                    (_, i) => i + 1,
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {chapterFilter && chapterVerseCount !== null && (
              <p className="border-t border-border-subtle px-4 py-2.5 text-xs text-text-muted">
                {chapterVerseCount === 0
                  ? "Нет изучаемых стихов в этой главе"
                  : `${chapterVerseCount} ${pluralVerses(chapterVerseCount)} в выбранной главе`}
              </p>
            )}
          </div>
        )}

        {/* Selection (подборка) row */}
        {hasSelection && selectionVerses ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[22px] border border-border-subtle bg-bg-surface px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">Подборка</p>
              <p className="mt-0.5 text-xs text-text-muted">
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
              className="shrink-0 rounded-xl"
            >
              Начать
            </Button>
          </div>
        ) : null}
      </div>

      {/* Bottom CTA */}
      <div className="shrink-0 px-4 pb-3 pt-1">
        <p
          className={cn(
            "mb-2 px-1 text-xs leading-relaxed",
            startLocked ? "text-text-muted" : "text-text-secondary",
          )}
        >
          {startLocked ? lockedSummaryText : sessionSummary}
        </p>

        {startLocked ? (
          <Button
            type="button"
            size="lg"
            disabled
            className="h-12 w-full gap-2 rounded-2xl border border-border-subtle !bg-bg-surface text-sm font-medium text-text-muted shadow-none"
          >
            <Lock className="h-4 w-4" />
            {lockedStartLabel}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            haptic="medium"
            data-tour="training-start-button"
            onClick={
              selectedScenario === "anchor" &&
              selectedAnchorSubScenario === "flashcard"
                ? onStartFlashcard
                : onStart
            }
            className="h-12 w-full gap-2 rounded-2xl border border-brand-primary bg-brand-primary text-sm font-medium text-brand-primary-foreground shadow-none hover:border-brand-primary-hover hover:bg-brand-primary-hover"
          >
            <Play className="h-4 w-4" />
            {startLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Helper functions ──────────────────────────────────────────────────── */

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

function getFlashcardLockMessage(currentCount: number) {
  if (currentCount > 0) return null;
  return "Для карточек нужен хотя бы один стих в изучении, повторении или выученных.";
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
