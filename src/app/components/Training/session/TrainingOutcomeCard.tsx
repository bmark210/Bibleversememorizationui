"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, Repeat2, Trophy } from "lucide-react";
import { VerseCard } from "@/app/components/VerseCard";
import { cn } from "@/app/components/ui/utils";
import type { TrainingVerseState } from "@/app/components/VerseGallery/types";
import type { TrainingPendingOutcome } from "./trainingPendingOutcome";
import { formatTrainingOutcomeAvailability } from "./trainingPendingOutcome";

type TrainingOutcomeCardProps = {
  trainingVerse: TrainingVerseState;
  outcome: TrainingPendingOutcome;
};

function getOutcomeCopy(
  outcome: TrainingPendingOutcome
): {
  badgeLabel: string;
  title: string;
  description: string;
  availabilityLabel: string | null;
  accentClasses: {
    iconWrap: string;
    icon: string;
    title: string;
    badge: string;
    badgeText: string;
    box: string;
    boxLabel: string;
    boxValue: string;
  };
} {
  if (outcome.kind === "mastered") {
    return {
      badgeLabel: "Выучено",
      title: "Стих выучен",
      description:
        "Этот стих завершил текущий цикл основной тренировки. После перехода дальше он больше не будет показан в этой сессии.",
      availabilityLabel: null,
      accentClasses: {
        iconWrap: "border-status-mastered/28 bg-status-mastered-soft",
        icon: "text-status-mastered",
        title: "text-status-mastered/90",
        badge: "border-status-mastered/28 bg-status-mastered-soft",
        badgeText: "text-status-mastered/90",
        box: "border-status-mastered/24 bg-status-mastered-soft",
        boxLabel: "text-status-mastered/75",
        boxValue: "text-status-mastered",
      },
    };
  }

  if (outcome.previousStatus !== "REVIEW") {
    return {
      badgeLabel: "Повторение",
      title: "Стих перешел в повторение",
      description:
        "Этап изучения завершен. Теперь этот стих временно ждет следующего окна повторения и не будет мешать текущей очереди.",
      availabilityLabel: "Следующее повторение",
      accentClasses: {
        iconWrap: "border-status-review/28 bg-status-review-soft",
        icon: "text-status-review",
        title: "text-status-review/90",
        badge: "border-status-review/24 bg-status-review-soft",
        badgeText: "text-status-review/90",
        box: "border-status-review/22 bg-status-review-soft",
        boxLabel: "text-status-review/75",
        boxValue: "text-status-review",
      },
    };
  }

  if (outcome.reviewWasSuccessful) {
    return {
      badgeLabel: "Повторение",
      title: "Повторение засчитано",
      description:
        "Стих успешно прошел текущую попытку и теперь ожидает следующего окна повторения. После продолжения он исчезнет из активной очереди.",
      availabilityLabel: "Снова доступен",
      accentClasses: {
        iconWrap: "border-status-review/28 bg-status-review-soft",
        icon: "text-status-review",
        title: "text-status-review/90",
        badge: "border-status-review/24 bg-status-review-soft",
        badgeText: "text-status-review/90",
        box: "border-status-review/22 bg-status-review-soft",
        boxLabel: "text-status-review/75",
        boxValue: "text-status-review",
      },
    };
  }

  return {
    badgeLabel: "Повторение",
    title: "Повтор пока не засчитан",
    description:
      "Прогресс стихa не потерян, но перед новой попыткой нужен небольшой интервал ожидания. После продолжения карточка временно уйдет из текущей очереди.",
    availabilityLabel: "Следующая попытка",
    accentClasses: {
      iconWrap: "border-status-review/28 bg-status-review-soft",
      icon: "text-status-review",
      title: "text-status-review/90",
      badge: "border-status-review/24 bg-status-review-soft",
      badgeText: "text-status-review/90",
      box: "border-status-review/22 bg-status-review-soft",
      boxLabel: "text-status-review/75",
      boxValue: "text-status-review",
    },
  };
}

