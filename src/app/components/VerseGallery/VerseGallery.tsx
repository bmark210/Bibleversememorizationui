"use client";

import { useEffect, useRef, useCallback, useState, type TouchEvent as ReactTouchEvent } from "react";
import { createPortal } from "react-dom";
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
import { Toaster } from "@/app/components/ui/toaster";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { GALLERY_TOASTER_ID } from "@/app/lib/toast";
import { VerseStatus } from "@/generated/prisma";
import {
  createVerticalTouchSwipeStart,
  getVerticalTouchSwipeStep,
  type VerticalTouchSwipeStart,
} from "@/shared/ui/verticalTouchSwipe";

import { GalleryHeader } from "./components/GalleryHeader";
import { GalleryFooter } from "./components/GalleryFooter";
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

const GALLERY_SCROLL_LOCK_COUNT_DATA_KEY = "verseGalleryScrollLockCount";
const GALLERY_PREV_OVERFLOW_DATA_KEY = "verseGalleryPrevOverflow";
const GALLERY_PREV_OVERFLOW_Y_DATA_KEY = "verseGalleryPrevOverflowY";
const GALLERY_PREV_TOUCH_ACTION_DATA_KEY = "verseGalleryPrevTouchAction";
const GALLERY_PREV_OVERSCROLL_DATA_KEY = "verseGalleryPrevOverscrollBehavior";

