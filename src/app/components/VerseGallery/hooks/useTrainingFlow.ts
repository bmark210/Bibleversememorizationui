import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type RefObject,
} from "react";
import { VerseStatus } from "@/generated/prisma";
import { fetchAllUserVerses } from "@/api/services/userVersesPagination";
import type { Verse } from "@/app/App";
import type { VersePatchEvent } from "@/app/types/verseSync";
import type {
  DailyGoalProgressEvent,
  DailyGoalResumeMode,
  DailyGoalTrainingStartDecision,
} from "@/app/features/daily-goal/types";
import type {
  TrainingContactToastPayload,
  TrainingCompletionToastCardPayload,
} from "@/app/components/verse-gallery/TrainingCompletionToastCard";
import {
  type TrainingModeRendererHandle,
} from "@/app/components/training-session/TrainingModeRenderer";
import {
  applyMasteryDelta,
} from "@/shared/training/modeEngine";
import {
  MASTERY_DELTA_BY_RATING,
  MODE_SHIFT_BY_RATING,
  SCORE_BY_RATING,
  REPEAT_THRESHOLD_FOR_MASTERED,
} from "../constants";
import {
  haptic,
  normalizeVerseStatus,
  normalizeRawMasteryLevel,
  toStageMasteryLevel,
  getVerseIdentity,
  toTrainingVerseState,
  isTrainingEligibleVerse,
  isTrainingReviewVerse,
  matchesTrainingSubsetFilter,
  chooseModeId,
  getModeByShiftInProgressOrder,
  calcNextReviewAt,
  calcNextReviewAtForReviewRepetition,
  deriveTrainingDisplayStatus,
  getTrainingContactToastPayload,
  getTrainingMilestonePopupPayload,
  sortByCreatedAtDesc,
  parseDate,
} from "../utils";
import { getTelegramId, persistTrainingVerseProgress } from "../trainingApi";
import type {
  PanelMode,
  ModeId,
  Rating,
  TrainingSubsetFilter,
  TrainingVerseState,
  VersePreviewOverride,
} from "../types";

type Params = {
  verses: Verse[];
  previewActiveVerse: Verse | null;
  activeIndex: number;
  autoStartInTraining: boolean;
  closeTrainingGoesToPreview: boolean;
  onClose: () => void;
  onVersePatched?: (event: VersePatchEvent) => void;
  onDailyGoalProgressEvent?: (event: DailyGoalProgressEvent) => void;
  onBeforeStartTrainingFromGalleryVerse?: (
    verse: Verse
  ) => Promise<DailyGoalTrainingStartDecision> | DailyGoalTrainingStartDecision;
  onDailyGoalJumpToVerseRequest?: (externalVerseId: string) => void;
  onDailyGoalPreferredResumeModeChange?: (mode: DailyGoalResumeMode) => void;
  dailyGoalGuideActive: boolean;
  dailyGoalPreferredTrainingSubset: TrainingSubsetFilter;
  // from useGalleryAux
  actionPending: boolean;
  setActionPending: (v: boolean) => void;
  setPreviewOverride: (verse: Verse, patch: VersePreviewOverride) => void;
  showFeedback: (message: string, type?: "success" | "error" | "info") => void;
  showTrainingContactToast: (payload: TrainingContactToastPayload) => void;
  showTrainingMilestonePopup: (payload: TrainingCompletionToastCardPayload) => void;
  // from usePreviewNavigation
  setNavActiveIndex: (index: number) => void;
  setNavDirection: (dir: number) => void;
};

function useEventCallback<T extends (...args: any[]) => any>(fn: T): T {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback(((...args: Parameters<T>) => fnRef.current(...args)) as T, []);
}

export type UseTrainingFlowReturn = {
  panelMode: PanelMode;
  trainingActiveVerse: TrainingVerseState | null;
  trainingIndex: number;
  trainingModeId: ModeId | null;
  trainingSubsetFilter: TrainingSubsetFilter;
  trainingEligibleIndices: number[];
  isAutoStartingTraining: boolean;
  trainingRendererRef: RefObject<TrainingModeRendererHandle | null>;
  startTrainingFromActiveVerse: (
    forcedSubset?: DailyGoalResumeMode,
    options?: { preservePreviewCard?: boolean }
  ) => Promise<boolean>;
  handleTrainingRate: (rating: Rating) => Promise<void>;
  handleTrainingNavigationStep: (delta: -1 | 1) => void;
  exitTrainingMode: (target?: TrainingVerseState | null) => void;
  handleTrainingBackAction: () => void;
  applyUserTrainingSubsetFilter: (filter: TrainingSubsetFilter) => void;
};

