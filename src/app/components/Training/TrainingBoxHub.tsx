"use client";

import { Brain, Gamepad2, Layers, Repeat, Sparkles } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import {
  formatRussianCount,
  TextStatPills,
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
  FlashcardMode,
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
  return left.length === right.length && right.every((mode) => left.includes(mode));
}

function buildTrainingHubStats(versesCount: number, counts: ReturnType<typeof getCoreTrainingCountsFromVerses>) {
  return [
    { label: "Всего", value: versesCount },
    { label: "Изучение", value: counts.learningCount },
    { label: "Повтор", value: counts.dueReviewCount },
    { label: "Ожидание", value: counts.waitingReviewCount },
    { label: "Игры", value: counts.anchorEligibleCount },
    { label: "Карточки", value: counts.flashcardCount },
  ].filter((item) => item.value > 0 || item.label === "Всего");
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
        "w-full rounded-[1.45rem] border px-4 py-4 text-left transition-colors",
        active ? "border-brand-primary/25 bg-bg-elevated" : "border-border-subtle bg-bg-base hover:bg-bg-elevated",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{label}</p>
            <p className="mt-0.5 text-xs text-text-muted">{value}</p>
          </div>
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
  selectedFlashcardMode,
  onScenarioChange,
  onModesChange,
  onAnchorModesChange,
  onAnchorSubScenarioChange,
  onFlashcardModeChange,
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
  selectedFlashcardMode: FlashcardMode;
  onScenarioChange: (scenario: TrainingScenario) => void;
  onModesChange: (modes: CoreTrainingMode[]) => void;
  onAnchorModesChange: (modes: AnchorModeGroup[]) => void;
  onAnchorSubScenarioChange: (sub: AnchorSubScenario) => void;
  onFlashcardModeChange: (mode: FlashcardMode) => void;
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
  const stats = buildTrainingHubStats(verses.length, counts);

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-6 pt-4 sm:px-6">
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

        <Button type="button" variant="ghost" className="rounded-full px-3" onClick={onRequestScopeChange}>
          Сменить
        </Button>
      </div>

      <TextSurfaceCard className="p-4">
        <TextStatPills stats={stats} />
      </TextSurfaceCard>

      <div className="mt-4 flex gap-2 rounded-[1.25rem] border border-border-subtle bg-bg-subtle p-1">
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
                "flex flex-1 items-center justify-center gap-2 rounded-[0.95rem] px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-bg-elevated text-text-primary shadow-[var(--shadow-soft)]" : "text-text-secondary",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <TextSurfaceCard className="mt-4 flex min-h-0 flex-1 flex-col p-4">
        {selectedScenario === "core" ? (
          <>
            <div className="space-y-3">
              {CORE_PRESETS.map((preset) => {
                const count = getCountForCoreModes(preset.modes, counts);
                return (
                  <ModeOption
                    key={preset.id}
                    label={preset.label}
                    value={formatRussianCount(count, ["стих", "стиха", "стихов"])}
                    icon={preset.icon}
                    active={sameModes(selectedModes, preset.modes)}
                    onClick={() => onModesChange(preset.modes)}
                  />
                );
              })}
            </div>

            <div className="mt-4 pt-1">
              <Button
                type="button"
                className="rounded-full px-5"
                disabled={!canStartCore}
                onClick={onStart}
              >
                Начать
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <ModeOption
                label="Игры"
                value={formatRussianCount(interactiveAnchorCount, ["стих", "стиха", "стихов"])}
                icon={Gamepad2}
                active={selectedAnchorSubScenario === "interactive"}
                onClick={() => {
                  onAnchorSubScenarioChange("interactive");
                  onAnchorModesChange(selectedAnchorModes.length > 0 ? selectedAnchorModes : ["reference-v1"]);
                }}
              />
              <ModeOption
                label="Карточки"
                value={formatRussianCount(flashcardCount, ["стих", "стиха", "стихов"])}
                icon={Layers}
                active={selectedAnchorSubScenario === "flashcard"}
                onClick={() => onAnchorSubScenarioChange("flashcard")}
              />
            </div>

            {selectedAnchorSubScenario === "flashcard" ? (
              <div className="mt-4 flex flex-wrap gap-2">
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
                        ? "border-brand-primary/25 bg-brand-primary/10 text-brand-primary"
                        : "border-border-subtle bg-bg-surface/80 text-text-secondary",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-4 pt-1">
              <Button
                type="button"
                className="rounded-full px-5"
                disabled={selectedAnchorSubScenario === "flashcard" ? !canStartFlashcard : !canStartAnchor}
                onClick={selectedAnchorSubScenario === "flashcard" ? onStartFlashcard : onStart}
              >
                Начать
              </Button>
            </div>
          </>
        )}
      </TextSurfaceCard>
    </div>
  );
}

