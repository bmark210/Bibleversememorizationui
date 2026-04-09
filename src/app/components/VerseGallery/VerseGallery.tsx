"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { PlayerProfileDrawer } from "@/app/components/PlayerProfileDrawer";
import { VerseProgressDrawer } from "@/app/components/VerseProgressDrawer";
import { VerseOwnersDrawer } from "@/app/components/VerseOwnersDrawer";
import { type VerseCardActionId } from "@/app/components/verseCardActionModel";
import { VerseTagsDrawer } from "@/app/components/verse-list/components/VerseTagsDrawer";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import type { Verse } from "@/app/domain/verse";
import { GALLERY_TOASTER_ID, TOAST_TOP_OFFSET_PX, toast } from "@/app/lib/toast";
import {
  showVerseActionToast,
} from "@/app/lib/semanticToast";
import { buildVerseDeletionFeedback } from "@/app/utils/verseXp";
import { VERSE_CARD_COLOR_CONFIG } from "@/app/components/verseCardColorConfig";
import {
  normalizeDisplayVerseStatus,
  type DisplayVerseStatus,
} from "@/app/types/verseStatus";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { getVerseTrainingLaunchMode } from "@/shared/verseRules/index";
import { resolveTextVersePresentation } from "@/app/components/texts/resolveTextVersePresentation";

import { GalleryHeader } from "./components/GalleryHeader";
import { GalleryDeleteDrawer } from "./components/GalleryDeleteDrawer";
import { GalleryFooter } from "./components/GalleryFooter";
import { GallerySwipeSlide } from "./components/GallerySwipeSlide";
import { GalleryToasterPortal } from "./components/GalleryToasterPortal";
import { SwipeHint } from "./components/SwipeHint";
import { VersePreviewCard } from "./components/VersePreviewCard";
import { useGalleryAux } from "./hooks/useGalleryAux";
import { useEventCallback } from "./hooks/useEventCallback";
import { useGalleryOverlays } from "./hooks/useGalleryOverlays";
import { useGalleryScrollLock } from "./hooks/useGalleryScrollLock";
import { usePreparedVersePreview } from "./hooks/usePreparedVersePreview";
import { usePreviewNavigation } from "./hooks/usePreviewNavigation";
import {
  toPreviewOverrideFromVersePatch,
  haptic,
  clamp,
} from "./utils";
import { TRAINING_STAGE_MASTERY_MAX } from "./constants";
import {
  isCatalogGalleryMode,
  isCatalogGalleryOwnedVerse,
  shouldShowGalleryDelete,
} from "./presentation";
import type { VerseGalleryProps } from "./types";

type PreviewStatusMutation = {
  nextStatus: VerseStatus;
};

function normalizeSelectedTagSlugs(
  activeTagSlugs: Iterable<string> | null | undefined
) {
  const next = new Set<string>();
  if (!activeTagSlugs) return next;

  for (const rawSlug of activeTagSlugs) {
    const slug = String(rawSlug ?? "").trim();
    if (!slug) continue;
    next.add(slug);
  }

  return next;
}

function getPreviewStatusMutation(
  status: DisplayVerseStatus,
  actionId: VerseCardActionId | null | undefined,
): PreviewStatusMutation | null {
  if (!actionId) return null;

  if (actionId === "add-to-my" && status === "CATALOG") {
    return {
      nextStatus: VerseStatus.QUEUE,
    };
  }

  if (actionId === "resume" && status === VerseStatus.STOPPED) {
    return {
      nextStatus: VerseStatus.QUEUE,
    };
  }

  if (
    actionId === "pause" &&
    (status === VerseStatus.QUEUE ||
      status === VerseStatus.LEARNING ||
      status === "REVIEW" ||
      status === "MASTERED")
  ) {
    return {
      nextStatus: VerseStatus.STOPPED,
    };
  }

  return null;
}

function getScopedPreviewStatusMutation(previewVerse: Verse): PreviewStatusMutation | null {
  const presentation = resolveTextVersePresentation(previewVerse);
  if (presentation.actionKind === "pause") {
    return { nextStatus: VerseStatus.STOPPED };
  }
  if (presentation.actionKind === "resume") {
    return { nextStatus: VerseStatus.QUEUE };
  }
  return null;
}