export function useTrainingFlow({
  verses,
  previewActiveVerse,
  activeIndex,
  autoStartInTraining,
  closeTrainingGoesToPreview,
  onClose,
  onVersePatched,
  onDailyGoalProgressEvent,
  onBeforeStartTrainingFromGalleryVerse,
  onDailyGoalJumpToVerseRequest,
  onDailyGoalPreferredResumeModeChange,
  dailyGoalGuideActive,
  dailyGoalPreferredTrainingSubset,
  actionPending,
  setActionPending,
  setPreviewOverride,
  showFeedback,
  showTrainingContactToast,
  showTrainingMilestonePopup,
  setNavActiveIndex,
  setNavDirection,
}: Params): UseTrainingFlowReturn {
  const [panelMode, setPanelMode] = useState<PanelMode>("preview");
  const [trainingVerses, setTrainingVerses] = useState<TrainingVerseState[]>([]);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [trainingModeId, setTrainingModeId] = useState<ModeId | null>(null);
  const [trainingSubsetFilter, setTrainingSubsetFilter] = useState<TrainingSubsetFilter>("catalog");
  const [isAutoStartingTraining, setIsAutoStartingTraining] = useState(
    () => autoStartInTraining
  );

  const trainingRendererRef = useRef<TrainingModeRendererHandle | null>(null);
  const autoStartedTrainingRef = useRef(false);
  const hasUserChosenTrainingSubsetRef = useRef(false);
  const hasAutoAppliedDailyGoalSubsetRef = useRef(false);
  const preservedPreviewVerseKeyOnTrainingExitRef = useRef<string | null>(null);

  const trainingActiveVerse = panelMode === "training" ? trainingVerses[trainingIndex] ?? null : null;

  const trainingEligibleIndices = useMemo(
    () =>
      trainingVerses
        .map((verse, index) => ({ verse, index }))
        .filter(({ verse }) => matchesTrainingSubsetFilter(verse, trainingSubsetFilter))
        .map(({ index }) => index),
    [trainingVerses, trainingSubsetFilter]
  );

  // Return to preview if no training verse is available
  useEffect(() => {
    if (panelMode !== "training") return;
    if (!trainingActiveVerse) {
      setPanelMode("preview");
      setTrainingModeId(null);
    }
  }, [panelMode, trainingActiveVerse]);

  // Auto-advance training index when eligible subset changes
  useEffect(() => {
    if (panelMode !== "training") return;
    if (trainingEligibleIndices.length > 0) {
      if (!trainingEligibleIndices.includes(trainingIndex)) {
        const nextIndex = trainingEligibleIndices[0];
        const nextVerse = trainingVerses[nextIndex];
        if (!nextVerse) return;
        setTrainingIndex(nextIndex);
        setTrainingModeId(chooseModeId(nextVerse));
      }
      return;
    }

    if (trainingSubsetFilter !== "catalog") {
      showFeedback("Нет стихов для выбранного режима. Переключаем обратно в каталог.", "info");
      setTrainingSubsetFilter("catalog");
      return;
    }

    if (trainingVerses.some(isTrainingEligibleVerse)) {
      const nextIndex = trainingVerses.findIndex(isTrainingEligibleVerse);
      if (nextIndex >= 0) {
        const nextVerse = trainingVerses[nextIndex];
        setTrainingIndex(nextIndex);
        setTrainingModeId(chooseModeId(nextVerse));
      }
    }
  }, [panelMode, trainingEligibleIndices, trainingIndex, trainingSubsetFilter, trainingVerses]);

  // Auto-apply daily goal subset when training starts
  useEffect(() => {
    if (panelMode !== "training") return;
    if (!dailyGoalGuideActive) return;
    if (dailyGoalPreferredTrainingSubset === "catalog") return;
    if (hasUserChosenTrainingSubsetRef.current) return;
    if (hasAutoAppliedDailyGoalSubsetRef.current) return;
    if (trainingSubsetFilter !== "catalog") return;
    hasAutoAppliedDailyGoalSubsetRef.current = true;
    setTrainingSubsetFilter(dailyGoalPreferredTrainingSubset);
  }, [panelMode, dailyGoalGuideActive, dailyGoalPreferredTrainingSubset, trainingSubsetFilter]);

  // Clear auto-starting overlay when training starts
  useEffect(() => {
    if (panelMode === "training") {
      setIsAutoStartingTraining(false);
    }
  }, [panelMode]);

  const fetchLearningVersesForTraining = useCallback(async (): Promise<Verse[]> => {
    const telegramId = getTelegramId();
    if (!telegramId) {
      return sortByCreatedAtDesc(
        verses.filter((v) => {
          const status = normalizeVerseStatus(v.status);
          return status === VerseStatus.LEARNING || status === "REVIEW";
        })
      );
    }
    try {
      const response = (await fetchAllUserVerses({
        telegramId,
        status: VerseStatus.LEARNING,
        orderBy: "createdAt",
        order: "desc",
      })) as Verse[];
      const filtered = response.filter((v) => {
        const status = normalizeVerseStatus(v.status);
        return status === VerseStatus.LEARNING || status === "REVIEW";
      });
      return sortByCreatedAtDesc(filtered);
    } catch (error) {
      console.error("Не удалось загрузить стихи LEARNING:", error);
      return sortByCreatedAtDesc(
        verses.filter((v) => {
          const status = normalizeVerseStatus(v.status);
          return status === VerseStatus.LEARNING || status === "REVIEW";
        })
      );
    }
  }, [verses]);

  const applyUserTrainingSubsetFilter = useCallback(
    (nextFilter: TrainingSubsetFilter) => {
      hasUserChosenTrainingSubsetRef.current = true;
      hasAutoAppliedDailyGoalSubsetRef.current = true;
      setTrainingSubsetFilter((prev) => (prev === nextFilter ? prev : nextFilter));
      if (nextFilter === "learning" || nextFilter === "review") {
        onDailyGoalPreferredResumeModeChange?.(nextFilter);
      }
    },
    [onDailyGoalPreferredResumeModeChange]
  );

  const exitTrainingMode = useCallback(
    (target?: TrainingVerseState | null) => {
      const preservedKey = preservedPreviewVerseKeyOnTrainingExitRef.current;
      preservedPreviewVerseKeyOnTrainingExitRef.current = null;
      const effectiveTarget = target ?? trainingActiveVerse;
      const trainingVerseKey = effectiveTarget?.key ?? null;

      if (preservedKey) {
        const preservedIndex = verses.findIndex((v) => getVerseIdentity(v) === preservedKey);
        if (preservedIndex >= 0) {
          setNavActiveIndex(preservedIndex);
        } else if (effectiveTarget) {
          const idx = verses.findIndex((v) => getVerseIdentity(v) === effectiveTarget.key);
          if (idx >= 0) setNavActiveIndex(idx);
        }
      } else if (effectiveTarget) {
        const idx = verses.findIndex((v) => getVerseIdentity(v) === effectiveTarget.key);
        if (idx >= 0) setNavActiveIndex(idx);
      }

      const isSameVerse = preservedKey ? preservedKey === trainingVerseKey : true;
      setNavDirection(isSameVerse ? 0 : 1);
      setPanelMode("preview");
      setTrainingModeId(null);
    },
    [trainingActiveVerse, verses, setNavActiveIndex, setNavDirection]
  );

  const handleTrainingBackAction = useCallback(() => {
    if (trainingRendererRef.current?.handleBackAction()) return;
    if (!closeTrainingGoesToPreview) {
      onClose();
      return;
    }
    exitTrainingMode();
  }, [closeTrainingGoesToPreview, exitTrainingMode, onClose]);

  const jumpToAdjacentTrainingVerse = useCallback(
    (delta: -1 | 1) => {
      if (panelMode !== "training") return;
      if (!trainingActiveVerse) return;
      if (trainingEligibleIndices.length <= 1) return;
      const currentPos = trainingEligibleIndices.indexOf(trainingIndex);

      let nextIndex: number | undefined;
      if (currentPos >= 0) {
        const nextPos = currentPos + delta;
        if (nextPos < 0 || nextPos >= trainingEligibleIndices.length) return;
        nextIndex = trainingEligibleIndices[nextPos];
      } else {
        if (delta > 0) {
          nextIndex =
            trainingEligibleIndices.find((idx) => idx > trainingIndex) ??
            trainingEligibleIndices[0];
        } else {
          nextIndex =
            [...trainingEligibleIndices].reverse().find((idx) => idx < trainingIndex) ??
            trainingEligibleIndices[trainingEligibleIndices.length - 1];
        }
      }

      const nextVerse = trainingVerses[nextIndex ?? -1];
      if (!nextVerse) return;
      setNavDirection(delta > 0 ? 1 : -1);
      setTrainingIndex(nextIndex!);
      setTrainingModeId(chooseModeId(nextVerse));
      haptic("medium");
    },
    [
      panelMode,
      trainingActiveVerse,
      trainingEligibleIndices,
      trainingIndex,
      trainingVerses,
      setNavDirection,
    ]
  );

  const removeCompletedTrainingVerseAndNavigate = useCallback(
    (delta: -1 | 1) => {
      if (panelMode !== "training") return;
      if (!trainingActiveVerse) return;

      const currentKey = trainingActiveVerse.key;
      const nextList = trainingVerses.filter((verse) => verse.key !== currentKey);

      if (nextList.length === trainingVerses.length) {
        jumpToAdjacentTrainingVerse(delta);
        return;
      }

      if (nextList.length === 0) {
        setTrainingVerses([]);
        setTrainingIndex(0);
        setTrainingModeId(null);
        haptic("light");
        return;
      }

      const candidateIndices = nextList
        .map((verse, index) => ({ verse, index }))
        .filter(({ verse }) => matchesTrainingSubsetFilter(verse, trainingSubsetFilter))
        .map(({ index }) => index);

      let nextIndex: number | null = null;
      if (candidateIndices.length > 0) {
        const pivot = delta > 0 ? trainingIndex : trainingIndex - 1;
        if (delta > 0) {
          nextIndex =
            candidateIndices.find((idx) => idx >= pivot) ?? candidateIndices[0] ?? null;
        } else {
          nextIndex =
            [...candidateIndices].reverse().find((idx) => idx <= pivot) ??
            candidateIndices[candidateIndices.length - 1] ??
            null;
        }
      } else {
        const fallbackEligible = nextList
          .map((verse, index) => ({ verse, index }))
          .filter(({ verse }) => isTrainingEligibleVerse(verse))
          .map(({ index }) => index);
        if (fallbackEligible.length > 0) {
          nextIndex =
            delta > 0
              ? (fallbackEligible[0] ?? 0)
              : (fallbackEligible[fallbackEligible.length - 1] ?? 0);
          if (trainingSubsetFilter !== "catalog") setTrainingSubsetFilter("catalog");
        } else {
          nextIndex = Math.min(
            Math.max(delta > 0 ? trainingIndex : trainingIndex - 1, 0),
            nextList.length - 1
          );
        }
      }

      const nextVerse = nextIndex != null ? nextList[nextIndex] : nextList[0];
      setTrainingVerses(nextList);
      if (nextVerse) {
        const resolvedIndex = nextList.findIndex((verse) => verse.key === nextVerse.key);
        setNavDirection(delta > 0 ? 1 : -1);
        setTrainingIndex(resolvedIndex >= 0 ? resolvedIndex : 0);
        setTrainingModeId(chooseModeId(nextVerse));
      } else {
        setTrainingIndex(0);
        setTrainingModeId(null);
      }
      haptic("light");
    },
    [
      jumpToAdjacentTrainingVerse,
      panelMode,
      trainingActiveVerse,
      trainingIndex,
      trainingSubsetFilter,
      trainingVerses,
      setNavDirection,
    ]
  );

  const handleTrainingNavigationStep = useCallback(
    (delta: -1 | 1) => {
      jumpToAdjacentTrainingVerse(delta);
    },
    [jumpToAdjacentTrainingVerse]
  );

  const startTrainingFromActiveVerse = useCallback(
    async (
      forcedSubset?: DailyGoalResumeMode,
      options?: { preservePreviewCard?: boolean }
    ): Promise<boolean> => {
      if (actionPending || !previewActiveVerse) return false;
      const preservePreviewCard = options?.preservePreviewCard === true;
      preservedPreviewVerseKeyOnTrainingExitRef.current = null;

      if (onBeforeStartTrainingFromGalleryVerse) {
        const decision = await onBeforeStartTrainingFromGalleryVerse(previewActiveVerse);
        if (decision.kind === "redirect") {
          showFeedback(decision.message, "info");
          const targetIndex = verses.findIndex(
            (verse) => getVerseIdentity(verse) === String(decision.targetVerseId)
          );
          if (targetIndex >= 0) {
            setNavDirection(targetIndex > activeIndex ? 1 : -1);
            setNavActiveIndex(targetIndex);
          } else {
            onDailyGoalJumpToVerseRequest?.(decision.targetVerseId);
            onClose();
          }
          return false;
        }
        if (decision.kind === "warn") {
          showFeedback(decision.message, "info");
        }
      }

      try {
        setActionPending(true);
        const startVerse = previewActiveVerse;
        const activeDisplayStatus = normalizeVerseStatus(previewActiveVerse.status);

        let learningRaw = await fetchLearningVersesForTraining();
        let normalized = learningRaw
          .map(toTrainingVerseState)
          .filter((v): v is TrainingVerseState => v !== null);

        const startKey = getVerseIdentity(startVerse);
        if (!normalized.some((v) => v.key === startKey)) {
          const fallback = toTrainingVerseState(startVerse);
          if (
            fallback &&
            (fallback.status === VerseStatus.LEARNING || fallback.status === "REVIEW")
          ) {
            normalized = [fallback, ...normalized];
          }
        }

        const eligibleIndices = normalized
          .map((verse, index) => ({ verse, index }))
          .filter(({ verse }) => isTrainingEligibleVerse(verse))
          .map(({ index }) => index);

        if (eligibleIndices.length === 0) {
          showFeedback("Нет доступных стихов LEARNING/REVIEW", "error");
          return false;
        }

        const selectedSubsetHint: TrainingSubsetFilter =
          activeDisplayStatus === "REVIEW" || activeDisplayStatus === "MASTERED"
            ? "review"
            : activeDisplayStatus === VerseStatus.LEARNING
              ? "learning"
              : "catalog";

        const preferredSubset: TrainingSubsetFilter =
          forcedSubset === "learning" || forcedSubset === "review"
            ? forcedSubset
            : selectedSubsetHint !== "catalog"
              ? selectedSubsetHint
              : dailyGoalGuideActive && dailyGoalPreferredTrainingSubset !== "catalog"
                ? dailyGoalPreferredTrainingSubset
                : "catalog";

        const getEligibleIndicesByFilter = (filter: TrainingSubsetFilter) =>
          normalized
            .map((verse, index) => ({ verse, index }))
            .filter(({ verse }) => matchesTrainingSubsetFilter(verse, filter))
            .map(({ index }) => index);

        let effectiveSubset = preferredSubset;
        let preferredEligibleIndices = getEligibleIndicesByFilter(effectiveSubset);
        if (preferredEligibleIndices.length === 0 && effectiveSubset !== "catalog") {
          effectiveSubset = "catalog";
          preferredEligibleIndices = getEligibleIndicesByFilter("catalog");
        }

        const activePreferredIndex = normalized.findIndex(
          (v) => v.key === startKey && matchesTrainingSubsetFilter(v, effectiveSubset)
        );

        const startIndex =
          activePreferredIndex >= 0
            ? activePreferredIndex
            : (preferredEligibleIndices[0] ?? eligibleIndices[0] ?? -1);
        if (startIndex < 0) {
          showFeedback("Нет доступных стихов LEARNING/REVIEW", "error");
          return false;
        }

        const startState = normalized[startIndex] ?? normalized[0];

        hasUserChosenTrainingSubsetRef.current = false;
        hasAutoAppliedDailyGoalSubsetRef.current = effectiveSubset !== "catalog";

        setTrainingVerses(normalized);
        setTrainingSubsetFilter(effectiveSubset);

        if (effectiveSubset === "learning" || effectiveSubset === "review") {
          onDailyGoalPreferredResumeModeChange?.(effectiveSubset);
        }

        if (preservePreviewCard) {
          preservedPreviewVerseKeyOnTrainingExitRef.current = getVerseIdentity(previewActiveVerse);
        }

        const isSameVerse = startState.key === startKey;
        setTrainingIndex(startIndex);
        setTrainingModeId(chooseModeId(startState));
        setPanelMode("training");
        setNavDirection(isSameVerse ? 0 : 1);
        haptic("medium");
        return true;
      } catch {
        haptic("error");
        showFeedback("Ошибка — попробуйте ещё раз", "error");
        return false;
      } finally {
        setActionPending(false);
      }
    },
    [
      actionPending,
      activeIndex,
      dailyGoalGuideActive,
      dailyGoalPreferredTrainingSubset,
      fetchLearningVersesForTraining,
      onBeforeStartTrainingFromGalleryVerse,
      onClose,
      onDailyGoalJumpToVerseRequest,
      onDailyGoalPreferredResumeModeChange,
      previewActiveVerse,
      setActionPending,
      setNavActiveIndex,
      setNavDirection,
      showFeedback,
      verses,
    ]
  );

  const handleTrainingRate = useCallback(
    async (rating: Rating) => {
      if (panelMode !== "training" || trainingModeId === null) return;
      const current = trainingVerses[trainingIndex];
      if (!current) return;
      if (!isTrainingEligibleVerse(current)) {
        haptic("warning");
        showFeedback("Стих сейчас недоступен для тренировки", "error");
        return;
      }

      const wasReviewExercise = isTrainingReviewVerse(current);
      const rawMasteryBefore = current.rawMasteryLevel;
      const isLearningVerse = current.status === VerseStatus.LEARNING;
      const now = new Date();

      let rawMasteryAfter = rawMasteryBefore;
      let stageMasteryAfter = toStageMasteryLevel(rawMasteryAfter);
      let graduatesToReview = false;
      let reviewWasSuccessful = false;
      const canUpdateRepetitions = wasReviewExercise;
      let nextRepetitions = current.repetitions;
      let nextReviewAt: Date | null = current.nextReviewAt;

      if (wasReviewExercise) {
        // Review has two outcomes only:
        // 1) successful attempt -> move to next review stage (+1 repetition)
        // 2) failed attempt -> stay on current review stage
        const shouldIncrementRepetitions = rating >= 2;
        reviewWasSuccessful = shouldIncrementRepetitions;
        nextRepetitions = current.repetitions + (shouldIncrementRepetitions ? 1 : 0);
        nextReviewAt = calcNextReviewAtForReviewRepetition(nextRepetitions);
      } else {
        const masteryDelta = MASTERY_DELTA_BY_RATING[rating] ?? 0;
        const masteryResult = applyMasteryDelta({
          isLearningVerse,
          rawMasteryBefore,
          masteryDelta,
        });

        rawMasteryAfter = masteryResult.rawMasteryAfter;
        graduatesToReview = masteryResult.graduatesToReview;
        stageMasteryAfter = toStageMasteryLevel(rawMasteryAfter);

        if (graduatesToReview) {
          // First review repetition becomes due on the next day.
          nextReviewAt = calcNextReviewAtForReviewRepetition(0);
        } else {
          const score = SCORE_BY_RATING[rating];
          nextReviewAt = calcNextReviewAt(stageMasteryAfter, score);
        }
      }

      const becameLearned = graduatesToReview;

      const nextStatus =
        current.status === VerseStatus.STOPPED
          ? VerseStatus.STOPPED
          : rawMasteryAfter > 0
            ? nextRepetitions >= REPEAT_THRESHOLD_FOR_MASTERED
              ? "MASTERED"
              : graduatesToReview || wasReviewExercise
                ? "REVIEW"
                : VerseStatus.LEARNING
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
        stageMasteryLevel: stageMasteryAfter,
        repetitions: nextRepetitions,
        status: nextStatus,
        // When a verse graduates to REVIEW, reset review rotation to the first review mode.
        lastModeId: !wasReviewExercise && graduatesToReview ? null : trainingModeId,
        lastReviewedAt: now,
        nextReviewAt,
      };

      const updatedList = [...trainingVerses];
      updatedList[trainingIndex] = updated;
      setTrainingVerses(updatedList);
      setPreviewOverride(current.raw, {
        status: updated.status,
        masteryLevel: rawMasteryAfter,
        ...(canUpdateRepetitions ? { repetitions: updated.repetitions } : {}),
      });

      if (becameLearned) {
        haptic("success");
        showFeedback("Стих выучен", "success");
      }

      const nextMode = getModeByShiftInProgressOrder(
        trainingModeId,
        MODE_SHIFT_BY_RATING[rating] ?? 1
      );
      const nextModeForCurrentVerse =
        becameLearned
          ? chooseModeId(updated)
          : !wasReviewExercise && nextMode
            ? nextMode
            : chooseModeId(updated);

      if (
        trainingSubsetFilter !== "catalog" &&
        !matchesTrainingSubsetFilter(updated, trainingSubsetFilter)
      ) {
        showFeedback(
          "Стих вышел из текущего фильтра. Переключаем на «Каталог».",
          "info"
        );
        setTrainingSubsetFilter("catalog");
      }

      setTrainingModeId(nextModeForCurrentVerse);

      try {
        const persistedResponse = await persistTrainingVerseProgress(updated, {
          includeRepetitions: canUpdateRepetitions,
        });

        const persistedStatus = normalizeVerseStatus(
          (persistedResponse?.status as Verse["status"] | undefined) ?? updated.status
        );
        const persistedMasteryLevel = normalizeRawMasteryLevel(
          (persistedResponse?.masteryLevel as number | null | undefined) ?? updated.rawMasteryLevel
        );
        const persistedRepetitions = Math.max(
          0,
          Math.round(
            Number(
              (persistedResponse?.repetitions as number | null | undefined) ?? updated.repetitions
            )
          )
        );
        const persistedLastReviewedAt =
          parseDate(
            (persistedResponse?.lastReviewedAt as string | Date | null | undefined) ??
              updated.lastReviewedAt
          ) ?? updated.lastReviewedAt;
        const persistedNextReviewAt =
          parseDate(
            (persistedResponse?.nextReviewAt as string | Date | null | undefined) ??
              updated.nextReviewAt
          ) ?? null;

        const persistedDisplayStatus =
          persistedStatus === VerseStatus.LEARNING
            ? deriveTrainingDisplayStatus({
                baseStatus: VerseStatus.LEARNING,
                masteryLevel: persistedMasteryLevel,
                repetitions: persistedRepetitions,
                nextReviewAt: persistedNextReviewAt,
              })
            : persistedStatus;

        const persistedUpdated: TrainingVerseState = {
          ...updated,
          raw: {
            ...updated.raw,
            status: persistedDisplayStatus,
            masteryLevel: persistedMasteryLevel,
            repetitions: persistedRepetitions,
            lastReviewedAt: persistedLastReviewedAt
              ? persistedLastReviewedAt.toISOString()
              : null,
            nextReviewAt: persistedNextReviewAt
              ? persistedNextReviewAt.toISOString()
              : null,
          } as Verse,
          status: persistedDisplayStatus,
          rawMasteryLevel: persistedMasteryLevel,
          stageMasteryLevel: toStageMasteryLevel(persistedMasteryLevel),
          repetitions: persistedRepetitions,
          lastReviewedAt: persistedLastReviewedAt,
          nextReviewAt: persistedNextReviewAt,
        };

        setTrainingVerses((prev) => {
          const idx = prev.findIndex((v) => v.key === current.key);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = persistedUpdated;
          return next;
        });

        setPreviewOverride(current.raw, {
          status: persistedUpdated.status,
          masteryLevel: persistedUpdated.rawMasteryLevel,
          repetitions: persistedUpdated.repetitions,
          lastReviewedAt: persistedUpdated.lastReviewedAt ?? null,
          nextReviewAt: persistedUpdated.nextReviewAt ?? null,
        });

        onVersePatched?.({
          target: { id: current.raw.id, externalVerseId: current.externalVerseId },
          patch: {
            status: persistedUpdated.status,
            masteryLevel: persistedUpdated.rawMasteryLevel,
            repetitions: persistedUpdated.repetitions,
            lastReviewedAt: persistedUpdated.lastReviewedAt?.toISOString() ?? null,
            nextReviewAt: persistedUpdated.nextReviewAt?.toISOString() ?? null,
          },
        });

        const contactToast = getTrainingContactToastPayload({
          wasReviewExercise,
          reviewWasSuccessful,
          reference: persistedUpdated.raw.reference,
          finalStatus: persistedUpdated.status,
          nextReviewAt: persistedUpdated.nextReviewAt,
          beforeRawMasteryLevel: current.rawMasteryLevel,
          afterRawMasteryLevel: persistedUpdated.rawMasteryLevel,
        });

        const milestonePopup = getTrainingMilestonePopupPayload({
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

        onDailyGoalProgressEvent?.({
          source: "verse-gallery",
          externalVerseId: persistedUpdated.externalVerseId,
          reference: persistedUpdated.raw.reference,
          saved: true,
          before: {
            status: String(current.status),
            masteryLevel: Number(current.rawMasteryLevel ?? 0),
            repetitions: Number(current.repetitions ?? 0),
            lastReviewedAt: current.lastReviewedAt
              ? current.lastReviewedAt.toISOString()
              : null,
          },
          after: {
            status: String(persistedUpdated.status),
            masteryLevel: Number(persistedUpdated.rawMasteryLevel ?? 0),
            repetitions: Number(persistedUpdated.repetitions ?? 0),
            lastReviewedAt: persistedUpdated.lastReviewedAt
              ? persistedUpdated.lastReviewedAt.toISOString()
              : null,
          },
          occurredAt: new Date().toISOString(),
        });

        showTrainingContactToast(contactToast);
        if (milestonePopup) {
          showTrainingMilestonePopup(milestonePopup);
        }

        const shouldMoveToNextVerse =
          wasReviewExercise || becameLearned || persistedUpdated.status === "MASTERED";
        if (shouldMoveToNextVerse) {
          removeCompletedTrainingVerseAndNavigate(1);
        }
      } catch (error) {
        console.error("Failed to persist training progress", error);
        haptic("error");
        showFeedback("Ошибка — попробуйте ещё раз", "error");
      }
    },
    [
      onDailyGoalProgressEvent,
      onVersePatched,
      panelMode,
      removeCompletedTrainingVerseAndNavigate,
      setPreviewOverride,
      showFeedback,
      showTrainingContactToast,
      showTrainingMilestonePopup,
      trainingIndex,
      trainingModeId,
      trainingSubsetFilter,
      trainingVerses,
    ]
  );

  const stableStartTrainingFromActiveVerse = useEventCallback(startTrainingFromActiveVerse);
  const stableHandleTrainingRate = useEventCallback(handleTrainingRate);
  const stableHandleTrainingNavigationStep = useEventCallback(handleTrainingNavigationStep);
  const stableHandleTrainingBackAction = useEventCallback(handleTrainingBackAction);

  // Auto-start training when gallery opens directly in training mode
  useEffect(() => {
    if (!autoStartInTraining) return;
    if (autoStartedTrainingRef.current) return;
    if (panelMode !== "preview") return;
    if (!previewActiveVerse) return;
    if (actionPending) return;

    autoStartedTrainingRef.current = true;
    setIsAutoStartingTraining(true);
    let cancelled = false;

    void (async () => {
      try {
        await stableStartTrainingFromActiveVerse();
      } finally {
        if (!cancelled) setIsAutoStartingTraining(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    autoStartInTraining,
    panelMode,
    previewActiveVerse,
    actionPending,
    stableStartTrainingFromActiveVerse,
  ]);

  return {
    panelMode,
    trainingActiveVerse,
    trainingIndex,
    trainingModeId,
    trainingSubsetFilter,
    trainingEligibleIndices,
    isAutoStartingTraining,
    trainingRendererRef,
    startTrainingFromActiveVerse: stableStartTrainingFromActiveVerse,
    handleTrainingRate: stableHandleTrainingRate,
    handleTrainingNavigationStep: stableHandleTrainingNavigationStep,
    exitTrainingMode,
    handleTrainingBackAction: stableHandleTrainingBackAction,
    applyUserTrainingSubsetFilter,
  };
}