function getElementScrollLockCount(element: HTMLElement): number {
  const raw = Number(element.dataset[GALLERY_SCROLL_LOCK_COUNT_DATA_KEY] ?? "0");
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function lockScrollOnElement(element: HTMLElement) {
  const lockCount = getElementScrollLockCount(element);
  if (lockCount === 0) {
    element.dataset[GALLERY_PREV_OVERFLOW_DATA_KEY] = element.style.overflow;
    element.dataset[GALLERY_PREV_OVERFLOW_Y_DATA_KEY] = element.style.overflowY;
    element.dataset[GALLERY_PREV_TOUCH_ACTION_DATA_KEY] = element.style.touchAction;
    element.dataset[GALLERY_PREV_OVERSCROLL_DATA_KEY] = element.style.overscrollBehavior;

    element.style.overflow = "hidden";
    element.style.overflowY = "hidden";
    element.style.touchAction = "none";
    element.style.overscrollBehavior = "none";
  }

  element.dataset[GALLERY_SCROLL_LOCK_COUNT_DATA_KEY] = String(lockCount + 1);
}

function unlockScrollOnElement(element: HTMLElement) {
  const lockCount = getElementScrollLockCount(element);
  if (lockCount <= 1) {
    const prevOverflow = element.dataset[GALLERY_PREV_OVERFLOW_DATA_KEY] ?? "";
    const prevOverflowY = element.dataset[GALLERY_PREV_OVERFLOW_Y_DATA_KEY] ?? "";
    const prevTouchAction = element.dataset[GALLERY_PREV_TOUCH_ACTION_DATA_KEY] ?? "";
    const prevOverscrollBehavior = element.dataset[GALLERY_PREV_OVERSCROLL_DATA_KEY] ?? "";

    if (prevOverflow) element.style.overflow = prevOverflow;
    else element.style.removeProperty("overflow");

    if (prevOverflowY) element.style.overflowY = prevOverflowY;
    else element.style.removeProperty("overflow-y");

    if (prevTouchAction) element.style.touchAction = prevTouchAction;
    else element.style.removeProperty("touch-action");

    if (prevOverscrollBehavior) element.style.overscrollBehavior = prevOverscrollBehavior;
    else element.style.removeProperty("overscroll-behavior");

    delete element.dataset[GALLERY_SCROLL_LOCK_COUNT_DATA_KEY];
    delete element.dataset[GALLERY_PREV_OVERFLOW_DATA_KEY];
    delete element.dataset[GALLERY_PREV_OVERFLOW_Y_DATA_KEY];
    delete element.dataset[GALLERY_PREV_TOUCH_ACTION_DATA_KEY];
    delete element.dataset[GALLERY_PREV_OVERSCROLL_DATA_KEY];
    return;
  }

  element.dataset[GALLERY_SCROLL_LOCK_COUNT_DATA_KEY] = String(lockCount - 1);
}

function toReadableSentence(text: string | null): string | null {
  if (!text) return null;
  const normalized = text.charAt(0).toUpperCase() + text.slice(1);
  return normalized.endsWith(".") ? normalized : `${normalized}.`;
}

export function VerseGallery({
  verses,
  initialIndex,
  activeTagSlugs = null,
  launchMode = "preview",
  onClose,
  onStatusChange,
  onVersePatched,
  onDelete,
  previewTotalCount = verses.length,
  previewHasMore = false,
  previewIsLoadingMore = false,
  onRequestMorePreviewVerses,
  onRequestMoreTrainingVerses,
}: VerseGalleryProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewTouchSwipeStartRef = useRef<VerticalTouchSwipeStart | null>(null);

  const [mounted, setMounted] = useState(false);
  const [hasTrainingInteractionStarted, setHasTrainingInteractionStarted] =
    useState(false);
  const [pendingTrainingNavigationStep, setPendingTrainingNavigationStep] =
    useState<1 | -1 | null>(null);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const scrollLockTargets = new Set<HTMLElement>();
    const appScrollContainer = document.querySelector<HTMLElement>(".app-scroll");
    if (appScrollContainer) scrollLockTargets.add(appScrollContainer);
    const mainScrollContainer = document.querySelector<HTMLElement>("main");
    if (mainScrollContainer) scrollLockTargets.add(mainScrollContainer);
    if (scrollLockTargets.size === 0) return;

    scrollLockTargets.forEach(lockScrollOnElement);
    return () => {
      scrollLockTargets.forEach(unlockScrollOnElement);
    };
  }, []);

  // ── Aux state (pending, overrides, feedback, milestone popup) ───────────────
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
    actionPending: aux.actionPending,
    setActionPending: aux.setActionPending,
    setPreviewOverride: aux.setPreviewOverride,
    showFeedback: aux.showFeedback,
    showTrainingContactToast: aux.showTrainingContactToast,
    showTrainingMilestonePopup: aux.showTrainingMilestonePopup,
    setNavActiveIndex: nav.setActiveIndex,
    setNavDirection: nav.setDirection,
    onRequestMoreTrainingVerses,
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

  const requestTrainingNavigationStep = useCallback(
    (step: 1 | -1) => {
      if (training.panelMode !== "training") return;
      if (training.isAutoStartingTraining || aux.actionPending) return;
      if (
        aux.deleteDialogOpen ||
        aux.trainingMilestonePopup !== null ||
        training.quickForgetConfirmStage !== null
      ) {
        return;
      }
      if (!hasTrainingInteractionStarted) {
        training.handleTrainingNavigationStep(step);
        return;
      }
      setPendingTrainingNavigationStep(step);
    },
    [
      aux.actionPending,
      aux.deleteDialogOpen,
      hasTrainingInteractionStarted,
      aux.trainingMilestonePopup,
      training.handleTrainingNavigationStep,
      training.isAutoStartingTraining,
      training.panelMode,
      training.quickForgetConfirmStage,
    ]
  );

  const markTrainingInteractionStarted = useCallback(() => {
    if (
      training.panelMode !== "training" ||
      training.isAutoStartingTraining ||
      !training.trainingActiveVerse
    ) {
      return;
    }
    setHasTrainingInteractionStarted(true);
  }, [
    training.isAutoStartingTraining,
    training.panelMode,
    training.trainingActiveVerse,
  ]);

  const confirmTrainingNavigationStep = useCallback(() => {
    if (pendingTrainingNavigationStep === null) return;
    const step = pendingTrainingNavigationStep;
    setPendingTrainingNavigationStep(null);
    training.handleTrainingNavigationStep(step);
  }, [pendingTrainingNavigationStep, training.handleTrainingNavigationStep]);

  const cancelTrainingNavigationStep = useCallback(() => {
    setPendingTrainingNavigationStep(null);
  }, []);

  useEffect(() => {
    if (training.panelMode !== "training") {
      setHasTrainingInteractionStarted(false);
      setPendingTrainingNavigationStep(null);
      return;
    }

    // Per-card semantics: new training verse starts with a clean state.
    setHasTrainingInteractionStarted(false);
    setPendingTrainingNavigationStep(null);
  }, [training.panelMode, training.trainingActiveVerse?.key]);

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        aux.deleteDialogOpen ||
        aux.trainingMilestonePopup !== null ||
        training.quickForgetConfirmStage !== null ||
        pendingTrainingNavigationStep !== null
      ) {
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
    aux.trainingMilestonePopup,
    pendingTrainingNavigationStep,
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
  // Use the stable state setter directly — the `aux` object literal is recreated
  // every render and would cause this effect to re-run on every single render.
  const setSlideAnnouncement = aux.setSlideAnnouncement;
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
    setSlideAnnouncement(
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
    setSlideAnnouncement,
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
    { axis: "y", filterTaps: true, pointer: { touch: false }, threshold: 10 }
  );
  const previewSwipeHandlers =
    training.panelMode === "preview" ? previewSwipeBind() : undefined;

  const handlePreviewTouchStart = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    if (training.panelMode !== "preview" || training.isAutoStartingTraining) return;
    previewTouchSwipeStartRef.current = createVerticalTouchSwipeStart(e);
  }, [training.panelMode, training.isAutoStartingTraining]);

  const handlePreviewTouchEnd = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    if (training.panelMode !== "preview" || training.isAutoStartingTraining) return;

    const step = getVerticalTouchSwipeStep(
      previewTouchSwipeStartRef.current,
      e,
      { minVerticalDistance: 48, verticalDominanceRatio: 1.05 }
    );
    previewTouchSwipeStartRef.current = null;
    if (!step) return;
    void nav.navigatePreviewTo(step === 1 ? "next" : "prev");
  }, [nav, training.panelMode, training.isAutoStartingTraining]);

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

  // Key is the verse identity only — AnimatePresence animates only when the verse
  // actually changes. Mode switches (preview↔training) or modeId advances on the
  // same verse must NOT trigger a slide animation.
  const galleryBodyKey = getVerseIdentity(displayVerse);

  const previewStatusAction =
    training.panelMode === "preview" && previewActiveVerse
      ? getGalleryStatusAction(normalizeVerseStatus(previewActiveVerse.status))
      : null;

  const trainingMilestonePopup = aux.trainingMilestonePopup;
  const milestoneStageLabel =
    trainingMilestonePopup?.status === "MASTERED"
      ? "Завершение"
      : trainingMilestonePopup?.status === "REVIEW"
        ? "Повторение"
        : trainingMilestonePopup?.status === "LEARNING"
          ? "Изучение"
          : "Этап";

  const milestoneTheme =
    trainingMilestonePopup?.status === "MASTERED"
      ? {
          contentClassName:
            "border-amber-500/25 bg-gradient-to-br from-amber-400/14 via-card to-yellow-300/6",
          glowClassName:
            "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.22),transparent_56%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.2),transparent_52%)]",
          badgeClassName:
            "border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-300",
          statCardClassName: "border-amber-500/25 bg-amber-500/[0.08]",
          valueClassName: "text-amber-800 dark:text-amber-300",
          actionClassName:
            "bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 hover:from-amber-500/95 hover:to-yellow-400/95",
        }
      : trainingMilestonePopup?.status === "REVIEW"
        ? {
            contentClassName:
              "border-violet-500/20 bg-gradient-to-br from-violet-500/9 via-card to-card",
            glowClassName:
              "bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.24),transparent_56%),radial-gradient(circle_at_bottom_left,rgba(167,139,250,0.2),transparent_52%)]",
            badgeClassName:
              "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
            statCardClassName: "border-violet-500/25 bg-violet-500/[0.08]",
            valueClassName: "text-violet-700 dark:text-violet-300",
            actionClassName:
              "bg-gradient-to-r from-violet-500 to-violet-400 text-white hover:from-violet-500/95 hover:to-violet-400/95",
          }
        : {
            contentClassName:
              "border-emerald-500/20 bg-gradient-to-br from-emerald-500/7 via-card to-card",
            glowClassName:
              "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_56%),radial-gradient(circle_at_bottom_left,rgba(52,211,153,0.2),transparent_52%)]",
            badgeClassName:
              "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            statCardClassName: "border-emerald-500/25 bg-emerald-500/[0.08]",
            valueClassName: "text-emerald-700 dark:text-emerald-300",
            actionClassName:
              "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white hover:from-emerald-500/95 hover:to-emerald-400/95",
          };
  const milestoneNextReviewSentence = toReadableSentence(
    trainingMilestonePopup?.nextReviewHint ?? null
  );

  const milestoneDialogContent =
    trainingMilestonePopup?.milestoneKind === "review_to_mastered"
      ? {
          title: "Стих выучен полностью",
          description: "Этап повторения завершён. Стих перешёл в список завершённых.",
        }
      : trainingMilestonePopup?.milestoneKind === "review_progress"
        ? {
            title: "Этап повторения обновлён",
            description: milestoneNextReviewSentence
              ? `Повтор засчитан. ${milestoneNextReviewSentence}`
              : "Повтор засчитан. Стих остаётся на этапе повторения по интервальному графику.",
          }
        : trainingMilestonePopup?.milestoneKind === "learning_to_review"
          ? {
              title: "Переход к этапу повторения",
              description: milestoneNextReviewSentence
                ? `Этап изучения завершён. ${milestoneNextReviewSentence}`
                : "Стих переведён в повторение. Теперь он закрепляется по интервальным повторам.",
            }
          : {
              title: "Стих переведён в этап изучения",
              description:
                "Это первый этап изучения. После завершения этапа изучения стих перейдёт в интервальное повторение.",
            };

  return (
    <>
      {/*
        Portal to document.body so the Toaster is completely outside the gallery's
        stacking context. The gallery creates position:fixed + backdrop-filter which
        traps any in-tree position:fixed descendants. Portaling to body bypasses all
        parent stacking contexts — the Sonner <ol> renders at the top of the DOM.
      */}
      {mounted && createPortal(
        <Toaster
          id={GALLERY_TOASTER_ID}
          offset={{ top: `${Math.max(topInset, 0) + 12}px` }}
        />,
        document.body
      )}

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
        className="fixed inset-0 z-50 flex flex-col overflow-x-hidden bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-md"
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
              className="col-start-1 row-start-1 w-full max-w-4xl min-w-0 focus-visible:outline-none"
              tabIndex={-1}
            >
              {training.panelMode === "preview" && previewActiveVerse ? (
                // Swipe wrapper with touch-action:none so @use-gesture works on touch devices
                <div
                  {...previewSwipeHandlers}
                  className="w-full min-w-0 overflow-x-hidden"
                  style={{ touchAction: "none" }}
                  onTouchStart={handlePreviewTouchStart}
                  onTouchEnd={handlePreviewTouchEnd}
                >
                  <VersePreviewCard
                    verse={previewActiveVerse}
                    actionPending={aux.actionPending}
                    activeTagSlugs={activeTagSlugs}
                    onStartTraining={() => void training.startTrainingFromActiveVerse()}
                    onStatusAction={() => void handlePreviewStatusAction()}
                  />
                </div>
              ) : training.panelMode === "training" &&
                training.trainingActiveVerse &&
                training.trainingModeId ? (
                <TrainingCard
                  trainingVerse={training.trainingActiveVerse}
                  modeId={training.trainingModeId}
                  rendererRef={training.trainingRendererRef}
                  onSwipeStep={requestTrainingNavigationStep}
                  onTrainingInteractionStart={markTrainingInteractionStarted}
                  onRate={(rating) => {
                    setHasTrainingInteractionStarted(true);
                    return training.handleTrainingRate(rating);
                  }}
                  onQuickForget={() => {
                    setHasTrainingInteractionStarted(true);
                    training.requestQuickForget();
                  }}
                  quickForgetLabel={training.quickForgetLabel}
                  quickForgetDisabled={aux.actionPending}
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

      <AlertDialog
        open={trainingMilestonePopup !== null}
        onOpenChange={() => {
          // Popup can be closed only via explicit confirmation button.
        }}
      >
        <AlertDialogContent
          className={`overflow-hidden rounded-3xl backdrop-blur-xl shadow-2xl ${milestoneTheme.contentClassName}`}
        >
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 backdrop-blur-lg ${milestoneTheme.glowClassName}`}
          />
          <AlertDialogHeader className="relative gap-3">
            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${milestoneTheme.badgeClassName}`}>
              {trainingMilestonePopup?.reference}
            </span>
            <AlertDialogTitle className="text-balance text-xl leading-tight text-muted-foreground/90">
              {milestoneDialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground/90">
              {milestoneDialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className={`relative grid gap-2 rounded-2xl border p-3 text-xs text-foreground/80 sm:grid-cols-2 ${milestoneTheme.statCardClassName}`}>
            <div className={`rounded-xl border px-3 py-2 ${milestoneTheme.statCardClassName}`}>
              <span className="text-muted-foreground">Текущий этап</span>
              <div className={`mt-0.5 text-sm font-semibold ${milestoneTheme.valueClassName}`}>{milestoneStageLabel}</div>
            </div>
            <div className={`rounded-xl border px-3 py-2 ${milestoneTheme.statCardClassName}`}>
              <span className="text-muted-foreground">Прогресс</span>
              <div className={`mt-0.5 text-sm font-semibold ${milestoneTheme.valueClassName}`}>
                {trainingMilestonePopup?.beforeProgressPercent}% → {trainingMilestonePopup?.afterProgressPercent}%
              </div>
            </div>
          </div>

          <AlertDialogFooter className="relative">
            <AlertDialogAction
              className={`w-full rounded-full sm:w-auto ${milestoneTheme.statCardClassName} ${milestoneTheme.actionClassName} `}
              onClick={aux.confirmTrainingMilestonePopup}
            >
              Понятно
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={aux.deleteDialogOpen} onOpenChange={aux.setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить стих?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Стих будет удалён из вашей коллекции.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border border-border/60 bg-muted/35 text-foreground/90">Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                aux.actionPending ||
                training.panelMode !== "preview" ||
                !previewActiveVerse
              }
              className="rounded-full border border-border/60 bg-muted/35 text-foreground/90"
              onClick={() => void handleDelete()}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={training.quickForgetConfirmStage !== null}
        onOpenChange={(open) => {
          if (!open) training.cancelQuickForget();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {training.quickForgetConfirmStage === "review"
                ? "Отметить как «не вспомнил»?"
                : "Отметить как «забыл»?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {training.quickForgetConfirmStage === "review"
                ? "Прогресс повторения не изменится. Следующая попытка будет доступна примерно через 10 минут."
                : "Текущий шаг будет засчитан как «Забыл» и рейтинг снизится согласно правилам этапа изучения."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={training.cancelQuickForget}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={training.confirmQuickForget}
            >
              Подтвердить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingTrainingNavigationStep !== null}
        onOpenChange={(open) => {
          if (!open) cancelTrainingNavigationStep();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/90">Перейти к другому стиху?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/90">
              Если перейти сейчас, прогресс текущего упражнения не сохранится.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border border-border/60 bg-muted/35 text-foreground/70" onClick={cancelTrainingNavigationStep}>
              Остаться
            </AlertDialogCancel>
            <AlertDialogAction className="rounded-full border border-border/60 bg-primary/60 text-background" onClick={confirmTrainingNavigationStep}>
              Перейти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
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
