import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type RefObject,
} from "react";
import { VerseStatus } from "@/shared/domain/verseStatus";
import type { Verse } from "@/app/domain/verse";
import type { VersePatchEvent } from "@/app/types/verseSync";
import {
  type TrainingModeRendererHandle,
} from "@/app/components/training-session/TrainingModeRenderer";
import {
  haptic,
  toTrainingVerseState,
  isTrainingEligibleVerse,
  isTrainingReviewVerse,
  chooseModeId,
} from "@/app/components/VerseGallery/utils";
import {
  fetchTrainingVerseSnapshot,
  getTelegramId,
  postTrainingVerseStep,
} from "@/app/components/VerseGallery/trainingApi";
import { toast } from "@/app/lib/toast";
import {
  normalizePersistedTrainingVerseState,
  useVerseSync,
  type PersistedTrainingVerse,
} from "@/app/components/VerseGallery/hooks/useVerseSync";
import type {
  ModeId,
  Rating,
  TrainingVerseState,
} from "@/app/components/VerseGallery/types";
import { buildTrainingProgressPopupPayload } from "@/app/components/Training/trainingProgressFeedback";
import {
  buildTrainingCommitToastPayload,
} from "./trainingResultState";
import { showTrainingCommitToast } from "./trainingTransitionToast";
import type { TrainingAttempt } from "@/modules/training/hints/types";

type QuickForgetConfirmStage = "learning" | "review";
export type TrainingRateCommitOutcome =
  | "continued"
  | "blocked"
  | "error";

type Params = {
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

  handleRate: (
    rating: Rating,
    attempt?: TrainingAttempt | null
  ) => Promise<TrainingRateCommitOutcome>;
  handleNavigationStep: (delta: -1 | 1) => void;
  handleClose: () => void;

  quickForgetConfirmStage: QuickForgetConfirmStage | null;
  requestQuickForget: () => void;
  confirmQuickForget: (attempt?: TrainingAttempt | null) => void;
  cancelQuickForget: () => void;
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
  }, [initialVerseExternalId, verses]);

  const showTrainingToast = useCallback(
    (
      tone: "success" | "error" | "info" | "warning",
      message: string,
      description?: string
    ) => {
      const method = toast[tone];
      method(message, {
        label: "Тренировка",
        description,
      });
    },
    []
  );

  const handleSessionClose = useCallback(() => {
    if (isSessionClosedRef.current) return;
    isSessionClosedRef.current = true;

    if (hasCommittedMutationRef.current) {
      hasCommittedMutationRef.current = false;
      onMutationCommitted?.();
    }

    onSessionComplete();
  }, [onMutationCommitted, onSessionComplete]);

  useEffect(() => {
    if (trainingVerses.length === 0 || !trainingActiveVerse) {
      handleSessionClose();
    }
  }, [handleSessionClose, trainingActiveVerse, trainingVerses.length]);

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
      return normalizePersistedTrainingVerseState(
        current,
        snapshot as unknown as PersistedTrainingVerse
      );
    },
    [trainingVerses]
  );

  const verseSync = useVerseSync({ onDesync: refetchVerse });

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

  const handleRate = useCallback(
    async (
      rating: Rating,
      attempt?: TrainingAttempt | null
    ): Promise<TrainingRateCommitOutcome> => {
      if (trainingModeId === null || isActionPending) return "blocked";
      const current = trainingVerses[trainingIndex];
      if (!current || !isTrainingEligibleVerse(current)) {
        haptic("warning");
        showTrainingToast("warning", "Стих сейчас недоступен для тренировки");
        return "blocked";
      }

      setIsActionPending(true);
      try {
        const wasReviewExercise = isTrainingReviewVerse(current);
        const isLearningVerse = current.status === VerseStatus.LEARNING;
        const cappedRating = Math.min(
          rating,
          attempt?.ratingPolicy.maxRating ?? (wasReviewExercise ? 2 : 3)
        ) as Rating;

        const telegramId = current.telegramId ?? getTelegramId();
        if (!telegramId) {
          haptic("error");
          showTrainingToast("error", "Не удалось определить пользователя");
          return "blocked";
        }

        const previousModeId = trainingModeId;
        const stepRes = await postTrainingVerseStep(
          telegramId,
          current.externalVerseId,
          {
            phase: wasReviewExercise ? "review" : "learning",
            trainingModeId,
            rating: cappedRating,
            isLearningVerse,
          }
        );

        const userVerse = stepRes?.userVerse;
        if (!userVerse) {
          throw new Error("Training step returned no userVerse");
        }

        const reviewWasSuccessful = stepRes.reviewWasSuccessful === true;
        const persistedUpdated = normalizePersistedTrainingVerseState(
          current,
          userVerse as unknown as PersistedTrainingVerse
        );
        const nextModeId =
          typeof stepRes.nextTrainingModeId === "number"
            ? (stepRes.nextTrainingModeId as ModeId)
            : chooseModeId(persistedUpdated);

        const progressPopupPayload = buildTrainingProgressPopupPayload({
          reference: persistedUpdated.raw.reference,
          context: "core",
          before: {
            status: current.status,
          },
          after: {
            status: persistedUpdated.status,
          },
          xpDelta: stepRes.xpDelta ?? 0,
        });

        applyAuthoritativeVerse(current, persistedUpdated);
        hasCommittedMutationRef.current = true;

        const commitToastPayload = buildTrainingCommitToastPayload({
          verseKey: persistedUpdated.key,
          reference: persistedUpdated.raw.reference,
          previousStatus: current.status,
          nextStatus: persistedUpdated.status,
          previousModeId,
          nextModeId,
          nextReviewAt: persistedUpdated.nextReviewAt,
          reviewWasSuccessful,
          progressPopup: progressPopupPayload,
        });

        if (persistedUpdated.status === VerseStatus.LEARNING) {
          setTrainingModeId(nextModeId);
        }

        if (commitToastPayload?.kind === "review-waiting") {
          removeCompletedVerseAndNavigate(1, persistedUpdated.key);
        } else if (commitToastPayload?.kind === "mastered") {
          removeCompletedVerseAndNavigate(1, persistedUpdated.key);
        }

        if (commitToastPayload) {
          showTrainingCommitToast(commitToastPayload);
        }

        return "continued";
      } catch (error) {
        console.error("Failed to apply training step", error);
        const recovered = await verseSync.recoverFromPatchFailure(
          current.externalVerseId
        );

        if (recovered) {
          applyAuthoritativeVerse(current, recovered);
          setTrainingModeId(chooseModeId(recovered));
        } else {
          setTrainingModeId(chooseModeId(current));
        }

        haptic("error");
        showTrainingToast("error", "Ошибка — попробуйте ещё раз");
        return "error";
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
      showTrainingToast,
      verseSync,
    ]
  );

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

    handleRate: stableHandleRate,
    handleNavigationStep: stableJump,
    handleClose: stableHandleClose,

    quickForgetConfirmStage,
    requestQuickForget: stableRequestQuickForget,
    confirmQuickForget: stableConfirmQuickForget,
    cancelQuickForget: stableCancelQuickForget,
  };
}
