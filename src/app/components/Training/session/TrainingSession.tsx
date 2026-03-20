"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { getTelegramWebApp } from "@/app/lib/telegramWebApp";
import { TrainingCard } from "@/app/components/VerseGallery/components/TrainingCard";
import { getVerseIdentity } from "@/app/components/VerseGallery/utils";
import type { TrainingSubsetSelectValue } from "@/app/components/verse-gallery/TrainingSubsetSelect";
import type { Verse } from "@/app/App";
import type { VersePatchEvent } from "@/app/types/verseSync";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { parseExternalVerseId } from "@/shared/bible/externalVerseId";
import type { TrainingOrder } from "../types";
import { TrainingOutcomeCard } from "./TrainingOutcomeCard";
import { useTrainingSession } from "./useTrainingSession";
import { TrainingProgressPopup } from "../TrainingProgressPopup";
import { useHintState } from "@/app/components/training-session/modes/useHintState";
import { AssistDrawer } from "@/app/components/training-session/modes/AssistDrawer";
import type { ExerciseProgressSnapshot } from "@/modules/training/hints/types";
import { canDiscardTrainingAttempt } from "@/modules/training/hints/hintEngine";
import { isLateStageReview } from "@/shared/constants/training";

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

  const [direction, setDirection] = useState(0);
  const [hasInteractionStarted, setHasInteractionStarted] = useState(false);
  const [pendingNavigationStep, setPendingNavigationStep] = useState<
    1 | -1 | null
  >(null);
  const [pendingSubsetChange, setPendingSubsetChange] =
    useState<TrainingSubsetSelectValue | null>(null);
  const [pendingOrderChange, setPendingOrderChange] =
    useState<TrainingOrder | null>(null);
  const [pendingCloseConfirm, setPendingCloseConfirm] = useState(false);
  const versePeekTimeoutRef = useRef<number | null>(null);
  const [subsetFilter, setSubsetFilter] = useState<TrainingSubsetSelectValue>(
    () => resolveSubsetFilter(initialSubsetFilter, getSubsetOptions(sourceVerses))
  );
  const [activeOrder, setActiveOrder] = useState<TrainingOrder>(initialOrder);

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

  useEffect(() => {
    setHasInteractionStarted(false);
    setPendingNavigationStep(null);
    setPendingSubsetChange(null);
    setPendingOrderChange(null);
    setPendingCloseConfirm(false);
  }, [session.trainingActiveVerse?.key, resolvedSubsetFilter, activeOrder]);

  useEffect(() => {
    if (direction === 0 || typeof window === "undefined") return;
    const timeoutId = window.setTimeout(() => {
      setDirection(0);
    }, 260);
    return () => window.clearTimeout(timeoutId);
  }, [direction, session.trainingActiveVerse?.key]);

  const markInteractionStarted = useCallback(() => {
    setHasInteractionStarted(true);
  }, []);

  const confirmNavigationStep = useCallback(async () => {
    if (pendingNavigationStep === null) return;
    const step = pendingNavigationStep;
    setPendingNavigationStep(null);
    await discardCurrentAttempt("navigated-away");
    setHasInteractionStarted(false);
    setDirection(step);
    session.handleNavigationStep(step);
  }, [pendingNavigationStep, session]);

  const cancelNavigationStep = useCallback(() => {
    setPendingNavigationStep(null);
  }, []);

  const confirmSubsetChange = useCallback(async () => {
    if (pendingSubsetChange === null) return;
    const nextSubset = pendingSubsetChange;
    await discardCurrentAttempt("subset-changed");
    setPendingSubsetChange(null);
    setHasInteractionStarted(false);
    setDirection(0);
    setSubsetFilter(nextSubset);
  }, [pendingSubsetChange]);

  const cancelSubsetChange = useCallback(() => {
    setPendingSubsetChange(null);
  }, []);

  const confirmOrderChange = useCallback(async () => {
    if (pendingOrderChange === null) return;
    const nextOrder = pendingOrderChange;
    await discardCurrentAttempt("order-changed");
    setPendingOrderChange(null);
    setHasInteractionStarted(false);
    setDirection(0);
    setActiveOrder(nextOrder);
  }, [pendingOrderChange]);

  const cancelOrderChange = useCallback(() => {
    setPendingOrderChange(null);
  }, []);

  const trainingActiveVerse = session.trainingActiveVerse;
  const trainingModeId = session.trainingModeId;
  const bodyKey = trainingActiveVerse
    ? getVerseIdentity(trainingActiveVerse.raw)
    : `empty:${resolvedSubsetFilter}:${activeOrder}`;
  const hintAttemptKey = `${bodyKey}:${trainingModeId ?? "none"}`;
  const hintAttemptPhase: "learning" | "review" =
    trainingActiveVerse?.status === "REVIEW" ||
    trainingActiveVerse?.status === "MASTERED"
      ? "review"
      : "learning";

  const isLateStage = isLateStageReview(
    hintAttemptPhase,
    trainingActiveVerse?.repetitions ?? 0
  );

  const isHintableMode = Boolean(trainingModeId && trainingModeId >= 1);
  const [assistDrawerOpen, setAssistDrawerOpen] = useState(false);
  const activeVerseRaw = trainingActiveVerse?.raw;
  const hintHelpers = useHintState({
    attemptKey: hintAttemptKey,
    phase: hintAttemptPhase,
    verseText: activeVerseRaw?.text ?? "",
    modeId: trainingModeId ?? undefined,
    difficultyLevel: activeVerseRaw?.difficultyLevel,
  });

  const showQuickForgetAction = Boolean(
    trainingActiveVerse &&
      trainingModeId &&
      trainingModeId > 1 &&
      hintAttemptPhase === "learning" &&
      session.pendingOutcome === null &&
      hintHelpers.hintState.flowState === "active"
  );

  const showAssistButton =
    isHintableMode && !session.pendingOutcome && !isLateStage;

  const activeVersePeek =
    hintHelpers.hintState.activeHintContent?.variant === "full_text_preview"
      ? hintHelpers.hintState.activeHintContent
      : null;

  const clearVersePeekTimeout = useCallback(() => {
    if (versePeekTimeoutRef.current !== null) {
      window.clearTimeout(versePeekTimeoutRef.current);
      versePeekTimeoutRef.current = null;
    }
  }, []);

  const handleProgressChange = useCallback(
    (progress: ExerciseProgressSnapshot) => {
      hintHelpers.updateProgress(progress);
    },
    [hintHelpers.updateProgress]
  );

  useEffect(() => {
    clearVersePeekTimeout();
    setAssistDrawerOpen(false);
    hintHelpers.dismissHintContent();
  }, [clearVersePeekTimeout, hintAttemptKey, hintHelpers.dismissHintContent]);

  useEffect(() => {
    return () => {
      clearVersePeekTimeout();
    };
  }, [clearVersePeekTimeout]);

  const handleRequestAssist = useCallback(() => {
    setHasInteractionStarted(true);
    hintHelpers.requestAssist();
  }, [hintHelpers.requestAssist]);

  const handleRequestShowVerse = useCallback(() => {
    setHasInteractionStarted(true);
    setAssistDrawerOpen(false);
    hintHelpers.requestShowVerse();
  }, [hintHelpers.requestShowVerse]);

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

    return () => {
      clearVersePeekTimeout();
    };
  }, [
    activeVersePeek,
    clearVersePeekTimeout,
    hintHelpers.dismissHintContent,
    hintHelpers.hintState.showVerseDurationSeconds,
  ]);

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

  const requestNavigationStep = useCallback(
    (step: 1 | -1) => {
      if (
        session.isActionPending ||
        session.quickForgetConfirmStage !== null ||
        session.pendingOutcome !== null ||
        pendingCloseConfirm
      ) {
        return;
      }

      if (!hasCorrectTrainingProgress) {
        setDirection(step);
        session.handleNavigationStep(step);
        return;
      }

      setPendingNavigationStep(step);
    },
    [hasCorrectTrainingProgress, pendingCloseConfirm, session]
  );

  const shouldConfirmSessionExit =
    session.pendingOutcome === null &&
    (hasInteractionStarted || hasDiscardableAttempt);

  function discardCurrentAttempt(_reason?: string) {
    if (!hasDiscardableAttempt) return;
    hintHelpers.abandonAttempt();
  }

  function requestCloseSession() {
    if (!shouldConfirmSessionExit) {
      session.handleClose();
      return;
    }
    setPendingCloseConfirm(true);
  }

  async function confirmCloseSession() {
    setPendingCloseConfirm(false);
    await discardCurrentAttempt("session-closed");
    session.handleClose();
  }

  function cancelCloseSession() {
    setPendingCloseConfirm(false);
  }

  const handleTrainingBackAction = useCallback(() => {
    if (assistDrawerOpen) {
      setAssistDrawerOpen(false);
      return;
    }

    if (session.quickForgetConfirmStage !== null) {
      session.cancelQuickForget();
      return;
    }

    if (pendingNavigationStep !== null) {
      cancelNavigationStep();
      return;
    }

    if (pendingSubsetChange !== null) {
      cancelSubsetChange();
      return;
    }

    if (pendingOrderChange !== null) {
      cancelOrderChange();
      return;
    }

    if (pendingCloseConfirm) {
      cancelCloseSession();
      return;
    }

    requestCloseSession();
  }, [
    assistDrawerOpen,
    cancelNavigationStep,
    cancelOrderChange,
    cancelSubsetChange,
    pendingCloseConfirm,
    pendingNavigationStep,
    pendingOrderChange,
    pendingSubsetChange,
    session,
  ]);

  useTelegramBackButton({
    enabled: true,
    onBack: handleTrainingBackAction,
    priority: 60,
  });

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    if (shouldConfirmSessionExit) {
      webApp.enableClosingConfirmation?.();
    } else {
      webApp.disableClosingConfirmation?.();
    }

    return () => {
      webApp.enableClosingConfirmation?.();
    };
  }, [shouldConfirmSessionExit]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && session.pendingOutcome !== null) {
        e.preventDefault();
        requestCloseSession();
        return;
      }

      if (
        session.pendingOutcome !== null ||
        session.quickForgetConfirmStage !== null ||
        pendingNavigationStep !== null ||
        pendingSubsetChange !== null ||
        pendingOrderChange !== null ||
        pendingCloseConfirm
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
  }, [
    session,
    pendingNavigationStep,
    pendingSubsetChange,
    pendingOrderChange,
    pendingCloseConfirm,
  ]);

  useEffect(() => {
    if (!shouldConfirmSessionExit || typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldConfirmSessionExit]);

  const canNavigatePrev = session.trainingIndex > 0;
  const canNavigateNext = session.trainingIndex < session.trainingVerseCount - 1;
  const isNavigationBlocked =
    session.isActionPending ||
    session.quickForgetConfirmStage !== null ||
    session.pendingOutcome !== null ||
    pendingCloseConfirm;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Тренировка"
        data-tour="training-session-shell"
        className="fixed inset-0 z-50 flex flex-col overflow-hidden overscroll-none bg-gradient-to-br from-background via-background to-muted/20"
      >
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {session.feedbackMessage}
        </div>

        <div
          className="shrink-0 border-b border-border/40 bg-background/75 backdrop-blur-xl z-40"
          style={{ paddingTop: `${topInset}px` }}
        >
          <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-2.5 sm:px-6">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Тренировка
            </p>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6"
          role="region"
          aria-roledescription="carousel"
          aria-label="Карточки обучения"
        >
          <TrainingProgressPopup popup={session.progressPopup} />

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
              {trainingActiveVerse && session.pendingOutcome ? (
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <TrainingOutcomeCard
                    trainingVerse={trainingActiveVerse}
                    outcome={session.pendingOutcome}
                  />
                </div>
              ) : trainingActiveVerse && trainingModeId ? (
                <TrainingCard
                  dataTour="training-session-card"
                  trainingVerse={trainingActiveVerse}
                  modeId={trainingModeId}
                  rendererRef={session.rendererRef}
                  onTrainingInteractionStart={markInteractionStarted}
                  onRate={async (rating) => {
                    setHasInteractionStarted(true);
                    await session.handleRate(rating, hintHelpers.hintState.attempt);
                    setHasInteractionStarted(false);
                  }}
                  hideRatingFooter={false}
                  isLateStageReview={isLateStage}
                  hintState={isHintableMode ? hintHelpers.hintState : undefined}
                  onProgressChange={isHintableMode ? handleProgressChange : undefined}
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

        <div
          style={{ paddingBottom: `${Math.max(12, bottomInset)}px` }}
          className="shrink-0 border-t border-border/30 bg-card/90 backdrop-blur-xl"
        >
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
                <ArrowLeft className="h-5 w-5" />
              </Button>

              {showAssistButton && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-xl text-amber-700/90 hover:bg-amber-500/10 dark:text-amber-300",
                    hintHelpers.hintState.assistSuggestion.shouldSuggest &&
                      "animate-pulse"
                  )}
                  onClick={() => setAssistDrawerOpen(true)}
                  disabled={session.isActionPending}
                  aria-label="Помощь"
                  title="Помощь"
                >
                  <Lightbulb className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-center gap-2">
              {session.pendingOutcome && (
                <Button
                  type="button"
                  className="h-9 rounded-xl border border-primary/20 bg-primary/60 px-3 text-sm text-primary-foreground backdrop-blur-xl"
                  onClick={session.acknowledgeOutcome}
                  disabled={session.isActionPending}
                >
                  Продолжить
                </Button>
              )}

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
              {showQuickForgetAction && (
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
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {activeVersePeek && (
            <motion.div
              key={`${hintAttemptKey}:verse-peek`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 px-6 py-8 backdrop-blur-sm"
            >
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700/80 dark:text-amber-300/80">
                  Полный стих на{" "}
                  {activeVersePeek.durationSeconds ??
                    hintHelpers.hintState.showVerseDurationSeconds}{" "}
                  сек.
                </p>
                <p className="whitespace-pre-line text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
                  {activeVersePeek.text}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AlertDialog
        open={session.quickForgetConfirmStage !== null}
        onOpenChange={(open) => {
          if (!open) session.cancelQuickForget();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/90">
              Отметить как «забыл»?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Текущий шаг будет засчитан как «Забыл» и рейтинг снизится согласно
              правилам этапа изучения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full border border-border/60 bg-muted/35 text-foreground/70"
              onClick={session.cancelQuickForget}
            >
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full border border-border/60 bg-destructive text-background hover:bg-destructive/90 dark:text-destructive-foreground/80"
              onClick={() =>
                session.confirmQuickForget(hintHelpers.hintState.attempt)
              }
            >
              Подтвердить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingNavigationStep !== null}
        onOpenChange={(open) => {
          if (!open) cancelNavigationStep();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/90">
              Перейти к другому стиху?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/90">
              Если перейти сейчас, прогресс текущего упражнения не сохранится.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full border border-border/60 bg-muted/35 text-foreground/70"
              onClick={cancelNavigationStep}
            >
              Остаться
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full border border-border/60 bg-destructive text-background dark:text-destructive-foreground/80"
              onClick={confirmNavigationStep}
            >
              Перейти без сохранения
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingSubsetChange !== null}
        onOpenChange={(open) => {
          if (!open) cancelSubsetChange();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/90">
              Сменить режим тренировки?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/90">
              Если переключить режим сейчас, прогресс текущего упражнения не
              сохранится.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full border border-border/60 bg-muted/35 text-foreground/70"
              onClick={cancelSubsetChange}
            >
              Остаться
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full border border-border/60 bg-primary/60 text-background"
              onClick={confirmSubsetChange}
            >
              Переключить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingOrderChange !== null}
        onOpenChange={(open) => {
          if (!open) cancelOrderChange();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/90">
              Изменить сортировку?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/90">
              Если сменить порядок сейчас, текущее упражнение перезапустится с
              новым списком карточек.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full border border-border/60 bg-muted/35 text-foreground/70"
              onClick={cancelOrderChange}
            >
              Остаться
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full border border-border/60 bg-primary/60 text-background"
              onClick={confirmOrderChange}
            >
              Изменить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingCloseConfirm}
        onOpenChange={(open) => {
          if (!open) cancelCloseSession();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/90">
              Закрыть тренировку?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/90">
              Текущая попытка будет закрыта без сохранения и не восстановится
              автоматически при следующем входе.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full border border-border/60 bg-muted/35 text-foreground/70"
              onClick={cancelCloseSession}
            >
              Остаться
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full border border-border/60 bg-destructive text-background dark:text-destructive-foreground/80"
              onClick={() => {
                void confirmCloseSession();
              }}
            >
              Закрыть без сохранения
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isHintableMode && (
        <AssistDrawer
          open={assistDrawerOpen}
          onOpenChange={setAssistDrawerOpen}
          hintState={hintHelpers.hintState}
          onRequestAssist={() => {
            handleRequestAssist();
          }}
          onRequestShowVerse={() => {
            handleRequestShowVerse();
          }}
        />
      )}
    </>
  );
}
