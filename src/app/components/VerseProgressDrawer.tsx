"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  Bookmark,
  Brain,
  Check,
  Clock3,
  Pause,
  Repeat,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { Verse } from "@/app/App";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import {
  getStoppedVerseStageKind,
} from "@/app/components/verse-list/constants";
import { VerseStatus } from "@/shared/domain/verseStatus";
import {
  REPEAT_THRESHOLD_FOR_MASTERED,
  REVIEW_LAPSE_STREAK_THRESHOLD,
  TOTAL_REPEATS_AND_STAGE_MASTERY_MAX,
  TRAINING_STAGE_MASTERY_MAX,
} from "@/shared/training/constants";
import {
  TRAINING_MODE_PROGRESS_ORDER,
  REVIEW_TRAINING_MODE_ROTATION,
} from "@/shared/training/modeEngine";
import { MODE_PIPELINE } from "@/app/components/VerseGallery/constants";
import { VERSE_JOURNEY_PHASE_TITLES } from "@/app/onboarding/verseJourneyModel";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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
type PhaseState = "complete" | "current" | "upcoming";
type PhaseTone = {
  cardClassName: string;
  iconWrapClassName: string;
  iconClassName: string;
  badgeClassName: string;
  progressClassName: string;
  railDoneClassName: string;
  railCurrentClassName: string;
  railUpcomingClassName: string;
};

const PHASE_TONES: Record<PhaseKey, PhaseTone> = {
  collection: {
    cardClassName: "border-sky-500/18 bg-sky-500/[0.08]",
    iconWrapClassName: "border-sky-500/25 bg-sky-500/12",
    iconClassName: "text-sky-700 dark:text-sky-300",
    badgeClassName: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    progressClassName: "from-sky-500 to-sky-400/80",
    railDoneClassName: "border-sky-500/35 bg-sky-500/18 text-sky-800 dark:text-sky-200",
    railCurrentClassName: "border-sky-500/45 bg-sky-500/24 text-sky-900 ring-2 ring-sky-500/20 dark:text-sky-100",
    railUpcomingClassName: "border-border/60 bg-background/70 text-muted-foreground/55",
  },
  learning: {
    cardClassName: "border-emerald-500/18 bg-emerald-500/[0.08]",
    iconWrapClassName: "border-emerald-500/25 bg-emerald-500/12",
    iconClassName: "text-emerald-700 dark:text-emerald-300",
    badgeClassName:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    progressClassName: "from-emerald-500 to-emerald-400/85",
    railDoneClassName:
      "border-emerald-500/35 bg-emerald-500/18 text-emerald-800 dark:text-emerald-200",
    railCurrentClassName:
      "border-emerald-500/45 bg-emerald-500/24 text-emerald-900 ring-2 ring-emerald-500/20 dark:text-emerald-100",
    railUpcomingClassName: "border-border/60 bg-background/70 text-muted-foreground/55",
  },
  review: {
    cardClassName: "border-violet-500/18 bg-violet-500/[0.08]",
    iconWrapClassName: "border-violet-500/25 bg-violet-500/12",
    iconClassName: "text-violet-700 dark:text-violet-300",
    badgeClassName:
      "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    progressClassName: "from-violet-500 to-violet-400/85",
    railDoneClassName:
      "border-violet-500/35 bg-violet-500/18 text-violet-800 dark:text-violet-200",
    railCurrentClassName:
      "border-violet-500/45 bg-violet-500/24 text-violet-900 ring-2 ring-violet-500/20 dark:text-violet-100",
    railUpcomingClassName: "border-border/60 bg-background/70 text-muted-foreground/55",
  },
  mastered: {
    cardClassName: "border-amber-500/20 bg-amber-500/[0.09]",
    iconWrapClassName: "border-amber-500/28 bg-amber-500/14",
    iconClassName: "text-amber-800 dark:text-amber-300",
    badgeClassName:
      "border-amber-500/28 bg-amber-500/12 text-amber-800 dark:text-amber-300",
    progressClassName: "from-amber-500 to-yellow-400/85",
    railDoneClassName:
      "border-amber-500/38 bg-amber-500/18 text-amber-900 dark:text-amber-100",
    railCurrentClassName:
      "border-amber-500/46 bg-amber-500/24 text-amber-950 ring-2 ring-amber-500/20 dark:text-amber-100",
    railUpcomingClassName: "border-border/60 bg-background/70 text-muted-foreground/55",
  },
};