export const TrainingOutcomeCard = memo(function TrainingOutcomeCard({
  trainingVerse,
  outcome,
}: TrainingOutcomeCardProps) {
  const verseTextViewportRef = useRef<HTMLDivElement>(null);
  const verseTextRef = useRef<HTMLParagraphElement>(null);
  const [, setLineClamp] = useState(6);
  const isReviewOutcome = outcome.kind === "review-waiting";
  const copy = getOutcomeCopy(outcome);
  const availabilityText = isReviewOutcome
    ? formatTrainingOutcomeAvailability(outcome.nextReviewAt)
    : null;

  const OutcomeIcon =
    outcome.kind === "mastered"
      ? Trophy
      : outcome.previousStatus === "REVIEW" && !outcome.reviewWasSuccessful
        ? Clock3
        : Repeat2;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const viewportEl = verseTextViewportRef.current;
    const textEl = verseTextRef.current;
    if (!viewportEl || !textEl) return;

    let rafId: number | null = null;

    const updateLineClamp = () => {
      const currentViewportEl = verseTextViewportRef.current;
      const currentTextEl = verseTextRef.current;
      if (!currentViewportEl || !currentTextEl) return;

      const viewportStyle = window.getComputedStyle(currentViewportEl);
      const textStyle = window.getComputedStyle(currentTextEl);
      const paddingTop =
        Number.parseFloat(viewportStyle.paddingTop || "0") || 0;
      const paddingBottom =
        Number.parseFloat(viewportStyle.paddingBottom || "0") || 0;
      const availableHeight = Math.max(
        0,
        currentViewportEl.clientHeight - paddingTop - paddingBottom
      );

      let lineHeight = Number.parseFloat(textStyle.lineHeight || "");
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        const fontSize = Number.parseFloat(textStyle.fontSize || "0") || 16;
        lineHeight = fontSize * 1.55;
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

    resizeObserver?.observe(viewportEl);
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
  }, [availabilityText, copy.description, trainingVerse.raw.text]);

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <VerseCard
        isActive
        minHeight="training"
        previewTone={isReviewOutcome ? "review" : "mastered"}
        header={
          <div className="w-full min-w-0 flex-shrink-0 text-center space-y-3">
            <h2 className="[font-family:var(--font-heading)] text-2xl sm:text-3xl italic text-brand-primary break-words [overflow-wrap:anywhere]">
              {trainingVerse.raw.reference}
            </h2>
            <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-brand-primary to-transparent" />
            <div className="mx-auto flex flex-wrap items-center justify-center gap-2">
              <div
                className={cn(
                  "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 shadow-[var(--shadow-soft)] backdrop-blur-sm",
                  copy.accentClasses.badge
                )}
              >
                {outcome.kind === "mastered" ? (
                  <CheckCircle2 className="size-4 text-status-mastered" />
                ) : (
                  <Clock3 className="size-4 text-status-review" />
                )}
                <span
                  className={cn(
                    "min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.14em]",
                    copy.accentClasses.badgeText
                  )}
                >
                  {copy.badgeLabel}
                </span>
              </div>
            </div>
          </div>
        }
        body={
          <div className="mx-auto flex h-full w-full max-w-xl min-h-0 flex-col overflow-hidden py-1 text-center">
            <div className="flex-shrink-0 space-y-4">
              <div
                className={cn(
                  "mx-auto flex size-14 items-center justify-center rounded-[1.5rem] border shadow-[var(--shadow-soft)]",
                  copy.accentClasses.iconWrap
                )}
              >
                <OutcomeIcon className={cn("size-7", copy.accentClasses.icon)} />
              </div>

              <div className="space-y-2">
                <h3
                  className={cn(
                    "text-lg font-semibold tracking-tight sm:text-xl",
                    copy.accentClasses.title
                  )}
                >
                  {copy.title}
                </h3>
                <p
                  style={{ WebkitLineClamp: 4 }}
                  className="mx-auto max-w-lg overflow-hidden text-ellipsis text-sm leading-relaxed text-text-secondary [display:-webkit-box] [-webkit-box-orient:vertical]"
                >
                  {copy.description}
                </p>
              </div>

              {availabilityText && copy.availabilityLabel ? (
                <div
                  className={cn(
                    "w-full rounded-[1.6rem] border px-4 py-3 shadow-[var(--shadow-soft)]",
                    copy.accentClasses.box
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-[0.16em]",
                      copy.accentClasses.boxLabel
                    )}
                  >
                    {copy.availabilityLabel}
                  </p>
                  <p
                    className={cn(
                      "mt-1.5 text-base font-semibold tracking-tight sm:text-lg",
                      copy.accentClasses.boxValue
                    )}
                  >
                    {availabilityText}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        }
      />
    </div>
  );
});

