"use client";

import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { useDrag } from "@use-gesture/react";
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
import { Toaster } from "@/app/components/ui/toaster";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { GALLERY_TOASTER_ID } from "@/app/lib/toast";
import { VerseStatus } from "@/generated/prisma";
import {
  createVerticalTouchSwipeStart,
  getVerticalTouchSwipeStep,
  type VerticalTouchSwipeStart,
} from "@/shared/ui/verticalTouchSwipe";

import { GalleryHeader } from "./components/GalleryHeader";
import { GalleryFooter } from "./components/GalleryFooter";
import { SwipeHint } from "./components/SwipeHint";
import { VersePreviewCard } from "./components/VersePreviewCard";
import { useGalleryAux } from "./hooks/useGalleryAux";
import { usePreviewNavigation } from "./hooks/usePreviewNavigation";
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
import type { VerseGalleryProps } from "./types";

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

const GALLERY_SCROLL_LOCK_COUNT_DATA_KEY = "verseGalleryScrollLockCount";
const GALLERY_PREV_OVERFLOW_DATA_KEY = "verseGalleryPrevOverflow";
const GALLERY_PREV_OVERFLOW_Y_DATA_KEY = "verseGalleryPrevOverflowY";
const GALLERY_PREV_TOUCH_ACTION_DATA_KEY = "verseGalleryPrevTouchAction";
const GALLERY_PREV_OVERSCROLL_DATA_KEY = "verseGalleryPrevOverscrollBehavior";

