"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { VerseGallery } from "./VerseGallery";
import { VerseListEmptyState } from "./verse-list/components/VerseListEmptyState";
import { VerseListFiltersDrawer } from "./verse-list/components/VerseListFiltersDrawer";
import { VerseListFiltersTrigger } from "./verse-list/components/VerseListFiltersTrigger";
import { VerseTagsDrawer } from "./verse-list/components/VerseTagsDrawer";
import { VerseListHeader } from "./verse-list/components/VerseListHeader";
import { VerseListSkeletonCards } from "./verse-list/components/VerseListSkeletonCards";
import { VerseListPrimaryFilterDock } from "./verse-list/components/VerseListPrimaryFilterDock";
import { VerseOwnersDrawer } from "./VerseOwnersDrawer";
import { VerseProgressDrawer } from "./VerseProgressDrawer";
import {
  getVerseCardLayoutSignature,
  type VerseListStatusFilter,
} from "./verse-list/constants";
import {
  parseStoredBoolean,
  VERSE_LIST_STORAGE_KEYS,
} from "./verse-list/storage";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { useTelegramUiStore } from "@/app/stores/telegramUiStore";
import { cn } from "@/app/components/ui/utils";
import { useVerseListController } from "./verse-list/hooks/useVerseListController";
import { VerseVirtualizedList } from "./verse-list/virtualization/VerseVirtualizedList";
import { VerseListSlotCard } from "./verse-list/components/VerseListSlotCard";
import { VerseListQueueSection } from "./verse-list/components/VerseListQueueSection";
import { VERSE_CARD_COLOR_CONFIG } from "@/app/components/verseCardColorConfig";
import type { Verse } from "@/app/domain/verse";
import type { DirectLaunchVerse } from "@/app/components/Training/types";
import type { LearningCapacityResponse, QueueVerseItem } from "@/app/components/Training/exam/types";
import { fetchVerseQueue, addVerseToQueue, removeVerseFromQueue } from "@/app/components/Training/exam/queueApi";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import { GraduationCap, ListOrdered } from "lucide-react";
import { toast } from "@/app/lib/toast";

const LIST_OVERLAY_SPACER_GAP_PX = 12;
const PRIMARY_FILTER_DOCK_GAP_PX = 12;

interface VerseListProps {
  reopenGalleryVerseId?: string | null;
  reopenGalleryStatusFilter?: VerseListStatusFilter | null;
  onReopenGalleryHandled?: () => void;
  verseListExternalSyncVersion?: number;
  onVerseMutationCommitted?: () => void;
  onNavigateToTraining?: (launch: DirectLaunchVerse) => void;
  onLearningCapacityExceeded?: () => void;
  learningCapacity?: LearningCapacityResponse | null;
  telegramId?: string | null;
  hasFriends?: boolean;
  isAnchorEligible?: boolean;
  onFriendsChanged?: () => void;
  onOpenPlayerProfile?: (player: {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }) => void;
}

