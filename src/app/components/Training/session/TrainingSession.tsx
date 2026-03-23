"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, Lightbulb } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import { Button } from "@/app/components/ui/button";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { TrainingCard } from "@/app/components/VerseGallery/components/TrainingCard";
import { MODE_PIPELINE } from "@/app/components/VerseGallery/constants";
import { getVerseIdentity } from "@/app/components/VerseGallery/utils";
import type { TrainingSubsetSelectValue } from "@/app/components/verse-gallery/TrainingSubsetSelect";
import type { Verse } from "@/app/App";
import type { VersePatchEvent } from "@/app/types/verseSync";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { parseExternalVerseId } from "@/shared/bible/externalVerseId";
import type { TrainingOrder } from "../types";
import { useTrainingSession } from "./useTrainingSession";
import { useHintState } from "@/app/components/training-session/modes/useHintState";
import { AssistDrawer } from "@/app/components/training-session/modes/AssistDrawer";
import type { ExerciseProgressSnapshot } from "@/modules/training/hints/types";
import { canDiscardTrainingAttempt } from "@/modules/training/hints/hintEngine";
import { isLateStageReview } from "@/shared/constants/training";
import {
  buildExerciseResultState,
  type TrainingResultState,
} from "./trainingResultState";
import { TrainingResultScreen } from "./TrainingResultScreen";
import { TrainingRatingButtons } from "@/app/components/training-session/modes/TrainingRatingButtons";
import { TrainingConfirmDialog } from "./TrainingConfirmDialog";
import type { TrainingExerciseResolution } from "@/app/components/training-session/modes/exerciseResult";
import type { TrainingModeInlineActionsProps } from "@/app/components/training-session/TrainingModeRenderer";

/* ── Animation variants ── */

const slideVariants = {
  enter: (dir: number) =>
    dir === 0
      ? { opacity: 0, scale: 1, y: 0 }
      : { y: dir > 0 ? "60%" : "-60%", opacity: 0, scale: 0.95 },
  center: (dir: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition:
      dir === 0
        ? {
            duration: 0.22,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          }
        : { type: "spring" as const, stiffness: 320, damping: 32 },
  }),
  exit: (dir: number) =>
    dir === 0
      ? {
          opacity: 0,
          scale: 1,
          transition: { duration: 0.15, ease: "easeIn" as const },
        }
      : {
          y: dir > 0 ? "-18%" : "18%",
          opacity: 0,
          scale: 0.92,
          transition: { duration: 0.2, ease: "easeIn" as const },
        },
};

/* ── Subset / ordering helpers ── */

function getSubsetCounts(verses: Verse[]) {
  return verses.reduce(
    (acc, verse) => {
      const status = normalizeDisplayVerseStatus(verse.status);
      if (status === "LEARNING") acc.learning += 1;
      if (status === "REVIEW") acc.review += 1;
      return acc;
    },
    { learning: 0, review: 0 }
  );
}

function getSubsetOptions(verses: Verse[]): TrainingSubsetSelectValue[] {
  const counts = getSubsetCounts(verses);
  const options: TrainingSubsetSelectValue[] = [];
  if (counts.learning > 0 && counts.review > 0) options.push("catalog");
  if (counts.learning > 0) options.push("learning");
  if (counts.review > 0) options.push("review");
  return options.length > 0 ? options : ["catalog"];
}

function resolveSubsetFilter(
  requested: TrainingSubsetSelectValue,
  options: TrainingSubsetSelectValue[]
): TrainingSubsetSelectValue {
  if (options.includes(requested)) return requested;
  return options[0] ?? "catalog";
}

function filterVersesBySubset(
  verses: Verse[],
  subsetFilter: TrainingSubsetSelectValue
): Verse[] {
  if (subsetFilter === "catalog") return verses;
  return verses.filter((verse) => {
    const status = normalizeDisplayVerseStatus(verse.status);
    return subsetFilter === "learning"
      ? status === "LEARNING"
      : status === "REVIEW";
  });
}

function getSafeTimestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getActivityTimestampMs(verse: Verse) {
  return Math.max(
    getSafeTimestampMs(verse.updatedAt ?? null),
    getSafeTimestampMs(verse.lastReviewedAt),
    getSafeTimestampMs(verse.createdAt ?? null)
  );
}

