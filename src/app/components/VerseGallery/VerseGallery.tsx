"use client";

import {
  startTransition,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
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
import { Toaster } from "@/app/components/ui/toaster";
import { PlayerProfileDrawer } from "@/app/components/PlayerProfileDrawer";
import { VerseProgressDrawer } from "@/app/components/VerseProgressDrawer";
import { VerseOwnersDrawer } from "@/app/components/VerseOwnersDrawer";
import {
  resolveVerseCardActionModel,
  type VerseCardActionId,
} from "@/app/components/verseCardActionModel";
import { VerseTagsDrawer } from "@/app/components/verse-list/components/VerseTagsDrawer";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { GALLERY_TOASTER_ID, TOAST_TOP_OFFSET_PX, toast } from "@/app/lib/toast";
import {
  formatToastXpDelta,
  showVerseActionToast,
} from "@/app/lib/semanticToast";
import { VerseStatus } from "@/shared/domain/verseStatus";

import { GalleryHeader } from "./components/GalleryHeader";
import { GalleryFooter } from "./components/GalleryFooter";
import { GallerySwipeSlide } from "./components/GallerySwipeSlide";
import { SwipeHint } from "./components/SwipeHint";
import { VersePreviewCard } from "./components/VersePreviewCard";
import { useGalleryAux } from "./hooks/useGalleryAux";
import { usePreviewNavigation } from "./hooks/usePreviewNavigation";
import {
  normalizeVerseStatus,
  parseDate,
  getVerseIdentity,
  mergePreviewOverrides,
  toPreviewOverrideFromVersePatch,
  haptic,
  clamp,
} from "./utils";
import { TRAINING_STAGE_MASTERY_MAX } from "./constants";
import type { Verse } from "@/app/App";
import type { TrainingMode } from "@/app/components/Training/types";
import type { PlayerProfilePreview, VerseGalleryProps } from "./types";

// ── Card slide animation ─────────────────────────────────────────────────────
// Fast GPU-friendly tweens instead of spring physics for smoother mobile perf.
// Using `translate3d` via y% keeps everything on the compositor thread.
const TWEEN_ENTER: [number, number, number, number] = [0.22, 1, 0.36, 1];
const TWEEN_EXIT: [number, number, number, number] = [0.4, 0, 0.2, 1];

const slideVariants = {
  enter: (dir: number) =>
    dir === 0
      ? { y: 0, opacity: 0, scale: 1 }
      : { y: dir > 0 ? "60%" : "-60%", opacity: 0, scale: 0.92 },
  center: (_dir: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.28, ease: TWEEN_ENTER },
  }),
  exit: (dir: number) =>
    dir === 0
      ? {
          opacity: 0,
          scale: 1,
          transition: { duration: 0.15, ease: TWEEN_EXIT },
        }
      : {
          y: dir > 0 ? "-20%" : "20%",
          opacity: 0,
          scale: 0.92,
          transition: { duration: 0.22, ease: TWEEN_EXIT },
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

function getTrainingLaunchMode(
  status: ReturnType<typeof normalizeVerseStatus>
): TrainingMode | null {
  if (status === "MASTERED") return "anchor";
  if (status === "REVIEW") return "review";
  if (status === VerseStatus.LEARNING) return "learning";
  return null;
}

type PreviewStatusMutation = {
  nextStatus: VerseStatus;
};

function getPreviewStatusMutation(
  status: ReturnType<typeof normalizeVerseStatus>,
  actionId: VerseCardActionId | null | undefined,
): PreviewStatusMutation | null {
  if (!actionId) return null;

  if (actionId === "add-to-my" && status === "CATALOG") {
    return {
      nextStatus: VerseStatus.MY,
    };
  }

  if (actionId === "start-learning" && status === VerseStatus.MY) {
    return {
      nextStatus: VerseStatus.LEARNING,
    };
  }

  if (actionId === "resume" && status === VerseStatus.STOPPED) {
    return {
      nextStatus: VerseStatus.LEARNING,
    };
  }

  if (
    actionId === "pause" &&
    (status === VerseStatus.LEARNING ||
      status === "REVIEW" ||
      status === "MASTERED")
  ) {
    return {
      nextStatus: VerseStatus.STOPPED,
    };
  }

  return null;
}

export function VerseGallery({
  verses,
  initialIndex,
  activeTagSlugs = null,
  viewerTelegramId = null,
  isFocusMode = false,
  onToggleFocusMode,
  onClose,
  onStatusChange,
  onDelete,
  onSelectTag,
  onFriendsChanged,
  onNavigateToTraining,
  isAnchorEligible = false,
  previewTotalCount = verses.length,
  previewHasMore = false,
  previewIsLoadingMore = false,
  onRequestMorePreviewVerses,
}: VerseGalleryProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isVerseTagsDrawerOpen, setIsVerseTagsDrawerOpen] = useState(false);
  const [verseTagsTarget, setVerseTagsTarget] = useState<Pick<
    Verse,
    "reference" | "tags"
  > | null>(null);
  const [isVerseOwnersDrawerOpen, setIsVerseOwnersDrawerOpen] = useState(false);
  const [verseOwnersTarget, setVerseOwnersTarget] = useState<{
    externalVerseId: string;
    reference: string;
    scope: "friends" | "players";
    totalCount: number;
  } | null>(null);
  const [isPlayerProfileDrawerOpen, setIsPlayerProfileDrawerOpen] =
    useState(false);
  const [activePlayerProfile, setActivePlayerProfile] =
    useState<PlayerProfilePreview | null>(null);
  const [isVerseProgressDrawerOpen, setIsVerseProgressDrawerOpen] =
    useState(false);

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
  const {
    isActionPending,
    setIsActionPending,
    previewOverrides,
    setPreviewOverride,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    slideAnnouncement,
    setSlideAnnouncement,
  } = useGalleryAux();

  // ── Preview navigation ───────────────────────────────────────────────────────
  const {
    activeIndex,
    direction,
    setActiveIndex,
    setDirection,
    navigatePreviewTo,
  } = usePreviewNavigation({
    verses,
    initialIndex,
    previewHasMore,
    previewIsLoadingMore,
    onRequestMorePreviewVerses,
  });

  // Keep activeIndex clamped when verse list shrinks
  useEffect(() => {
    if (verses.length === 0) return;
    const clamped = clamp(activeIndex, 0, Math.max(0, verses.length - 1));
    if (clamped !== activeIndex) setActiveIndex(clamped);
  }, [activeIndex, setActiveIndex, verses.length]);

  // ── Derived preview state ────────────────────────────────────────────────────
  const activePreviewVerse = verses[activeIndex];
  const previewActiveVerse = activePreviewVerse
    ? mergePreviewOverrides(activePreviewVerse, previewOverrides)
    : null;
  const previewActionModel = useMemo(() => {
    if (!previewActiveVerse) return null;

    return resolveVerseCardActionModel({
      status: normalizeVerseStatus(previewActiveVerse.status),
      flow: previewActiveVerse.flow,
      nextReviewAt: parseDate(
        (previewActiveVerse as Record<string, unknown>).nextReviewAt ??
          (previewActiveVerse as Record<string, unknown>).nextReview,
      ),
      isAnchorEligible,
    });
  }, [previewActiveVerse, isAnchorEligible]);

  const previewDisplayTotal = Math.max(previewTotalCount, verses.length, 1);
  const selectedTagSlugs = useMemo(() => {
    const next = new Set<string>();
    if (!activeTagSlugs) return next;

    for (const rawSlug of activeTagSlugs) {
      const slug = String(rawSlug ?? "").trim();
      if (!slug) continue;
      next.add(slug);
    }

    return next;
  }, [activeTagSlugs]);

  const closeVerseTagsDrawer = useCallback(() => {
    setIsVerseTagsDrawerOpen(false);
    setVerseTagsTarget(null);
  }, []);

  const closeVerseOwnersDrawer = useCallback(() => {
    setIsVerseOwnersDrawerOpen(false);
    setVerseOwnersTarget(null);
  }, []);

  const closePlayerProfileDrawer = useCallback(() => {
    setIsPlayerProfileDrawerOpen(false);
    setActivePlayerProfile(null);
  }, []);

  const handleOpenTagsDrawer = useCallback((verse: Verse) => {
    if (!verse.tags || verse.tags.length === 0) return;

    setVerseTagsTarget({
      reference: verse.reference,
      tags: verse.tags,
    });
    setIsVerseTagsDrawerOpen(true);
  }, []);

  const handleOpenOwnersDrawer = useCallback((verse: Verse) => {
    if (
      !verse.popularityScope ||
      verse.popularityScope === "self" ||
      !verse.popularityValue
    ) {
      return;
    }

    setVerseOwnersTarget({
      externalVerseId: verse.externalVerseId,
      reference: verse.reference,
      scope: verse.popularityScope,
      totalCount: Math.max(0, Math.round(verse.popularityValue)),
    });
    setIsVerseOwnersDrawerOpen(true);
  }, []);

  const handleVerseTagSelect = useCallback(
    (slug: string) => {
      onSelectTag(slug);
      closeVerseTagsDrawer();
    },
    [closeVerseTagsDrawer, onSelectTag],
  );

  const handleOpenPlayerProfile = useCallback(
    (player: PlayerProfilePreview) => {
      if (!player.telegramId) return;

      setActivePlayerProfile({
        telegramId: player.telegramId,
        name: player.name,
        avatarUrl: player.avatarUrl ?? null,
      });
      setIsPlayerProfileDrawerOpen(true);
    },
    [],
  );

  // ── Preview status action ────────────────────────────────────────────────────
  const handlePreviewStatusMutation = useCallback(
    async (actionId: VerseCardActionId | null | undefined) => {
      if (!previewActiveVerse || isActionPending) return;
      const statusAction = getPreviewStatusMutation(
        normalizeVerseStatus(previewActiveVerse.status),
        actionId,
      );
      if (!statusAction) return;
      try {
        setIsActionPending(true);
        const optimisticStatus =
          statusAction.nextStatus === VerseStatus.LEARNING &&
          Number(previewActiveVerse.masteryLevel ?? 0) >=
            TRAINING_STAGE_MASTERY_MAX
            ? "REVIEW"
            : statusAction.nextStatus;
        setPreviewOverride(previewActiveVerse, { status: optimisticStatus });
        const patch = await onStatusChange(
          previewActiveVerse,
          statusAction.nextStatus,
        );
        if (patch) {
          setPreviewOverride(
            previewActiveVerse,
            toPreviewOverrideFromVersePatch(patch),
          );
        }
        haptic("success");
        const actionToastKind =
          statusAction.nextStatus === VerseStatus.MY
            ? "add-to-my"
            : statusAction.nextStatus === VerseStatus.LEARNING &&
                normalizeVerseStatus(previewActiveVerse.status) ===
                  VerseStatus.STOPPED
              ? "resume"
              : statusAction.nextStatus === VerseStatus.LEARNING
                ? "start-learning"
                : "pause";
        showVerseActionToast({
          kind: actionToastKind,
          reference: previewActiveVerse.reference,
          toasterId: GALLERY_TOASTER_ID,
        });
      } catch {
        haptic("error");
        setPreviewOverride(previewActiveVerse, {
          status: previewActiveVerse.status,
        });
        toast.error("Ошибка — попробуйте ещё раз", {
          label: "Галерея",
          toasterId: GALLERY_TOASTER_ID,
        });
      } finally {
        setIsActionPending(false);
      }
    },
    [
      isActionPending,
      onStatusChange,
      previewActiveVerse,
      setIsActionPending,
      setPreviewOverride,
    ],
  );

  const handlePrimaryStatusAction = useCallback(() => {
    void handlePreviewStatusMutation(previewActionModel?.primaryAction?.id);
  }, [handlePreviewStatusMutation, previewActionModel]);

  const handleUtilityStatusAction = useCallback(() => {
    void handlePreviewStatusMutation(previewActionModel?.utilityAction?.id);
  }, [handlePreviewStatusMutation, previewActionModel]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!previewActiveVerse) return;
    try {
      setIsActionPending(true);
      const result = await onDelete(previewActiveVerse);
      const xpLoss =
        result && typeof result === "object" && "xpLoss" in result
          ? Number(result.xpLoss ?? 0)
          : 0;
      haptic("success");
      showVerseActionToast({
        kind: "delete",
        reference: previewActiveVerse.reference,
        meta: formatToastXpDelta(-xpLoss),
        toasterId: GALLERY_TOASTER_ID,
      });
      if (verses.length <= 1) {
        onClose();
      } else {
        const newDir = activeIndex > 0 ? -1 : 1;
        startTransition(() => {
          setDirection(newDir);
          setActiveIndex(activeIndex > 0 ? activeIndex - 1 : 0);
        });
      }
    } catch {
      haptic("error");
      toast.error("Ошибка удаления", {
        label: "Галерея",
        toasterId: GALLERY_TOASTER_ID,
      });
    } finally {
      setIsActionPending(false);
    }
    setIsDeleteDialogOpen(false);
  }, [
    activeIndex,
    onClose,
    onDelete,
    previewActiveVerse,
    setActiveIndex,
    setDirection,
    setIsActionPending,
    setIsDeleteDialogOpen,
    verses.length,
  ]);

  const isOverlayOpen =
    isDeleteDialogOpen ||
    isPlayerProfileDrawerOpen ||
    isVerseOwnersDrawerOpen ||
    isVerseTagsDrawerOpen ||
    isVerseProgressDrawerOpen;

  const closeActiveOverlay = useCallback(() => {
    if (isDeleteDialogOpen) {
      setIsDeleteDialogOpen(false);
      return true;
    }
    if (isPlayerProfileDrawerOpen) {
      closePlayerProfileDrawer();
      return true;
    }
    if (isVerseOwnersDrawerOpen) {
      closeVerseOwnersDrawer();
      return true;
    }
    if (isVerseTagsDrawerOpen) {
      closeVerseTagsDrawer();
      return true;
    }
    if (isVerseProgressDrawerOpen) {
      setIsVerseProgressDrawerOpen(false);
      return true;
    }
    return false;
  }, [
    closePlayerProfileDrawer,
    closeVerseOwnersDrawer,
    closeVerseTagsDrawer,
    isDeleteDialogOpen,
    isPlayerProfileDrawerOpen,
    isVerseOwnersDrawerOpen,
    isVerseProgressDrawerOpen,
    isVerseTagsDrawerOpen,
    setIsDeleteDialogOpen,
  ]);

  const handlePreviewSwipeStep = useCallback(
    (step: 1 | -1) => navigatePreviewTo(step === 1 ? "next" : "prev"),
    [navigatePreviewTo],
  );

  const handleFocusModeVerticalSwipe = useCallback(
    (step: 1 | -1) => {
      if (isActionPending || isOverlayOpen) return;
      void handlePreviewSwipeStep(step);
    },
    [handlePreviewSwipeStep, isActionPending, isOverlayOpen],
  );

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (closeActiveOverlay()) return;
        onClose();
        return;
      }
      if (isOverlayOpen) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        void navigatePreviewTo("next");
        return;
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        void navigatePreviewTo("prev");
      }
    };
    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [
    closeActiveOverlay,
    isOverlayOpen,
    navigatePreviewTo,
    onClose,
  ]);

  // Initial focus
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // ── Slide announcement (accessibility) ──────────────────────────────────────
  useEffect(() => {
    if (!previewActiveVerse) return;
    setSlideAnnouncement(
      `Стих ${activeIndex + 1} из ${Math.max(previewDisplayTotal, 1)}: ${previewActiveVerse.reference}`,
    );
  }, [activeIndex, previewActiveVerse, previewDisplayTotal, setSlideAnnouncement]);

  const handleTelegramBack = useCallback(() => {
    if (isActionPending) return;
    if (closeActiveOverlay()) return;

    onClose();
  }, [closeActiveOverlay, isActionPending, onClose]);

  useTelegramBackButton({
    enabled: true,
    onBack: handleTelegramBack,
    priority: 100,
  });

  const handleOpenProgress = useCallback(() => {
    setIsVerseProgressDrawerOpen(true);
  }, []);

  const handleVerseTagsOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeVerseTagsDrawer();
        return;
      }
      setIsVerseTagsDrawerOpen(true);
    },
    [closeVerseTagsDrawer],
  );

  const handleVerseOwnersOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeVerseOwnersDrawer();
        return;
      }
      setIsVerseOwnersDrawerOpen(true);
    },
    [closeVerseOwnersDrawer],
  );

  const handlePlayerProfileOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closePlayerProfileDrawer();
        return;
      }
      setIsPlayerProfileDrawerOpen(true);
    },
    [closePlayerProfileDrawer],
  );

  const handleStartTraining = useCallback(() => {
    if (!previewActiveVerse) return;

    const launchMode = getTrainingLaunchMode(
      normalizeVerseStatus(previewActiveVerse.status),
    );
    if (!launchMode) return;

    onNavigateToTraining({
      verse: previewActiveVerse,
      preferredMode: launchMode,
    });
  }, [onNavigateToTraining, previewActiveVerse]);

  const handleDeleteDialogOpen = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, [setIsDeleteDialogOpen]);

  const handleGoPrev = useCallback(() => {
    void navigatePreviewTo("prev");
  }, [navigatePreviewTo]);

  const handleGoNext = useCallback(() => {
    void navigatePreviewTo("next");
  }, [navigatePreviewTo]);

  // ── Display values ───────────────────────────────────────────────────────────
  if (!previewActiveVerse || !previewActionModel) return null;

  const displayTotal = previewDisplayTotal;
  const displayActive = Math.max(0, activeIndex);
  const galleryBodyKey = getVerseIdentity(previewActiveVerse);
  const canGoPrev = activeIndex > 0;
  const canGoNext =
    activeIndex < verses.length - 1 ||
    (previewHasMore &&
      !previewIsLoadingMore &&
      typeof onRequestMorePreviewVerses === "function");
  const isPreviewSwipeEnabled = !isFocusMode && !isActionPending && !isOverlayOpen;
  return (
    <>
      {isMounted &&
        createPortal(
          <Toaster
            id={GALLERY_TOASTER_ID}
            offset={{ top: `${Math.max(topInset, 0) + TOAST_TOP_OFFSET_PX}px` }}
          />,
          document.body,
        )}

      <div
        data-tour="verse-gallery-root"
        role="dialog"
        aria-modal="true"
        aria-label="Просмотр стиха"
        className="fixed inset-0 z-50 flex flex-col overflow-x-hidden bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-sm"
      >
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {slideAnnouncement}
        </div>

        <GalleryHeader
          displayActive={displayActive}
          displayTotal={displayTotal}
          topInset={topInset}
        />

        {/* Card area — GPU-promoted layer for smooth compositing */}
        <div
          className="relative flex-1 min-h-0 grid place-items-center px-4 sm:px-6"
          role="region"
          aria-roledescription="carousel"
          aria-label="Карточки со стихами"
        >
          <AnimatePresence initial={false} mode="sync" custom={direction}>
            <motion.div
              key={galleryBodyKey}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="col-start-1 row-start-1 w-full max-w-4xl min-w-0 focus-visible:outline-none"
              style={{ willChange: "transform, opacity" }}
              tabIndex={-1}
            >
              <GallerySwipeSlide
                enabled={isPreviewSwipeEnabled}
                onSwipeStep={handlePreviewSwipeStep}
              >
                <VersePreviewCard
                  verse={previewActiveVerse}
                  isActionPending={isActionPending}
                  activeTagSlugs={selectedTagSlugs}
                  isAnchorEligible={isAnchorEligible}
                  isFocusMode={isFocusMode}
                  onStartTraining={handleStartTraining}
                  onStatusAction={handlePrimaryStatusAction}
                  onUtilityAction={handleUtilityStatusAction}
                  onOpenProgress={handleOpenProgress}
                  onOpenTags={handleOpenTagsDrawer}
                  onOpenOwners={handleOpenOwnersDrawer}
                  onVerticalSwipeStep={
                    isFocusMode && !isActionPending && !isOverlayOpen
                      ? handleFocusModeVerticalSwipe
                      : undefined
                  }
                />
              </GallerySwipeSlide>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer buttons */}
        <GalleryFooter
          isActionPending={isActionPending}
          isFocusMode={isFocusMode}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          showDelete={normalizeVerseStatus(previewActiveVerse.status) !== "CATALOG"}
          bottomInset={contentSafeAreaInset.bottom}
          onClose={onClose}
          onToggleFocusMode={onToggleFocusMode}
          onGoPrev={handleGoPrev}
          onGoNext={handleGoNext}
          onDeleteRequest={handleDeleteDialogOpen}
          closeButtonRef={closeButtonRef}
        />

        {!isFocusMode ? <SwipeHint panelMode="preview" /> : null}

        <Drawer
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <DrawerContent>
            <DrawerHeader className="pb-1">
              <DrawerTitle className="text-base text-foreground/90">
                Удалить стих?
              </DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground/80">
                Это действие нельзя отменить. Стих будет удалён из вашей
                коллекции.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="flex-row gap-3 pt-2">
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl border-border/60 bg-muted/35 text-sm font-medium text-foreground/70"
                >
                  Отмена
                </Button>
              </DrawerClose>
              <Button
                disabled={isActionPending || !previewActiveVerse}
                className="flex-1 h-12 rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] text-sm font-semibold text-rose-800 shadow-sm hover:bg-rose-500/[0.12] dark:text-rose-200"
                onClick={() => void handleDelete()}
              >
                Удалить
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      <VerseTagsDrawer
        target={verseTagsTarget}
        open={isVerseTagsDrawerOpen}
        selectedTagSlugs={selectedTagSlugs}
        onOpenChange={handleVerseTagsOpenChange}
        onSelectTag={handleVerseTagSelect}
      />

      <VerseOwnersDrawer
        viewerTelegramId={viewerTelegramId}
        target={verseOwnersTarget}
        open={isVerseOwnersDrawerOpen}
        onOpenChange={handleVerseOwnersOpenChange}
        onOpenPlayerProfile={handleOpenPlayerProfile}
      />

      <PlayerProfileDrawer
        viewerTelegramId={viewerTelegramId}
        preview={activePlayerProfile}
        open={isPlayerProfileDrawerOpen}
        onOpenChange={handlePlayerProfileOpenChange}
        onFriendsChanged={onFriendsChanged}
      />

      <VerseProgressDrawer
        verse={previewActiveVerse}
        open={isVerseProgressDrawerOpen}
        onOpenChange={setIsVerseProgressDrawerOpen}
      />
    </>
  );
}
