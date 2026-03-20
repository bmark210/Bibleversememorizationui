"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { Eye, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

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
import type { Verse } from "@/app/App";
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
  });

  const reveal = useCallback(
    (delay: number) => vm.view.getRevealProps(delay),
    [vm.view.getRevealProps],
  );
  const getListItemLayoutSignature = useCallback(
    (verse: Verse) =>
      `${getVerseCardLayoutSignature(verse)}:${isFocusMode ? "focus" : "default"}`,
    [isFocusMode],
  );
  const shouldReduceMotion = vm.ui.shouldReduceMotion;
  const listCrossfadeSlow = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.1, ease: [0.22, 1, 0.36, 1] as const };
  const listCrossfadeExit = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: [0.4, 0, 0.2, 1] as const };
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
        hasMoreItems={vm.pagination.hasMoreVerses}
        isFetchingMore={vm.pagination.isFetchingMoreVerses}
        showDelayedLoadMoreSkeleton={vm.pagination.showDelayedLoadMoreSkeleton}
        appendRevealRange={vm.pagination.appendRevealRange}
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
  const filterCardProps = {
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
    onCreateTagDialogOpen: () => {
      setAddDialogMode("tag");
      setAddDialogOpen(true);
    },
    onDeleteTag: vm.tagFilter.deleteTag,
  };

  const headerHeight = document.querySelector("#app-layout-header")?.clientHeight ?? 0;

  return (
    <>
      <motion.div
        className="mx-auto flex min-h-full w-full max-w-6xl flex-col pb-4"
        {...(shouldReduceMotion
          ? {}
          : {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.2, ease: "easeOut" as const },
            })}
      >
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {vm.ui.announcement}
        </div>

        <motion.div
          className={cn("shrink-0", !isTelegramFullscreen && "pb-2")}
          {...reveal(0.02)}
        >
          <VerseListHeader
            isFullscreen={isTelegramFullscreen}
          />
        </motion.div>

              <div
                className={cn(
                  "fixed z-50 flex shrink-0 flex-col gap-1.5",
                )}
                style={{
                  bottom: `calc(74px + ${contentSafeAreaInset.bottom}px + 12px)`,
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
                    "h-10 w-10 shrink-0 rounded-full border-border/70 bg-card/88 p-0 shadow-md backdrop-blur-2xl hover:bg-card",
                    isFocusMode &&
                      "border-primary/35 bg-primary/10 text-primary",
                  )}
                >
                  <Eye className="h-4 w-4" />
                </Button>

                {canAddVerse ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={vm.header.onAddVerseClick}
                    title="Добавить стих"
                    className="h-10 w-10 shrink-0 rounded-full border-border/70 bg-card/88 p-0 shadow-md backdrop-blur-2xl hover:bg-card"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
        <div
          className="sticky z-40 shrink-0"
          style={{ top: `${headerHeight}px` }}
        >
          <motion.div
            className="px-2 pt-2 pb-0 sm:px-6 lg:px-8"
            {...reveal(0.04)}
          >
            <div className="flex items-stretch gap-1">
              <div className="min-w-0 flex-1">
                <VerseListFiltersTrigger
                  open={isFiltersDrawerOpen}
                  onOpen={() => setIsLocalFiltersDrawerOpen(true)}
                  {...filterCardProps}
                />
              </div>

            </div>
          </motion.div>
        </div>

        <AnimatePresence mode="sync">
          {vm.ui.isListLoading ? (
            <motion.div
              key="verse-list-loading"
              data-tour="verse-list-content"
              data-tour-filter={vm.filters.statusFilter}
              data-tour-state="loading"
              className="px-4 sm:px-6 lg:px-8"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={listCrossfadeExit}
            >
              <VerseListSkeletonCards count={5} />
            </motion.div>
          ) : null}
          {!vm.ui.isListLoading && vm.ui.isEmptyFiltered ? (
            <motion.div
              key="verse-list-empty"
              data-tour="verse-list-content"
              data-tour-filter={vm.filters.statusFilter}
              data-tour-state="empty"
              className="px-4 sm:px-6 lg:px-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={listCrossfadeSlow}
            >
              <VerseListEmptyState
                currentFilterLabel={vm.ui.currentFilterLabel}
                isAllFilter={vm.filters.statusFilter === "catalog"}
              />
            </motion.div>
          ) : null}
          {!vm.ui.isListLoading && !vm.ui.isEmptyFiltered && vm.list.sectionConfig ? (
            <motion.div
              key="verse-list-ready"
              data-tour="verse-list-content"
              data-tour-filter={vm.filters.statusFilter}
              data-tour-state="ready"
              className="px-4 sm:px-6 lg:px-8"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={listCrossfadeSlow}
            >
              {listContent}
            </motion.div>
          ) : null}
        </AnimatePresence>

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
              onNavigateToTraining={(launch) => {
                vm.gallery.onClose();
                onNavigateToTraining?.({
                  ...launch,
                  returnTarget: {
                    kind: "verse-list",
                    statusFilter: vm.filters.statusFilter,
                  },
                });
              }}
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
          onOpenChange={(open) => {
            setIsVerseOwnersDrawerOpen(open);
            if (!open) {
              setVerseOwnersTarget(null);
            }
          }}
          onOpenPlayerProfile={onOpenPlayerProfile}
        />

        <VerseTagsDrawer
          target={verseTagsTarget}
          open={isVerseTagsDrawerOpen}
          selectedTagSlugs={vm.tagFilter.selectedTagSlugs}
          onOpenChange={(open) => {
            if (!open) {
              closeVerseTagsDrawer();
              return;
            }
            setIsVerseTagsDrawerOpen(true);
          }}
          onSelectTag={handleVerseTagSelect}
        />

        <VerseProgressDrawer
          verse={verseProgressTarget}
          open={isVerseProgressDrawerOpen}
          onOpenChange={(open) => {
            setIsVerseProgressDrawerOpen(open);
            if (!open) {
              setVerseProgressTarget(null);
            }
          }}
        />
      </motion.div>
    </>
  );
}