function getElementScrollLockCount(element: HTMLElement): number {
  const raw = Number(
    element.dataset[GALLERY_SCROLL_LOCK_COUNT_DATA_KEY] ?? "0",
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function lockScrollOnElement(element: HTMLElement) {
  const lockCount = getElementScrollLockCount(element);
  if (lockCount === 0) {
    element.dataset[GALLERY_PREV_OVERFLOW_DATA_KEY] = element.style.overflow;
    element.dataset[GALLERY_PREV_OVERFLOW_Y_DATA_KEY] = element.style.overflowY;
    element.dataset[GALLERY_PREV_TOUCH_ACTION_DATA_KEY] =
      element.style.touchAction;
    element.dataset[GALLERY_PREV_OVERSCROLL_DATA_KEY] =
      element.style.overscrollBehavior;

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
    const prevOverflowY =
      element.dataset[GALLERY_PREV_OVERFLOW_Y_DATA_KEY] ?? "";
    const prevTouchAction =
      element.dataset[GALLERY_PREV_TOUCH_ACTION_DATA_KEY] ?? "";
    const prevOverscrollBehavior =
      element.dataset[GALLERY_PREV_OVERSCROLL_DATA_KEY] ?? "";

    if (prevOverflow) element.style.overflow = prevOverflow;
    else element.style.removeProperty("overflow");

    if (prevOverflowY) element.style.overflowY = prevOverflowY;
    else element.style.removeProperty("overflow-y");

    if (prevTouchAction) element.style.touchAction = prevTouchAction;
    else element.style.removeProperty("touch-action");

    if (prevOverscrollBehavior)
      element.style.overscrollBehavior = prevOverscrollBehavior;
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

export function VerseGallery({
  verses,
  initialIndex,
  activeTagSlugs = null,
  onClose,
  onStatusChange,
  onDelete,
  onNavigateToTraining,
  previewTotalCount = verses.length,
  previewHasMore = false,
  previewIsLoadingMore = false,
  onRequestMorePreviewVerses,
}: VerseGalleryProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewTouchSwipeStartRef = useRef<VerticalTouchSwipeStart | null>(
    null,
  );

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const scrollLockTargets = new Set<HTMLElement>();
    const appScrollContainer =
      document.querySelector<HTMLElement>(".app-scroll");
    if (appScrollContainer) scrollLockTargets.add(appScrollContainer);
    const mainScrollContainer = document.querySelector<HTMLElement>("main");
    if (mainScrollContainer) scrollLockTargets.add(mainScrollContainer);
    if (scrollLockTargets.size === 0) return;

    scrollLockTargets.forEach(lockScrollOnElement);
    return () => {
      scrollLockTargets.forEach(unlockScrollOnElement);
    };
  }, []);

  // ── Aux state (pending, overrides, feedback) ──────────────────────────────
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
  }, [verses.length]);

  // ── Derived preview state ────────────────────────────────────────────────────
  const activePreviewVerse = verses[nav.activeIndex];
  const previewActiveVerse = activePreviewVerse
    ? mergePreviewOverrides(activePreviewVerse, aux.previewOverrides)
    : null;

  const previewDisplayTotal = Math.max(previewTotalCount, verses.length, 1);

  // ── Preview status action ────────────────────────────────────────────────────
  const handlePreviewStatusAction = useCallback(async () => {
    if (!previewActiveVerse || aux.isActionPending) return;
    const statusAction = getGalleryStatusAction(
      normalizeVerseStatus(previewActiveVerse.status),
    );
    if (!statusAction) return;
    try {
      aux.setIsActionPending(true);
      const optimisticStatus =
        statusAction.nextStatus === VerseStatus.LEARNING &&
        Number(previewActiveVerse.masteryLevel ?? 0) >=
          TRAINING_STAGE_MASTERY_MAX
          ? "REVIEW"
          : statusAction.nextStatus;
      aux.setPreviewOverride(previewActiveVerse, { status: optimisticStatus });
      const patch = await onStatusChange(
        previewActiveVerse,
        statusAction.nextStatus,
      );
      if (patch) {
        aux.setPreviewOverride(
          previewActiveVerse,
          toPreviewOverrideFromVersePatch(patch),
        );
      }
      haptic("success");
      aux.showFeedback(statusAction.successMessage, "success");
    } catch {
      haptic("error");
      aux.setPreviewOverride(previewActiveVerse, {
        status: previewActiveVerse.status,
      });
      aux.showFeedback("Ошибка — попробуйте ещё раз", "error");
    } finally {
      aux.setIsActionPending(false);
    }
  }, [previewActiveVerse, aux, onStatusChange]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!previewActiveVerse) return;
    try {
      aux.setIsActionPending(true);
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
      aux.setIsActionPending(false);
    }
    aux.setIsDeleteDialogOpen(false);
  }, [previewActiveVerse, aux, onDelete, verses.length, nav, onClose]);

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (aux.isDeleteDialogOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        void nav.navigatePreviewTo("next");
        return;
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        void nav.navigatePreviewTo("prev");
      }
    };
    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [aux.isDeleteDialogOpen, nav, onClose]);

  // Initial focus
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // ── Slide announcement (accessibility) ──────────────────────────────────────
  const setSlideAnnouncement = aux.setSlideAnnouncement;
  useEffect(() => {
    if (!previewActiveVerse) return;
    setSlideAnnouncement(
      `Стих ${nav.activeIndex + 1} из ${Math.max(previewDisplayTotal, 1)}: ${previewActiveVerse.reference}`,
    );
  }, [nav.activeIndex, previewActiveVerse, previewDisplayTotal, setSlideAnnouncement]);

  // ── Swipe gesture ─────────────────────────────────────────────────────────
  const previewSwipeBind = useDrag(
    ({ last, movement: [, my], velocity: [, vy], canceled }) => {
      if (!last || canceled) return;
      if (Math.abs(my) > 50 || Math.abs(vy) > 0.3) {
        void nav.navigatePreviewTo(my < 0 ? "next" : "prev");
      }
    },
    { axis: "y", filterTaps: true, pointer: { touch: false }, threshold: 10 },
  );
  const previewSwipeHandlers = previewSwipeBind();

  const handlePreviewTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      previewTouchSwipeStartRef.current = createVerticalTouchSwipeStart(e);
    },
    [],
  );

  const handlePreviewTouchEnd = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      const step = getVerticalTouchSwipeStep(
        previewTouchSwipeStartRef.current,
        e,
        { minVerticalDistance: 48, verticalDominanceRatio: 1.05 },
      );
      previewTouchSwipeStartRef.current = null;
      if (!step) return;
      void nav.navigatePreviewTo(step === 1 ? "next" : "prev");
    },
    [nav],
  );

  const handleTelegramBack = useCallback(() => {
    if (aux.isActionPending) return;

    if (aux.isDeleteDialogOpen) {
      aux.setIsDeleteDialogOpen(false);
      return;
    }

    onClose();
  }, [aux, onClose]);

  useTelegramBackButton({
    enabled: true,
    onBack: handleTelegramBack,
    priority: 100,
  });

  // ── Display values ───────────────────────────────────────────────────────────
  if (!previewActiveVerse) return null;

  const displayTotal = previewDisplayTotal;
  const displayActive = Math.max(0, nav.activeIndex);
  const galleryBodyKey = getVerseIdentity(previewActiveVerse);

  const previewStatusAction = getGalleryStatusAction(
    normalizeVerseStatus(previewActiveVerse.status),
  );

  return (
    <>
      {isMounted &&
        createPortal(
          <Toaster
            id={GALLERY_TOASTER_ID}
            offset={{ top: `${Math.max(topInset, 0) + 12}px` }}
          />,
          document.body,
        )}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Просмотр стиха"
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
          aria-label="Карточки со стихами"
        >
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
              <div
                {...previewSwipeHandlers}
                className="w-full min-w-0 overflow-x-hidden"
                style={{ touchAction: "none" }}
                onTouchStart={handlePreviewTouchStart}
                onTouchEnd={handlePreviewTouchEnd}
              >
                <VersePreviewCard
                  verse={previewActiveVerse}
                  isActionPending={aux.isActionPending}
                  activeTagSlugs={activeTagSlugs}
                  onStartTraining={() => onNavigateToTraining(previewActiveVerse)}
                  onStatusAction={() => void handlePreviewStatusAction()}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer buttons */}
        <GalleryFooter
          isActionPending={aux.isActionPending}
          previewStatusAction={previewStatusAction}
          onClose={onClose}
          onPreviewStatusAction={() => void handlePreviewStatusAction()}
          onDeleteRequest={() => aux.setIsDeleteDialogOpen(true)}
          closeButtonRef={closeButtonRef}
        />

        <SwipeHint panelMode="preview" />

        <AlertDialog
          open={aux.isDeleteDialogOpen}
          onOpenChange={aux.setIsDeleteDialogOpen}
        >
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить стих?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Стих будет удалён из вашей
                коллекции.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full border border-border/60 bg-muted/35 text-foreground/90">
                Отмена
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={aux.isActionPending || !previewActiveVerse}
                className="rounded-full border border-border/60 bg-muted/35 text-foreground/90"
                onClick={() => void handleDelete()}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
