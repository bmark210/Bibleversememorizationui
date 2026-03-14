import { memo, useMemo, type RefObject, type SyntheticEvent } from "react";
import { cn } from "@/app/components/ui/utils";
import {
  TrainingModeRenderer,
  type TrainingModeRendererHandle,
} from "@/app/components/training-session/TrainingModeRenderer";
import { TrainingUiStateProvider } from "@/app/components/training-session/TrainingUiStateContext";
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import { MAX_MASTERY_LEVEL, MODE_PIPELINE } from "../constants";
import type { TrainingVerseState, ModeId, Rating } from "../types";
import { Verse } from "@/app/App";

type Props = {
  dataTour?: string;
  trainingVerse: TrainingVerseState;
  modeId: ModeId;
  rendererRef: RefObject<TrainingModeRendererHandle | null>;
  onTrainingInteractionStart?: () => void;
  onRate: (rating: Rating) => void | Promise<void>;
  hideRatingFooter?: boolean;
  suppressModeTutorials?: boolean;
};

function computeTotalProgressPercent(rawMasteryLevel: number, repetitions: number): number {
  const total = Math.min(
    rawMasteryLevel + repetitions,
    TOTAL_REPEATS_AND_STAGE_MASTERY_MAX
  );
  return Math.round((total / TOTAL_REPEATS_AND_STAGE_MASTERY_MAX) * 100);
}

function asLegacyVerseForRenderer(verse: TrainingVerseState): Verse {
  const progressPercent = Math.round(
    (Math.max(0, verse.stageMasteryLevel) / MAX_MASTERY_LEVEL) * 100
  );
  return {
    id: String(verse.key),
    externalVerseId: verse.externalVerseId,
    status: verse.status,
    reference: verse.raw.reference,
    text: verse.raw.text,
    translation: String((verse.raw as Record<string, unknown>).translation ?? "rus_syn"),
    masteryLevel: progressPercent,
    repetitions: verse.repetitions,
    lastReviewedAt: verse.lastReviewedAt?.toISOString() ?? null,
    nextReviewAt: verse.nextReviewAt?.toISOString() ?? null,
    nextReview: verse.nextReviewAt?.toISOString() ?? null,
    tags: [],
  };
}

export const TrainingCard = memo(function TrainingCard({
  dataTour,
  trainingVerse,
  modeId,
  rendererRef,
  onTrainingInteractionStart,
  onRate,
  hideRatingFooter = false,
  suppressModeTutorials = false,
}: Props) {
  const renderer = MODE_PIPELINE[modeId].renderer;
  const isReviewStage =
    trainingVerse.status === "REVIEW" || trainingVerse.status === "MASTERED";
  const totalProgressPercent = useMemo(
    () =>
      computeTotalProgressPercent(
        trainingVerse.rawMasteryLevel,
        trainingVerse.repetitions
      ),
    [trainingVerse.rawMasteryLevel, trainingVerse.repetitions]
  );

  const verse = useMemo(
    () => asLegacyVerseForRenderer(trainingVerse),
    [
      trainingVerse.key,
      trainingVerse.externalVerseId,
      trainingVerse.status,
      trainingVerse.raw.reference,
      trainingVerse.raw.text,
      (trainingVerse.raw as Record<string, unknown>).translation,
      trainingVerse.stageMasteryLevel,
      trainingVerse.repetitions,
      trainingVerse.lastReviewedAt?.getTime(),
      trainingVerse.nextReviewAt?.getTime(),
    ]
  );

  const handleTrainingInteractionCapture = (
    event: SyntheticEvent<HTMLDivElement>
  ) => {
    if (!onTrainingInteractionStart) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const interactiveTarget = target.closest(
      "button,input,textarea,select,[role='button'],[contenteditable='true']"
    );
    if (!interactiveTarget) return;

    onTrainingInteractionStart();
  };

  return (
    <div
      data-tour={dataTour}
      className="flex h-full w-full min-w-0 flex-col overflow-hidden"
    >
      {/* Header: reference + progress badge */}
      <div className="shrink-0 pb-3 text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl italic text-primary/90 font-serif">
          {trainingVerse.raw.reference}
        </h2>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-2">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 backdrop-blur-sm",
              isReviewStage
                ? "border-violet-500/25 bg-violet-500/10"
                : "border-emerald-500/25 bg-emerald-500/10"
            )}
          >
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-[0.14em]",
                isReviewStage
                  ? "text-violet-700/85 dark:text-violet-300/90"
                  : "text-emerald-700/80 dark:text-emerald-300/90"
              )}
            >
              {isReviewStage ? "Повторение" : "Освоение"}
            </span>

            <div
              role="progressbar"
              aria-label="Прогресс изучения"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={totalProgressPercent}
              className={cn(
                "relative h-1 w-16 overflow-hidden rounded-full",
                isReviewStage ? "bg-violet-500/15" : "bg-emerald-500/15"
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out",
                  isReviewStage ? "bg-violet-500" : "bg-emerald-500"
                )}
                style={{ width: `${totalProgressPercent}%` }}
              />
            </div>

            <span
              className={cn(
                "text-[11px] font-semibold tabular-nums",
                isReviewStage
                  ? "text-violet-700 dark:text-violet-300"
                  : "text-emerald-700 dark:text-emerald-300"
              )}
            >
              {totalProgressPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Body: exercise renderer takes remaining space */}
      <div
        className="relative flex-1 min-h-0 overflow-y-auto"
        onClickCapture={handleTrainingInteractionCapture}
        onInputCapture={handleTrainingInteractionCapture}
        onKeyDownCapture={handleTrainingInteractionCapture}
      >
        <TrainingUiStateProvider hideRatingFooter={hideRatingFooter}>
          <TrainingModeRenderer
            ref={rendererRef as RefObject<TrainingModeRendererHandle>}
            renderer={renderer}
            verse={verse}
            suppressTutorial={suppressModeTutorials}
            onRate={onRate}
          />
        </TrainingUiStateProvider>
      </div>
    </div>
  );
});