export function VerseList({
  reopenGalleryVerseId = null,
  reopenGalleryStatusFilter = null,
  onReopenGalleryHandled,
  verseListExternalSyncVersion,
  onVerseMutationCommitted,
  onNavigateToTraining,
  onLearningCapacityExceeded,
  learningCapacity = null,
  telegramId = null,
  hasFriends = false,
  onOpenPlayerProfile,
  isAnchorEligible = false,
  onFriendsChanged,
}: VerseListProps) {
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen,
  );
  // const stickyControlsTop = isTelegramFullscreen
  //   ? Math.max(0, contentSafeAreaInset.top)
  //   : 0;
  const [isFocusMode, setIsFocusMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      parseStoredBoolean(
        window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.focusMode),
      ) ?? false
    );
  });
  const [isLocalFiltersDrawerOpen, setIsLocalFiltersDrawerOpen] = useState(false);
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
  const [isVerseProgressDrawerOpen, setIsVerseProgressDrawerOpen] = useState(false);
  const [verseProgressTarget, setVerseProgressTarget] = useState<Verse | null>(null);
  // Queue drawer: shown when user tries to start learning but slots are full
  const [queueTargetVerse, setQueueTargetVerse] = useState<Verse | null>(null);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  // Queue items for "my" mode
  const [queueItems, setQueueItems] = useState<QueueVerseItem[]>([]);
  const [queueFreeSlots, setQueueFreeSlots] = useState(0);
  const filterOverlayRef = useRef<HTMLDivElement | null>(null);
  const primaryFilterDockRef = useRef<HTMLDivElement | null>(null);
  const listViewportHostRef = useRef<HTMLDivElement | null>(null);
  const [filterOverlayHeight, setFilterOverlayHeight] = useState(0);
  const [primaryFilterDockHeight, setPrimaryFilterDockHeight] = useState(0);
  const [listViewportHeight, setListViewportHeight] = useState<number | null>(null);
  const isFiltersDrawerOpen = isLocalFiltersDrawerOpen;

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      VERSE_LIST_STORAGE_KEYS.focusMode,
      isFocusMode ? "1" : "0",
    );
  }, [isFocusMode]);


  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const overlay = filterOverlayRef.current;
    if (!overlay) return;

    let frameId = 0;

    const updateOverlayHeight = () => {
      const currentOverlay = filterOverlayRef.current;
      if (!currentOverlay) return;

      const nextHeight = Math.ceil(currentOverlay.getBoundingClientRect().height);
      setFilterOverlayHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    const scheduleOverlayHeightUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateOverlayHeight();
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleOverlayHeightUpdate())
        : null;

    resizeObserver?.observe(overlay);
    window.addEventListener("resize", scheduleOverlayHeightUpdate, {
      passive: true,
    });
    window.visualViewport?.addEventListener(
      "resize",
      scheduleOverlayHeightUpdate,
    );
    scheduleOverlayHeightUpdate();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleOverlayHeightUpdate);
      window.visualViewport?.removeEventListener(
        "resize",
        scheduleOverlayHeightUpdate,
      );
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const dock = primaryFilterDockRef.current;
    if (!dock) return;

    let frameId = 0;

    const updateDockHeight = () => {
      const currentDock = primaryFilterDockRef.current;
      if (!currentDock) return;

      const styles = window.getComputedStyle(currentDock);
      const nextHeight =
        styles.display === "none"
          ? 0
          : Math.ceil(currentDock.getBoundingClientRect().height);

      setPrimaryFilterDockHeight((prev) =>
        prev === nextHeight ? prev : nextHeight,
      );
    };

    const scheduleDockHeightUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateDockHeight();
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleDockHeightUpdate())
        : null;

    resizeObserver?.observe(dock);
    window.addEventListener("resize", scheduleDockHeightUpdate, {
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", scheduleDockHeightUpdate);
    scheduleDockHeightUpdate();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleDockHeightUpdate);
      window.visualViewport?.removeEventListener(
        "resize",
        scheduleDockHeightUpdate,
      );
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const host = listViewportHostRef.current;
    if (!host) return;

    let frameId = 0;

    const updateViewportHeight = () => {
      const currentHost = listViewportHostRef.current;
      if (!currentHost) return;

      const styles = window.getComputedStyle(currentHost);
      const rootStyles = window.getComputedStyle(document.documentElement);
      const paddingTop = Number.parseFloat(styles.paddingTop || "0") || 0;
      const paddingBottom = Number.parseFloat(styles.paddingBottom || "0") || 0;
      const bottomNavClearance =
        Number.parseFloat(
          rootStyles.getPropertyValue("--app-bottom-nav-clearance") || "0",
        ) || 0;
      const nextHeight = Math.max(
        260,
        Math.floor(
          currentHost.clientHeight -
            paddingTop -
            paddingBottom +
            bottomNavClearance,
        ),
      );

      setListViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    const scheduleViewportHeightUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateViewportHeight();
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleViewportHeightUpdate())
        : null;

    resizeObserver?.observe(host);
    window.addEventListener("resize", scheduleViewportHeightUpdate, {
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", scheduleViewportHeightUpdate);
    scheduleViewportHeightUpdate();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleViewportHeightUpdate);
      window.visualViewport?.removeEventListener(
        "resize",
        scheduleViewportHeightUpdate,
      );
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const closeVerseTagsDrawer = useCallback(() => {
    setIsVerseTagsDrawerOpen(false);
    setVerseTagsTarget(null);
  }, []);

  const vm = useVerseListController({
    disabled: false,
    initialTags: [],
    hasFriends,
    isFocusMode,
    onOpenVerseTags: (verse: Verse) => {
      if (!verse.tags || verse.tags.length === 0) return;
      setVerseTagsTarget({
        reference: verse.reference,
        tags: verse.tags,
      });
      setIsVerseTagsDrawerOpen(true);
    },
    onOpenVerseOwners: (verse: Verse) => {
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
    },
    onOpenVerseProgress: (verse: Verse) => {
      setVerseProgressTarget(verse);
      setIsVerseProgressDrawerOpen(true);
    },
    onNavigateToTraining,
    isAnchorEligible,
    reopenGalleryVerseId,
    reopenGalleryStatusFilter,
    onReopenGalleryHandled,
    verseListExternalSyncVersion,
    onVerseMutationCommitted,
    onLearningCapacityExceeded: (verse) => setQueueTargetVerse(verse),
    cardColorConfig: VERSE_CARD_COLOR_CONFIG,
  });

  const getListItemLayoutSignature = useCallback(
    (verse: Verse) =>
      `${getVerseCardLayoutSignature(verse)}:${isFocusMode ? "focus" : "default"}`,
    [isFocusMode],
  );
  const isAllMode = vm.filters.statusFilter === "catalog";
  const isMyMode = vm.filters.statusFilter === "my";
  const visibleListItems = isAllMode ? vm.list.listItems : vm.list.sectionItems;

  // Load queue data when in "my" mode
  const loadQueue = useCallback(() => {
    if (!telegramId) return;
    fetchVerseQueue({ telegramId }).then((resp) => {
      setQueueItems(resp.items ?? []);
      setQueueFreeSlots(resp.freeSlots ?? 0);
    }).catch(() => {});
  }, [telegramId]);

  useEffect(() => {
    if (!isMyMode || !telegramId) return;
    loadQueue();
  }, [isMyMode, telegramId, loadQueue]);

  const handleRemoveFromQueue = useCallback(
    (externalVerseId: string) => {
      if (!telegramId) return;
      removeVerseFromQueue({ telegramId, externalVerseId })
        .then(() => {
          setQueueItems((prev) => {
            const updated = prev.filter((item) => item.externalVerseId !== externalVerseId);
            return updated.map((item, idx) => ({ ...item, queuePosition: idx + 1 }));
          });
        })
        .catch(() => {});
    },
    [telegramId],
  );

  const handleAddToQueue = useCallback(async () => {
    if (!queueTargetVerse || !telegramId) return;
    setIsAddingToQueue(true);
    try {
      await addVerseToQueue({ telegramId, externalVerseId: queueTargetVerse.externalVerseId });
      setQueueTargetVerse(null);
      toast.success('Добавлено в очередь', {
        description: queueTargetVerse.reference,
        label: 'Стихи',
      });
      loadQueue();
    } catch {
      toast.error('Ошибка — попробуйте ещё раз', { label: 'Стихи' });
    } finally {
      setIsAddingToQueue(false);
    }
  }, [queueTargetVerse, telegramId, loadQueue]);

  const isGalleryOpen = vm.gallery.galleryIndex !== null;

  const handleNavigateToCatalog = useCallback(() => {
    vm.filterTabs.onTabClick("catalog", "Каталог");
  }, [vm.filterTabs.onTabClick]);

  const handleNavigateToExam = useCallback(() => {
    onLearningCapacityExceeded?.();
  }, [onLearningCapacityExceeded]);

  const slotCardFooter = useMemo(() => {
    if (!isMyMode) return undefined;
    return (
      <VerseListSlotCard
        learningCapacity={learningCapacity}
        onNavigateToCatalog={handleNavigateToCatalog}
        onNavigateToExam={handleNavigateToExam}
        queueCount={learningCapacity?.queueCount ?? 0}
      />
    );
  }, [isMyMode, learningCapacity, handleNavigateToCatalog, handleNavigateToExam]);

  const handleTelegramBack = useCallback(() => {
    if (isGalleryOpen) {
      vm.gallery.onClose();
      return;
    }

    if (isVerseTagsDrawerOpen) {
      closeVerseTagsDrawer();
      return;
    }

    if (isFiltersDrawerOpen) {
      setIsLocalFiltersDrawerOpen(false);
      return;
    }

    if (isVerseOwnersDrawerOpen) {
      setIsVerseOwnersDrawerOpen(false);
      return;
    }

    if (isVerseProgressDrawerOpen) {
      setIsVerseProgressDrawerOpen(false);
      setVerseProgressTarget(null);
    }
  }, [
    closeVerseTagsDrawer,
    isFiltersDrawerOpen,
    isGalleryOpen,
    isVerseOwnersDrawerOpen,
    isVerseProgressDrawerOpen,
    isVerseTagsDrawerOpen,
    vm.gallery,
  ]);

  useTelegramBackButton({
    enabled:
      isGalleryOpen ||
      isVerseTagsDrawerOpen ||
      isFiltersDrawerOpen ||
      isVerseOwnersDrawerOpen ||
      isVerseProgressDrawerOpen,
    onBack: handleTelegramBack,
    priority: 60,
  });

  const handleNavigateToTrainingFromGallery = useCallback(
    (launch: DirectLaunchVerse) => {
      vm.gallery.onClose();
      onNavigateToTraining?.({
        ...launch,
        returnTarget: {
          kind: "verse-list",
          statusFilter: vm.filters.statusFilter,
        },
      });
    },
    [vm.gallery, onNavigateToTraining, vm.filters.statusFilter],
  );

  const handleVerseOwnersOpenChange = useCallback(
    (open: boolean) => {
      setIsVerseOwnersDrawerOpen(open);
      if (!open) {
        setVerseOwnersTarget(null);
      }
    },
    [],
  );

  const handleVerseTagsDrawerOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeVerseTagsDrawer();
        return;
      }
      setIsVerseTagsDrawerOpen(true);
    },
    [closeVerseTagsDrawer],
  );

  const handleVerseProgressOpenChange = useCallback(
    (open: boolean) => {
      setIsVerseProgressDrawerOpen(open);
      if (!open) {
        setVerseProgressTarget(null);
      }
    },
    [],
  );

  const handleVerseTagSelect = useCallback(
    (slug: string) => {
      if (!vm.tagFilter.selectedTagSlugs.has(slug)) {
        vm.tagFilter.onTagClick(slug);
      }
      closeVerseTagsDrawer();
    },
    [closeVerseTagsDrawer, vm.tagFilter.onTagClick, vm.tagFilter.selectedTagSlugs],
  );
  const listTopInset = filterOverlayHeight + LIST_OVERLAY_SPACER_GAP_PX;
  const listBottomInset =
    primaryFilterDockHeight > 0
      ? primaryFilterDockHeight + PRIMARY_FILTER_DOCK_GAP_PX
      : 0;

  const listContent =
    visibleListItems.length > 0 ? (
      <VerseVirtualizedList
        items={visibleListItems}
        enableInfiniteLoader={vm.list.enableInfiniteLoader}
        preferInternalScroll
        topInset={listTopInset}
        bottomInset={listBottomInset}
        hasMoreItems={vm.pagination.hasMoreVerses}
        isFetchingMore={vm.pagination.isFetchingMoreVerses}
        showDelayedLoadMoreSkeleton={vm.pagination.showDelayedLoadMoreSkeleton}
        onLoadMore={vm.list.onLoadMoreRows}
        renderRow={vm.list.renderVerseRow}
        getItemKey={vm.list.getItemKey}
        getItemLayoutSignature={getListItemLayoutSignature}
        statusFilter={vm.filters.statusFilter}
        totalCount={vm.pagination.totalCount}
        pageSize={vm.list.pageSize}
        prefetchRows={vm.list.prefetchRows}
        footerNode={slotCardFooter}
        headerNode={
          isMyMode && queueItems.length > 0 ? (
            <VerseListQueueSection
              items={queueItems}
              freeSlots={queueFreeSlots}
              onRemove={handleRemoveFromQueue}
            />
          ) : undefined
        }
        debugInfiniteScroll={vm.list.debugInfiniteScroll}
      />
    ) : null;

  const filterCardProps = useMemo(
    () => ({
      totalVisible: vm.ui.totalVisible,
      totalCount: vm.pagination.totalCount,
      currentFilterLabel: vm.ui.currentFilterLabel,
      currentFilterTheme: vm.ui.currentFilterTheme,
      statusFilter: vm.filters.statusFilter,
      defaultStatusFilter: vm.filters.defaultStatusFilter,
      filterOptions: vm.filters.filterOptions,
      hasFriends,
      onTabClick: vm.filterTabs.onTabClick,
      selectedBookId: vm.filters.selectedBookId,
      bookOptions: vm.filters.bookOptions,
      onBookChange: vm.filterTabs.onBookChange,
      sortBy: vm.filters.sortBy,
      sortOptions: vm.filters.sortOptions,
      onSortChange: vm.filterTabs.onSortChange,
      onResetFilters: vm.filterTabs.onResetFilters,
      searchQuery: vm.search.searchQuery,
      onSearchChange: vm.search.setSearchQuery,
      allTags: vm.tagFilter.allTags,
      isLoadingTags: vm.tagFilter.isLoadingTags,
      selectedTagSlugs: vm.tagFilter.selectedTagSlugs,
      hasActiveTags: vm.tagFilter.hasActiveTags,
      onTagClick: vm.tagFilter.onTagClick,
      onClearTags: vm.tagFilter.onClearTags,
    }),
    [
      vm.ui.totalVisible,
      vm.pagination.totalCount,
      vm.ui.currentFilterLabel,
      vm.ui.currentFilterTheme,
      vm.filters.statusFilter,
      vm.filters.defaultStatusFilter,
      vm.filters.filterOptions,
      hasFriends,
      vm.filterTabs.onTabClick,
      vm.filters.selectedBookId,
      vm.filters.bookOptions,
      vm.filterTabs.onBookChange,
      vm.filters.sortBy,
      vm.filters.sortOptions,
      vm.filterTabs.onSortChange,
      vm.filterTabs.onResetFilters,
      vm.search.searchQuery,
      vm.search.setSearchQuery,
      vm.tagFilter.allTags,
      vm.tagFilter.isLoadingTags,
      vm.tagFilter.selectedTagSlugs,
      vm.tagFilter.hasActiveTags,
      vm.tagFilter.onTagClick,
      vm.tagFilter.onClearTags,
    ],
  );

  const listViewportClassName =
    "relative flex min-h-0 flex-1 flex-col overflow-hidden";

  return (
    <>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {vm.ui.announcement}
        </div>

        <div className={cn("shrink-0", !isTelegramFullscreen && "pb-2")}>
          <VerseListHeader
            isFullscreen={isTelegramFullscreen}
          />
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={filterOverlayRef}
            className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-2 pb-0 sm:px-6 lg:px-8"
          >
            <VerseListFiltersTrigger
              className="pointer-events-auto"
              open={isFiltersDrawerOpen}
              onOpen={() => setIsLocalFiltersDrawerOpen(true)}
              isFocusMode={isFocusMode}
              onToggleFocusMode={toggleFocusMode}
              {...filterCardProps}
            />
          </div>

          <div
            ref={listViewportHostRef}
            className="flex h-full min-h-0 flex-col px-2 pt-0 pb-0 sm:px-6 lg:px-8"
          >
            <div
              className={listViewportClassName}
              style={
                listViewportHeight
                  ? { height: `${listViewportHeight}px` }
                  : undefined
              }
            >
              {vm.ui.isListLoading ? (
                <div
                  data-tour-filter={vm.filters.statusFilter}
                  data-tour-state="loading"
                  className="relative flex h-full min-h-0 flex-col overflow-y-auto py-2"
                  style={{
                    paddingTop: `${listTopInset}px`,
                    paddingBottom:
                      listBottomInset > 0
                        ? `calc(var(--app-bottom-nav-clearance, 0px) + ${listBottomInset}px + 0.5rem)`
                        : "calc(var(--app-bottom-nav-clearance, 0px) + 0.5rem)",
                  }}
                >
                  <VerseListSkeletonCards count={5} />
                </div>
              ) : null}
              {!vm.ui.isListLoading && vm.ui.isEmptyFiltered ? (
                <div
                  data-tour-filter={vm.filters.statusFilter}
                  data-tour-state="empty"
                  className="relative flex h-full min-h-0 flex-col overflow-y-auto px-4 sm:px-6"
                  style={{
                    paddingTop: `${listTopInset}px`,
                    paddingBottom:
                      listBottomInset > 0
                        ? `calc(var(--app-bottom-nav-clearance, 0px) + ${listBottomInset}px + 2rem)`
                        : "calc(var(--app-bottom-nav-clearance, 0px) + 2rem)",
                  }}
                >
                  <div className="flex flex-1 items-center justify-center py-8">
                    <div className="w-full max-w-md">
                      <VerseListEmptyState
                        currentFilterLabel={vm.ui.currentFilterLabel}
                        isAllFilter={vm.filters.statusFilter === "catalog"}
                        isMyFilter={isMyMode}
                        onNavigateToCatalog={isMyMode ? handleNavigateToCatalog : undefined}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              {!vm.ui.isListLoading && !vm.ui.isEmptyFiltered && vm.list.sectionConfig ? (
                <div className="relative flex h-full min-h-0 flex-col">
                  <div className="min-h-0 flex-1">{listContent}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <VerseListFiltersDrawer
          open={isFiltersDrawerOpen}
          onOpenChange={setIsLocalFiltersDrawerOpen}
          {...filterCardProps}
        />

        <VerseListPrimaryFilterDock
          rootRef={primaryFilterDockRef}
          statusFilter={vm.filters.statusFilter}
          currentFilterLabel={vm.ui.currentFilterLabel}
          currentFilterTheme={vm.ui.currentFilterTheme}
          totalCount={vm.pagination.totalCount}
          hasFriends={hasFriends}
          onTabClick={vm.filterTabs.onTabClick}
        />

        {vm.gallery.galleryIndex !== null &&
          vm.pagination.verses[vm.gallery.galleryIndex] &&
          typeof document !== "undefined" &&
          createPortal(
            <VerseGallery
              verses={vm.pagination.verses}
              initialIndex={vm.gallery.galleryIndex}
              activeTagSlugs={vm.tagFilter.selectedTagSlugs}
              viewerTelegramId={telegramId}
              isFocusMode={isFocusMode}
              onToggleFocusMode={toggleFocusMode}
              onClose={vm.gallery.onClose}
              onStatusChange={vm.gallery.onStatusChange}
              onDelete={vm.gallery.onDelete}
              onSelectTag={handleVerseTagSelect}
              onFriendsChanged={onFriendsChanged}
              onNavigateToTraining={handleNavigateToTrainingFromGallery}
              previewTotalCount={vm.pagination.totalCount}
              previewHasMore={vm.pagination.hasMoreVerses}
              previewIsLoadingMore={vm.pagination.isFetchingMoreVerses}
              onRequestMorePreviewVerses={vm.gallery.onRequestMorePreviewVerses}
              isAnchorEligible={isAnchorEligible}
            />,
            document.body,
          )}

        <VerseOwnersDrawer
          viewerTelegramId={telegramId}
          target={verseOwnersTarget}
          open={isVerseOwnersDrawerOpen}
          onOpenChange={handleVerseOwnersOpenChange}
          onOpenPlayerProfile={onOpenPlayerProfile}
        />

        <VerseTagsDrawer
          target={verseTagsTarget}
          open={isVerseTagsDrawerOpen}
          selectedTagSlugs={vm.tagFilter.selectedTagSlugs}
          onOpenChange={handleVerseTagsDrawerOpenChange}
          onSelectTag={handleVerseTagSelect}
        />

        <VerseProgressDrawer
          verse={verseProgressTarget}
          open={isVerseProgressDrawerOpen}
          onOpenChange={handleVerseProgressOpenChange}
        />

        <Drawer
          open={queueTargetVerse !== null}
          onOpenChange={(open) => {
            if (!open) setQueueTargetVerse(null);
          }}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Слоты для изучения заполнены</DrawerTitle>
              <DrawerDescription>
                Добавьте стих в очередь — он начнёт изучаться, когда освободится слот
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-3 px-4 pb-6">
              <button
                type="button"
                disabled={isAddingToQueue}
                onClick={handleAddToQueue}
                className={cn(
                  'flex items-center gap-3.5 rounded-2xl border border-border bg-bg-elevated px-4 py-3.5',
                  'text-left transition-colors hover:bg-bg-elevated/80',
                  isAddingToQueue && 'pointer-events-none opacity-60',
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-subtle">
                  <ListOrdered className="h-3.5 w-3.5 text-text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text-primary">Добавить в очередь</p>
                  <p className="mt-0.5 text-[11px] text-text-subtle">
                    Стих начнёт изучаться, когда освободится слот
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQueueTargetVerse(null);
                  onLearningCapacityExceeded?.();
                }}
                className={cn(
                  'flex items-center gap-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/6 px-4 py-3.5',
                  'text-left transition-colors hover:border-amber-500/35 hover:bg-amber-500/10',
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/12">
                  <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-amber-600 dark:text-amber-400">
                    Перейти к экзамену
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-subtle">
                    Сдайте экзамен, чтобы увеличить количество слотов
                  </p>
                </div>
              </button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
