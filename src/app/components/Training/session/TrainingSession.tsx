"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronUp, ChevronDown } from "lucide-react";
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

  return String(a.externalVerseId).localeCompare(String(b.externalVerseId), "ru");
}

function sortVersesByOrder(
  verses: Verse[],
  order: TrainingOrder
): Verse[] {
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
  suppressModeTutorials?: boolean;
  onClose: () => void;
  onVersePatched?: (event: VersePatchEvent) => void;
  onMutationCommitted?: () => void;
}

export function TrainingSession({
  verses: sourceVerses,
  initialSubsetFilter,
  initialOrder,
  initialVerseExternalId = null,
  suppressModeTutorials = false,
  onClose,
  onVersePatched,
  onMutationCommitted,
}: TrainingSessionProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;

  const [direction, setDirection] = useState(0);
  const [hasInteractionStarted, setHasInteractionStarted] = useState(false);
  const [pendingNavigationStep, setPendingNavigationStep] = useState<1 | -1 | null>(null);
  const [pendingSubsetChange, setPendingSubsetChange] =
    useState<TrainingSubsetSelectValue | null>(null);
  const [pendingOrderChange, setPendingOrderChange] =
    useState<TrainingOrder | null>(null);
  const [subsetFilter, setSubsetFilter] = useState<TrainingSubsetSelectValue>(() =>
    resolveSubsetFilter(initialSubsetFilter, getSubsetOptions(sourceVerses))
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

  const requestNavigationStep = useCallback(
    (step: 1 | -1) => {
      if (
        session.isActionPending ||
        session.quickForgetConfirmStage !== null ||
        session.pendingOutcome !== null
      ) {
        return;
      }
      if (!hasInteractionStarted) {
        setDirection(step);
        session.handleNavigationStep(step);
        return;
      }
      setPendingNavigationStep(step);
    },
    [hasInteractionStarted, session]
  );

  const confirmNavigationStep = useCallback(() => {
    if (pendingNavigationStep === null) return;
    const step = pendingNavigationStep;
    setPendingNavigationStep(null);
    setDirection(step);
    session.handleNavigationStep(step);
  }, [pendingNavigationStep, session]);

  const cancelNavigationStep = useCallback(() => {
    setPendingNavigationStep(null);
  }, []);

  // ── Swipe gesture handling ──
  const swipeTouchRef = useRef<{ startY: number; startX: number; startTime: number } | null>(null);
  const SWIPE_THRESHOLD = 50;
  const SWIPE_MAX_HORIZONTAL = 80;
  const SWIPE_MAX_TIME = 600;

  const handleContentTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-card-swipe-ignore="true"]')) return;
    const touch = e.touches[0];
    if (!touch) return;
    swipeTouchRef.current = { startY: touch.clientY, startX: touch.clientX, startTime: Date.now() };
  }, []);

  const handleContentTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = swipeTouchRef.current;
    swipeTouchRef.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dy = touch.clientY - start.startY;
    const dx = Math.abs(touch.clientX - start.startX);
    const dt = Date.now() - start.startTime;
    if (dt > SWIPE_MAX_TIME || dx > SWIPE_MAX_HORIZONTAL || Math.abs(dy) < SWIPE_THRESHOLD) return;
    const step: 1 | -1 = dy < 0 ? 1 : -1;
    requestNavigationStep(step);
  }, [requestNavigationStep]);

  const confirmSubsetChange = useCallback(() => {
    if (pendingSubsetChange === null) return;
    setPendingSubsetChange(null);
    setHasInteractionStarted(false);
    setDirection(0);
    setSubsetFilter(pendingSubsetChange);
  }, [pendingSubsetChange]);

  const cancelSubsetChange = useCallback(() => {
    setPendingSubsetChange(null);
  }, []);

  const confirmOrderChange = useCallback(() => {
    if (pendingOrderChange === null) return;
    setPendingOrderChange(null);
    setHasInteractionStarted(false);
    setDirection(0);
    setActiveOrder(pendingOrderChange);
  }, [pendingOrderChange]);

  const cancelOrderChange = useCallback(() => {
    setPendingOrderChange(null);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && session.pendingOutcome !== null) {
        e.preventDefault();
        session.handleClose();
        return;
      }

      if (
        session.pendingOutcome !== null ||
        session.quickForgetConfirmStage !== null ||
        pendingNavigationStep !== null ||
        pendingSubsetChange !== null ||
        pendingOrderChange !== null
      ) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        session.handleClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        requestNavigationStep(1);
        return;
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        requestNavigationStep(-1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    session,
    pendingNavigationStep,
    pendingOrderChange,
    pendingSubsetChange,
    requestNavigationStep,
  ]);

  const trainingActiveVerse = session.trainingActiveVerse;
  const trainingModeId = session.trainingModeId;
  const bodyKey = trainingActiveVerse
    ? getVerseIdentity(trainingActiveVerse.raw)
    : `empty:${resolvedSubsetFilter}:${activeOrder}`;
  const showQuickForgetAction = Boolean(
    trainingActiveVerse && trainingModeId && session.pendingOutcome === null
  );

  const canNavigatePrev = session.trainingIndex > 0;
  const canNavigateNext = session.trainingIndex < session.trainingVerseCount - 1;
  const isNavigationBlocked =
    session.isActionPending ||
    session.quickForgetConfirmStage !== null ||
    session.pendingOutcome !== null;

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

        {/* Top bar: counter */}
        <div
          className="shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-xl z-40"
          style={{ paddingTop: `${topInset}px` }}
        >
          <div className="mx-auto max-w-4xl px-4 py-2.5 sm:px-6">
            <div className="flex items-center justify-center">
              <div
                role="status"
                aria-label={`Стих ${Math.min(session.trainingIndex + 1, Math.max(session.trainingVerseCount, 1))} из ${Math.max(session.trainingVerseCount, 1)}`}
                className="rounded-full border border-border/50 bg-background/90 px-3 py-1 shadow-lg backdrop-blur-md"
              >
                <span className="block truncate text-sm font-semibold tabular-nums text-center text-foreground/75">
                  {Math.min(session.trainingIndex + 1, Math.max(session.trainingVerseCount, 1))} /{" "}
                  {Math.max(session.trainingVerseCount, 1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content: fullscreen exercise */}
        <div
          className="relative flex-1 min-h-0 flex flex-col px-4 py-3 sm:px-6"
          role="region"
          aria-roledescription="carousel"
          aria-label="Карточки обучения"
          onTouchStart={handleContentTouchStart}
          onTouchEnd={handleContentTouchEnd}
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
              className="absolute inset-0 flex flex-col px-4 py-3 sm:px-6 focus-visible:outline-none"
              tabIndex={-1}
            >
              {trainingActiveVerse && session.pendingOutcome ? (
                <div className="flex flex-1 items-center justify-center min-h-0">
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
                  suppressModeTutorials={suppressModeTutorials}
                  onTrainingInteractionStart={markInteractionStarted}
                  onRate={async (rating) => {
                    setHasInteractionStarted(true);
                    await session.handleRate(rating);
                    setHasInteractionStarted(false);
                  }}
                  hideRatingFooter={false}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center min-h-0">
                  <p className="text-sm text-foreground/55 text-center px-6">
                    Нет стихов для тренировки в выбранной комбинации фильтра и сортировки
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer: navigation arrows + action buttons */}
        <div
          style={{ paddingBottom: `${Math.max(12, bottomInset)}px` }}
          className="shrink-0 px-4 sm:px-6 z-40 border-t border-border/30 bg-background/60 backdrop-blur-xl pt-2"
        >
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex items-center justify-between gap-2">
              {/* Left: prev arrow */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-2xl border-border/60"
                disabled={!canNavigatePrev || isNavigationBlocked}
                onClick={() => requestNavigationStep(-1)}
                aria-label="Предыдущий стих"
              >
                <ChevronUp className="h-5 w-5" />
              </Button>

              {/* Center: action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 min-w-0">
                {showQuickForgetAction && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-2xl border border-amber-500/35 bg-amber-500/10 text-amber-700 backdrop-blur-xl hover:bg-amber-500/18 dark:text-amber-300 text-sm px-3"
                    onClick={() => {
                      setHasInteractionStarted(true);
                      session.requestQuickForget();
                    }}
                    disabled={session.isActionPending}
                  >
                    Забыл
                  </Button>
                )}
                {session.pendingOutcome && (
                  <Button
                    type="button"
                    className={cn(
                      "h-10 rounded-2xl border border-primary/20 bg-primary/60 text-primary-foreground backdrop-blur-xl text-sm px-3"
                    )}
                    onClick={session.acknowledgeOutcome}
                    disabled={session.isActionPending}
                  >
                    Продолжить
                  </Button>
                )}
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 rounded-2xl bg-background border backdrop-blur-xl w-fit text-sm px-3",
                    "text-foreground/75"
                  )}
                  onClick={session.handleClose}
                  disabled={session.isActionPending}
                >
                  Завершить
                </Button>
              </div>

              {/* Right: next arrow */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-2xl border-border/60"
                disabled={!canNavigateNext || isNavigationBlocked}
                onClick={() => requestNavigationStep(1)}
                aria-label="Следующий стих"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm dialogs */}
      <AlertDialog
        open={session.quickForgetConfirmStage !== null}
        onOpenChange={(open) => {
          if (!open) session.cancelQuickForget();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/90">
              {session.quickForgetConfirmStage === "review"
                ? "Отметить как «не вспомнил»?"
                : "Отметить как «забыл»?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {session.quickForgetConfirmStage === "review"
                ? "Прогресс повторения не изменится. Следующая попытка будет доступна примерно через 6 часов."
                : "Текущий шаг будет засчитан как «Забыл» и рейтинг снизится согласно правилам этапа изучения."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border border-border/60 bg-muted/35 text-foreground/70" onClick={session.cancelQuickForget}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full border border-border/60 bg-destructive hover:bg-destructive/90 text-background"
              onClick={session.confirmQuickForget}
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
              className="rounded-full border border-border/60 bg-destructive hover:bg-destructive/90 text-foreground/90"
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
              Если переключить режим сейчас, прогресс текущего упражнения не сохранится.
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
              Если сменить порядок сейчас, текущее упражнение перезапустится с новым списком карточек.
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
    </>
  );
}