const PAUSE_SUMMARY_TONE: PhaseTone = {
  cardClassName: "border-rose-500/18 bg-rose-500/[0.08]",
  iconWrapClassName: "border-rose-500/25 bg-rose-500/12",
  iconClassName: "text-rose-700 dark:text-rose-300",
  badgeClassName: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  progressClassName: "from-rose-500 to-rose-400/85",
  railDoneClassName: "border-rose-500/35 bg-rose-500/18 text-rose-800 dark:text-rose-200",
  railCurrentClassName:
    "border-rose-500/45 bg-rose-500/24 text-rose-900 ring-2 ring-rose-500/20 dark:text-rose-100",
  railUpcomingClassName: "border-border/60 bg-background/70 text-muted-foreground/55",
};

function normalizeCount(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value: Date | null): string | null {
  if (!value) return null;
  return value.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  if (status === "MASTERED") return "mastered";
  if (status === "REVIEW") return "review";
  return "learning";
}

function getPhaseState(currentPhase: PhaseKey, phase: PhaseKey): PhaseState {
  const phaseOrder: PhaseKey[] = ["collection", "learning", "review", "mastered"];
  const phaseIndex = phaseOrder.indexOf(phase);
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
  if (phaseIndex < currentPhaseIndex) return "complete";
  if (phaseIndex === currentPhaseIndex) return "current";
  return "upcoming";
}

function getPhaseBadgeLabel(state: PhaseState): string {
  if (state === "complete") return "Пройден";
  if (state === "current") return "Сейчас";
  return "Впереди";
}

function getCurrentStepText(params: {
  verse: Verse;
  currentPhase: PhaseKey;
  masteryLevel: number;
  learningStage: number;
  reviewCompleted: number;
  reviewTarget: number;
  nextReviewAt: Date | null;
  reviewLapseStreak: number;
}): string {
  const {
    verse,
    currentPhase,
    masteryLevel,
    learningStage,
    reviewCompleted,
    reviewTarget,
    nextReviewAt,
    reviewLapseStreak,
  } = params;
  const status = normalizeDisplayVerseStatus(verse.status);
  if (status === "CATALOG") {
    return "Стих еще не добавлен. Сначала добавьте его в свои стихи.";
  }
  if (status === VerseStatus.MY) {
    return "Стих уже в коллекции и ждет первого упражнения.";
  }
  if (status === VerseStatus.STOPPED) {
    if (currentPhase === "mastered") {
      return "Путь завершен, но стих поставлен на паузу.";
    }
    if (currentPhase === "review") {
      return `Пауза на этапе повторения: засчитано ${reviewCompleted} из ${REPEAT_THRESHOLD_FOR_MASTERED}.`;
    }
    if (masteryLevel <= 0) {
      return "Пауза перед первой ступенью освоения. После возобновления стих вернется к старту изучения.";
    }
    return `Пауза на этапе освоения: текущая ступень ${learningStage} из ${TRAINING_STAGE_MASTERY_MAX}.`;
  }
  if (currentPhase === "learning" && masteryLevel <= 0) {
    return "Стих готов к первой ступени освоения. После первого успешного прохода начнется движение по этапам.";
  }
  if (currentPhase === "learning") {
    return `Сейчас стих на ступени ${learningStage} из ${TRAINING_STAGE_MASTERY_MAX}. После 7-й ступени он перейдет в повторение.`;
  }
  if (currentPhase === "review") {
    const retryHint =
      nextReviewAt !== null
        ? ` Следующее окно: ${formatDateTime(nextReviewAt)}.`
        : "";
    const lapseHint =
      reviewLapseStreak > 0
        ? ` Серия срывов: ${reviewLapseStreak} из ${REVIEW_LAPSE_STREAK_THRESHOLD}.`
        : "";
    return `Сейчас идет повтор ${reviewTarget} из ${REPEAT_THRESHOLD_FOR_MASTERED}. Уже засчитано ${reviewCompleted}.${retryHint}${lapseHint}`;
  }
  return "Все этапы пройдены. Теперь стих живет в поддерживающем цикле повторений.";
}