function compareCanonically(a: Verse, b: Verse) {
  const parsedA = parseExternalVerseId(a.externalVerseId);
  const parsedB = parseExternalVerseId(b.externalVerseId);
  if (parsedA && parsedB) {
    return (
      parsedA.book - parsedB.book ||
      parsedA.chapter - parsedB.chapter ||
      parsedA.verseStart - parsedB.verseStart ||
      parsedA.verseEnd - parsedB.verseEnd
    );
  }
  return String(a.externalVerseId).localeCompare(
    String(b.externalVerseId),
    "ru"
  );
}

function sortVersesByOrder(verses: Verse[], order: TrainingOrder): Verse[] {
  return verses
    .map((verse, index) => ({ verse, index }))
    .sort((a, b) => {
      if (order === "updatedAt") {
        const activityDelta =
          getActivityTimestampMs(b.verse) - getActivityTimestampMs(a.verse);
        if (activityDelta !== 0) return activityDelta;
      }
      if (order === "popularity") {
        const popularityDelta =
          (b.verse.popularityValue ?? 0) - (a.verse.popularityValue ?? 0);
        if (popularityDelta !== 0) return popularityDelta;
      }
      const canonicalDelta = compareCanonically(a.verse, b.verse);
      if (canonicalDelta !== 0) return canonicalDelta;
      return a.index - b.index;
    })
    .map(({ verse }) => verse);
}

/* ── Pending action state machine ── */

type PendingAction =
  | { kind: "navigation"; step: 1 | -1 }
  | { kind: "subset"; value: TrainingSubsetSelectValue }
  | { kind: "order"; value: TrainingOrder }
  | { kind: "close" }
  | null;

/* ── Component ── */

interface TrainingSessionProps {
  verses: Verse[];
  initialSubsetFilter: TrainingSubsetSelectValue;
  initialOrder: TrainingOrder;
  initialVerseExternalId?: string | null;
  onClose: () => void;
  onVersePatched?: (event: VersePatchEvent) => void;
  onMutationCommitted?: () => void;
}