export function VerseGallery({
  verses,
  initialIndex,
  sourceMode = "my",
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
  onEditQueuePosition,
  isAnchorEligible = false,
  previewTotalCount = verses.length,
  previewHasMore = false,
  previewIsLoadingMore = false,
  onRequestMorePreviewVerses,
  primaryActionOverride = null,
  showDeleteAction,
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

  const previewActiveVerse = preview?.verse ?? null;
  const previewActionModel = preview?.actionModel ?? null;
  const previewStatus = preview?.status ?? null;
  const isCatalogSourceMode = isCatalogGalleryMode(sourceMode);
  const isCatalogOwnedPreview =
    previewStatus != null &&
    isCatalogGalleryOwnedVerse(sourceMode, previewStatus);
  const isBlockingOverlayOpen = isDeleteDialogOpen || isOverlayOpen;
  const previewDisplayTotal = useMemo(
    () => Math.max(previewTotalCount, verses.length, 1),
    [previewTotalCount, verses.length]
  );
  const selectedTagSlugs = useMemo(
    () => normalizeSelectedTagSlugs(activeTagSlugs),
    [activeTagSlugs]
  );
  const slideAnnouncement = useMemo(() => {
    if (!previewActiveVerse) return "";

    return `Стих ${activeIndex + 1} из ${previewDisplayTotal}: ${previewActiveVerse.reference}`;
  }, [activeIndex, previewActiveVerse?.reference, previewDisplayTotal]);
  const canRequestMorePreview =
    previewHasMore &&
    !previewIsLoadingMore &&
    typeof onRequestMorePreviewVerses === "function";
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < verses.length - 1 || canRequestMorePreview;
  const isPreviewSwipeEnabled =
    !isFocusMode && !isActionPending && !isBlockingOverlayOpen;
  const toasterTopOffsetPx = Math.max(topInset, 0) + TOAST_TOP_OFFSET_PX;

  const handleClose = useEventCallback(() => {
    onClose();
  });

  const applyPreviewStatusMutation = useEventCallback(
    async (statusAction: PreviewStatusMutation | null) => {
      if (!previewActiveVerse || !previewStatus || isActionPending) return;

      if (!statusAction) return;

      try {
        setIsActionPending(true);
        const optimisticStatus =
          statusAction.nextStatus === VerseStatus.LEARNING &&
          Number(previewActiveVerse.masteryLevel ?? 0) >=
            TRAINING_STAGE_MASTERY_MAX
            ? "REVIEW"
            : normalizeDisplayVerseStatus(statusAction.nextStatus);

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
          statusAction.nextStatus === VerseStatus.QUEUE
            ? previewStatus === VerseStatus.STOPPED
              ? "resume"
              : "add-to-my"
            : statusAction.nextStatus === VerseStatus.LEARNING
              ? previewStatus === VerseStatus.STOPPED
                ? "resume"
                : "start-learning"
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
    }
  );

  const handlePrimaryStatusAction = useEventCallback(() => {
    if (isCatalogSourceMode) {
      if (isCatalogOwnedPreview) {
        setIsDeleteDialogOpen(true);
        return;
      }
      void applyPreviewStatusMutation(
        getPreviewStatusMutation(previewStatus, previewActionModel?.primaryAction?.id),
      );
      return;
    }

    if (!previewActiveVerse) return;
    void applyPreviewStatusMutation(getScopedPreviewStatusMutation(previewActiveVerse));
  });

  const handleUtilityStatusAction = useEventCallback(() => {
    if (!previewActiveVerse) return;
    void applyPreviewStatusMutation(getScopedPreviewStatusMutation(previewActiveVerse));
  });

  const handleDelete = useEventCallback(async () => {
    if (!previewActiveVerse) return;

    try {
      setIsActionPending(true);
      await onDelete(previewActiveVerse);
      const feedback = buildVerseDeletionFeedback({
        resetToCatalog: isCatalogSourceMode,
      });

      haptic("success");
      showVerseActionToast({
        kind: "delete",
        reference: previewActiveVerse.reference,
        meta: isCatalogSourceMode ? feedback.title : null,
        toasterId: GALLERY_TOASTER_ID,
      });

      if (isCatalogSourceMode) {
        setPreviewOverride(previewActiveVerse, {
          status: "CATALOG",
          flow: null,
          masteryLevel: 0,
          repetitions: 0,
          lastReviewedAt: null,
          nextReviewAt: null,
        });
      } else if (verses.length <= 1) {
        handleClose();
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
  });

  const closeActiveLayer = useEventCallback(() => {
    if (isDeleteDialogOpen) {
      setIsDeleteDialogOpen(false);
      return true;
    }

    return closeActiveOverlay();
  });

  const handleFocusModeVerticalSwipe = useEventCallback(
    (step: 1 | -1) => {
      if (isActionPending || isBlockingOverlayOpen) return;
      void navigatePreviewTo(step === 1 ? "next" : "prev");
    }
  );

  const handleWindowKeyDown = useEventCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (closeActiveLayer()) return;
      handleClose();
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
  });

  useEffect(() => {
    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [handleWindowKeyDown]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleTelegramBack = useEventCallback(() => {
    if (isActionPending) return;
    if (closeActiveLayer()) return;

    handleClose();
  });

  useTelegramBackButton({
    enabled: true,
    onBack: handleTelegramBack,
    priority: 100,
  });

  const handleStartTraining = useEventCallback(() => {
    if (!previewActiveVerse) return;

    const launchMode = getVerseTrainingLaunchMode(previewActiveVerse);
    if (!launchMode) return;

    onNavigateToTraining({
      verse: previewActiveVerse,
      preferredMode: launchMode,
    });
  });

  const handleDeleteDialogOpen = useEventCallback(() => {
    setIsDeleteDialogOpen(true);
  });

  const handleDeleteConfirm = useEventCallback(() => {
    void handleDelete();
  });

  const handleGoPrev = useEventCallback(() => {
    void navigatePreviewTo("prev");
  });

  const handleGoNext = useEventCallback(() => {
    void navigatePreviewTo("next");
  });

  if (!previewActiveVerse || !previewActionModel || !preview) return null;

  const displayTotal = previewDisplayTotal;
  const displayActive = Math.max(0, activeIndex);

  return (
    <>
      <GalleryToasterPortal topOffsetPx={toasterTopOffsetPx} />

      <div
        data-tour="verse-gallery-root"
        role="dialog"
        aria-modal="true"
        aria-label="Просмотр стиха"
        className="fixed inset-0 z-50 flex flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top_right,rgba(var(--brand-primary-rgb),0.12),transparent_28%),linear-gradient(180deg,rgba(var(--bg-app-rgb),0.98),rgba(var(--bg-app-rgb),1))] backdrop-blur-sm"
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
          className="relative flex min-h-0 flex-1 flex-col overflow-visible px-4 sm:px-6"
          role="region"
          aria-roledescription="carousel"
          aria-label="Карточки со стихами"
        >
          <GallerySwipeSlide
            slideKey={preview.key}
            direction={direction}
            enabled={isPreviewSwipeEnabled}
            onNavigate={navigatePreviewTo}
            className="flex-1 min-h-0 w-full min-w-0"
          >
            <VersePreviewCard
              preview={preview}
              sourceMode={sourceMode}
              isActionPending={isActionPending}
              activeTagSlugs={selectedTagSlugs}
              isFocusMode={isFocusMode}
              onStartTraining={handleStartTraining}
              onStatusAction={handlePrimaryStatusAction}
              onCatalogRemove={handleDeleteDialogOpen}
              onDeleteRequest={handleDeleteDialogOpen}
              onUtilityAction={handleUtilityStatusAction}
              onOpenProgress={handleOpenProgress}
              onOpenTags={handleOpenTagsDrawer}
              onOpenOwners={handleOpenOwnersDrawer}
              onEditQueuePosition={onEditQueuePosition}
              onVerticalSwipeStep={
                isFocusMode && !isActionPending && !isBlockingOverlayOpen
                  ? handleFocusModeVerticalSwipe
                  : undefined
              }
              colorConfig={VERSE_CARD_COLOR_CONFIG}
              primaryActionOverride={primaryActionOverride}
            />
          </GallerySwipeSlide>
        </div>

        {/* Footer buttons */}
        <GalleryFooter
          isActionPending={isActionPending}
          isFocusMode={isFocusMode}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          showDelete={showDeleteAction ?? (previewStatus != null && shouldShowGalleryDelete(sourceMode, previewStatus))}
          bottomInset={contentSafeAreaInset.bottom}
          onClose={handleClose}
          onToggleFocusMode={onToggleFocusMode}
          onGoPrev={handleGoPrev}
          onGoNext={handleGoNext}
          onDeleteRequest={handleDeleteDialogOpen}
          closeButtonRef={closeButtonRef}
        />

        {!isFocusMode ? <SwipeHint panelMode="preview" /> : null}

        <GalleryDeleteDrawer
          open={isDeleteDialogOpen}
          isActionPending={isActionPending}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
        />
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
