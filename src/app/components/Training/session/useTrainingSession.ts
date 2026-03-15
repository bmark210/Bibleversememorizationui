import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type RefObject,
} from "react";
import { VerseStatus } from "@/shared/domain/verseStatus";
import type { Verse } from "@/app/App";
import type { VersePatchEvent } from "@/app/types/verseSync";
import {
  type TrainingModeRendererHandle,
} from "@/app/components/training-session/TrainingModeRenderer";
import { computeDisplayStatus } from "@/modules/training/application/computeDisplayStatus";
import { computeProgressDelta } from "@/modules/training/application/computeProgressDelta";
import {
  MODE_SHIFT_BY_RATING,
} from "@/app/components/VerseGallery/constants";
import {
  haptic,
  toTrainingVerseState,
  isTrainingEligibleVerse,
  isTrainingReviewVerse,
  chooseModeId,
  getModeByShiftInProgressOrder,
} from "@/app/components/VerseGallery/utils";
import {
  completeTraining,
  fetchTrainingVerseSnapshot,
} from "@/app/components/VerseGallery/trainingApi";
import {
  normalizePersistedTrainingVerseState,
  useVerseSync,
} from "@/app/components/VerseGallery/hooks/useVerseSync";
import type {
  ModeId,
  Rating,
  TrainingVerseState,
} from "@/app/components/VerseGallery/types";
import { buildTrainingProgressPopupPayload } from "@/app/components/Training/trainingProgressFeedback";
import type { TrainingProgressPopupPayload } from "@/app/components/Training/trainingProgressFeedback";
import { useTrainingProgressPopup } from "@/app/components/Training/useTrainingProgressPopup";
import {
  buildTrainingPendingOutcome,
  type TrainingPendingOutcome,
} from "./trainingPendingOutcome";
import type { TrainingAttempt } from "@/modules/training/hints/types";

type QuickForgetConfirmStage = "learning" | "review";

type Params = {
  /** Pre-filtered verses for this session */
  verses: Verse[];
  initialVerseExternalId?: string | null;
  onVersePatched?: (event: VersePatchEvent) => void;
  onMutationCommitted?: () => void;
  onSessionComplete: () => void;
};

function useEventCallback<Args extends unknown[], Result>(
  fn: (...args: Args) => Result
): (...args: Args) => Result {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  return useCallback((...args: Args) => fnRef.current(...args), []);
}

function normalizeTrainingSessionVerses(verses: Verse[]): TrainingVerseState[] {
  return verses
    .map(toTrainingVerseState)
    .filter((v): v is TrainingVerseState => v !== null)
    .filter(isTrainingEligibleVerse);
}

function resolveInitialTrainingIndex(
  verses: TrainingVerseState[],
  initialVerseExternalId?: string | null
): number {
  const normalizedId = String(initialVerseExternalId ?? "").trim();
  if (!normalizedId || verses.length === 0) return 0;

  const nextIndex = verses.findIndex(
    (verse) => verse.externalVerseId === normalizedId
  );
  return nextIndex >= 0 ? nextIndex : 0;
}

export type UseTrainingSessionReturn = {
  trainingActiveVerse: TrainingVerseState | null;
  trainingIndex: number;
  trainingModeId: ModeId | null;
  trainingVerseCount: number;
  isActionPending: boolean;
  rendererRef: RefObject<TrainingModeRendererHandle | null>;
  pendingOutcome: TrainingPendingOutcome | null;

  handleRate: (rating: Rating, attempt?: TrainingAttempt | null) => Promise<void>;
  handleNavigationStep: (delta: -1 | 1) => void;
  handleClose: () => void;
  acknowledgeOutcome: () => void;

  quickForgetConfirmStage: QuickForgetConfirmStage | null;
  requestQuickForget: () => void;
  confirmQuickForget: (attempt?: TrainingAttempt | null) => void;
  cancelQuickForget: () => void;

  feedbackMessage: string;
  progressPopup: TrainingProgressPopupPayload | null;
};

