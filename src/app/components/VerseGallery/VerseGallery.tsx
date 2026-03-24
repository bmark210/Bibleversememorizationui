"use client";

import {
  startTransition,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
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
import { useGalleryOverlays } from "./hooks/useGalleryOverlays";
import { useGalleryScrollLock } from "./hooks/useGalleryScrollLock";
import { usePreparedVersePreview } from "./hooks/usePreparedVersePreview";
import { usePreviewNavigation } from "./hooks/usePreviewNavigation";
import {
  normalizeVerseStatus,
  toPreviewOverrideFromVersePatch,
  haptic,
  clamp,
} from "./utils";
import { TRAINING_STAGE_MASTERY_MAX } from "./constants";
import type { TrainingMode } from "@/app/components/Training/types";
import type { VerseGalleryProps } from "./types";

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

  useGalleryScrollLock();

  const {
    isActionPending,
    setIsActionPending,
    previewOverrides,
    setPreviewOverride,
    prunePreviewOverrides,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    slideAnnouncement,
    setSlideAnnouncement,
  } = useGalleryAux();

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

  useEffect(() => {
    if (verses.length === 0) return;
    const clamped = clamp(activeIndex, 0, Math.max(0, verses.length - 1));
    if (clamped !== activeIndex) setActiveIndex(clamped);
  }, [activeIndex, setActiveIndex, verses.length]);

  useEffect(() => {
    prunePreviewOverrides(verses);
  }, [prunePreviewOverrides, verses]);

  const {
    isOverlayOpen,
    isVerseTagsDrawerOpen,
    verseTagsTarget,
    isVerseOwnersDrawerOpen,
    verseOwnersTarget,
    isPlayerProfileDrawerOpen,
    activePlayerProfile,
    isVerseProgressDrawerOpen,
    setIsVerseProgressDrawerOpen,
    closeActiveOverlay,
    handleOpenTagsDrawer,
    handleOpenOwnersDrawer,
    handleVerseTagSelect,
    handleOpenPlayerProfile,
    handleOpenProgress,
    handleVerseTagsOpenChange,
    handleVerseOwnersOpenChange,
    handlePlayerProfileOpenChange,
  } = useGalleryOverlays({ onSelectTag });
  const preview = usePreparedVersePreview({
    verses,
    activeIndex,
    previewOverrides,
    isAnchorEligible,
  });

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

  const previewActiveVerse = preview?.verse ?? null;
  const previewActionModel = preview?.actionModel ?? null;
  const previewStatus = preview?.status ?? null;
  const isBlockingOverlayOpen = isDeleteDialogOpen || isOverlayOpen;

  const handlePreviewStatusMutation = useCallback(
    async (actionId: VerseCardActionId | null | undefined) => {
      if (!previewActiveVerse || !previewStatus || isActionPending) return;

      const statusAction = getPreviewStatusMutation(previewStatus, actionId);
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
          statusAction.nextStatus
        );

        if (patch) {
          setPreviewOverride(
            previewActiveVerse,
            toPreviewOverrideFromVersePatch(patch)
          );
        }

        haptic("success");
        const actionToastKind =
          statusAction.nextStatus === VerseStatus.MY
            ? "add-to-my"
            : statusAction.nextStatus === VerseStatus.LEARNING &&
                previewStatus === VerseStatus.STOPPED
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
      previewStatus,
      setIsActionPending,
      setPreviewOverride,
    ]
  );

  const handlePrimaryStatusAction = useCallback(() => {
    void handlePreviewStatusMutation(previewActionModel?.primaryAction?.id);
  }, [handlePreviewStatusMutation, previewActionModel]);

  const handleUtilityStatusAction = useCallback(() => {
    void handlePreviewStatusMutation(previewActionModel?.utilityAction?.id);
  }, [handlePreviewStatusMutation, previewActionModel]);

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

  const closeActiveLayer = useCallback(() => {
    if (isDeleteDialogOpen) {
      setIsDeleteDialogOpen(false);
      return true;
    }

    return closeActiveOverlay();
  }, [closeActiveOverlay, isDeleteDialogOpen, setIsDeleteDialogOpen]);

  const handleFocusModeVerticalSwipe = useCallback(
    (step: 1 | -1) => {
      if (isActionPending || isBlockingOverlayOpen) return;
      void navigatePreviewTo(step === 1 ? "next" : "prev");
    },
    [isActionPending, isBlockingOverlayOpen, navigatePreviewTo]
  );

  useEffect(() => {
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (closeActiveLayer()) return;
        onClose();
        return;
      }

      if (isBlockingOverlayOpen) {
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
  }, [closeActiveLayer, isBlockingOverlayOpen, navigatePreviewTo, onClose]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!previewActiveVerse) return;

    setSlideAnnouncement(
      `Стих ${activeIndex + 1} из ${Math.max(
        previewDisplayTotal,
        1
      )}: ${previewActiveVerse.reference}`
    );
  }, [activeIndex, previewActiveVerse, previewDisplayTotal, setSlideAnnouncement]);

  const handleTelegramBack = useCallback(() => {
    if (isActionPending) return;
    if (closeActiveLayer()) return;

    onClose();
  }, [closeActiveLayer, isActionPending, onClose]);

  useTelegramBackButton({
    enabled: true,
    onBack: handleTelegramBack,
    priority: 100,
  });

  const handleStartTraining = useCallback(() => {
    if (!previewActiveVerse || !previewStatus) return;

    const launchMode = getTrainingLaunchMode(previewStatus);
    if (!launchMode) return;

    onNavigateToTraining({
      verse: previewActiveVerse,
      preferredMode: launchMode,
    });
  }, [onNavigateToTraining, previewActiveVerse, previewStatus]);

  const handleDeleteDialogOpen = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, [setIsDeleteDialogOpen]);

  const handleGoPrev = useCallback(() => {
    void navigatePreviewTo("prev");
  }, [navigatePreviewTo]);

  const handleGoNext = useCallback(() => {
    void navigatePreviewTo("next");
  }, [navigatePreviewTo]);

  if (!previewActiveVerse || !previewActionModel || !preview) return null;

  const displayTotal = previewDisplayTotal;
  const displayActive = Math.max(0, activeIndex);
  const canGoPrev = activeIndex > 0;
  const canGoNext =
    activeIndex < verses.length - 1 ||
    (previewHasMore &&
      !previewIsLoadingMore &&
      typeof onRequestMorePreviewVerses === "function");
  const isPreviewSwipeEnabled =
    !isFocusMode && !isActionPending && !isBlockingOverlayOpen;

  return (
    <>
      {typeof document !== "undefined" &&
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

        <div
          className="relative flex min-h-0 flex-1 flex-col px-4 sm:px-6"
          role="region"
          aria-roledescription="carousel"
          aria-label="Карточки со стихами"
        >
          <GallerySwipeSlide
            slideKey={preview.key}
            direction={direction}
            enabled={isPreviewSwipeEnabled}
            onNavigate={navigatePreviewTo}
            className="h-full min-h-0 w-full"
          >
            <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-center py-1">
              <div className="w-full min-w-0">
                <VersePreviewCard
                  preview={preview}
                  isActionPending={isActionPending}
                  activeTagSlugs={selectedTagSlugs}
                  isFocusMode={isFocusMode}
                  onStartTraining={handleStartTraining}
                  onStatusAction={handlePrimaryStatusAction}
                  onUtilityAction={handleUtilityStatusAction}
                  onOpenProgress={handleOpenProgress}
                  onOpenTags={handleOpenTagsDrawer}
                  onOpenOwners={handleOpenOwnersDrawer}
                  onVerticalSwipeStep={
                    isFocusMode && !isActionPending && !isBlockingOverlayOpen
                      ? handleFocusModeVerticalSwipe
                      : undefined
                  }
                />
              </div>
            </div>
          </GallerySwipeSlide>
        </div>

        {/* Footer buttons */}
        <GalleryFooter
          isActionPending={isActionPending}
          isFocusMode={isFocusMode}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          showDelete={previewStatus !== "CATALOG"}
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