function buildPhaseDescription(params: {
  phase: PhaseKey;
  state: PhaseState;
  verse: Verse;
  learningStage: number;
  reviewCompleted: number;
  reviewTarget: number;
  nextReviewAt: Date | null;
  reviewLapseStreak: number;
}): string {
  const {
    phase,
    state,
    verse,
    learningStage,
    reviewCompleted,
    reviewTarget,
    nextReviewAt,
    reviewLapseStreak,
  } = params;

  if (phase === "collection") {
    if (state === "current") {
      return normalizeDisplayVerseStatus(verse.status) === "CATALOG"
        ? "Стартовая точка. Стих нужно добавить в коллекцию, чтобы запустить маршрут запоминания."
        : "Стих уже находится в вашей коллекции и готов перейти к первым тренировкам.";
    }
    return "Стих уже закреплен в вашей личной коллекции.";
  }

  if (phase === "learning") {
    if (state === "complete") {
      return "Этап освоения пройден: все 7 ступеней позади.";
    }
    if (state === "current") {
      return `Сейчас активна ступень ${learningStage} из ${TRAINING_STAGE_MASTERY_MAX}. Каждый успешный проход двигает стих ближе к повторению.`;
    }
    return "После добавления в изучение стих проходит 7 последовательных ступеней освоения.";
  }

  if (phase === "review") {
    if (state === "complete") {
      return "Этап повторения завершен: все 7 повторов уже засчитаны.";
    }
    if (state === "current") {
      const nextWindow =
        nextReviewAt !== null ? ` Следующее окно: ${formatDateTime(nextReviewAt)}.` : "";
      const lapseInfo =
        reviewLapseStreak > 0
          ? ` Сейчас серия срывов ${reviewLapseStreak}/${REVIEW_LAPSE_STREAK_THRESHOLD}.`
          : "";
      return `Сейчас стих идет к повтору ${reviewTarget} из ${REPEAT_THRESHOLD_FOR_MASTERED}. Засчитано ${reviewCompleted} повторов.${nextWindow}${lapseInfo}`;
    }
    return "После завершения освоения стих проходит 7 повторов с растущими интервалами.";
  }

  if (state === "current") {
    return "Финальная точка маршрута. Дальше остаются только поддерживающие повторы.";
  }

  return "После 7 успешных повторов стих переходит в статус выученного.";
}

function buildSummaryIcon(params: {
  phase: PhaseKey;
  status: ReturnType<typeof normalizeDisplayVerseStatus>;
}): LucideIcon {
  const { phase, status } = params;
  if (status === VerseStatus.STOPPED) return Pause;
  if (phase === "collection") return Bookmark;
  if (phase === "learning") return Brain;
  if (phase === "review") return Repeat;
  return Trophy;
}

function getSummaryLabel(params: {
  phase: PhaseKey;
  status: ReturnType<typeof normalizeDisplayVerseStatus>;
}): string {
  const { phase, status } = params;

  if (status === "CATALOG") return "Каталог";
  if (status === VerseStatus.MY) return "Мой список";
  if (phase === "learning") return "Изучение";
  if (phase === "review") return "Повторение";
  if (phase === "mastered") return "Выучен";
  return "В коллекции";
}

