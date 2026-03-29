"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { Eye, Plus } from "lucide-react";

const AddVerseDialog = dynamic(
  () => import("./AddVerseDialog").then((m) => m.AddVerseDialog),
  { ssr: false },
);

import { VerseGallery } from "./VerseGallery";
import { VerseListEmptyState } from "./verse-list/components/VerseListEmptyState";
import { VerseListFiltersDrawer } from "./verse-list/components/VerseListFiltersDrawer";
import { VerseListFiltersTrigger } from "./verse-list/components/VerseListFiltersTrigger";
import { VerseTagsDrawer } from "./verse-list/components/VerseTagsDrawer";
import { VerseListHeader } from "./verse-list/components/VerseListHeader";
import { VerseListSkeletonCards } from "./verse-list/components/VerseListSkeletonCards";
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
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { useTelegramUiStore } from "@/app/stores/telegramUiStore";
import { isAdminTelegramId } from "@/lib/admins";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { useVerseListController } from "./verse-list/hooks/useVerseListController";
import { VerseVirtualizedList } from "./verse-list/virtualization/VerseVirtualizedList";
import { VERSE_CARD_COLOR_CONFIG } from "@/app/components/verseCardColorConfig";
import type { Verse } from "@/app/domain/verse";
import type { DirectLaunchVerse } from "@/app/components/Training/types";

