"use client";

import { Brain, Check, Gamepad2, Layers, Repeat, Dumbbell } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import {
  formatRussianCount,
  TextSurfaceCard,
} from "@/app/components/texts/TextCards";
import {
  getCoreTrainingCountsFromVerses,
  getCountForCoreModes,
} from "./coreTrainingAvailability";
import type {
  AnchorModeGroup,
  AnchorSubScenario,
  CoreTrainingMode,
  TrainingScenario,
} from "./types";
import type { Verse } from "@/app/domain/verse";
import type { TrainingBoxScope } from "@/app/types/textBox";

const CORE_PRESETS: Array<{
  id: "learning" | "review" | "mixed";
  label: string;
  modes: CoreTrainingMode[];
  icon: typeof Brain;
}> = [
  { id: "learning", label: "Изучение", modes: ["learning"], icon: Brain },
  { id: "review", label: "Повтор", modes: ["review"], icon: Repeat },
  { id: "mixed", label: "Все", modes: ["learning", "review"], icon: Layers },
];

function sameModes(left: CoreTrainingMode[], right: CoreTrainingMode[]) {
  return (
    left.length === right.length && right.every((mode) => left.includes(mode))
  );
}

function ModeOption({
  label,
  value,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: string;
  icon: typeof Brain;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-[1.45rem] border px-4 py-4 text-left transition-all duration-200",
        active
          ? "border-brand-primary/50 bg-brand-primary/10 shadow-[var(--shadow-chip)]"
          : "border-border-subtle bg-bg-base hover:border-brand-primary/20 hover:bg-bg-elevated",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200",
            active
              ? "bg-brand-primary/25 text-brand-primary"
              : "bg-brand-primary/10 text-brand-primary/60"
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className={cn(
              "truncate text-sm font-semibold transition-colors duration-200",
              active ? "text-text-primary" : "text-text-secondary"
            )}>
              {label}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">{value}</p>
          </div>
        </div>
        <div className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-200",
          active
            ? "bg-brand-primary text-bg-base scale-100 opacity-100"
            : "scale-75 opacity-0"
        )}>
          <Check className="h-3 w-3" strokeWidth={2.5} />
        </div>
      </div>
    </button>
  );
}

export function TrainingBoxHub({
  scope,
  verses,
  selectedScenario,
  selectedModes,
  selectedAnchorModes,
  selectedAnchorSubScenario,
  onScenarioChange,
  onModesChange,
  onAnchorModesChange,
  onAnchorSubScenarioChange,
  onStart,
  onStartFlashcard,
  onRequestScopeChange,
}: {
  scope: TrainingBoxScope;
  verses: Verse[];
  selectedScenario: TrainingScenario;
  selectedModes: CoreTrainingMode[];
  selectedAnchorModes: AnchorModeGroup[];
  selectedAnchorSubScenario: AnchorSubScenario;
  onScenarioChange: (scenario: TrainingScenario) => void;
  onModesChange: (modes: CoreTrainingMode[]) => void;
  onAnchorModesChange: (modes: AnchorModeGroup[]) => void;
  onAnchorSubScenarioChange: (sub: AnchorSubScenario) => void;
  onStart: () => void;
  onStartFlashcard: () => void;
  onRequestScopeChange: () => void;
}) {
  const counts = getCoreTrainingCountsFromVerses(verses);
  const currentCoreCount = getCountForCoreModes(selectedModes, counts);
  const interactiveAnchorCount = counts.anchorEligibleCount;
  const flashcardCount = counts.flashcardCount;
  const canStartCore = currentCoreCount > 0;
  const canStartAnchor = interactiveAnchorCount > 0;
  const canStartFlashcard = flashcardCount > 0;
  const canStartSelected =
    selectedScenario === "core"
      ? canStartCore
      : selectedAnchorSubScenario === "flashcard"
        ? canStartFlashcard
        : canStartAnchor;
  const handleStart = () => {
    if (
      selectedScenario === "anchor" &&
      selectedAnchorSubScenario === "flashcard"
    ) {
      onStartFlashcard();
    } else {
      onStart();
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pt-4 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            Коробка
          </p>
          <h1 className="mt-2 truncate [font-family:var(--font-heading)] text-[2rem] font-semibold tracking-tight text-text-primary sm:text-[2.2rem]">
            {scope.boxTitle}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {formatRussianCount(verses.length, ["стих", "стиха", "стихов"])}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="rounded-full px-3"
          onClick={onRequestScopeChange}
        >
          Сменить
        </Button>
      </div>

      <div className="mt-4 flex gap-2 rounded-[1.25rem] border border-border-subtle bg-bg-subtle p-1">
        {[
          { id: "core" as const, label: "Практика", icon: Dumbbell },
          { id: "anchor" as const, label: "Игры", icon: Gamepad2 },
        ].map((item) => {
          const Icon = item.icon;
          const active = selectedScenario === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onScenarioChange(item.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-[0.95rem] px-3 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-bg-elevated text-brand-primary shadow-[var(--shadow-chip)]"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <TextSurfaceCard className="mt-4 flex min-h-0 flex-1 flex-col p-4 overflow-y-auto">
        {selectedScenario === "core" ? (
          <>
            <div className="space-y-3">
              {CORE_PRESETS.map((preset) => {
                const count = getCountForCoreModes(preset.modes, counts);
                return (
                  <ModeOption
                    key={preset.id}
                    label={preset.label}
                    value={formatRussianCount(count, [
                      "стих",
                      "стиха",
                      "стихов",
                    ])}
                    icon={preset.icon}
                    active={sameModes(selectedModes, preset.modes)}
                    onClick={() => onModesChange(preset.modes)}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <ModeOption
                label="Игры"
                value={formatRussianCount(interactiveAnchorCount, [
                  "стих",
                  "стиха",
                  "стихов",
                ])}
                icon={Gamepad2}
                active={selectedAnchorSubScenario === "interactive"}
                onClick={() => {
                  onAnchorSubScenarioChange("interactive");
                  onAnchorModesChange(
                    selectedAnchorModes.length > 0
                      ? selectedAnchorModes
                      : ["reference-v1"],
                  );
                }}
              />
              <ModeOption
                label="Карточки"
                value={formatRussianCount(flashcardCount, [
                  "стих",
                  "стиха",
                  "стихов",
                ])}
                icon={Layers}
                active={selectedAnchorSubScenario === "flashcard"}
                onClick={() => onAnchorSubScenarioChange("flashcard")}
              />
            </div>
          </>
        )}
      </TextSurfaceCard>

      <div className="my-4 w-full pt-1">
        <Button
          type="button"
          className="w-full rounded-full px-5"
          disabled={!canStartSelected}
          onClick={handleStart}
        >
          Начать
        </Button>
      </div>
    </div>
  );
}
