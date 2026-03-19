import { memo, useMemo, type RefObject, type SyntheticEvent } from "react";
// import { cn } from "@/app/components/ui/utils";
import {
  TrainingModeRenderer,
  type TrainingModeRendererHandle,
} from "@/app/components/training-session/TrainingModeRenderer";
import type { HintState } from "@/app/components/training-session/modes/useHintState";
import type { ExerciseProgressSnapshot } from "@/modules/training/hints/types";
import { TrainingUiStateProvider } from "@/app/components/training-session/TrainingUiStateContext";
import { MODE_PIPELINE } from "../constants";
import type { TrainingVerseState, ModeId, Rating } from "../types";
import { computeTotalProgressPercent } from "../utils";
import { Verse } from "@/app/App";

type Props = {
  dataTour?: string;
  trainingVerse: TrainingVerseState;
  modeId: ModeId;
  rendererRef: RefObject<TrainingModeRendererHandle | null>;
  onTrainingInteractionStart?: () => void;
  onRate: (rating: Rating) => void | Promise<void>;
  hideRatingFooter?: boolean;
  isLateStageReview?: boolean;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
};

function asLegacyVerseForRenderer(verse: TrainingVerseState): Verse {
  const progressPercent = computeTotalProgressPercent(
    verse.rawMasteryLevel,
    verse.repetitions
  );
  return {
    id: String(verse.key),
    externalVerseId: verse.externalVerseId,
    difficultyLevel: verse.raw.difficultyLevel,
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
    contextPromptText: (verse.raw as Record<string, unknown>).contextPromptText as string | undefined,
    contextPromptReference: (verse.raw as Record<string, unknown>).contextPromptReference as string | undefined,
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
  isLateStageReview: isLateStage = false,
  hintState,
  onProgressChange,
}: Props) {
  const renderer = MODE_PIPELINE[modeId].renderer;
  // const isReviewStage =
  //   trainingVerse.status === "REVIEW" || trainingVerse.status === "MASTERED";
  // const totalProgressPercent = useMemo(
  //   () =>
  //     computeTotalProgressPercent(
  //       trainingVerse.rawMasteryLevel,
  //       trainingVerse.repetitions
  //     ),
  //   [trainingVerse.rawMasteryLevel, trainingVerse.repetitions]
  // );

  const verse = useMemo(
    () => asLegacyVerseForRenderer(trainingVerse),
    [
      trainingVerse.key,
      trainingVerse.externalVerseId,
      trainingVerse.status,
      trainingVerse.raw.reference,
      trainingVerse.raw.text,
      (trainingVerse.raw as Record<string, unknown>).translation,
      trainingVerse.rawMasteryLevel,
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
      {/* Header: reference + minimal progress */}
      <div className="shrink-0 pb-1 pt-2 sm:pt-4 text-center space-y-1.5">
        <h2 className="text-xl sm:text-3xl italic text-primary/90 font-serif">
          {trainingVerse.raw.reference}
        </h2>
        {/* <div className="flex items-center justify-center gap-1.5">
          <div
            role="progressbar"
            aria-label="Прогресс изучения"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={totalProgressPercent}
            className={cn(
              "h-0.5 w-16 overflow-hidden rounded-full",
              isReviewStage ? "bg-violet-500/20" : "bg-emerald-500/20"
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                isReviewStage ? "bg-violet-500/60" : "bg-emerald-500/60"
              )}
              style={{ width: `${totalProgressPercent}%` }}
            />
          </div>
          <span
            className={cn(
              "text-[10px] tabular-nums",
              isReviewStage ? "text-violet-600/70" : "text-emerald-600/70"
            )}
          >
            {totalProgressPercent}%
          </span> */}
        {/* </div> */}
      </div>

      {/* Body: exercise renderer takes remaining space */}
      <div
        className="flex-1 min-h-0"
        onClickCapture={handleTrainingInteractionCapture}
        onInputCapture={handleTrainingInteractionCapture}
        onKeyDownCapture={handleTrainingInteractionCapture}
      >
        <TrainingUiStateProvider hideRatingFooter={hideRatingFooter}>
          <TrainingModeRenderer
            ref={rendererRef as RefObject<TrainingModeRendererHandle>}
            renderer={renderer}
            verse={verse}
            onRate={onRate}
            isLateStageReview={isLateStage}
            hintState={hintState}
            onProgressChange={onProgressChange}
          />
        </TrainingUiStateProvider>
      </div>
    </div>
  );
});
