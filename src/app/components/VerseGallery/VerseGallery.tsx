"use client";

import { useEffect, useRef, useCallback } from "react";
import { useDrag } from "@use-gesture/react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { VerseStatus } from "@/generated/prisma";
import { TrainingCompletionToastCard } from "@/app/components/verse-gallery/TrainingCompletionToastCard";

import { GalleryHeader } from "./components/GalleryHeader";
import { GalleryFooter } from "./components/GalleryFooter";
import { DailyGoalPanel } from "./components/DailyGoalPanel";
import { DotProgress } from "./components/DotProgress";
import { SwipeHint } from "./components/SwipeHint";
import { VersePreviewCard } from "./components/VersePreviewCard";
import { TrainingCard } from "./components/TrainingCard";
import { useGalleryAux } from "./hooks/useGalleryAux";
import { usePreviewNavigation } from "./hooks/usePreviewNavigation";
import { useTrainingFlow } from "./hooks/useTrainingFlow";
import {
  normalizeVerseStatus,
  getGalleryStatusAction,
  getVerseIdentity,
  mergePreviewOverrides,
  toPreviewOverrideFromVersePatch,
  haptic,
  clamp,
} from "./utils";
import {
  getDailyGoalPreferredTrainingSubset,
  getDailyGoalModeFromDisplayStatus,
  getDailyGoalPhasePillMeta,
} from "./dailyGoalUtils";
import { TRAINING_STAGE_MASTERY_MAX } from "./constants";
import type { VerseGalleryProps, TrainingSubsetFilter, VerseGalleryLaunchMode } from "./types";

// Card slide animation — only animation kept intentionally
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
        ? { duration: 0.22, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
        : { type: "spring" as const, stiffness: 320, damping: 32 },
  }),
  exit: (dir: number) =>
    dir === 0
      ? { opacity: 0, scale: 1, transition: { duration: 0.15, ease: "easeIn" as const } }
      : {
          y: dir > 0 ? "-18%" : "18%",
          opacity: 0,
          scale: 0.86,
          transition: { duration: 0.2, ease: "easeIn" as const },
        },
};

