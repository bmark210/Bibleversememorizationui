import { useLayoutEffect, useRef, useState } from "react";
import {
  Anchor,
  Brain,
  Clock3,
  Lock,
  Pause,
  Play,
  Plus,
  Repeat,
  Trophy,
  Users,
} from "lucide-react";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { VerseCard } from "@/app/components/VerseCard";
import {
  TRAINING_STAGE_MASTERY_MAX,
  TOTAL_REPEATS_AND_STAGE_MASTERY_MAX,
  REPEAT_THRESHOLD_FOR_MASTERED,
} from "@/shared/training/constants";
import type { Verse } from "@/app/App";
import { normalizeVerseStatus, parseDate, computeTotalProgressPercent } from "../utils";
import type { VerseCardPreviewTone } from "@/app/components/VerseCard";

type Props = {
  verse: Verse;
  isActionPending: boolean;
  activeTagSlugs?: Iterable<string> | null;
  isAnchorEligible?: boolean;
  onStartTraining: () => void;
  onStatusAction: () => void;
};

export function VersePreviewCard({
  verse,
  isActionPending,
  activeTagSlugs = null,
  isAnchorEligible = false,
  onStartTraining,
  onStatusAction,
}: Props) {
  const previewBodyRef = useRef<HTMLDivElement>(null);
  const previewTextRef = useRef<HTMLParagraphElement>(null);
  const [lineClamp, setLineClamp] = useState(8);
  const status = normalizeVerseStatus(verse.status);
  const rawMasteryLevel = Number(verse.masteryLevel ?? 0);
  const repetitionsCount = Math.max(0, Number(verse.repetitions ?? 0));
  const totalProgressPercent = computeTotalProgressPercent(rawMasteryLevel, repetitionsCount);
  const nextReviewAt = parseDate(
    (verse as Record<string, unknown>).nextReviewAt ??
      (verse as Record<string, unknown>).nextReview
  );
  const isNotYetDue =
    status === "REVIEW" && nextReviewAt !== null && Date.now() < nextReviewAt.getTime();
  const notYetDueLabel =
    isNotYetDue && nextReviewAt
      ? `Доступно ${nextReviewAt.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`
      : null;
  const isReviewStage = status === "REVIEW" || status === "MASTERED";

  const tone: VerseCardPreviewTone | undefined =
    status === "CATALOG"
      ? "catalog"
      : status === VerseStatus.MY
        ? "my"
        : status === VerseStatus.STOPPED
          ? "stopped"
          : status === "MASTERED"
            ? "mastered"
            : isReviewStage
              ? "review"
              : "learning";
  const popularityValue =
    typeof verse.popularityValue === "number"
      ? Math.max(0, Math.round(verse.popularityValue))
      : null;
  const popularityBadge = (() => {
    if (popularityValue == null) return null;
    if (verse.popularityScope === "friends") {
      return {
        icon: Users,
        label: `У друзей ${popularityValue}`,
        className:
          "border-cyan-500/35 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
      };
    }
    if (verse.popularityScope === "players") {
      return {
        icon: Users,
        label: `У игроков ${popularityValue}`,
        className:
          "border-slate-500/35 bg-slate-500/12 text-slate-700 dark:text-slate-300",
      };
    }
    return null;
  })();

  const primaryAction = buildPrimaryAction({
    status,
    isNotYetDue,
    notYetDueLabel,
    isReviewStage,
    isAnchorEligible,
    onStartTraining,
    onStatusAction,
  });

  const statusTone = buildStatusTone({
    status,
    isNotYetDue,
    notYetDueLabel,
    repetitionsCount,
    rawMasteryLevel,
  });

  const showFooter =
    status !== "CATALOG" && status !== VerseStatus.MY;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const bodyEl = previewBodyRef.current;
    const textEl = previewTextRef.current;
    if (!bodyEl || !textEl) return;

    let rafId: number | null = null;

    const updateLineClamp = () => {
      const currentBodyEl = previewBodyRef.current;
      const currentTextEl = previewTextRef.current;
      if (!currentBodyEl || !currentTextEl) return;

      const bodyStyle = window.getComputedStyle(currentBodyEl);
      const textStyle = window.getComputedStyle(currentTextEl);
      const paddingTop = Number.parseFloat(bodyStyle.paddingTop || "0") || 0;
      const paddingBottom =
        Number.parseFloat(bodyStyle.paddingBottom || "0") || 0;
      const availableHeight = Math.max(
        0,
        currentBodyEl.clientHeight - paddingTop - paddingBottom,
      );

      let lineHeight = Number.parseFloat(textStyle.lineHeight || "");
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        const fontSize = Number.parseFloat(textStyle.fontSize || "0") || 16;
        lineHeight = fontSize * 1.625;
      }

      const nextClamp = Math.max(2, Math.floor(availableHeight / lineHeight));
      setLineClamp((prev) => (prev === nextClamp ? prev : nextClamp));
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateLineClamp();
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleUpdate())
        : null;

    resizeObserver?.observe(bodyEl);
    resizeObserver?.observe(textEl);
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [verse.text, showFooter]);

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <VerseCard
        isActive
        minHeight="training"
        previewTone={tone}
        metaBadge={
          popularityBadge && popularityValue && popularityValue > 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                popularityBadge.className
              )}
            >
              <popularityBadge.icon className="h-3.5 w-3.5" />
              {popularityBadge.label}
            </span>
          ) : null
        }
        tags={verse.tags ?? []}
        activeTagSlugs={activeTagSlugs}
        header={
          <div className="w-full min-w-0 flex-shrink-0 text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-serif text-primary/90 italic break-words [overflow-wrap:anywhere]">
              {verse.reference}
            </h2>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto" />
          </div>
        }
        body={
          <div
            ref={previewBodyRef}
            className="h-full min-w-0 flex items-start justify-center overflow-hidden px-2 pt-2 sm:pt-4"
          >
            <p
              ref={previewTextRef}
              style={{ WebkitLineClamp: lineClamp }}
              className="w-full max-h-full max-w-full text-xl sm:text-2xl leading-relaxed text-foreground/90 italic text-center font-light break-words [overflow-wrap:anywhere] [display:-webkit-box] [-webkit-box-orient:vertical] overflow-hidden text-ellipsis"
            >
              «{verse.text}»
            </p>
          </div>
        }
        centerAction={
          <Button
            variant="secondary"
            className={cn(
              "gap-2 min-w-[200px] max-w-full shadow-lg rounded-2xl backdrop-blur-sm",
              primaryAction?.className
            )}
            onClick={primaryAction?.onClick}
            disabled={isActionPending || Boolean(primaryAction?.disabled)}
            aria-label={primaryAction?.ariaLabel}
          >
            {primaryAction ? <primaryAction.icon className="h-4 w-4" /> : null}
            <span className="min-w-0 truncate">{primaryAction?.label}</span>
          </Button>
        }
        footer={
          showFooter && statusTone ? (
            <StatusFooter
              statusTone={statusTone}
              totalProgressPercent={totalProgressPercent}
            />
          ) : null
        }
      />
    </div>
  );
}

