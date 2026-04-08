"use client";

import React, { useMemo } from "react";
import { Brain, Repeat } from "lucide-react";
import type { Verse } from "@/app/domain/verse";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import {
  resolveVerseState,
} from "@/shared/verseRules";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { cn } from "./ui/utils";

type VerseProgressDrawerProps = {
  verse: Verse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PhaseKey = "collection" | "learning" | "review" | "mastered";
type StatusTone = {
  pillClassName: string;
  progressClassName: string;
};

function resolveCurrentPhase(phase: ReturnType<typeof resolveVerseState>["journeyPhase"]): PhaseKey {
  if (phase === "catalog" || phase === "my" || phase === "queue") {
    return "collection";
  }
  return phase;
}

function pluralizeRu(
  value: number,
  forms: [one: string, few: string, many: string],
) {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;

  if (abs > 10 && abs < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

function formatRemaining(value: number, forms: [string, string, string]) {
  return `${value} ${pluralizeRu(value, forms)}`;
}

function getStatusLabel(
  phase: PhaseKey,
  isPaused: boolean,
  status: DisplayVerseStatus,
) {
  if (isPaused) return "На паузе";
  if (status === "CATALOG") return "Каталог";
  if (status === VerseStatus.QUEUE) return "В очереди";
  if (phase === "learning") return "В изучении";
  if (phase === "review") return "Повторение";
  return "Выучен";
}

function getSubtitle(
  phase: PhaseKey,
  isPaused: boolean,
  totalRemaining: number,
  status: DisplayVerseStatus,
) {
  if (isPaused) {
    return "Стих временно остановлен, но прогресс сохранен.";
  }
  if (phase === "mastered") {
    return "Основной цикл завершен.";
  }
  if (status === "CATALOG") {
    return "Стих еще не добавлен в личную коллекцию.";
  }
  if (status === VerseStatus.QUEUE) {
    return "Стих ожидает свободный слот изучения.";
  }
  return `До полного освоения осталось ${formatRemaining(totalRemaining, [
    "шаг",
    "шага",
    "шагов",
  ])}.`;
}

function getTone(phase: PhaseKey, isPaused: boolean): StatusTone {
  if (isPaused) {
    return {
      pillClassName:
        "border-status-paused/25 bg-status-paused-soft text-status-paused",
      progressClassName: "bg-status-paused",
    };
  }

  if (phase === "mastered") {
    return {
      pillClassName:
        "border-status-mastered/25 bg-status-mastered-soft text-status-mastered",
      progressClassName: "bg-status-mastered",
    };
  }

  if (phase === "review") {
    return {
      pillClassName:
        "border-status-review/25 bg-status-review-soft text-status-review",
      progressClassName: "bg-status-review",
    };
  }

  if (phase === "learning") {
    return {
      pillClassName:
        "border-status-learning/25 bg-status-learning-soft text-status-learning",
      progressClassName: "bg-status-learning",
    };
  }

  return {
    pillClassName: "border-border-default bg-bg-elevated text-text-secondary",
    progressClassName: "bg-brand-primary",
  };
}

function MetricRow({
  icon: Icon,
  value,
  label,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  iconClassName: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} />
        <div className="text-sm text-text-secondary">{label}</div>
      </div>
      <div className="text-2xl font-semibold tracking-tight text-brand-primary">
        {value}
      </div>
    </div>
  );
}

export function VerseProgressDrawer({
  verse,
  open,
  onOpenChange,
}: VerseProgressDrawerProps) {
  const progressModel = useMemo(() => {
    if (!verse) return null;

    const resolved = resolveVerseState(verse);
    const phase = resolveCurrentPhase(resolved.journeyPhase);
    const status = resolved.displayStatus;
    const isPaused = resolved.isPaused;
    const {
      totalCompleted,
      totalRemaining,
      remainingLearnings,
      remainingRepeats,
      progressPercent,
    } = resolved.progress;

    return {
      phase,
      status,
      isPaused,
      remainingLearnings,
      remainingRepeats,
      totalCompleted,
      totalRemaining,
      progressPercent,
      tone: getTone(phase, isPaused),
      statusLabel: getStatusLabel(phase, isPaused, status),
      subtitle: getSubtitle(phase, isPaused, totalRemaining, status),
    };
  }, [verse]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="rounded-t-[32px] border-border-subtle bg-bg-elevated px-4 shadow-[var(--shadow-floating)] backdrop-blur-xl sm:px-6">
        <div className="mx-auto w-full max-w-2xl pt-3">
          <DrawerHeader className="px-0 pb-0 pt-3">
            <DrawerTitle className="[font-family:var(--font-heading)] text-brand-primary [overflow-wrap:anywhere] text-2xl tracking-tight">
              {verse?.reference ?? "Прогресс стиха"}
            </DrawerTitle>
          </DrawerHeader>

          {progressModel ? (
            <div className="mt-5 space-y-4">
              <section className="rounded-3xl border border-border-subtle bg-bg-surface p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-text-secondary">
                    Текущий статус
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                      progressModel.tone.pillClassName,
                    )}
                  >
                    {progressModel.statusLabel}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
                    <span>
                      Пройдено {progressModel.totalCompleted} из{" "}
                      {TOTAL_REPEATS_AND_STAGE_MASTERY_MAX}
                    </span>
                    <span>{progressModel.progressPercent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500 ease-out",
                        progressModel.tone.progressClassName,
                      )}
                      style={{ width: `${progressModel.progressPercent}%` }}
                    />
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-3xl border border-border-subtle bg-bg-surface shadow-[var(--shadow-soft)]">
                <MetricRow
                  icon={Brain}
                  value={progressModel.remainingLearnings}
                  label="Изучений осталось"
                  iconClassName="text-status-learning"
                />
                <div className="h-px bg-border-subtle" />
                <MetricRow
                  icon={Repeat}
                  value={progressModel.remainingRepeats}
                  label="Повторов осталось"
                  iconClassName="text-status-review"
                />
              </section>
            </div>
          ) : (
            <div className="mt-5 rounded-[28px] border border-border-subtle bg-bg-surface p-5 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
              Выберите стих, чтобы увидеть, сколько шагов осталось до
              выученного.
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
