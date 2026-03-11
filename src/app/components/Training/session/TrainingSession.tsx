"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
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
import { SwipeHint } from "@/app/components/VerseGallery/components/SwipeHint";
import { getVerseIdentity } from "@/app/components/VerseGallery/utils";
import {
  TrainingSubsetSelect,
  type TrainingSubsetSelectValue,
} from "@/app/components/verse-gallery/TrainingSubsetSelect";
import type { Verse } from "@/app/App";
import type { VersePatchEvent } from "@/app/types/verseSync";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { parseExternalVerseId } from "@/shared/bible/externalVerseId";
import type { TrainingOrder } from "../types";
import { TrainingOrderSelect } from "./TrainingOrderSelect";
import { useTrainingSession } from "./useTrainingSession";
import { TrainingProgressPopup } from "../TrainingProgressPopup";

const slideVariants = {
  enter: (dir: number) =>
    dir === 0
      ? { opacity: 0, scale: 1, y: 0 }
      : { y: dir > 0 ? "100%" : "-100%", opacity: 0, scale: 0.88 },
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
          scale: 0.86,
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
        session.quickForgetConfirmStage !== null
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

  const areControlsLocked =
    session.isActionPending ||
    session.quickForgetConfirmStage !== null ||
    pendingNavigationStep !== null ||
    pendingSubsetChange !== null ||
    pendingOrderChange !== null;

  const handleSubsetChange = useCallback(
    (nextFilter: TrainingSubsetSelectValue) => {
      if (areControlsLocked) return;

      const resolvedFilter = resolveSubsetFilter(nextFilter, subsetOptions);
      if (resolvedFilter === resolvedSubsetFilter) return;

      if (!hasInteractionStarted) {
        setDirection(0);
        setSubsetFilter(resolvedFilter);
        return;
      }

      setPendingSubsetChange(resolvedFilter);
    },
    [areControlsLocked, hasInteractionStarted, resolvedSubsetFilter, subsetOptions]
  );

  const handleOrderChange = useCallback(
    (nextOrder: TrainingOrder) => {
      if (areControlsLocked || nextOrder === activeOrder) return;

      if (!hasInteractionStarted) {
        setDirection(0);
        setActiveOrder(nextOrder);
        return;
      }

      setPendingOrderChange(nextOrder);
    },
    [activeOrder, areControlsLocked, hasInteractionStarted]
  );

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
      if (
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
  const showQuickForgetAction = Boolean(trainingActiveVerse && trainingModeId);

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Тренировка"
        className="fixed inset-0 z-50 flex flex-col overflow-hidden overscroll-none bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-md"
      >
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {session.feedbackMessage}
        </div>

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

        <div className=" shrink-0 pt-3 z-30 flex gap-3 justify-center max-w-2xl mx-auto">
            <TrainingSubsetSelect
              value={resolvedSubsetFilter}
              options={subsetOptions}
              disabled={areControlsLocked || subsetOptions.length <= 1}
              onValueChange={handleSubsetChange}
            />
            <TrainingOrderSelect
              value={activeOrder}
              disabled={areControlsLocked}
              onValueChange={handleOrderChange}
            />
        </div>

        <div
          className="flex-1 relative grid place-items-center px-4 py-4 sm:px-6"
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
              className="col-start-1 row-start-1 w-full max-w-4xl min-w-0 focus-visible:outline-none"
              tabIndex={-1}
            >
              {trainingActiveVerse && trainingModeId ? (
                <TrainingCard
                  trainingVerse={trainingActiveVerse}
                  modeId={trainingModeId}
                  rendererRef={session.rendererRef}
                  onSwipeStep={requestNavigationStep}
                  onTrainingInteractionStart={markInteractionStarted}
                  onRate={(rating) => {
                    setHasInteractionStarted(true);
                    return session.handleRate(rating);
                  }}
                  hideRatingFooter={false}
                />
              ) : (
                <div className="mx-auto flex min-h-[24rem] w-full max-w-2xl items-center justify-center rounded-[3rem] border border-border/60 bg-card/90 px-6 text-center shadow-[0_18px_45px_-20px_rgba(0,0,0,0.24)]">
                  <p className="text-sm text-foreground/55">
                    Нет стихов для тренировки в выбранной комбинации фильтра и сортировки
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          style={{ paddingBottom: `${Math.max(25, bottomInset)}px` }}
          className="shrink-0 px-4 sm:px-6 z-40"
        >
          <div className="mx-auto w-full max-w-2xl">
            <div
              className={cn(
                "flex gap-3",
                showQuickForgetAction ? "justify-center" : "justify-end"
              )}
            >
              {showQuickForgetAction && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl border border-amber-500/35 bg-amber-500/10 text-amber-700 backdrop-blur-xl hover:bg-amber-500/18 dark:text-amber-300"
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
                variant="outline"
                className={cn(
                  "h-11 rounded-2xl bg-background border backdrop-blur-xl w-fit",
                  "text-foreground/75"
                )}
                onClick={session.handleClose}
                disabled={session.isActionPending}
              >
                Завершить
              </Button>
            </div>
          </div>
        </div>

        <SwipeHint panelMode="training" />
      </div>

      <AlertDialog
        open={session.quickForgetConfirmStage !== null}
        onOpenChange={(open) => {
          if (!open) session.cancelQuickForget();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {session.quickForgetConfirmStage === "review"
                ? "Отметить как «не вспомнил»?"
                : "Отметить как «забыл»?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {session.quickForgetConfirmStage === "review"
                ? "Прогресс повторения не изменится. Следующая попытка будет доступна примерно через 10 минут."
                : "Текущий шаг будет засчитан как «Забыл» и рейтинг снизится согласно правилам этапа изучения."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={session.cancelQuickForget}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
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
              className="rounded-full border border-border/60 bg-primary/60 text-background"
              onClick={confirmNavigationStep}
            >
              Перейти
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