export function VerseGallery({
  verses,
  initialIndex,
  launchMode = "preview",
  onClose,
  onStatusChange,
  onVersePatched,
  onDelete,
  previewTotalCount = verses.length,
  previewHasMore = false,
  previewIsLoadingMore = false,
  onRequestMorePreviewVerses,
  dailyGoalContext,
  onBeforeStartTrainingFromGalleryVerse,
  onDailyGoalProgressEvent,
  onDailyGoalJumpToVerseRequest,
  onDailyGoalPreferredResumeModeChange,
}: VerseGalleryProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ── Aux state (pending, overrides, feedback, completion popup) ──────────────
  const aux = useGalleryAux();

  // ── Preview navigation ───────────────────────────────────────────────────────
  const nav = usePreviewNavigation({
    verses,
    initialIndex,
    previewHasMore,
    previewIsLoadingMore,
    onRequestMorePreviewVerses,
  });

  // Keep activeIndex clamped when verse list shrinks
  useEffect(() => {
    if (verses.length === 0) return;
    const clamped = clamp(nav.activeIndex, 0, Math.max(0, verses.length - 1));
    if (clamped !== nav.activeIndex) nav.setActiveIndex(clamped);
  }, [verses.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived preview state ────────────────────────────────────────────────────
  const previewActiveVerse = verses[nav.activeIndex]
    ? mergePreviewOverrides(verses[nav.activeIndex], aux.previewOverrides)
    : null;

  const previewDisplayTotal = Math.max(previewTotalCount, verses.length, 1);

  // ── Daily goal derived ───────────────────────────────────────────────────────
  const dailyGoalGuideActive = Boolean(
    dailyGoalContext?.showGuideBanner &&
      (dailyGoalContext.phase === "learning" || dailyGoalContext.phase === "review")
  );
  const dailyGoalPreferredTrainingSubset = getDailyGoalPreferredTrainingSubset(dailyGoalContext);
  const resolvedLaunchMode: VerseGalleryLaunchMode = launchMode;
  const shouldAutoStartTrainingOnOpen = resolvedLaunchMode === "training";
  const closeTrainingGoesToPreview =
    resolvedLaunchMode === "preview" && !shouldAutoStartTrainingOnOpen;

  // ── Training flow ────────────────────────────────────────────────────────────
  const training = useTrainingFlow({
    verses,
    previewActiveVerse,
    activeIndex: nav.activeIndex,
    autoStartInTraining: shouldAutoStartTrainingOnOpen,
    closeTrainingGoesToPreview,
    onClose,
    onVersePatched,
    onDailyGoalProgressEvent,
    onBeforeStartTrainingFromGalleryVerse,
    onDailyGoalJumpToVerseRequest,
    onDailyGoalPreferredResumeModeChange,
    dailyGoalGuideActive,
    dailyGoalPreferredTrainingSubset,
    actionPending: aux.actionPending,
    setActionPending: aux.setActionPending,
    setPreviewOverride: aux.setPreviewOverride,
    showFeedback: aux.showFeedback,
    showTrainingContactToast: aux.showTrainingContactToast,
    showTrainingMilestonePopup: aux.showTrainingMilestonePopup,
    setNavActiveIndex: nav.setActiveIndex,
    setNavDirection: nav.setDirection,
  });

  // ── Preview status action ────────────────────────────────────────────────────
  const handlePreviewStatusAction = useCallback(async () => {
    if (!previewActiveVerse || aux.actionPending) return;
    const statusAction = getGalleryStatusAction(normalizeVerseStatus(previewActiveVerse.status));
    if (!statusAction) return;
    try {
      aux.setActionPending(true);
      const optimisticStatus =
        statusAction.nextStatus === VerseStatus.LEARNING &&
        Number(previewActiveVerse.masteryLevel ?? 0) >= TRAINING_STAGE_MASTERY_MAX
          ? "REVIEW"
          : statusAction.nextStatus;
      aux.setPreviewOverride(previewActiveVerse, { status: optimisticStatus });
      const patch = await onStatusChange(previewActiveVerse, statusAction.nextStatus);
      if (patch) {
        aux.setPreviewOverride(previewActiveVerse, toPreviewOverrideFromVersePatch(patch));
      }
      haptic("success");
      aux.showFeedback(statusAction.successMessage, "success");
    } catch {
      haptic("error");
      aux.setPreviewOverride(previewActiveVerse, { status: previewActiveVerse.status });
      aux.showFeedback("Ошибка — попробуйте ещё раз", "error");
    } finally {
      aux.setActionPending(false);
    }
  }, [previewActiveVerse, aux, onStatusChange]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!previewActiveVerse) return;
    try {
      aux.setActionPending(true);
      await onDelete(previewActiveVerse);
      haptic("success");
      aux.showFeedback("Стих удалён", "success");
      if (verses.length <= 1) {
        onClose();
      } else {
        const newDir = nav.activeIndex > 0 ? -1 : 1;
        nav.setDirection(newDir);
        nav.setActiveIndex(nav.activeIndex > 0 ? nav.activeIndex - 1 : 0);
      }
    } catch {
      haptic("error");
      aux.showFeedback("Ошибка удаления", "error");
    } finally {
      aux.setActionPending(false);
    }
    aux.setDeleteDialogOpen(false);
  }, [previewActiveVerse, aux, onDelete, verses.length, nav, onClose]);

  // ── Daily goal pills ─────────────────────────────────────────────────────────
  const currentCardDailyGoalMode =
    training.panelMode === "training"
      ? getDailyGoalModeFromDisplayStatus(training.trainingActiveVerse?.status ?? null)
      : getDailyGoalModeFromDisplayStatus(
          previewActiveVerse ? normalizeVerseStatus(previewActiveVerse.status) : null
        );

  const dailyGoalCurrentExecutionMode =
    training.panelMode === "training"
      ? training.trainingSubsetFilter === "catalog"
        ? currentCardDailyGoalMode ?? (dailyGoalContext?.effectiveResumeMode ?? null)
        : training.trainingSubsetFilter
      : currentCardDailyGoalMode ?? (dailyGoalContext?.effectiveResumeMode ?? null);

  const dailyGoalShowReviewStage = Boolean(dailyGoalContext?.phaseStates.review.enabled);

  const dailyGoalLearningPill = dailyGoalContext
    ? getDailyGoalPhasePillMeta({
        mode: "learning",
        title: "Изучение",
        done: dailyGoalContext.phaseStates.learning.done,
        total: dailyGoalContext.phaseStates.learning.total,
        completed: dailyGoalContext.phaseStates.learning.completed,
        isCurrentMode:
          training.panelMode === "training" &&
          dailyGoalCurrentExecutionMode === "learning" &&
          !dailyGoalContext.phaseStates.learning.completed,
      })
    : null;

  const dailyGoalReviewPill =
    dailyGoalContext && dailyGoalShowReviewStage
      ? getDailyGoalPhasePillMeta({
          mode: "review",
          title: "Повторение",
          done: dailyGoalContext.phaseStates.review.done,
          total: dailyGoalContext.phaseStates.review.total,
          completed: dailyGoalContext.phaseStates.review.completed,
          isCurrentMode:
            training.panelMode === "training" &&
            dailyGoalCurrentExecutionMode === "review" &&
            !dailyGoalContext.phaseStates.review.completed,
        })
      : null;

  const handleDailyGoalPillClick = useCallback(
    async (mode: "learning" | "review") => {
      haptic("light");
      if (training.panelMode === "preview") {
        await training.startTrainingFromActiveVerse(mode, { preservePreviewCard: true });
        return;
      }
      training.applyUserTrainingSubsetFilter(mode);
    },
    [training]
  );

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (aux.deleteDialogOpen) return;
      if (aux.trainingMilestonePopup) {
        if (e.key === "Escape") {
          e.preventDefault();
          aux.dismissTrainingMilestonePopup();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (training.panelMode === "training") {
          if (closeTrainingGoesToPreview) training.exitTrainingMode();
          else onClose();
        } else {
          onClose();
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        if (training.panelMode === "training") training.handleTrainingNavigationStep(1);
        else void nav.navigatePreviewTo("next");
        return;
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        if (training.panelMode === "training") training.handleTrainingNavigationStep(-1);
        else void nav.navigatePreviewTo("prev");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    aux.deleteDialogOpen,
    aux.dismissTrainingMilestonePopup,
    aux.trainingMilestonePopup,
    closeTrainingGoesToPreview,
    nav,
    onClose,
    training,
  ]);

  // Initial focus
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // ── Slide announcement (accessibility) ──────────────────────────────────────
  useEffect(() => {
    const displayVerse =
      training.panelMode === "training" && training.trainingActiveVerse
        ? training.trainingActiveVerse.raw
        : previewActiveVerse;
    if (!displayVerse) return;
    const total =
      training.panelMode === "training"
        ? Math.max(training.trainingEligibleIndices.length, 1)
        : previewDisplayTotal;
    const position =
      training.panelMode === "training"
        ? Math.max(1, training.trainingEligibleIndices.indexOf(training.trainingIndex) + 1)
        : nav.activeIndex + 1;
    aux.setSlideAnnouncement(
      `Стих ${position} из ${Math.max(total, 1)}: ${displayVerse.reference}`
    );
  }, [
    training.panelMode,
    training.trainingActiveVerse,
    training.trainingEligibleIndices,
    training.trainingIndex,
    nav.activeIndex,
    previewActiveVerse,
    previewDisplayTotal,
    aux,
  ]);

  // ── Swipe gesture (preview only) ─────────────────────────────────────────────
  const previewSwipeBind = useDrag(
    ({ last, movement: [, my], velocity: [, vy], canceled }) => {
      if (!last || canceled || training.panelMode !== "preview" || training.isAutoStartingTraining)
        return;
      if (Math.abs(my) > 50 || Math.abs(vy) > 0.3) {
        void nav.navigatePreviewTo(my < 0 ? "next" : "prev");
      }
    },
    { axis: "y", filterTaps: true, pointer: { touch: true }, threshold: 10 }
  );
  const previewSwipeHandlers =
    training.panelMode === "preview" ? previewSwipeBind() : undefined;

  // ── Display values ───────────────────────────────────────────────────────────
  const displayVerse =
    training.panelMode === "training" && training.trainingActiveVerse
      ? training.trainingActiveVerse.raw
      : previewActiveVerse;

  if (!displayVerse) return null;

  const displayTotal =
    training.panelMode === "training"
      ? Math.max(training.trainingEligibleIndices.length, 1)
      : previewDisplayTotal;
  const displayActive =
    training.panelMode === "training"
      ? Math.max(0, training.trainingEligibleIndices.indexOf(training.trainingIndex))
      : Math.max(0, nav.activeIndex);

  const galleryBodyKey =
    training.panelMode === "training"
      ? `training-${training.trainingIndex}-${getVerseIdentity(displayVerse)}-${training.trainingModeId ?? "none"}`
      : `preview-${nav.activeIndex}-${getVerseIdentity(displayVerse)}`;

  const previewStatusAction =
    training.panelMode === "preview" && previewActiveVerse
      ? getGalleryStatusAction(normalizeVerseStatus(previewActiveVerse.status))
      : null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={
        training.isAutoStartingTraining
          ? "Подготовка режима обучения"
          : training.panelMode === "training"
            ? "Режим обучения"
            : "Просмотр стиха"
      }
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-md"
    >
      {/* Accessibility announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {aux.feedbackMessage}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {aux.slideAnnouncement}
      </div>

      <GalleryHeader
        displayActive={displayActive}
        displayTotal={displayTotal}
        topInset={topInset}
      />

      {dailyGoalGuideActive && dailyGoalContext ? (
        <DailyGoalPanel
          dailyGoalContext={dailyGoalContext}
          learningPill={dailyGoalLearningPill}
          reviewPill={dailyGoalReviewPill}
          panelMode={training.panelMode}
          currentExecutionMode={dailyGoalCurrentExecutionMode}
          onPillClick={(mode) => void handleDailyGoalPillClick(mode)}
        />
      ) : null}

      {/* Card area */}
      <div
        className="flex-1 relative grid place-items-center px-4 sm:px-6"
        role="region"
        aria-roledescription="carousel"
        aria-label={
          training.panelMode === "training" ? "Карточки обучения" : "Карточки со стихами"
        }
      >
        {training.isAutoStartingTraining ? (
          <TrainingLoadingView />
        ) : (
          <AnimatePresence initial={false} mode="sync" custom={nav.direction}>
            <motion.div
              key={galleryBodyKey}
              custom={nav.direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="col-start-1 row-start-1 w-full max-w-4xl focus-visible:outline-none"
              tabIndex={-1}
            >
              {training.panelMode === "preview" && previewActiveVerse ? (
                // Swipe wrapper with touch-action:none so @use-gesture works on touch devices
                <div {...previewSwipeHandlers} style={{ touchAction: "none" }}>
                  <VersePreviewCard
                    verse={previewActiveVerse}
                    actionPending={aux.actionPending}
                    onStartTraining={() => void training.startTrainingFromActiveVerse()}
                    onStatusAction={() => void handlePreviewStatusAction()}
                    dailyGoalGuideActive={dailyGoalGuideActive}
                  />
                </div>
              ) : training.panelMode === "training" &&
                training.trainingActiveVerse &&
                training.trainingModeId ? (
                <TrainingCard
                  trainingVerse={training.trainingActiveVerse}
                  modeId={training.trainingModeId}
                  rendererRef={training.trainingRendererRef}
                  onSwipeStep={training.handleTrainingNavigationStep}
                  onRate={(rating) => void training.handleTrainingRate(rating)}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Mode-specific footer buttons */}
      <GalleryFooter
        panelMode={training.panelMode}
        isTrainingAutoStartOverlayVisible={training.isAutoStartingTraining}
        actionPending={aux.actionPending}
        closeTrainingGoesToPreview={closeTrainingGoesToPreview}
        trainingSubsetFilter={training.trainingSubsetFilter}
        previewStatusAction={previewStatusAction}
        onClose={onClose}
        onPreviewStatusAction={() => void handlePreviewStatusAction()}
        onDeleteRequest={() => aux.setDeleteDialogOpen(true)}
        onTrainingBack={training.handleTrainingBackAction}
        onTrainingSubsetChange={(filter) => training.applyUserTrainingSubsetFilter(filter as TrainingSubsetFilter)}
        closeButtonRef={closeButtonRef}
      />

      {/* Bottom navigation row */}
      {/* <div
        className="shrink-0 flex items-center justify-center gap-2 sm:gap-3 pt-3 z-40 px-2 sm:px-4"
        style={{ paddingBottom: `${Math.max(bottomInset, 10)}px` }}
      >
        <Button
          variant="secondary"
          size="icon"
          onClick={() =>
            training.panelMode === "training"
              ? training.handleTrainingNavigationStep(-1)
              : void nav.navigatePreviewTo("prev")
          }
          disabled={
            training.isAutoStartingTraining ||
            (training.panelMode === "training"
              ? displayActive <= 0 || training.trainingEligibleIndices.length <= 1
              : nav.activeIndex === 0)
          }
          aria-label="Предыдущий стих"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex items-center justify-center">
          {training.isAutoStartingTraining ? (
            <div className="px-3 py-2 rounded-full border border-border/50 bg-background/80 text-xs text-muted-foreground">
              Подготовка…
            </div>
          ) : (
            <DotProgress
              total={displayTotal}
              active={Math.min(displayActive, Math.max(0, displayTotal - 1))}
            />
          )}
        </div>

        <Button
          variant="secondary"
          size="icon"
          onClick={() =>
            training.panelMode === "training"
              ? training.handleTrainingNavigationStep(1)
              : void nav.navigatePreviewTo("next")
          }
          disabled={
            training.isAutoStartingTraining ||
            (training.panelMode === "training"
              ? displayActive >= displayTotal - 1 ||
                training.trainingEligibleIndices.length <= 1
              : (previewIsLoadingMore && nav.activeIndex >= verses.length - 1) ||
                (nav.activeIndex === verses.length - 1 && !previewHasMore))
          }
          aria-label="Следующий стих"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div> */}

      {!training.isAutoStartingTraining && <SwipeHint panelMode={training.panelMode} />}

      <TrainingCompletionToastCard
        payload={aux.trainingMilestonePopup}
        onClose={aux.dismissTrainingMilestonePopup}
      />

      <AlertDialog open={aux.deleteDialogOpen} onOpenChange={aux.setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить стих?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Стих будет удалён из вашей коллекции.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                aux.actionPending ||
                training.panelMode !== "preview" ||
                !previewActiveVerse
              }
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => void handleDelete()}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TrainingLoadingView() {
  return (
    <div className="w-full max-w-3xl">
      <div className="rounded-[1.75rem] border border-border/60 bg-background/95 shadow-xl backdrop-blur-xl">
        <div className="rounded-2xl border border-border/60 bg-background/80 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-semibold leading-snug">
                Подготавливаем тренировку
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Подбираем упражнения и включаем нужный режим.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between text-[0.7rem] text-muted-foreground">
              <span>Загрузка упражнений</span>
              <span className="font-medium text-foreground/80">Почти готово</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted/35">
              <motion.div
                aria-hidden="true"
                className="absolute inset-y-0 rounded-full bg-primary/80 shadow-[0_0_10px_rgba(0,0,0,0.08)]"
                initial={{ x: "-45%", width: "60%" }}
                animate={{ x: ["-45%", "10%", "85%"], width: ["60%", "68%", "58%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>

          <div aria-hidden="true" className="mt-4 rounded-xl border border-border/40 bg-background/70 p-3">
            <div className="mb-2 h-3.5 w-32 rounded-full bg-muted/45 animate-pulse" />
            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-full bg-muted/30 animate-pulse" />
              <div className="h-2.5 w-4/5 rounded-full bg-muted/20 animate-pulse [animation-delay:120ms]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