export function TrainingSession({
  verses: sourceVerses,
  initialSubsetFilter,
  initialOrder,
  initialVerseExternalId = null,
  onClose,
  onVersePatched,
  onMutationCommitted,
}: TrainingSessionProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;

  /* ── UI state ── */
  const [direction, setDirection] = useState(0);
  const [hasInteractionStarted, setHasInteractionStarted] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [exerciseRetryNonce, setExerciseRetryNonce] = useState(0);
  const [localResult, setLocalResult] = useState<TrainingResultState | null>(
    null
  );
  const versePeekTimeoutRef = useRef<number | null>(null);
  const [subsetFilter, setSubsetFilter] = useState<TrainingSubsetSelectValue>(
    () =>
      resolveSubsetFilter(initialSubsetFilter, getSubsetOptions(sourceVerses))
  );
  const [activeOrder, setActiveOrder] = useState<TrainingOrder>(initialOrder);
  const [assistDrawerOpen, setAssistDrawerOpen] = useState(false);

  /* ── Subset / order / session ── */
  const subsetOptions = useMemo(
    () => getSubsetOptions(sourceVerses),
    [sourceVerses]
  );

  useEffect(() => {
    setSubsetFilter((current) => {
      if (subsetOptions.includes(current)) return current;
      return resolveSubsetFilter(initialSubsetFilter, subsetOptions);
    });
  }, [initialSubsetFilter, subsetOptions]);

  useEffect(() => {
    setActiveOrder(initialOrder);
  }, [initialOrder]);

  const resolvedSubsetFilter = resolveSubsetFilter(subsetFilter, subsetOptions);
  const orderedSourceVerses = useMemo(
    () => sortVersesByOrder(sourceVerses, activeOrder),
    [activeOrder, sourceVerses]
  );
  const filteredVerses = useMemo(
    () => filterVersesBySubset(orderedSourceVerses, resolvedSubsetFilter),
    [orderedSourceVerses, resolvedSubsetFilter]
  );

  const session = useTrainingSession({
    verses: filteredVerses,
    initialVerseExternalId,
    onVersePatched,
    onMutationCommitted,
    onSessionComplete: onClose,
  });

  /* ── Reset state on verse/mode/filter change ── */
  useEffect(() => {
    setHasInteractionStarted(false);
    setPendingAction(null);
    setExerciseRetryNonce(0);
    setLocalResult(null);
  }, [
    session.trainingActiveVerse?.key,
    session.trainingModeId,
    resolvedSubsetFilter,
    activeOrder,
  ]);

  /* ── Direction animation reset ── */
  useEffect(() => {
    if (direction === 0 || typeof window === "undefined") return;
    const timeoutId = window.setTimeout(() => setDirection(0), 260);
    return () => window.clearTimeout(timeoutId);
  }, [direction, session.trainingActiveVerse?.key]);

  /* ── Derived values (memoized) ── */
  const trainingActiveVerse = session.trainingActiveVerse;
  const trainingModeId = session.trainingModeId;

  const bodyKey = useMemo(
    () =>
      trainingActiveVerse
        ? getVerseIdentity(trainingActiveVerse.raw)
        : `empty:${resolvedSubsetFilter}:${activeOrder}`,
    [trainingActiveVerse, resolvedSubsetFilter, activeOrder]
  );

  const hintAttemptKey = `${bodyKey}:${trainingModeId ?? "none"}:${exerciseRetryNonce}`;

  const hintAttemptPhase: "learning" | "review" =
    trainingActiveVerse?.status === "REVIEW" ||
    trainingActiveVerse?.status === "MASTERED"
      ? "review"
      : "learning";

  const isLateStage = useMemo(
    () =>
      isLateStageReview(
        hintAttemptPhase,
        trainingActiveVerse?.repetitions ?? 0
      ),
    [hintAttemptPhase, trainingActiveVerse?.repetitions]
  );

  const activeRendererKey = useMemo(
    () => (trainingModeId ? MODE_PIPELINE[trainingModeId].renderer : null),
    [trainingModeId]
  );

  const useInlineExerciseActions = activeRendererKey !== null;
  const isHintableMode = Boolean(trainingModeId && trainingModeId >= 1);

  /* ── Hint state ── */
  const activeVerseRaw = trainingActiveVerse?.raw;
  const hintHelpers = useHintState({
    attemptKey: hintAttemptKey,
    phase: hintAttemptPhase,
    verseText: activeVerseRaw?.text ?? "",
    modeId: trainingModeId ?? undefined,
    difficultyLevel: activeVerseRaw?.difficultyLevel,
  });

  /* ── Verse peek timeout ── */
  const clearVersePeekTimeout = useCallback(() => {
    if (versePeekTimeoutRef.current !== null) {
      window.clearTimeout(versePeekTimeoutRef.current);
      versePeekTimeoutRef.current = null;
    }
  }, []);

  const activeVersePeek =
    hintHelpers.hintState.activeHintContent?.variant === "full_text_preview"
      ? hintHelpers.hintState.activeHintContent
      : null;

  const isShowingResultScreen = localResult !== null;

  /* ── Derived UI flags (memoized) ── */
  const showQuickForgetAction = useMemo(
    () =>
      Boolean(
        trainingActiveVerse &&
          trainingModeId &&
          trainingModeId > 1 &&
          hintAttemptPhase === "learning" &&
          !isShowingResultScreen &&
          hintHelpers.hintState.flowState === "active"
      ),
    [
      trainingActiveVerse,
      trainingModeId,
      hintAttemptPhase,
      isShowingResultScreen,
      hintHelpers.hintState.flowState,
    ]
  );

  const showAssistButton = isHintableMode && !isShowingResultScreen && !isLateStage;

  /* ── Discardable attempt checks (memoized) ── */
  const hasDiscardableAttempt = useMemo(() => {
    const { attempt, flowState } = hintHelpers.hintState;
    if (!canDiscardTrainingAttempt(flowState)) return false;
    return (
      flowState === "awaiting_rating" ||
      attempt.assistHistory.length > 0 ||
      (attempt.progress?.completedCount ?? 0) > 0 ||
      (attempt.progress?.mistakeCount ?? 0) > 0
    );
  }, [hintHelpers.hintState]);

  const hasCorrectTrainingProgress = useMemo(() => {
    const { attempt, flowState } = hintHelpers.hintState;
    return (
      flowState === "awaiting_rating" ||
      (attempt.progress?.completedCount ?? 0) > 0
    );
  }, [hintHelpers.hintState]);

  const shouldConfirmSessionExit =
    hasInteractionStarted || hasDiscardableAttempt;

  /* ── Core actions (useCallback to avoid stale closures) ── */

  const discardCurrentAttempt = useCallback(() => {
    if (!hasDiscardableAttempt) return;
    hintHelpers.abandonAttempt();
  }, [hasDiscardableAttempt, hintHelpers]);

  const handleProgressChange = useCallback(
    (progress: ExerciseProgressSnapshot) => {
      hintHelpers.updateProgress(progress);
    },
    [hintHelpers.updateProgress]
  );

  const resetCurrentExercise = useCallback(() => {
    clearVersePeekTimeout();
    setAssistDrawerOpen(false);
    hintHelpers.dismissHintContent();
    hintHelpers.resetHints();
    setHasInteractionStarted(false);
    setLocalResult(null);
    setExerciseRetryNonce((prev) => prev + 1);
  }, [clearVersePeekTimeout, hintHelpers.dismissHintContent, hintHelpers.resetHints]);

  const handleRetryCurrentExercise = useCallback(() => {
    if (
      session.isActionPending ||
      session.quickForgetConfirmStage !== null ||
      (pendingAction !== null && pendingAction.kind === "close")
    ) {
      return;
    }
    resetCurrentExercise();
  }, [pendingAction, resetCurrentExercise, session.isActionPending, session.quickForgetConfirmStage]);

  /* ── Hint attempt reset on key change ── */
  useEffect(() => {
    clearVersePeekTimeout();
    setAssistDrawerOpen(false);
    hintHelpers.dismissHintContent();
  }, [clearVersePeekTimeout, hintAttemptKey, hintHelpers.dismissHintContent]);

  useEffect(() => {
    return () => clearVersePeekTimeout();
  }, [clearVersePeekTimeout]);

  /* ── Assist / show verse handlers ── */
  const handleRequestAssist = useCallback(() => {
    setHasInteractionStarted(true);
    hintHelpers.requestAssist();
  }, [hintHelpers.requestAssist]);

  const handleRequestShowVerse = useCallback(() => {
    setHasInteractionStarted(true);
    setAssistDrawerOpen(false);
    hintHelpers.requestShowVerse();
  }, [hintHelpers.requestShowVerse]);

  /* ── Exercise resolved ── */
  const handleExerciseResolved = useCallback(
    (result: TrainingExerciseResolution) => {
      if (!trainingActiveVerse) return;
      clearVersePeekTimeout();
      setAssistDrawerOpen(false);
      hintHelpers.dismissHintContent();
      setHasInteractionStarted(true);
      setLocalResult(
        buildExerciseResultState({
          result,
          reference: trainingActiveVerse.raw.reference,
          verseText: trainingActiveVerse.raw.text,
          status: trainingActiveVerse.status,
          trainingModeId,
          ratingPolicy: hintHelpers.hintState.ratingPolicy,
        })
      );
    },
    [
      clearVersePeekTimeout,
      hintHelpers.dismissHintContent,
      hintHelpers.hintState.ratingPolicy,
      trainingActiveVerse,
      trainingModeId,
    ]
  );

  /* ── Rating commit ── */
  const handleResultRating = useCallback(
    async (rating: 0 | 1 | 2 | 3) => {
      if (!localResult || rating === 0) return;
      const outcome = await session.handleRate(
        rating,
        hintHelpers.hintState.attempt
      );
      if (outcome === "continued") {
        resetCurrentExercise();
        setLocalResult(null);
      }
    },
    [hintHelpers.hintState.attempt, localResult, resetCurrentExercise, session]
  );

  /* ── Verse peek auto-dismiss ── */
  useEffect(() => {
    clearVersePeekTimeout();
    if (!activeVersePeek) return;

    const durationSeconds =
      activeVersePeek.durationSeconds ??
      hintHelpers.hintState.showVerseDurationSeconds;

    versePeekTimeoutRef.current = window.setTimeout(() => {
      hintHelpers.dismissHintContent();
      versePeekTimeoutRef.current = null;
    }, durationSeconds * 1000);

    return () => clearVersePeekTimeout();
  }, [
    activeVersePeek,
    clearVersePeekTimeout,
    hintHelpers.dismissHintContent,
    hintHelpers.hintState.showVerseDurationSeconds,
  ]);

  /* ── Navigation request (with progress guard) ── */
  const requestNavigationStep = useCallback(
    (step: 1 | -1) => {
      if (
        session.isActionPending ||
        session.quickForgetConfirmStage !== null ||
        isShowingResultScreen ||
        pendingAction !== null
      ) {
        return;
      }

      if (!hasCorrectTrainingProgress) {
        setDirection(step);
        session.handleNavigationStep(step);
        return;
      }

      setPendingAction({ kind: "navigation", step });
    },
    [
      hasCorrectTrainingProgress,
      isShowingResultScreen,
      pendingAction,
      session,
    ]
  );

  /* ── Pending action confirm / cancel ── */
  const cancelPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  const confirmPendingAction = useCallback(async () => {
    if (pendingAction === null) return;
    const action = pendingAction;
    setPendingAction(null);
    discardCurrentAttempt();
    setHasInteractionStarted(false);

    switch (action.kind) {
      case "navigation":
        setDirection(action.step);
        session.handleNavigationStep(action.step);
        break;
      case "subset":
        setDirection(0);
        setSubsetFilter(action.value);
        break;
      case "order":
        setDirection(0);
        setActiveOrder(action.value);
        break;
      case "close":
        session.handleClose();
        break;
    }
  }, [pendingAction, discardCurrentAttempt, session]);

  /* ── Session close request ── */
  const requestCloseSession = useCallback(() => {
    if (!shouldConfirmSessionExit) {
      session.handleClose();
      return;
    }
    setPendingAction({ kind: "close" });
  }, [shouldConfirmSessionExit, session]);

  /* ── Back button handler ── */
  const handleTrainingBackAction = useCallback(() => {
    if (assistDrawerOpen) {
      setAssistDrawerOpen(false);
      return;
    }
    if (session.quickForgetConfirmStage !== null) {
      session.cancelQuickForget();
      return;
    }
    if (pendingAction !== null) {
      cancelPendingAction();
      return;
    }
    requestCloseSession();
  }, [
    assistDrawerOpen,
    cancelPendingAction,
    pendingAction,
    requestCloseSession,
    session,
  ]);

  useTelegramBackButton({
    enabled: true,
    onBack: handleTrainingBackAction,
    priority: 60,
  });

  /* ── Keyboard Escape ── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        session.quickForgetConfirmStage !== null ||
        pendingAction !== null
      ) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        requestCloseSession();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [session.quickForgetConfirmStage, pendingAction, requestCloseSession]);

  /* ── Navigation flags ── */
  const canNavigatePrev = session.trainingIndex > 0;
  const canNavigateNext =
    session.trainingIndex < session.trainingVerseCount - 1;
  const isNavigationBlocked =
    session.isActionPending ||
    session.quickForgetConfirmStage !== null ||
    isShowingResultScreen ||
    pendingAction !== null;

  /* ── Stable inline actions object (memoized) ── */
  const inlineExerciseActions = useMemo<
    TrainingModeInlineActionsProps | undefined
  >(
    () =>
      useInlineExerciseActions
        ? {
            showInlineAssistButton: showAssistButton,
            onRequestInlineAssist: () => setAssistDrawerOpen(true),
            showInlineQuickForgetAction: showQuickForgetAction,
            onRequestInlineQuickForget: () => {
              setHasInteractionStarted(true);
              session.requestQuickForget();
            },
            inlineActionsDisabled: session.isActionPending,
          }
        : undefined,
    [
      useInlineExerciseActions,
      showAssistButton,
      showQuickForgetAction,
      session.isActionPending,
      session.requestQuickForget,
    ]
  );

  const markInteractionStarted = useCallback(() => {
    setHasInteractionStarted(true);
  }, []);

  /* ── Pending action dialog config ── */
  const pendingDialogConfig = useMemo(() => {
    if (!pendingAction) return null;
    switch (pendingAction.kind) {
      case "navigation":
        return {
          title: "Перейти к другому стиху?",
          description:
            "Если перейти сейчас, прогресс текущего упражнения не сохранится.",
          confirmLabel: "Перейти без сохранения",
          variant: "destructive" as const,
        };
      case "subset":
        return {
          title: "Сменить режим тренировки?",
          description:
            "Если переключить режим сейчас, прогресс текущего упражнения не сохранится.",
          confirmLabel: "Переключить",
          variant: "primary" as const,
        };
      case "order":
        return {
          title: "Изменить сортировку?",
          description:
            "Если сменить порядок сейчас, текущее упражнение перезапустится с новым списком карточек.",
          confirmLabel: "Изменить",
          variant: "primary" as const,
        };
      case "close":
        return {
          title: "Закрыть тренировку?",
          description:
            "Текущая попытка будет закрыта без сохранения и не восстановится автоматически при следующем входе.",
          confirmLabel: "Закрыть без сохранения",
          variant: "destructive" as const,
        };
    }
  }, [pendingAction]);

  /* ── Render ── */
  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Тренировка"
        data-tour="training-session-shell"
        className="fixed inset-0 z-50 flex flex-col overflow-hidden overscroll-none bg-gradient-to-br from-background via-background to-muted/20"
      >
        {/* ── Header ── */}
        <div
          className="shrink-0 border-b border-border/40 bg-background/75 backdrop-blur-xl z-40"
          style={{ paddingTop: `${topInset}px` }}
        >
          <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-2.5 sm:px-6">
            <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 uppercase text-sm font-semibold text-foreground/75">
              {`${session.trainingIndex + 1} / ${session.trainingVerseCount}`}
            </p>
          </div>
        </div>

        {/* ── Body (carousel) ── */}
        <div
          className="relative flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6"
          role="region"
          aria-roledescription="carousel"
          aria-label="Карточки обучения"
        >
          <AnimatePresence initial={false} mode="sync" custom={direction}>
            <motion.div
              key={`${resolvedSubsetFilter}:${activeOrder}:${bodyKey}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 flex flex-col px-4 pb-0 pt-1 sm:px-6 focus-visible:outline-none"
              tabIndex={-1}
            >
              {localResult ? (
                <TrainingResultScreen result={localResult} />
              ) : trainingActiveVerse && trainingModeId ? (
                <TrainingCard
                  dataTour="training-session-card"
                  trainingVerse={trainingActiveVerse}
                  modeId={trainingModeId}
                  rendererRef={session.rendererRef}
                  onTrainingInteractionStart={markInteractionStarted}
                  onExerciseResolved={handleExerciseResolved}
                  hideRatingFooter
                  isLateStageReview={isLateStage}
                  hintState={isHintableMode ? hintHelpers.hintState : undefined}
                  onProgressChange={
                    isHintableMode ? handleProgressChange : undefined
                  }
                  exerciseRetryNonce={exerciseRetryNonce}
                  inlineExerciseActions={inlineExerciseActions}
                />
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <p className="px-6 text-center text-sm text-foreground/55">
                    Нет стихов для тренировки в выбранной комбинации фильтра и
                    сортировки
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div
          style={{ paddingBottom: `${Math.max(12, bottomInset)}px` }}
          className="shrink-0 border-t border-border/30 bg-card/90 backdrop-blur-xl relative"
        >
          {localResult ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-3 sm:px-6">
              {localResult.footerMode === "rating-with-retry" ? (
                <TrainingRatingButtons
                  stage={localResult.ratingStage}
                  onRate={(rating) => void handleResultRating(rating)}
                  onRetryCurrentExercise={handleRetryCurrentExercise}
                  ratingPolicy={localResult.ratingPolicy}
                  allowEasySkip={localResult.allowEasySkip}
                  excludeForget
                  lateStageReview={isLateStage}
                  disabled={session.isActionPending}
                />
              ) : (
                <Button
                  type="button"
                  className="mx-auto h-11 w-full max-w-lg rounded-2xl border border-primary/25 bg-primary/85 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                  onClick={handleRetryCurrentExercise}
                  disabled={session.isActionPending}
                >
                  Повторить ещё раз
                </Button>
              )}
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-3 py-2 sm:px-6">
              <div className="flex flex-1 items-center justify-start gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl text-foreground/75"
                  disabled={!canNavigatePrev || isNavigationBlocked}
                  onClick={() => requestNavigationStep(-1)}
                  aria-label="Предыдущий стих"
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>

                {showAssistButton && !useInlineExerciseActions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-[-50px] h-9 w-9 z-[60] p-2 border border-border/60 bg-background backdrop-blur-xl rounded-xl text-amber-700/90 hover:bg-amber-500/10 dark:text-amber-300"
                      onClick={() => setAssistDrawerOpen(true)}
                      disabled={session.isActionPending}
                      aria-label="Помощь"
                      title="Помощь"
                    >
                      <Lightbulb className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-center gap-2">
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-border/60 bg-background/80 px-3 text-sm text-foreground/80 backdrop-blur-xl"
                  onClick={requestCloseSession}
                  disabled={session.isActionPending}
                >
                  Завершить
                </Button>
              </div>

              <div className="flex flex-1 items-center justify-end gap-1.5">
                {showQuickForgetAction && !useInlineExerciseActions && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-xl px-2.5 text-xs text-rose-700/90 hover:bg-rose-500/10 dark:text-rose-300"
                    onClick={() => {
                      setHasInteractionStarted(true);
                      session.requestQuickForget();
                    }}
                    disabled={session.isActionPending}
                  >
                    Забыл
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl text-foreground/75"
                  disabled={!canNavigateNext || isNavigationBlocked}
                  onClick={() => requestNavigationStep(1)}
                  aria-label="Следующий стих"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Verse peek overlay (z-[55] to sit above main z-50 container) ── */}
        <AnimatePresence>
          {activeVersePeek && !isShowingResultScreen && (
            <motion.div
              key={`${hintAttemptKey}:verse-peek`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[55] flex items-center justify-center bg-background/88 px-6 py-8 backdrop-blur-md"
            >
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 rounded-[32px] border border-border/60 bg-background/92 px-6 py-8 text-center shadow-2xl backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700/80 dark:text-amber-300/80">
                  Полный стих на{" "}
                  {activeVersePeek.durationSeconds ??
                    hintHelpers.hintState.showVerseDurationSeconds}{" "}
                  сек.
                </p>
                {activeVerseRaw?.reference ? (
                  <p className="text-sm font-semibold text-foreground/70">
                    {activeVerseRaw.reference}
                  </p>
                ) : null}
                <p className="whitespace-pre-line text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
                  {activeVersePeek.text}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Quick Forget drawer ── */}
      <Drawer
        open={session.quickForgetConfirmStage !== null}
        onOpenChange={(open) => {
          if (!open) session.cancelQuickForget();
        }}
      >
        <DrawerContent>
          <DrawerHeader className="pb-1">
            <DrawerTitle className="text-base text-foreground/90">
              Отметить как «забыл»?
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground/80">
              Текущий шаг будет засчитан как «Забыл» и рейтинг снизится согласно
              правилам этапа изучения.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="flex-row gap-3 pt-2">
            <DrawerClose asChild>
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-2xl border-border/60 bg-muted/35 text-sm font-medium text-foreground/70"
                onClick={session.cancelQuickForget}
              >
                Отмена
              </Button>
            </DrawerClose>
            <Button
              className="flex-1 h-12 rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] text-sm font-semibold text-rose-800 shadow-sm hover:bg-rose-500/[0.12] dark:text-rose-200"
              onClick={() =>
                session.confirmQuickForget(hintHelpers.hintState.attempt)
              }
            >
              Подтвердить
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ── Unified pending-action confirm dialog ── */}
      {pendingDialogConfig && (
        <TrainingConfirmDialog
          open={pendingAction !== null}
          onOpenChange={(open) => {
            if (!open) cancelPendingAction();
          }}
          title={pendingDialogConfig.title}
          description={pendingDialogConfig.description}
          confirmLabel={pendingDialogConfig.confirmLabel}
          onCancel={cancelPendingAction}
          onConfirm={() => void confirmPendingAction()}
          variant={pendingDialogConfig.variant}
        />
      )}

      {/* ── Assist drawer ── */}
      {isHintableMode && (
        <AssistDrawer
          open={assistDrawerOpen}
          onOpenChange={setAssistDrawerOpen}
          hintState={hintHelpers.hintState}
          onRequestAssist={handleRequestAssist}
          onRequestShowVerse={handleRequestShowVerse}
        />
      )}
    </>
  );
}