export function useTrainingSession({
  verses,
  initialVerseExternalId,
  onVersePatched,
  onMutationCommitted,
  onSessionComplete,
}: Params): UseTrainingSessionReturn {
  const initialTrainingVerses = normalizeTrainingSessionVerses(verses);
  const initialTrainingIndex = resolveInitialTrainingIndex(
    initialTrainingVerses,
    initialVerseExternalId
  );

  // ── Core state ─────────────────────────────────────────────────────────────
  const [trainingVerses, setTrainingVerses] = useState<TrainingVerseState[]>(
    () => initialTrainingVerses
  );
  const [trainingIndex, setTrainingIndex] = useState(initialTrainingIndex);
  const [trainingModeId, setTrainingModeId] = useState<ModeId | null>(() => {
    const initial = initialTrainingVerses[initialTrainingIndex];
    return initial ? chooseModeId(initial) : null;
  });
  const [isActionPending, setIsActionPending] = useState(false);
  const [quickForgetConfirmStage, setQuickForgetConfirmStage] =
    useState<QuickForgetConfirmStage | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [pendingOutcome, setPendingOutcome] =
    useState<TrainingPendingOutcome | null>(null);
  const { progressPopup, showProgressPopup } = useTrainingProgressPopup();

  const rendererRef = useRef<TrainingModeRendererHandle | null>(null);
  const hasCommittedMutationRef = useRef(false);
  const isSessionClosedRef = useRef(false);

  const trainingActiveVerse = trainingVerses[trainingIndex] ?? null;

  useEffect(() => {
    const normalized = normalizeTrainingSessionVerses(verses);
    const nextIndex = resolveInitialTrainingIndex(
      normalized,
      initialVerseExternalId
    );
    const nextActiveVerse = normalized[nextIndex];
    setTrainingVerses(normalized);
    setTrainingIndex(nextIndex);
    setTrainingModeId(nextActiveVerse ? chooseModeId(nextActiveVerse) : null);
    setQuickForgetConfirmStage(null);
    setPendingOutcome(null);
  }, [initialVerseExternalId, verses]);

  // ── Feedback helpers ───────────────────────────────────────────────────────
  const showFeedback = useCallback((message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(""), 2000);
  }, []);

  const handleSessionClose = useCallback(() => {
    if (isSessionClosedRef.current) return;
    isSessionClosedRef.current = true;

    if (hasCommittedMutationRef.current) {
      hasCommittedMutationRef.current = false;
      onMutationCommitted?.();
    }

    onSessionComplete();
  }, [onMutationCommitted, onSessionComplete]);

  // ── Session complete when no verses left ───────────────────────────────────
  useEffect(() => {
    if (trainingVerses.length === 0 || !trainingActiveVerse) {
      handleSessionClose();
    }
  }, [handleSessionClose, trainingActiveVerse, trainingVerses.length]);

  // ── Verse sync ─────────────────────────────────────────────────────────────
  const refetchVerse = useCallback(
    async (externalVerseId: string): Promise<TrainingVerseState | null> => {
      const current = trainingVerses.find(
        (v) => v.externalVerseId === externalVerseId
      );
      if (!current) return null;
      const snapshot = await fetchTrainingVerseSnapshot(
        externalVerseId,
        current.telegramId
      );
      if (!snapshot) return null;
      return normalizePersistedTrainingVerseState(current, snapshot);
    },
    [trainingVerses]
  );

  const verseSync = useVerseSync({ onDesync: refetchVerse });

  // ── Apply authoritative verse ──────────────────────────────────────────────
  const applyAuthoritativeVerse = useCallback(
    (current: TrainingVerseState, authoritative: TrainingVerseState) => {
      setTrainingVerses((prev) => {
        const idx = prev.findIndex((v) => v.key === current.key);
        if (idx < 0) return prev;
        const next = [...prev];
        next[idx] = authoritative;
        return next;
      });

      onVersePatched?.({
        target: {
          id: current.raw.id,
          externalVerseId: current.externalVerseId,
        },
        patch: {
          status: authoritative.status,
          masteryLevel: authoritative.rawMasteryLevel,
          repetitions: authoritative.repetitions,
          reviewLapseStreak: authoritative.reviewLapseStreak,
          lastReviewedAt: authoritative.lastReviewedAt?.toISOString() ?? null,
          nextReviewAt: authoritative.nextReviewAt?.toISOString() ?? null,
        },
      });
    },
    [onVersePatched]
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const jumpToAdjacentVerse = useCallback(
    (delta: -1 | 1) => {
      if (!trainingActiveVerse) return;
      const nextIndex = trainingIndex + delta;
      if (nextIndex < 0 || nextIndex >= trainingVerses.length) return;
      const nextVerse = trainingVerses[nextIndex];
      if (!nextVerse) return;
      setTrainingIndex(nextIndex);
      setTrainingModeId(chooseModeId(nextVerse));
      haptic("medium");
    },
    [trainingActiveVerse, trainingIndex, trainingVerses]
  );

  const removeCompletedVerseAndNavigate = useCallback(
    (delta: -1 | 1, targetVerseKey?: string) => {
      const currentKey = String(targetVerseKey ?? trainingActiveVerse?.key ?? "");
      if (!currentKey) return;
      const nextList = trainingVerses.filter((v) => v.key !== currentKey);

      if (nextList.length === 0) {
        setTrainingVerses([]);
        setTrainingIndex(0);
        setTrainingModeId(null);
        setPendingOutcome((prev) =>
          prev?.verseKey === currentKey ? null : prev
        );
        haptic("light");
        return;
      }

      const nextIndex = Math.min(
        Math.max(delta > 0 ? trainingIndex : trainingIndex - 1, 0),
        nextList.length - 1
      );
      const nextVerse = nextList[nextIndex];

      setTrainingVerses(nextList);
      setTrainingIndex(nextIndex);
      setTrainingModeId(nextVerse ? chooseModeId(nextVerse) : null);
      setPendingOutcome((prev) =>
        prev?.verseKey === currentKey ? null : prev
      );
      haptic("light");
    },
    [trainingActiveVerse, trainingIndex, trainingVerses]
  );

  const acknowledgeOutcome = useCallback(() => {
    if (!pendingOutcome) return;
    removeCompletedVerseAndNavigate(1, pendingOutcome.verseKey);
  }, [pendingOutcome, removeCompletedVerseAndNavigate]);

  // ── Rate handler ───────────────────────────────────────────────────────────
  const handleRate = useCallback(
    async (rating: Rating, attempt?: TrainingAttempt | null) => {
      if (trainingModeId === null || isActionPending) return;
      const current = trainingVerses[trainingIndex];
      if (!current || !isTrainingEligibleVerse(current)) {
        haptic("warning");
        showFeedback("Стих сейчас недоступен для тренировки");
        return;
      }

      setIsActionPending(true);
      try {
        const wasReviewExercise = isTrainingReviewVerse(current);
        const isLearningVerse = current.status === VerseStatus.LEARNING;
        const now = new Date();
        const cappedRating = Math.min(
          rating,
          attempt?.ratingPolicy.maxRating ?? (wasReviewExercise ? 2 : 3)
        ) as Rating;

        const progressDelta = computeProgressDelta({
          phase: wasReviewExercise ? "review" : "learning",
          rating: cappedRating,
          rawMasteryLevel: current.rawMasteryLevel,
          repetitions: current.repetitions,
          reviewLapseStreak: current.reviewLapseStreak,
          now,
          trainingModeId,
          isLearningVerse,
        });

        const rawMasteryAfter = progressDelta.rawMasteryLevel;
        const graduatesToReview = progressDelta.graduatesToReview;
        const nextRepetitions = progressDelta.repetitions;
        const nextReviewAt = progressDelta.nextReviewAt;
        const becameLearned = graduatesToReview;

        const nextStatus =
          current.status === VerseStatus.STOPPED
            ? VerseStatus.STOPPED
            : rawMasteryAfter > 0
              ? computeDisplayStatus(rawMasteryAfter, nextRepetitions)
              : VerseStatus.MY;

        const updated: TrainingVerseState = {
          ...current,
          raw: {
            ...current.raw,
            masteryLevel: rawMasteryAfter,
            repetitions: nextRepetitions,
            status: nextStatus,
          } as Verse,
          rawMasteryLevel: rawMasteryAfter,
          stageMasteryLevel: progressDelta.stageMasteryLevel,
          repetitions: nextRepetitions,
          reviewLapseStreak: progressDelta.reviewLapseStreak,
          status: nextStatus,
          lastModeId: !wasReviewExercise && graduatesToReview ? null : trainingModeId,
          lastReviewedAt: now,
          nextReviewAt,
        };

        const shouldMoveToNextVerse =
          wasReviewExercise || becameLearned || nextStatus === "MASTERED";

        // Optimistic update
        const updatedList = [...trainingVerses];
        updatedList[trainingIndex] = updated;
        setTrainingVerses(updatedList);

        if (becameLearned) {
          haptic("success");
        }

        const nextMode = getModeByShiftInProgressOrder(
          trainingModeId,
          MODE_SHIFT_BY_RATING[cappedRating] ?? 1
        );
        const nextModeForCurrentVerse = becameLearned
          ? chooseModeId(updated)
          : !wasReviewExercise && nextMode
            ? nextMode
            : chooseModeId(updated);

        if (!shouldMoveToNextVerse) {
          setTrainingModeId(nextModeForCurrentVerse);
        }

        // Persist
        try {
          const completionResponse = await completeTraining({
            externalVerseId: current.externalVerseId,
            modeId: trainingModeId,
            phase: wasReviewExercise ? "review" : "learning",
            requestedRating: rating,
            ratingCap: attempt?.ratingPolicy.maxRating ?? (wasReviewExercise ? 2 : 3),
          });
          const persistedResponse = completionResponse.verse;
          const persistedUpdated = await verseSync.reconcile({
            optimistic: updated,
            persistedResponse,
          });

          const pendingCompletionOutcome = buildTrainingPendingOutcome({
            verseKey: persistedUpdated.key,
            reference: persistedUpdated.raw.reference,
            previousStatus: current.status,
            nextStatus: persistedUpdated.status,
            nextReviewAt: persistedUpdated.nextReviewAt,
            wasReviewExercise,
            reviewWasSuccessful: progressDelta.reviewWasSuccessful,
          });
          const finalShouldMoveImmediately =
            pendingCompletionOutcome === null &&
            (wasReviewExercise ||
              becameLearned ||
              persistedUpdated.status === "MASTERED");

          applyAuthoritativeVerse(current, persistedUpdated);
          hasCommittedMutationRef.current = true;

          if (!finalShouldMoveImmediately && pendingCompletionOutcome === null) {
            const persistedNextMode = becameLearned
              ? chooseModeId(persistedUpdated)
              : !wasReviewExercise && nextMode
                ? nextMode
                : chooseModeId(persistedUpdated);
            setTrainingModeId(persistedNextMode);
          }

          const progressPopupPayload = buildTrainingProgressPopupPayload({
            reference: persistedUpdated.raw.reference,
            context: "core",
            before: {
              status: current.status,
              difficultyLevel: current.raw.difficultyLevel,
              masteryLevel: current.rawMasteryLevel,
              repetitions: current.repetitions,
            },
            after: {
              status: persistedUpdated.status,
              difficultyLevel: persistedUpdated.raw.difficultyLevel,
              masteryLevel: persistedUpdated.rawMasteryLevel,
              repetitions: persistedUpdated.repetitions,
            },
          });

          if (progressPopupPayload) {
            showProgressPopup(progressPopupPayload);
            const xpDeltaLabel =
              progressPopupPayload.xpDelta === 0
                ? progressPopupPayload.stageLabel
                : `${progressPopupPayload.xpDelta > 0 ? "+" : ""}${progressPopupPayload.xpDelta} XP`;
            showFeedback(
              `${progressPopupPayload.title}. ${progressPopupPayload.stageLabel}. ${xpDeltaLabel}`
            );
          }

          if (pendingCompletionOutcome) {
            setPendingOutcome(pendingCompletionOutcome);
          } else if (finalShouldMoveImmediately) {
            removeCompletedVerseAndNavigate(1);
          }
        } catch (error) {
          console.error("Failed to persist training progress", error);
          const recovered = await verseSync.recoverFromPatchFailure(
            current.externalVerseId
          );

          if (recovered) {
            applyAuthoritativeVerse(current, recovered);
            setTrainingModeId(chooseModeId(recovered));
          } else {
            // Restore original
            setTrainingVerses((prev) => {
              const idx = prev.findIndex((v) => v.key === current.key);
              if (idx < 0) return prev;
              const next = [...prev];
              next[idx] = current;
              return next;
            });
            setTrainingModeId(chooseModeId(current));
          }

          haptic("error");
          showFeedback("Ошибка — попробуйте ещё раз");
          setPendingOutcome(null);
        }
      } finally {
        setIsActionPending(false);
      }
    },
    [
      isActionPending,
      trainingIndex,
      trainingModeId,
      trainingVerses,
      applyAuthoritativeVerse,
      removeCompletedVerseAndNavigate,
      showFeedback,
      showProgressPopup,
    ]
  );

  // ── Quick forget ───────────────────────────────────────────────────────────
  const requestQuickForget = useCallback(() => {
    if (trainingModeId === null || isActionPending) return;
    const current = trainingVerses[trainingIndex];
    if (!current || !isTrainingEligibleVerse(current)) return;

    const stage: QuickForgetConfirmStage = isTrainingReviewVerse(current)
      ? "review"
      : "learning";
    setQuickForgetConfirmStage(stage);
  }, [isActionPending, trainingIndex, trainingModeId, trainingVerses]);

  const confirmQuickForget = useCallback((attempt?: TrainingAttempt | null) => {
    setQuickForgetConfirmStage(null);
    void handleRate(0, attempt);
  }, [handleRate]);

  const cancelQuickForget = useCallback(() => {
    setQuickForgetConfirmStage(null);
  }, []);

  // ── Stable refs ────────────────────────────────────────────────────────────
  const stableHandleRate = useEventCallback(handleRate);
  const stableJump = useEventCallback(jumpToAdjacentVerse);
  const stableHandleClose = useEventCallback(handleSessionClose);
  const stableRequestQuickForget = useEventCallback(requestQuickForget);
  const stableConfirmQuickForget = useEventCallback(confirmQuickForget);
  const stableCancelQuickForget = useEventCallback(cancelQuickForget);

  return {
    trainingActiveVerse,
    trainingIndex,
    trainingModeId,
    trainingVerseCount: trainingVerses.length,
    isActionPending,
    rendererRef,
    pendingOutcome,

    handleRate: stableHandleRate,
    handleNavigationStep: stableJump,
    handleClose: stableHandleClose,
    acknowledgeOutcome,

    quickForgetConfirmStage,
    requestQuickForget: stableRequestQuickForget,
    confirmQuickForget: stableConfirmQuickForget,
    cancelQuickForget: stableCancelQuickForget,

    feedbackMessage,
    progressPopup,
  };
}
