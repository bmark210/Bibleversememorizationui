"use client";

import {
  useEffect,
  useRef,
  useCallback,
  useMemo,
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
import { PlayerProfileDrawer } from "@/app/components/PlayerProfileDrawer";
import { VerseProgressDrawer } from "@/app/components/VerseProgressDrawer";
import { VerseOwnersDrawer } from "@/app/components/VerseOwnersDrawer";
import { VerseTagsDrawer } from "@/app/components/verse-list/components/VerseTagsDrawer";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { GALLERY_TOASTER_ID, TOAST_TOP_OFFSET_PX, toast } from "@/app/lib/toast";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { buildVerseDeletionXpFeedback } from "@/app/utils/verseXp";
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
import type { Verse } from "@/app/App";
import type { TrainingMode } from "@/app/components/Training/types";
import type { PlayerProfilePreview, VerseGalleryProps } from "./types";

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

function getTrainingLaunchMode(
  status: ReturnType<typeof normalizeVerseStatus>
): TrainingMode | null {
  if (status === "MASTERED") return "anchor";
  if (status === "REVIEW") return "review";
  if (status === VerseStatus.LEARNING) return "learning";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewTouchSwipeStartRef = useRef<VerticalTouchSwipeStart | null>(
    null,
  );

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
      const result = await onDelete(previewActiveVerse);
      const xpLoss =
        result && typeof result === "object" && "xpLoss" in result
          ? Number(result.xpLoss ?? 0)
          : 0;
      const feedback = buildVerseDeletionXpFeedback({
        xpLoss,
      });
      haptic("success");
      toast.success(feedback.title, {
        description: feedback.description,
        toasterId: GALLERY_TOASTER_ID,
        label: "Галерея",
      });
      aux.showFeedback(
        xpLoss > 0
          ? `${feedback.title}. -${xpLoss} XP`
          : feedback.title,
        "success"
      );
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
      if (e.key === "Escape") {
        e.preventDefault();
        if (aux.isDeleteDialogOpen) {
          aux.setIsDeleteDialogOpen(false);
          return;
        }
        if (isPlayerProfileDrawerOpen) {
          closePlayerProfileDrawer();
          return;
        }
        if (isVerseOwnersDrawerOpen) {
          closeVerseOwnersDrawer();
          return;
        }
        if (isVerseTagsDrawerOpen) {
          closeVerseTagsDrawer();
          return;
        }
        if (isVerseProgressDrawerOpen) {
          setIsVerseProgressDrawerOpen(false);
          return;
        }
        onClose();
        return;
      }
      if (
        aux.isDeleteDialogOpen ||
        isPlayerProfileDrawerOpen ||
        isVerseOwnersDrawerOpen ||
        isVerseTagsDrawerOpen ||
        isVerseProgressDrawerOpen
      ) {
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
  }, [
    aux,
    closePlayerProfileDrawer,
    closeVerseOwnersDrawer,
    closeVerseTagsDrawer,
    isPlayerProfileDrawerOpen,
    isVerseProgressDrawerOpen,
    isVerseOwnersDrawerOpen,
    isVerseTagsDrawerOpen,
    nav,
    onClose,
  ]);

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
    if (isPlayerProfileDrawerOpen) {
      closePlayerProfileDrawer();
      return;
    }
    if (isVerseOwnersDrawerOpen) {
      closeVerseOwnersDrawer();
      return;
    }
    if (isVerseTagsDrawerOpen) {
      closeVerseTagsDrawer();
      return;
    }
    if (isVerseProgressDrawerOpen) {
      setIsVerseProgressDrawerOpen(false);
      return;
    }

    onClose();
  }, [
    aux,
    closePlayerProfileDrawer,
    closeVerseOwnersDrawer,
    closeVerseTagsDrawer,
    isPlayerProfileDrawerOpen,
    isVerseProgressDrawerOpen,
    isVerseOwnersDrawerOpen,
    isVerseTagsDrawerOpen,
    onClose,
  ]);

  useTelegramBackButton({
    enabled: true,
    onBack: handleTelegramBack,
    priority: 100,
  });

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

  const handleGoPrev = useCallback(() => {
    void nav.navigatePreviewTo("prev");
  }, [nav]);

  const handleGoNext = useCallback(() => {
    void nav.navigatePreviewTo("next");
  }, [nav]);

  const handleVerticalSwipeStep = useCallback(
    (step: 1 | -1) => {
      void nav.navigatePreviewTo(step === 1 ? "next" : "prev");
    },
    [nav],
  );

  // ── Display values ───────────────────────────────────────────────────────────
  if (!previewActiveVerse) return null;

  const displayTotal = previewDisplayTotal;
  const displayActive = Math.max(0, nav.activeIndex);
  const galleryBodyKey = getVerseIdentity(previewActiveVerse);
  const canGoPrev = nav.activeIndex > 0;
  const canGoNext =
    nav.activeIndex < verses.length - 1 ||
    (previewHasMore &&
      !previewIsLoadingMore &&
      typeof onRequestMorePreviewVerses === "function");

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
          className="relative flex-1 min-h-0 grid place-items-center px-4 sm:px-6"
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
                {...(isFocusMode ? {} : previewSwipeHandlers)}
                className="w-full min-w-0 overflow-x-hidden"
                style={isFocusMode ? undefined : { touchAction: "none" }}
                onTouchStart={isFocusMode ? undefined : handlePreviewTouchStart}
                onTouchEnd={isFocusMode ? undefined : handlePreviewTouchEnd}
              >
                <VersePreviewCard
                  verse={previewActiveVerse}
                  isActionPending={aux.isActionPending}
                  activeTagSlugs={activeTagSlugs}
                  isAnchorEligible={isAnchorEligible}
                  isFocusMode={isFocusMode}
                  onStartTraining={handleStartTraining}
                  onStatusAction={() => void handlePreviewStatusAction()}
                  onOpenProgress={() => setIsVerseProgressDrawerOpen(true)}
                  onOpenTags={handleOpenTagsDrawer}
                  onOpenOwners={handleOpenOwnersDrawer}
                  onVerticalSwipeStep={isFocusMode ? handleVerticalSwipeStep : undefined}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer buttons */}
        <GalleryFooter
          isActionPending={aux.isActionPending}
          isFocusMode={isFocusMode}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          showDelete={normalizeVerseStatus(previewActiveVerse.status) !== "CATALOG"}
          onClose={onClose}
          onToggleFocusMode={onToggleFocusMode}
          onGoPrev={handleGoPrev}
          onGoNext={handleGoNext}
          onDeleteRequest={() => aux.setIsDeleteDialogOpen(true)}
          closeButtonRef={closeButtonRef}
        />

        {!isFocusMode ? <SwipeHint panelMode="preview" /> : null}

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
              <AlertDialogCancel className="rounded-full border border-border/60 bg-muted/35 text-foreground/80">
                Отмена
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={aux.isActionPending || !previewActiveVerse}
                className="rounded-full border border-border/60 bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => void handleDelete()}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <VerseTagsDrawer
        target={verseTagsTarget}
        open={isVerseTagsDrawerOpen}
        selectedTagSlugs={selectedTagSlugs}
        onOpenChange={(open) => {
          if (!open) {
            closeVerseTagsDrawer();
            return;
          }
          setIsVerseTagsDrawerOpen(true);
        }}
        onSelectTag={handleVerseTagSelect}
      />

      <VerseOwnersDrawer
        viewerTelegramId={viewerTelegramId}
        target={verseOwnersTarget}
        open={isVerseOwnersDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeVerseOwnersDrawer();
            return;
          }
          setIsVerseOwnersDrawerOpen(true);
        }}
        onOpenPlayerProfile={handleOpenPlayerProfile}
      />

      <PlayerProfileDrawer
        viewerTelegramId={viewerTelegramId}
        preview={activePlayerProfile}
        open={isPlayerProfileDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            closePlayerProfileDrawer();
            return;
          }
          setIsPlayerProfileDrawerOpen(true);
        }}
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
