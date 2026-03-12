"use client";

import { memo } from "react";
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
        iconWrap: "border-amber-500/28 bg-amber-500/14",
        icon: "text-amber-700 dark:text-amber-300",
        title: "text-amber-800/90 dark:text-amber-200",
        badge: "border-amber-500/28 bg-amber-500/12",
        badgeText: "text-amber-800/85 dark:text-amber-300/90",
        box: "border-amber-500/24 bg-amber-500/10",
        boxLabel: "text-amber-800/70 dark:text-amber-300/75",
        boxValue: "text-amber-800 dark:text-amber-200",
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
        iconWrap: "border-violet-500/28 bg-violet-500/14",
        icon: "text-violet-700 dark:text-violet-300",
        title: "text-violet-800/90 dark:text-violet-200",
        badge: "border-violet-500/24 bg-violet-500/12",
        badgeText: "text-violet-800/85 dark:text-violet-300/90",
        box: "border-violet-500/22 bg-violet-500/10",
        boxLabel: "text-violet-800/70 dark:text-violet-300/75",
        boxValue: "text-violet-800 dark:text-violet-200",
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
        iconWrap: "border-violet-500/28 bg-violet-500/14",
        icon: "text-violet-700 dark:text-violet-300",
        title: "text-violet-800/90 dark:text-violet-200",
        badge: "border-violet-500/24 bg-violet-500/12",
        badgeText: "text-violet-800/85 dark:text-violet-300/90",
        box: "border-violet-500/22 bg-violet-500/10",
        boxLabel: "text-violet-800/70 dark:text-violet-300/75",
        boxValue: "text-violet-800 dark:text-violet-200",
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
      iconWrap: "border-violet-500/28 bg-violet-500/14",
      icon: "text-violet-700 dark:text-violet-300",
      title: "text-violet-800/90 dark:text-violet-200",
      badge: "border-violet-500/24 bg-violet-500/12",
      badgeText: "text-violet-800/85 dark:text-violet-300/90",
      box: "border-violet-500/22 bg-violet-500/10",
      boxLabel: "text-violet-800/70 dark:text-violet-300/75",
      boxValue: "text-violet-800 dark:text-violet-200",
    },
  };
}

export const TrainingOutcomeCard = memo(function TrainingOutcomeCard({
  trainingVerse,
  outcome,
}: TrainingOutcomeCardProps) {
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

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <VerseCard
        isActive
        minHeight="training"
        bodyScrollable
        previewTone={isReviewOutcome ? "review" : "mastered"}
        header={
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl italic text-primary/90 font-serif">
              {trainingVerse.raw.reference}
            </h2>
            <div className="mx-auto flex flex-wrap items-center justify-center gap-2">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-sm",
                  copy.accentClasses.badge
                )}
              >
                {outcome.kind === "mastered" ? (
                  <CheckCircle2 className="size-4 text-amber-700 dark:text-amber-300" />
                ) : (
                  <Clock3 className="size-4 text-violet-700 dark:text-violet-300" />
                )}
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.14em]",
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
          <div className="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center gap-5 py-2 text-center">
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-[1.75rem] border shadow-sm",
                copy.accentClasses.iconWrap
              )}
            >
              <OutcomeIcon className={cn("size-8", copy.accentClasses.icon)} />
            </div>

            <div className="space-y-3">
              <h3
                className={cn(
                  "text-xl font-semibold tracking-tight sm:text-2xl",
                  copy.accentClasses.title
                )}
              >
                {copy.title}
              </h3>
              <p className="mx-auto max-w-lg text-sm leading-relaxed text-foreground/70 sm:text-[0.95rem]">
                {copy.description}
              </p>
            </div>

            {availabilityText && copy.availabilityLabel ? (
              <div
                className={cn(
                  "w-full rounded-[1.8rem] border px-4 py-3.5 shadow-sm",
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
                    "mt-2 text-lg font-semibold tracking-tight sm:text-xl",
                    copy.accentClasses.boxValue
                  )}
                >
                  {availabilityText}
                </p>
              </div>
            ) : null}

            <div className="w-full rounded-[2rem] border border-border/60 bg-background/70 p-4 text-left shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/50">
                Текст стиха
              </p>
              <p className="mt-3 whitespace-pre-line text-center font-serif italic text-[1.02rem] leading-relaxed text-primary/90 sm:text-[1.1rem]">
                {trainingVerse.raw.text}
              </p>
            </div>
          </div>
        }
      />
    </div>
  );
});

