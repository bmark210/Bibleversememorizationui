"use client";

import { Brain, Gamepad2, Layers, Repeat, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { getCoreTrainingCountsFromVerses, getCountForCoreModes, getWaitingReviewCountForCoreModes } from "./coreTrainingAvailability";
import type { AnchorModeGroup, AnchorSubScenario, CoreTrainingMode, FlashcardMode, TrainingScenario } from "./types";
import type { Verse } from "@/app/domain/verse";
import type { TrainingBoxScope } from "@/app/types/textBox";

const CORE_PRESETS: Array<{
  id: "learning" | "review" | "mixed";
  label: string;
  modes: CoreTrainingMode[];
  icon: typeof Brain;
}> = [
  { id: "learning", label: "Изучение", modes: ["learning"], icon: Brain },
  { id: "review", label: "Повторение", modes: ["review"], icon: Repeat },
  { id: "mixed", label: "Все вместе", modes: ["learning", "review"], icon: Layers },
];

type TrainingBoxHubProps = {
  scope: TrainingBoxScope;
  verses: Verse[];
  selectedScenario: TrainingScenario;
  selectedModes: CoreTrainingMode[];
  selectedAnchorModes: AnchorModeGroup[];
  selectedAnchorSubScenario: AnchorSubScenario;
  selectedFlashcardMode: FlashcardMode;
  onScenarioChange: (scenario: TrainingScenario) => void;
  onModesChange: (modes: CoreTrainingMode[]) => void;
  onAnchorModesChange: (modes: AnchorModeGroup[]) => void;
  onAnchorSubScenarioChange: (sub: AnchorSubScenario) => void;
  onFlashcardModeChange: (mode: FlashcardMode) => void;
  onStart: () => void;
  onStartFlashcard: () => void;
  onRequestScopeChange: () => void;
};

function sameModes(left: CoreTrainingMode[], right: CoreTrainingMode[]) {
  return left.length === right.length && right.every((mode) => left.includes(mode));
}

export function TrainingBoxHub({
  scope,
  verses,
  selectedScenario,
  selectedModes,
  selectedAnchorModes,
  selectedAnchorSubScenario,
  selectedFlashcardMode,
  onScenarioChange,
  onModesChange,
  onAnchorModesChange,
  onAnchorSubScenarioChange,
  onFlashcardModeChange,
  onStart,
  onStartFlashcard,
  onRequestScopeChange,
}: TrainingBoxHubProps) {
  const counts = getCoreTrainingCountsFromVerses(verses);
  const currentCoreCount = getCountForCoreModes(selectedModes, counts);
  const currentWaitingCount = getWaitingReviewCountForCoreModes(selectedModes, counts);
  const interactiveAnchorCount = counts.anchorEligibleCount;
  const flashcardCount = counts.flashcardCount;
  const canStartCore = currentCoreCount > 0;
  const canStartAnchor = interactiveAnchorCount > 0;
  const canStartFlashcard = flashcardCount > 0;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-6 pt-4 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Тренировка</p>
          <h1 className="mt-2 text-2xl font-semibold text-text-primary">{scope.boxTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {verses.length} стихов в коробке. Выберите режим и запустите сессию только для этой коробки.
          </p>
        </div>
        <Button type="button" variant="outline" className="rounded-[1.2rem]" onClick={onRequestScopeChange}>
          Сменить
        </Button>
      </div>

      <div className="mb-4 flex gap-2 rounded-[1.3rem] border border-border-subtle bg-bg-subtle p-1">
        {[
          { id: "core" as const, label: "Практика", icon: Sparkles },
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
                "flex flex-1 items-center justify-center gap-2 rounded-[1rem] px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-bg-elevated text-brand-primary shadow-[var(--shadow-soft)]" : "text-text-secondary",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {selectedScenario === "core" ? (
        <div className="space-y-3">
          {CORE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const active = sameModes(selectedModes, preset.modes);
            const count = getCountForCoreModes(preset.modes, counts);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onModesChange(preset.modes)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[1.35rem] border px-4 py-4 text-left transition-colors",
                  active ? "border-brand-primary/30 bg-bg-elevated" : "border-border-subtle bg-bg-base hover:bg-bg-elevated",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{preset.label}</p>
                    <p className="text-xs text-text-muted">
                      {count} готовы сейчас{preset.id === "review" && currentWaitingCount > 0 ? ` · ${currentWaitingCount} ожидают` : ""}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}

          <Button type="button" className="mt-2 rounded-[1.25rem] px-5" disabled={!canStartCore} onClick={onStart}>
            {canStartCore ? "Начать практику" : "Нет стихов для практики"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                onAnchorSubScenarioChange("interactive");
                onAnchorModesChange(selectedAnchorModes.length > 0 ? selectedAnchorModes : ["reference-v1"]);
              }}
              className={cn(
                "rounded-[1.35rem] border px-4 py-4 text-left transition-colors",
                selectedAnchorSubScenario === "interactive"
                  ? "border-brand-primary/30 bg-bg-elevated"
                  : "border-border-subtle bg-bg-base hover:bg-bg-elevated",
              )}
            >
              <p className="text-sm font-semibold text-text-primary">Игры</p>
              <p className="mt-1 text-xs text-text-muted">{interactiveAnchorCount} стихов подходят для закрепления</p>
            </button>
            <button
              type="button"
              onClick={() => onAnchorSubScenarioChange("flashcard")}
              className={cn(
                "rounded-[1.35rem] border px-4 py-4 text-left transition-colors",
                selectedAnchorSubScenario === "flashcard"
                  ? "border-brand-primary/30 bg-bg-elevated"
                  : "border-border-subtle bg-bg-base hover:bg-bg-elevated",
              )}
            >
              <p className="text-sm font-semibold text-text-primary">Карточки</p>
              <p className="mt-1 text-xs text-text-muted">{flashcardCount} стихов доступны в карточках</p>
            </button>
          </div>

          {selectedAnchorSubScenario === "flashcard" ? (
            <div className="space-y-3 rounded-[1.35rem] border border-border-subtle bg-bg-elevated p-4">
              <p className="text-sm font-semibold text-text-primary">Режим карточек</p>
              <div className="flex gap-2">
                {[
                  { id: "reference" as const, label: "Ссылка" },
                  { id: "verse" as const, label: "Стих" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onFlashcardModeChange(option.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selectedFlashcardMode === option.id
                        ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                        : "border-border-subtle text-text-secondary",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Button type="button" className="rounded-[1.25rem] px-5" disabled={!canStartFlashcard} onClick={onStartFlashcard}>
                {canStartFlashcard ? "Начать карточки" : "Нет стихов для карточек"}
              </Button>
            </div>
          ) : (
            <Button type="button" className="rounded-[1.25rem] px-5" disabled={!canStartAnchor} onClick={onStart}>
              {canStartAnchor ? "Начать игры" : "Нет стихов для игр"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