interface VerseListProps {
  onVerseAdded: (verse: {
    externalVerseId: string;
    reference: string;
    tags: string[];
    replaceTags?: boolean;
  }) => Promise<void>;
  reopenGalleryVerseId?: string | null;
  reopenGalleryStatusFilter?: VerseListStatusFilter | null;
  onReopenGalleryHandled?: () => void;
  verseListExternalSyncVersion?: number;
  onVerseMutationCommitted?: () => void;
  onNavigateToTraining?: (launch: DirectLaunchVerse) => void;
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
  onVerseAdded,
  reopenGalleryVerseId = null,
  reopenGalleryStatusFilter = null,
  onReopenGalleryHandled,
  verseListExternalSyncVersion,
  onVerseMutationCommitted,
  onNavigateToTraining,
  telegramId = null,
  hasFriends = false,
  onOpenPlayerProfile,
  isAnchorEligible = false,
  onFriendsChanged,
}: VerseListProps) {
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen,
  );
  const { contentSafeAreaInset } = useTelegramSafeArea();
  // const stickyControlsTop = isTelegramFullscreen
  //   ? Math.max(0, contentSafeAreaInset.top)
  //   : 0;
  const canAddVerse = isAdminTelegramId(telegramId);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogMode, setAddDialogMode] = useState<"verse" | "tag">("verse");
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
  const listViewportHostRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (canAddVerse || addDialogMode !== "verse" || !addDialogOpen) return;
    setAddDialogOpen(false);
  }, [addDialogMode, addDialogOpen, canAddVerse]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const host = listViewportHostRef.current;
    if (!host) return;

    let frameId = 0;

    const updateViewportHeight = () => {
      const currentHost = listViewportHostRef.current;
      if (!currentHost) return;

      const styles = window.getComputedStyle(currentHost);
      const paddingTop = Number.parseFloat(styles.paddingTop || "0") || 0;
      const paddingBottom = Number.parseFloat(styles.paddingBottom || "0") || 0;
      const nextHeight = Math.max(
        260,
        Math.floor(currentHost.clientHeight - paddingTop - paddingBottom),
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
    onAddVerse: () => {
      if (!canAddVerse) return;
      setAddDialogMode("verse");
      setAddDialogOpen(true);
    },
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
    cardColorConfig: VERSE_CARD_COLOR_CONFIG,
  });

  const getListItemLayoutSignature = useCallback(
    (verse: Verse) =>
      `${getVerseCardLayoutSignature(verse)}:${isFocusMode ? "focus" : "default"}`,
    [isFocusMode],
  );
  const isAllMode = vm.filters.statusFilter === "catalog";
  const visibleListItems = isAllMode ? vm.list.listItems : vm.list.sectionItems;
  const isGalleryOpen = vm.gallery.galleryIndex !== null;

  const handleTelegramBack = useCallback(() => {
    if (addDialogOpen) {
      setAddDialogOpen(false);
      return;
    }

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
    addDialogOpen,
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
      addDialogOpen ||
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

  const listContent =
    visibleListItems.length > 0 ? (
      <VerseVirtualizedList
        items={visibleListItems}
        enableInfiniteLoader={vm.list.enableInfiniteLoader}
        preferInternalScroll
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
        debugInfiniteScroll={vm.list.debugInfiniteScroll}
      />
    ) : null;
  const handleCreateTagDialogOpen = useCallback(() => {
    setAddDialogMode("tag");
    setAddDialogOpen(true);
  }, []);

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
      onCreateTagDialogOpen: handleCreateTagDialogOpen,
      onDeleteTag: vm.tagFilter.deleteTag,
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
      handleCreateTagDialogOpen,
      vm.tagFilter.deleteTag,
    ],
  );

  const listViewportShellClassName =
    "relative flex min-h-0 flex-1 flex-col rounded-[2.15rem] border border-border-subtle/80 bg-bg-overlay/58 shadow-[var(--shadow-soft)] backdrop-blur-2xl";
  const listViewportContentClassName =
    "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[calc(2.15rem-1px)]";
  const listViewportGlowClassName =
    "pointer-events-none absolute inset-x-0 z-10 h-16 shrink-0";

  return (
    <>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col pb-4">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {vm.ui.announcement}
        </div>

        <div className={cn("shrink-0", !isTelegramFullscreen && "pb-2")}>
          <VerseListHeader
            isFullscreen={isTelegramFullscreen}
          />
        </div>

              <div
                className={cn(
                  "absolute z-50 flex shrink-0 flex-row gap-1.5 p-0.5 border border-border/60 bg-background/45 backdrop-blur-xl rounded-[24px]",
                )}
                style={{
                  bottom: `calc(var(--app-bottom-nav-clearance, 54px) + ${contentSafeAreaInset.bottom}px + 12px)`,
                  right: `calc(1rem + ${contentSafeAreaInset.right}px)`,
                }}
              >
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={isFocusMode}
                  title={
                    isFocusMode
                      ? "Выключить режим чтения"
                      : "Включить режим чтения"
                  }
                  onClick={toggleFocusMode}
                  className={cn(
                    "h-10 shrink-0 rounded-full border-border/70 bg-card/88 p-0 shadow-md backdrop-blur-2xl hover:bg-card",
                    isFocusMode &&
                      "border-primary/35 bg-primary/10 text-primary",
                  )}
                >
                  Режим чтения
                  <Eye className="h-4 w-4" />
                </Button>

                {canAddVerse ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={vm.header.onAddVerseClick}
                    title="Добавить стих"
                    className="h-10 shrink-0 rounded-full border-border/70 bg-card/88 p-0 shadow-md backdrop-blur-2xl hover:bg-card"
                  >
                    Создать
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
        <div
          className="sticky top-0 z-40 shrink-0"
        >
          <div className="px-2 pt-2 pb-0 sm:px-6 lg:px-8">
            <div className="flex items-stretch gap-1">
              <div className="min-w-0 flex-1">
                <VerseListFiltersTrigger
                  open={isFiltersDrawerOpen}
                  onOpen={() => setIsLocalFiltersDrawerOpen(true)}
                  {...filterCardProps}
                />
              </div>

            </div>
          </div>
        </div>

        <div
          ref={listViewportHostRef}
          className="flex min-h-0 flex-1 flex-col px-2 pt-3 pb-2 sm:px-6 lg:px-8"
        >
          <div
            className={listViewportShellClassName}
            style={
              listViewportHeight
                ? { height: `${listViewportHeight}px` }
                : undefined
            }
          >
            <div className={listViewportContentClassName}>
              <div
                aria-hidden="true"
                className={cn(
                  listViewportGlowClassName,
                  "top-0 bg-gradient-to-b from-bg-elevated/92 via-bg-overlay/58 to-transparent",
                )}
              />
              <div
                aria-hidden="true"
                className={cn(
                  listViewportGlowClassName,
                  "bottom-0 h-20 bg-gradient-to-t from-bg-elevated/94 via-bg-overlay/62 to-transparent",
                )}
              />

              {vm.ui.isListLoading ? (
                <div
                  data-tour="verse-list-content"
                  data-tour-filter={vm.filters.statusFilter}
                  data-tour-state="loading"
                  className="relative flex h-full min-h-0 flex-col overflow-y-auto px-3 py-3 sm:px-4"
                >
                  <VerseListSkeletonCards count={5} />
                </div>
              ) : null}
              {!vm.ui.isListLoading && vm.ui.isEmptyFiltered ? (
                <div
                  data-tour="verse-list-content"
                  data-tour-filter={vm.filters.statusFilter}
                  data-tour-state="empty"
                  className="relative flex h-full min-h-0 items-center justify-center px-4 py-8 sm:px-6"
                >
                  <div className="w-full max-w-md">
                    <VerseListEmptyState
                      currentFilterLabel={vm.ui.currentFilterLabel}
                      isAllFilter={vm.filters.statusFilter === "catalog"}
                    />
                  </div>
                </div>
              ) : null}
              {!vm.ui.isListLoading && !vm.ui.isEmptyFiltered && vm.list.sectionConfig ? (
                <div
                  data-tour="verse-list-content"
                  data-tour-filter={vm.filters.statusFilter}
                  data-tour-state="ready"
                  className="relative flex h-full min-h-0 flex-col px-2 py-2 sm:px-3"
                >
                  <div className="min-h-0 flex-1">{listContent}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <AddVerseDialog
          open={addDialogOpen && (addDialogMode === "tag" || canAddVerse)}
          mode={addDialogMode}
          viewerTelegramId={telegramId}
          onClose={() => setAddDialogOpen(false)}
          onAdd={canAddVerse ? onVerseAdded : undefined}
          onCreateTag={vm.tagFilter.createTag}
        />

        <VerseListFiltersDrawer
          open={isFiltersDrawerOpen}
          onOpenChange={setIsLocalFiltersDrawerOpen}
          {...filterCardProps}
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
      </div>
    </>
  );
}