// ─── Status footer (CSS transitions, no motion.div) ──────────────────────────

type StatusTone = {
  icon: typeof Brain;
  title: string;
  subtitle: string;
  wrapperClass: string;
  iconWrapClass: string;
  titleClass: string;
  valueClass: string;
  fillClass: string;
  trackClass: string;
  bgFillClass: string;
};

function StatusFooter({
  statusTone,
  totalProgressPercent,
}: {
  statusTone: StatusTone;
  totalProgressPercent: number;
}) {
  return (
    <div className={cn("relative rounded-2xl border overflow-hidden shadow-sm", statusTone.wrapperClass)}>
      {/* Background fill proportional to progress — CSS transition */}
      <div
        className={cn("absolute inset-y-0 left-0 transition-[width] duration-700 ease-out", statusTone.bgFillClass)}
        style={{ width: `${totalProgressPercent}%` }}
      />
      <div className="relative z-10 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0", statusTone.iconWrapClass)}>
              <statusTone.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 text-left">
              <div className={cn("text-[10px] font-semibold uppercase tracking-[0.18em] leading-tight", statusTone.titleClass)}>
                {statusTone.title}
              </div>
              <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {statusTone.subtitle}
              </div>
            </div>
          </div>
          <div className={cn("text-2xl font-bold tabular-nums flex-shrink-0", statusTone.valueClass)}>
            {totalProgressPercent}%
          </div>
        </div>

        {/* Progress bar — CSS transition instead of motion.div */}
        <div className={cn("relative h-1.5 rounded-full overflow-hidden", statusTone.trackClass)}>
          <div
            className={cn("absolute inset-y-0 left-0 bg-gradient-to-r rounded-full transition-[width] duration-700 ease-out", statusTone.fillClass)}
            style={{ width: `${totalProgressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type PrimaryAction = {
  label: string;
  ariaLabel: string;
  icon: typeof Brain;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
};

function buildPrimaryAction(params: {
  status: ReturnType<typeof normalizeVerseStatus>;
  isNotYetDue: boolean;
  notYetDueLabel: string | null;
  isReviewStage: boolean;
  isAnchorEligible: boolean;
  onStartTraining: () => void;
  onStatusAction: () => void;
}): PrimaryAction | null {
  const { status, isNotYetDue, isReviewStage, isAnchorEligible, onStartTraining, onStatusAction } = params;

  if (status === "CATALOG") {
    return {
      label: "Добавить в мои",
      ariaLabel: "Добавить стих в мои стихи",
      icon: Plus,
      onClick: onStatusAction,
      className:
        "border border-slate-500/25 bg-gradient-to-r from-slate-500/14 to-slate-500/8 text-slate-700 hover:bg-slate-500/18 dark:text-slate-300",
    };
  }
  if (status === VerseStatus.MY) {
    return {
      label: "Добавить в изучение",
      ariaLabel: "Добавить стих в изучение",
      icon: Play,
      onClick: onStatusAction,
      className:
        "border border-sky-500/25 bg-gradient-to-r from-sky-500/18 to-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300",
    };
  }
  if (status === VerseStatus.STOPPED) {
    return {
      label: "Возобновить",
      ariaLabel: "Возобновить изучение стиха",
      icon: Play,
      onClick: onStatusAction,
      className:
        "border border-rose-500/25 bg-gradient-to-r from-rose-500/16 to-rose-500/8 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300",
    };
  }
  if (isNotYetDue) {
    return {
      label: "Повторять",
      ariaLabel: "Повторять этот стих",
      icon: Clock3,
      onClick: () => {},
      disabled: true,
      className:
        "border border-violet-500/25 bg-gradient-to-r from-violet-500/14 to-violet-500/8 text-violet-700 dark:text-violet-300",
    };
  }
  if (status === "MASTERED") {
    if (isAnchorEligible) {
      return {
        label: "Закрепить",
        ariaLabel: "Перейти к закреплению стиха",
        icon: Anchor,
        onClick: onStartTraining,
        className:
          "border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-yellow-400/10 text-amber-800 hover:bg-amber-500/25 dark:text-amber-300",
      };
    }
    return {
      label: "Закрепить",
      ariaLabel: "Недостаточно стихов для закрепления",
      icon: Lock,
      onClick: () => {},
      disabled: true,
      className:
        "border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-yellow-400/10 text-amber-800 dark:text-amber-300 opacity-75 cursor-default",
    };
  }
  if (isReviewStage) {
    return {
      label: "Повторять",
      ariaLabel: "Повторять этот стих",
      icon: Repeat,
      onClick: onStartTraining,
      className:
        "border border-violet-500/25 bg-gradient-to-r from-violet-500/18 to-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-300",
    };
  }
  return {
    label: "Учить",
    ariaLabel: "Учить этот стих",
    icon: Brain,
    onClick: onStartTraining,
    className:
      "border border-emerald-500/25 bg-gradient-to-r from-emerald-500/18 to-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
  };
}

function buildStatusTone(params: {
  status: ReturnType<typeof normalizeVerseStatus>;
  isNotYetDue: boolean;
  notYetDueLabel: string | null;
  repetitionsCount: number;
  rawMasteryLevel: number;
}): StatusTone | null {
  const { status, isNotYetDue, notYetDueLabel, repetitionsCount, rawMasteryLevel } = params;
  const repeatThreshold = REPEAT_THRESHOLD_FOR_MASTERED;

  if (status === VerseStatus.STOPPED) {
    return {
      icon: Pause,
      title: "На паузе",
      subtitle: `${rawMasteryLevel + repetitionsCount} из ${TOTAL_REPEATS_AND_STAGE_MASTERY_MAX} шагов`,
      wrapperClass: "border-rose-500/20",
      iconWrapClass: "border-rose-500/25 bg-rose-500/12 text-rose-700 dark:text-rose-300",
      titleClass: "text-rose-700/80 dark:text-rose-300/80",
      valueClass: "text-rose-700 dark:text-rose-300",
      fillClass: "from-rose-500 to-rose-400/80",
      trackClass: "bg-rose-500/14",
      bgFillClass: "bg-rose-500/[0.13]",
    };
  }
  if (status === "MASTERED") {
    return {
      icon: Trophy,
      title: "Выучен",
      subtitle: "Все этапы пройдены",
      wrapperClass: "border-amber-500/25",
      iconWrapClass: "border-amber-500/30 bg-amber-500/14 text-amber-800 dark:text-amber-300",
      titleClass: "text-amber-800/80 dark:text-amber-300/80",
      valueClass: "text-amber-800 dark:text-amber-300",
      fillClass: "from-amber-500 to-yellow-400/85",
      trackClass: "bg-amber-500/14",
      bgFillClass: "bg-amber-500/[0.13]",
    };
  }
  if (status === "REVIEW") {
    return {
      icon: isNotYetDue ? Clock3 : Repeat,
      title: "Повторение",
      subtitle: isNotYetDue
        ? (notYetDueLabel ?? `Повтор ${repetitionsCount} из ${repeatThreshold}`)
        : `Повтор ${repetitionsCount} из ${repeatThreshold}`,
      wrapperClass: "border-violet-500/20",
      iconWrapClass: "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-300",
      titleClass: "text-violet-700/80 dark:text-violet-300/80",
      valueClass: "text-violet-700 dark:text-violet-300",
      fillClass: "from-violet-500 to-violet-400/80",
      trackClass: "bg-violet-500/14",
      bgFillClass: "bg-violet-500/[0.13]",
    };
  }
  if (status === VerseStatus.LEARNING) {
    return {
      icon: Brain,
      title: "Изучение",
      subtitle: `Ступень ${rawMasteryLevel} из ${TRAINING_STAGE_MASTERY_MAX}`,
      wrapperClass: "border-emerald-500/20",
      iconWrapClass:
        "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
      titleClass: "text-emerald-700/80 dark:text-emerald-300/80",
      valueClass: "text-emerald-700 dark:text-emerald-300",
      fillClass: "from-emerald-500 to-emerald-400/80",
      trackClass: "bg-emerald-500/14",
      bgFillClass: "bg-emerald-500/[0.13]",
    };
  }
  return null;
}
