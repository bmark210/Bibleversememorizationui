import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type RefObject,
} from "react";
import { VerseStatus } from "@/generated/prisma";
import type { Verse } from "@/app/App";
import type { VersePatchEvent } from "@/app/types/verseSync";
import type {
  TrainingContactToastPayload,
  TrainingCompletionToastCardPayload,
} from "@/app/components/verse-gallery/TrainingCompletionToastCard";
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
  normalizeVerseStatus,
  normalizeRawMasteryLevel,
  getVerseIdentity,
  toTrainingVerseState,
  isTrainingEligibleVerse,
  isTrainingReviewVerse,
  chooseModeId,
  getModeByShiftInProgressOrder,
  getTrainingContactToastPayload,
  getTrainingMilestonePopupPayload,
} from "@/app/components/VerseGallery/utils";
import {
  fetchTrainingVerseSnapshot,
  persistTrainingVerseProgress,
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

type QuickForgetConfirmStage = "learning" | "review";

type Params = {
  /** Pre-filtered verses for this session */
  verses: Verse[];
  onVersePatched?: (event: VersePatchEvent) => void;
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

export type UseTrainingSessionReturn = {
  trainingActiveVerse: TrainingVerseState | null;
  trainingIndex: number;
  trainingModeId: ModeId | null;
  trainingVerseCount: number;
  isActionPending: boolean;
  rendererRef: RefObject<TrainingModeRendererHandle | null>;

  handleRate: (rating: Rating) => Promise<void>;
  handleNavigationStep: (delta: -1 | 1) => void;
  handleClose: () => void;

  quickForgetLabel: string;
  quickForgetConfirmStage: QuickForgetConfirmStage | null;
  requestQuickForget: () => void;
  confirmQuickForget: () => void;
  cancelQuickForget: () => void;

  feedbackMessage: string;
  contactToastPayload: TrainingContactToastPayload | null;
  milestonePopup: TrainingCompletionToastCardPayload | null;
  confirmMilestonePopup: () => void;
};

export function useTrainingSession({
  verses,
  onVersePatched,
  onSessionComplete,
}: Params): UseTrainingSessionReturn {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [trainingVerses, setTrainingVerses] = useState<TrainingVerseState[]>(
    () => {
      const normalized = verses
        .map(toTrainingVerseState)
        .filter((v): v is TrainingVerseState => v !== null)
        .filter(isTrainingEligibleVerse);
      return normalized;
    }
  );
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [trainingModeId, setTrainingModeId] = useState<ModeId | null>(() => {
    const initial = verses
      .map(toTrainingVerseState)
      .filter((v): v is TrainingVerseState => v !== null)
      .filter(isTrainingEligibleVerse);
    return initial[0] ? chooseModeId(initial[0]) : null;
  });
  const [isActionPending, setIsActionPending] = useState(false);
  const [quickForgetConfirmStage, setQuickForgetConfirmStage] =
    useState<QuickForgetConfirmStage | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [contactToastPayload, setContactToastPayload] =
    useState<TrainingContactToastPayload | null>(null);
  const [milestonePopup, setMilestonePopup] =
    useState<TrainingCompletionToastCardPayload | null>(null);
  const milestoneResolveRef = useRef<(() => void) | null>(null);

  const rendererRef = useRef<TrainingModeRendererHandle | null>(null);

  const trainingActiveVerse = trainingVerses[trainingIndex] ?? null;

  // ── Feedback helpers ───────────────────────────────────────────────────────
  const showFeedback = useCallback((message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(""), 2000);
  }, []);

  const showContactToast = useCallback((payload: TrainingContactToastPayload) => {
    setContactToastPayload(payload);
  }, []);

  const showMilestonePopup = useCallback(
    (payload: TrainingCompletionToastCardPayload) =>
      new Promise<void>((resolve) => {
        milestoneResolveRef.current?.();
        milestoneResolveRef.current = resolve;
        setMilestonePopup(payload);
      }),
    []
  );

  const confirmMilestonePopup = useCallback(() => {
    setMilestonePopup(null);
    const resolve = milestoneResolveRef.current;
    milestoneResolveRef.current = null;
    resolve?.();
  }, []);

  useEffect(
    () => () => {
      milestoneResolveRef.current?.();
      milestoneResolveRef.current = null;
    },
    []
  );

  // ── Session complete when no verses left ───────────────────────────────────
  useEffect(() => {
    if (trainingVerses.length === 0 || !trainingActiveVerse) {
      onSessionComplete();
    }
  }, [trainingActiveVerse, trainingVerses.length, onSessionComplete]);

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
    (delta: -1 | 1) => {
      if (!trainingActiveVerse) return;

      const currentKey = trainingActiveVerse.key;
      const nextList = trainingVerses.filter((v) => v.key !== currentKey);

      if (nextList.length === 0) {
        setTrainingVerses([]);
        setTrainingIndex(0);
        setTrainingModeId(null);
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
      haptic("light");
    },
    [trainingActiveVerse, trainingIndex, trainingVerses]
  );

  // ── Rate handler ───────────────────────────────────────────────────────────
  const handleRate = useCallback(
    async (rating: Rating) => {
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

        const progressDelta = computeProgressDelta({
          phase: wasReviewExercise ? "review" : "learning",
          rating,
          rawMasteryLevel: current.rawMasteryLevel,
          repetitions: current.repetitions,
          now,
          trainingModeId,
          isLearningVerse,
        });

        const rawMasteryAfter = progressDelta.rawMasteryLevel;
        const graduatesToReview = progressDelta.graduatesToReview;
        const reviewWasSuccessful = progressDelta.reviewWasSuccessful;
        const canUpdateRepetitions = progressDelta.canUpdateRepetitions;
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
          showFeedback("Стих выучен");
        }

        const nextMode = getModeByShiftInProgressOrder(
          trainingModeId,
          MODE_SHIFT_BY_RATING[rating] ?? 1
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
          const persistedResponse = await persistTrainingVerseProgress(updated, {
            includeRepetitions: canUpdateRepetitions,
          });
          const persistedUpdated = await verseSync.reconcile({
            optimistic: updated,
            persistedResponse,
          });

          const finalShouldMove =
            wasReviewExercise || becameLearned || persistedUpdated.status === "MASTERED";

          applyAuthoritativeVerse(current, persistedUpdated);

          if (!finalShouldMove) {
            const persistedNextMode = becameLearned
              ? chooseModeId(persistedUpdated)
              : !wasReviewExercise && nextMode
                ? nextMode
                : chooseModeId(persistedUpdated);
            setTrainingModeId(persistedNextMode);
          }

          const contactToast = getTrainingContactToastPayload({
            wasReviewExercise,
            reviewWasSuccessful,
            reference: persistedUpdated.raw.reference,
            finalStatus: persistedUpdated.status,
            nextReviewAt: persistedUpdated.nextReviewAt,
            beforeRawMasteryLevel: current.rawMasteryLevel,
            afterRawMasteryLevel: persistedUpdated.rawMasteryLevel,
          });

          const milestone = getTrainingMilestonePopupPayload({
            wasReviewExercise,
            beforeStatus: current.status,
            finalStatus: persistedUpdated.status,
            reference: persistedUpdated.raw.reference,
            nextReviewAt: persistedUpdated.nextReviewAt,
            beforeRawMasteryLevel: current.rawMasteryLevel,
            beforeRepetitions: current.repetitions,
            afterRawMasteryLevel: persistedUpdated.rawMasteryLevel,
            afterRepetitions: persistedUpdated.repetitions,
          });

          showContactToast(contactToast);
          if (milestone) {
            await showMilestonePopup(milestone);
          }

          if (finalShouldMove) {
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
      showContactToast,
      showFeedback,
      showMilestonePopup,
    ]
  );

  // ── Quick forget ───────────────────────────────────────────────────────────
  const quickForgetLabel =
    trainingActiveVerse && isTrainingReviewVerse(trainingActiveVerse)
      ? "Не вспомнил"
      : "Забыл";

  const requestQuickForget = useCallback(() => {
    if (trainingModeId === null || isActionPending) return;
    const current = trainingVerses[trainingIndex];
    if (!current || !isTrainingEligibleVerse(current)) return;

    const stage: QuickForgetConfirmStage = isTrainingReviewVerse(current)
      ? "review"
      : "learning";
    setQuickForgetConfirmStage(stage);
  }, [isActionPending, trainingIndex, trainingModeId, trainingVerses]);

  const confirmQuickForget = useCallback(() => {
    setQuickForgetConfirmStage(null);
    void handleRate(0);
  }, [handleRate]);

  const cancelQuickForget = useCallback(() => {
    setQuickForgetConfirmStage(null);
  }, []);

  // ── Stable refs ────────────────────────────────────────────────────────────
  const stableHandleRate = useEventCallback(handleRate);
  const stableJump = useEventCallback(jumpToAdjacentVerse);
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

    handleRate: stableHandleRate,
    handleNavigationStep: stableJump,
    handleClose: onSessionComplete,

    quickForgetLabel,
    quickForgetConfirmStage,
    requestQuickForget: stableRequestQuickForget,
    confirmQuickForget: stableConfirmQuickForget,
    cancelQuickForget: stableCancelQuickForget,

    feedbackMessage,
    contactToastPayload,
    milestonePopup,
    confirmMilestonePopup,
  };
}