function ModeStepRail({
  modeIds,
  completed,
  current,
  tone,
  stepLabelPrefix,
}: {
  modeIds: readonly import("@/shared/training/modeEngine").TrainingModeId[];
  completed: number;
  current: number | null;
  tone: PhaseTone;
  stepLabelPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {modeIds.map((modeId, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber <= completed;
        const isCurrent = current === stepNumber;
        const meta = MODE_PIPELINE[modeId];
        const ModeIcon = meta?.icon;

        return (
          <div
            key={`${stepLabelPrefix}-${stepNumber}`}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 transition-colors",
              isCurrent ? "py-2.5" : "py-1.5",
              isCompleted
                ? tone.railDoneClassName
                : isCurrent
                  ? tone.railCurrentClassName
                  : tone.railUpcomingClassName
            )}
            aria-label={`${stepLabelPrefix} ${stepNumber}: ${meta?.label ?? ""}`}
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : ModeIcon ? (
                <ModeIcon className="h-4 w-4" />
              ) : (
                <span className="text-xs font-semibold tabular-nums">{stepNumber}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className={cn("text-xs font-medium leading-tight", isCurrent && "font-semibold")}>
                {meta?.label ?? `${stepLabelPrefix} ${stepNumber}`}
              </span>
              {isCurrent && meta?.description && (
                <p className="mt-0.5 text-[11px] leading-snug opacity-75">
                  {meta.description}
                </p>
              )}
            </div>
            {isCurrent && (
              <span className="shrink-0 text-[10px] font-medium opacity-60">Сейчас</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimelinePhaseCard({
  icon: Icon,
  title,
  description,
  badge,
  tone,
  state,
  children,
  dataTour,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge: string;
  tone: PhaseTone;
  state: PhaseState;
  children?: React.ReactNode;
  dataTour?: string;
}) {
  return (
    <div
      data-tour={dataTour}
      className={cn(
        "rounded-3xl border p-4 shadow-sm backdrop-blur-sm",
        tone.cardClassName,
        state === "upcoming" ? "opacity-70" : ""
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
            tone.iconWrapClassName
          )}
        >
          <Icon className={cn("h-5 w-5", tone.iconClassName)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-foreground/92">{title}</div>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                tone.badgeClassName
              )}
            >
              {badge}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground/68">
            {description}
          </p>
        </div>
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function VerseProgressDrawer({
  verse,
  open,
  onOpenChange,
}: VerseProgressDrawerProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  const progressModel = useMemo(() => {
    if (!verse) return null;

    const status = normalizeDisplayVerseStatus(verse.status);
    const currentPhase = resolveCurrentPhase(verse);
    const masteryLevel = normalizeCount(verse.masteryLevel);
    const repetitions = normalizeCount(verse.repetitions);
    const reviewLapseStreak = normalizeCount(verse.reviewLapseStreak);
    const nextReviewAt = parseOptionalDate(verse.nextReviewAt ?? verse.nextReview ?? null);

    const learningStage =
      currentPhase === "learning"
        ? Math.min(Math.max(masteryLevel, 1), TRAINING_STAGE_MASTERY_MAX)
        : Math.min(Math.max(masteryLevel, 0), TRAINING_STAGE_MASTERY_MAX);
    const learningCompleted =
      currentPhase === "review" || currentPhase === "mastered"
        ? TRAINING_STAGE_MASTERY_MAX
        : currentPhase === "learning"
          ? Math.min(Math.max(learningStage - 1, 0), TRAINING_STAGE_MASTERY_MAX)
          : 0;
    const learningCurrent =
      currentPhase === "learning" ? Math.min(Math.max(learningStage, 1), TRAINING_STAGE_MASTERY_MAX) : null;

    const reviewCompleted =
      currentPhase === "mastered"
        ? REPEAT_THRESHOLD_FOR_MASTERED
        : currentPhase === "review"
          ? Math.min(Math.max(repetitions, 0), REPEAT_THRESHOLD_FOR_MASTERED)
          : 0;
    const reviewCurrent =
      currentPhase === "review"
        ? Math.min(reviewCompleted + 1, REPEAT_THRESHOLD_FOR_MASTERED)
        : null;

    const totalProgress = Math.min(
      masteryLevel + repetitions,
      TOTAL_REPEATS_AND_STAGE_MASTERY_MAX
    );
    const progressPercent = Math.round(
      (totalProgress / TOTAL_REPEATS_AND_STAGE_MASTERY_MAX) * 100
    );
    const currentTone =
      status === VerseStatus.STOPPED
        ? PAUSE_SUMMARY_TONE
        : PHASE_TONES[currentPhase];
    const SummaryIcon = buildSummaryIcon({ phase: currentPhase, status });
    const summaryLabel = getSummaryLabel({ phase: currentPhase, status });

    return {
      status,
      currentPhase,
      masteryLevel,
      repetitions,
      reviewLapseStreak,
      nextReviewAt,
      learningCompleted,
      learningCurrent,
      learningStage,
      reviewCompleted,
      reviewCurrent,
      reviewTarget: reviewCurrent ?? REPEAT_THRESHOLD_FOR_MASTERED,
      totalProgress,
      progressPercent,
      currentTone,
      SummaryIcon,
      summaryLabel,
      currentStepText: getCurrentStepText({
        verse,
        currentPhase,
        masteryLevel,
        learningStage,
        reviewCompleted,
        reviewTarget: reviewCurrent ?? REPEAT_THRESHOLD_FOR_MASTERED,
        nextReviewAt,
        reviewLapseStreak,
      }),
    };
  }, [verse]);

  const phases = useMemo(() => {
    if (!progressModel || !verse) return [];

    const currentPhase = progressModel.currentPhase;

    return [
      {
        key: "learning" as const,
        title: VERSE_JOURNEY_PHASE_TITLES.learning,
        icon: Brain,
        tone: PHASE_TONES.learning,
        state: getPhaseState(currentPhase, "learning"),
        description: buildPhaseDescription({
          phase: "learning",
          state: getPhaseState(currentPhase, "learning"),
          verse,
          learningStage: progressModel.learningStage,
          reviewCompleted: progressModel.reviewCompleted,
          reviewTarget: progressModel.reviewTarget,
          nextReviewAt: progressModel.nextReviewAt,
          reviewLapseStreak: progressModel.reviewLapseStreak,
        }),
        content: (
          <ModeStepRail
            modeIds={TRAINING_MODE_PROGRESS_ORDER}
            completed={progressModel.learningCompleted}
            current={progressModel.learningCurrent}
            tone={PHASE_TONES.learning}
            stepLabelPrefix="Ступень"
          />
        ),
      },
      {
        key: "review" as const,
        title: VERSE_JOURNEY_PHASE_TITLES.review,
        icon:
          progressModel.currentPhase === "review" && progressModel.nextReviewAt
            ? Clock3
            : Repeat,
        tone: PHASE_TONES.review,
        state: getPhaseState(currentPhase, "review"),
        description: buildPhaseDescription({
          phase: "review",
          state: getPhaseState(currentPhase, "review"),
          verse,
          learningStage: progressModel.learningStage,
          reviewCompleted: progressModel.reviewCompleted,
          reviewTarget: progressModel.reviewTarget,
          nextReviewAt: progressModel.nextReviewAt,
          reviewLapseStreak: progressModel.reviewLapseStreak,
        }),
        content: (
          <div className="space-y-3">
            <ModeStepRail
              modeIds={REVIEW_TRAINING_MODE_ROTATION}
              completed={progressModel.reviewCompleted}
              current={progressModel.reviewCurrent}
              tone={PHASE_TONES.review}
              stepLabelPrefix="Повтор"
            />
            {progressModel.reviewLapseStreak > 0 ? (
              <div className="rounded-2xl border border-violet-500/18 bg-violet-500/[0.08] px-3 py-2 text-xs text-violet-800 dark:text-violet-200">
                Серия срывов: {progressModel.reviewLapseStreak} из{" "}
                {REVIEW_LAPSE_STREAK_THRESHOLD}. При достижении порога стих откатится по повторам.
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "mastered" as const,
        title: VERSE_JOURNEY_PHASE_TITLES.mastered,
        icon: Trophy,
        tone: PHASE_TONES.mastered,
        state: getPhaseState(currentPhase, "mastered"),
        description: buildPhaseDescription({
          phase: "mastered",
          state: getPhaseState(currentPhase, "mastered"),
          verse,
          learningStage: progressModel.learningStage,
          reviewCompleted: progressModel.reviewCompleted,
          reviewTarget: progressModel.reviewTarget,
          nextReviewAt: progressModel.nextReviewAt,
          reviewLapseStreak: progressModel.reviewLapseStreak,
        }),
        content: null as React.ReactNode,
      },
    ];
  }, [progressModel, verse]);

  useEffect(() => {
    if (!open || !verse || !(contentRef.current instanceof HTMLDivElement)) {
      return;
    }

    const content = contentRef.current;
    const resetScroll = () => {
      content.scrollTo({
        top: 0,
        behavior: "auto",
      });
    };

    resetScroll();
    const frameId = window.requestAnimationFrame(resetScroll);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [open, verse?.externalVerseId]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent
        data-tour="verse-progress-drawer"
        className="rounded-t-[32px] border-border/70 bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl backdrop-blur-xl sm:px-6"
      >
        <DrawerHeader className="px-0 pb-0 pt-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                progressModel?.currentTone.iconWrapClassName ?? "border-border/60 bg-background/60"
              )}
            >
              {progressModel ? (
                <progressModel.SummaryIcon
                  className={cn("h-5 w-5", progressModel.currentTone.iconClassName)}
                />
              ) : (
                <Bookmark className="h-5 w-5 text-foreground/60" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DrawerTitle className="truncate text-xl tracking-tight text-foreground">
                Путь стиха
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-sm text-foreground/56">
                {verse?.reference ?? "Стих"} · от добавления до выученного
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        {progressModel ? (
          <div
            ref={contentRef}
            data-tour="verse-progress-content"
            className="mt-5 max-h-[72vh] overflow-y-auto overscroll-contain scroll-smooth pr-1 pb-4 sm:pr-2"
          >
            <section
              data-tour="verse-progress-summary"
              className={cn(
                "overflow-hidden rounded-[28px] border p-4 shadow-sm",
                progressModel.currentTone.cardClassName
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    progressModel.currentTone.badgeClassName
                  )}
                >
                  {progressModel.summaryLabel}
                </span>
                {progressModel.status === VerseStatus.STOPPED ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300">
                    <Pause className="h-3.5 w-3.5" />
                    На паузе
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-relaxed text-foreground/74">
                {progressModel.currentStepText}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs text-foreground/58">
                    <span>Общий прогресс маршрута</span>
                    <span>
                      {progressModel.totalProgress} из {TOTAL_REPEATS_AND_STAGE_MASTERY_MAX}
                    </span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-background/70">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
                        progressModel.currentTone.progressClassName
                      )}
                      style={{ width: `${progressModel.progressPercent}%` }}
                    />
                  </div>
                </div>
                <div
                  className={cn(
                    "text-3xl font-bold tabular-nums tracking-tight",
                    progressModel.currentTone.iconClassName
                  )}
                >
                  {progressModel.progressPercent}%
                </div>
              </div>

              {progressModel.nextReviewAt ? (
                <div className="mt-4 rounded-2xl border border-border/60 bg-background/65 px-3 py-2 text-xs text-foreground/68">
                  {progressModel.currentPhase === "mastered"
                    ? "Поддерживающий повтор"
                    : "Следующее окно"}{" "}
                  · {formatDateTime(progressModel.nextReviewAt)}
                </div>
              ) : null}
            </section>

            <div className="relative mt-5 pb-2">
              <div className="absolute bottom-4 left-[23px] top-4 w-px bg-border/70" />
              <div className="space-y-4">
                {phases.map((phase, index) => {
                  const isCurrent = phase.state === "current";

                  return (
                    <div key={phase.key} className="relative pl-12">
                      <div
                        className={cn(
                          "absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-2xl border bg-background shadow-sm backdrop-blur-2xl",
                          phase.state === "complete"
                            ? phase.tone.iconWrapClassName
                            : isCurrent
                              ? phase.tone.iconWrapClassName
                              : "border-border/60 bg-background/75"
                        )}
                      >
                        <span className="text-sm font-semibold tabular-nums">{index + 1}</span>
                      </div>
                      <TimelinePhaseCard
                        icon={phase.icon}
                        title={phase.title}
                        description={phase.description}
                        badge={getPhaseBadgeLabel(phase.state)}
                        tone={phase.tone}
                        state={phase.state}
                        dataTour={`verse-progress-phase-${phase.key}`}
                      >
                        {phase.content}
                      </TimelinePhaseCard>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-border/60 bg-background/70 p-4 text-sm text-foreground/68">
            Выберите стих, чтобы увидеть его путь запоминания.
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
