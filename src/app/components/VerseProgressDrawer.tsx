"use client";

import React, { useMemo } from "react";
import { Brain, Repeat } from "lucide-react";
import type { Verse } from "@/app/domain/verse";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { getStoppedVerseStageKind } from "@/app/components/verse-list/constants";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import { computeVerseProgressBreakdown } from "@/shared/training/verseTotalProgress";
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

function resolveCurrentPhase(verse: Verse): PhaseKey {
  const status = normalizeDisplayVerseStatus(verse.status);
  if (status === "CATALOG" || status === VerseStatus.MY) {
    return "collection";
  }
  if (status === VerseStatus.STOPPED) {
    const stoppedKind = getStoppedVerseStageKind(verse);
    if (stoppedKind === "mastered") return "mastered";
    if (stoppedKind === "review") return "review";
    return "learning";
  }
  if (status === VerseStatus.MASTERED) return "mastered";
  if (status === VerseStatus.REVIEW) return "review";
  return "learning";
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
  status: ReturnType<typeof normalizeDisplayVerseStatus>,
) {
  if (isPaused) return "На паузе";
  if (status === "CATALOG") return "Каталог";
  if (status === VerseStatus.MY) return "Мой список";
  if (phase === "learning") return "В изучении";
  if (phase === "review") return "Повторение";
  return "Выучен";
}

function getSubtitle(
  phase: PhaseKey,
  isPaused: boolean,
  totalRemaining: number,
  status: ReturnType<typeof normalizeDisplayVerseStatus>,
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
  if (status === VerseStatus.MY) {
    return "Стих уже в списке, но обучение еще не началось.";
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
        "border-rose-500/20 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300",
      progressClassName: "bg-rose-500",
    };
  }

  if (phase === "mastered") {
    return {
      pillClassName:
        "border-amber-500/25 bg-amber-500/[0.08] text-amber-800 dark:text-amber-300",
      progressClassName: "bg-amber-500",
    };
  }

  if (phase === "review") {
    return {
      pillClassName:
        "border-violet-500/20 bg-violet-500/[0.08] text-violet-700 dark:text-violet-300",
      progressClassName: "bg-violet-500",
    };
  }

  if (phase === "learning") {
    return {
      pillClassName:
        "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300",
      progressClassName: "bg-emerald-500",
    };
  }

  return {
    pillClassName: "border-border/60 bg-background/55 text-foreground/62",
    progressClassName: "bg-foreground/35",
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
        <div className="text-sm text-foreground/78">{label}</div>
      </div>
      <div className="text-2xl font-semibold tracking-tight text-primary">
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

    const phase = resolveCurrentPhase(verse);
    const status = normalizeDisplayVerseStatus(verse.status);
    const isPaused = status === VerseStatus.STOPPED;
    const {
      totalCompleted,
      totalRemaining,
      remainingLearnings,
      remainingRepeats,
      progressPercent,
    } = computeVerseProgressBreakdown(verse.masteryLevel, verse.repetitions);

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
      <DrawerContent className="rounded-t-[32px] border-border/70 bg-card px-4 shadow-2xl backdrop-blur-xl sm:px-6">
        <div className="mx-auto w-full max-w-2xl pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
          <DrawerHeader className="px-0 pb-0 pt-3">
            <DrawerTitle className="font-serif text-primary [overflow-wrap:anywhere] text-2xl tracking-tight">
              {verse?.reference ?? "Прогресс стиха"}
            </DrawerTitle>
          </DrawerHeader>

          {progressModel ? (
            <div className="mt-5 space-y-4">
              <section className="rounded-3xl border border-border/60 bg-background/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-foreground/56">
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
                  <div className="flex items-center justify-between gap-3 text-xs text-foreground/52">
                    <span>
                      Пройдено {progressModel.totalCompleted} из{" "}
                      {TOTAL_REPEATS_AND_STAGE_MASTERY_MAX}
                    </span>
                    <span>{progressModel.progressPercent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/8">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500 ease-out bg-primary/80",
                      )}
                      style={{ width: `${progressModel.progressPercent}%` }}
                    />
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-3xl border border-border/60 bg-background/55">
                <MetricRow
                  icon={Brain}
                  value={progressModel.remainingLearnings}
                  label="Изучений осталось"
                  iconClassName="text-emerald-700 dark:text-emerald-300"
                />
                <div className="h-px bg-border/60" />
                <MetricRow
                  icon={Repeat}
                  value={progressModel.remainingRepeats}
                  label="Повторов осталось"
                  iconClassName="text-violet-700 dark:text-violet-300"
                />
              </section>
            </div>
          ) : (
            <div className="mt-5 rounded-[28px] border border-border/60 bg-background/70 p-5 text-sm text-foreground/68">
              Выберите стих, чтобы увидеть, сколько шагов осталось до
              выученного.
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
