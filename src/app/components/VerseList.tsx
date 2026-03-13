"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

const AddVerseDialog = dynamic(
  () => import("./AddVerseDialog").then((m) => m.AddVerseDialog),
  { ssr: false },
);

import { VerseGallery } from "./VerseGallery";
import { ConfirmDeleteModal } from "./verse-list/components/ConfirmDeleteModal";
import { SwipeableVerseCard } from "./verse-list/components/SwipeableVerseCard";
import { VerseListEmptyState } from "./verse-list/components/VerseListEmptyState";
import { VerseListFilterCard } from "./verse-list/components/VerseListFilterCard";
import { VerseListFiltersDrawer } from "./verse-list/components/VerseListFiltersDrawer";
import { VerseTagsDrawer } from "./verse-list/components/VerseTagsDrawer";
import { VerseListHeader } from "./verse-list/components/VerseListHeader";
import { VerseListSectionShell } from "./verse-list/components/VerseListSectionShell";
import { VerseListSkeletonCards } from "./verse-list/components/VerseListSkeletonCards";
import { VerseOwnersDrawer } from "./VerseOwnersDrawer";
import { VerseProgressDrawer } from "./VerseProgressDrawer";
import {
  FILTER_VISUAL_THEME,
  getVerseCardLayoutSignature,
  type VerseListStatusFilter,
} from "./verse-list/constants";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { useVerseListController } from "./verse-list/hooks/useVerseListController";
import { VerseStaticList } from "./verse-list/virtualization/VerseStaticList";
import { VerseVirtualizedList } from "./verse-list/virtualization/VerseVirtualizedList";
import type { Verse } from "@/app/App";
import type { Tag } from "@/api/models/Tag";
import type { DirectLaunchVerse } from "@/app/components/Training/types";
import { ONBOARDING_PRIMARY_VERSE_ID } from "@/app/onboarding/onboardingMockVerseFlow";
import { readOnboardingCompletion } from "@/app/onboarding/onboardingStorage";
import {
  useOnboardingStore,
  selectShouldUseMockData,
  selectMockFilterLabel,
  getMockVerseSectionConfig,
  filterAndSortMockVerses,
} from "@/app/onboarding/onboardingStore";

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
  suppressSectionIntro?: boolean;
}

const VERSE_LIST_INTRO_STORAGE_PREFIX = "bible-memory.verse-list.intro.v1";

function getVerseListIntroStorageKey() {
  if (typeof window === "undefined") return null;
  const rawTelegramId = window.localStorage.getItem("telegramId") ?? "";
  const telegramId = rawTelegramId.trim() || "anonymous";
  return `${VERSE_LIST_INTRO_STORAGE_PREFIX}:${telegramId}`;
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
  suppressSectionIntro = false,
}: VerseListProps) {
  // --- Onboarding store subscriptions (only primitive/stable selectors) ---
  const isOnboardingMock = useOnboardingStore(selectShouldUseMockData);
  const isOnboardingProgressDrawerOpen = useOnboardingStore(
    (s) => s.isProgressDrawerOpen,
  );
  const isOnboardingFiltersDrawerOpen = useOnboardingStore(
    (s) => s.isFiltersDrawerOpen,
  );
  const onboardingMockFilterLabel = useOnboardingStore(selectMockFilterLabel);
  const onboardingStatusFilter = useOnboardingStore((s) => s.statusFilter);
  const onboardingMockVerses = useOnboardingStore((s) => s.mockVerses);
  const onboardingProgressTargetVerseId = useOnboardingStore(
    (s) => s.progressTargetVerseId,
  );

  // Derived values via useMemo (avoids new-reference selectors causing infinite loops)
  const onboardingProgressTarget = useMemo(
    () =>
      onboardingProgressTargetVerseId == null
        ? null
        : onboardingMockVerses.find(
            (v) => v.externalVerseId === onboardingProgressTargetVerseId,
          ) ?? null,
    [onboardingProgressTargetVerseId, onboardingMockVerses],
  );
  const onboardingMockFilterTheme = useMemo(
    () => FILTER_VISUAL_THEME[onboardingStatusFilter],
    [onboardingStatusFilter],
  );
  const onboardingMockSectionConfig = useMemo(
    () => getMockVerseSectionConfig(onboardingStatusFilter),
    [onboardingStatusFilter],
  );
  const onboardingMockInitialTags = useMemo(
    () =>
      onboardingMockVerses
        .flatMap((verse) => verse.tags ?? [])
        .filter(
          (tag, index, tags) =>
            tags.findIndex((candidate) => candidate.slug === tag.slug) === index,
        ) as Tag[],
    [onboardingMockVerses],
  );
  const onboardingMockTotalCount = onboardingMockVerses.length;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogMode, setAddDialogMode] = useState<"verse" | "tag">("verse");
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
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

  // Effective drawer states: onboarding store overrides local state
  const isFiltersDrawerOpen = isOnboardingMock
    ? isOnboardingFiltersDrawerOpen
    : isLocalFiltersDrawerOpen;
  const setIsFiltersDrawerOpen = isOnboardingMock
    ? (open: boolean) => {
        if (open) useOnboardingStore.getState().openFiltersDrawer();
        else useOnboardingStore.getState().closeFiltersDrawer();
      }
    : setIsLocalFiltersDrawerOpen;

  const activeVerseProgressTarget = isOnboardingMock
    ? onboardingProgressTarget
    : verseProgressTarget;
  const isActiveVerseProgressDrawerOpen = isOnboardingMock
    ? isOnboardingProgressDrawerOpen
    : isVerseProgressDrawerOpen;

  const markVerseListIntroAsSeen = useCallback(() => {
    if (typeof window === "undefined") return;
    const storageKey = getVerseListIntroStorageKey();
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = getVerseListIntroStorageKey();
    if (!storageKey) return;

    try {
      if (suppressSectionIntro || readOnboardingCompletion(telegramId)) {
        window.localStorage.setItem(storageKey, "1");
        setIsAboutDialogOpen(false);
        return;
      }

      const hasSeenIntro = window.localStorage.getItem(storageKey) === "1";
      if (!hasSeenIntro) {
        setIsAboutDialogOpen(true);
      }
    } catch {
      if (!suppressSectionIntro) {
        setIsAboutDialogOpen(true);
      }
    }
  }, [suppressSectionIntro, telegramId]);

  const handleAboutDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsAboutDialogOpen(open);
      if (open) return;
      markVerseListIntroAsSeen();
    },
    [markVerseListIntroAsSeen],
  );

  const handleAboutDialogOpen = useCallback(() => {
    setIsAboutDialogOpen(true);
  }, []);

  const closeVerseTagsDrawer = useCallback(() => {
    setIsVerseTagsDrawerOpen(false);
    setVerseTagsTarget(null);
  }, []);

  const vm = useVerseListController({
    disabled: isOnboardingMock,
    initialTags: onboardingMockInitialTags,
    hasFriends,
    onAddVerse: () => {
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
    reopenGalleryVerseId,
    reopenGalleryStatusFilter,
    onReopenGalleryHandled,
    verseListExternalSyncVersion,
    onVerseMutationCommitted,
  });

  // Visible mock verses — computed from store data + controller filter state
  const onboardingMockVisibleVerses = useMemo(
    () =>
      filterAndSortMockVerses(
        onboardingMockVerses,
        onboardingStatusFilter,
        vm.filters.selectedBookId,
        vm.filters.sortBy,
        vm.search.searchQuery,
        vm.tagFilter.selectedTagSlugs,
      ),
    [
      onboardingMockVerses,
      onboardingStatusFilter,
      vm.filters.selectedBookId,
      vm.filters.sortBy,
      vm.search.searchQuery,
      vm.tagFilter.selectedTagSlugs,
    ],
  );

  const reveal = useCallback(
    (delay: number) =>
      isOnboardingMock ? {} : vm.view.getRevealProps(delay),
    [isOnboardingMock, vm.view.getRevealProps],
  );
  const shouldReduceMotion = isOnboardingMock || vm.ui.shouldReduceMotion;
  const isAllMode = vm.filters.statusFilter === "catalog";
  const visibleListItems = isAllMode ? vm.list.listItems : vm.list.sectionItems;
  const isDeleteModalOpen =
    vm.modal.deleteTargetVerse !== null && !vm.modal.isDeleteSubmitting;
  const isGalleryOpen = vm.gallery.galleryIndex !== null;

  const handleTelegramBack = useCallback(() => {
    if (addDialogOpen) {
      setAddDialogOpen(false);
      return;
    }

    if (isDeleteModalOpen) {
      vm.modal.setDeleteTargetVerse(null);
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
      setIsFiltersDrawerOpen(false);
      return;
    }

    if (isVerseOwnersDrawerOpen) {
      setIsVerseOwnersDrawerOpen(false);
      return;
    }

    if (isActiveVerseProgressDrawerOpen) {
      if (isOnboardingMock) {
        useOnboardingStore.getState().closeProgressDrawer();
      } else {
        setIsVerseProgressDrawerOpen(false);
        setVerseProgressTarget(null);
      }
      return;
    }

    if (isAboutDialogOpen) {
      handleAboutDialogOpenChange(false);
    }
  }, [
    addDialogOpen,
    handleAboutDialogOpenChange,
    isAboutDialogOpen,
    isDeleteModalOpen,
    isFiltersDrawerOpen,
    isGalleryOpen,
    isActiveVerseProgressDrawerOpen,
    isVerseTagsDrawerOpen,
    isVerseOwnersDrawerOpen,
    isOnboardingMock,
    closeVerseTagsDrawer,
    setIsFiltersDrawerOpen,
    vm.gallery,
    vm.modal,
  ]);

  useTelegramBackButton({
    enabled:
      addDialogOpen ||
      isDeleteModalOpen ||
      isGalleryOpen ||
      isVerseTagsDrawerOpen ||
      isFiltersDrawerOpen ||
      isVerseOwnersDrawerOpen ||
      isActiveVerseProgressDrawerOpen ||
      isAboutDialogOpen,
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

  const renderOnboardingMockVerseRow = useCallback(
    (verse: Verse) => (
      <div
        data-tour={
          verse.externalVerseId === ONBOARDING_PRIMARY_VERSE_ID
            ? "onboarding-mock-primary-verse-card"
            : undefined
        }
      >
        <SwipeableVerseCard
          verse={verse}
          onOpen={() => {}}
          onOpenProgress={(v) => useOnboardingStore.getState().openProgressDrawer(v)}
          onOpenTags={(targetVerse) => {
            if (!targetVerse.tags || targetVerse.tags.length === 0) return;
            setVerseTagsTarget({
              reference: targetVerse.reference,
              tags: targetVerse.tags,
            });
            setIsVerseTagsDrawerOpen(true);
          }}
          onAddToLearning={(targetVerse) => {
            const action =
              targetVerse.status === "CATALOG" ? "add-to-learning" : "start-learning";
            useOnboardingStore
              .getState()
              .applyVerseAction(targetVerse.externalVerseId, action);
          }}
          onPauseLearning={(targetVerse) =>
            useOnboardingStore
              .getState()
              .applyVerseAction(targetVerse.externalVerseId, "pause")
          }
          onResumeLearning={(targetVerse) =>
            useOnboardingStore
              .getState()
              .applyVerseAction(targetVerse.externalVerseId, "resume")
          }
          onRequestDelete={(targetVerse) =>
            useOnboardingStore
              .getState()
              .applyVerseAction(targetVerse.externalVerseId, "delete")
          }
        />
      </div>
    ),
    [],
  );

  const onboardingMockListContent = useCallback(
    () => (
      <VerseStaticList
        items={onboardingMockVisibleVerses}
        renderRow={renderOnboardingMockVerseRow}
        getItemKey={(verse) => verse.externalVerseId}
        getItemLayoutSignature={getVerseCardLayoutSignature}
      />
    ),
    [onboardingMockVisibleVerses, renderOnboardingMockVerseRow],
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
        getItemLayoutSignature={vm.list.getItemLayoutSignature}
        statusFilter={vm.filters.statusFilter}
        totalCount={vm.pagination.totalCount}
        pageSize={vm.list.pageSize}
        prefetchRows={vm.list.prefetchRows}
        debugInfiniteScroll={vm.list.debugInfiniteScroll}
      />
    ) : null;

  return (
    <>
      <AlertDialog
        open={isAboutDialogOpen}
        onOpenChange={handleAboutDialogOpenChange}
      >
        <AlertDialogContent className="overflow-hidden backdrop-blur-xl rounded-3xl border-border/70 bg-gradient-to-br from-amber-500/15 via-background to-primary/10 p-0 shadow-2xl">
          <div className="relative px-6 py-6 sm:px-7">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-amber-500/20 blur-2xl" />
              <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            </div>

            <AlertDialogHeader className="relative gap-3">
              <AlertDialogTitle className="text-xl text-primary">
                Раздел «Стихи»
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-foreground/80">
                Здесь вы можете добавлять, удалять и искать стихи разными
                способами через фильтры, теги, сортировку и поиск.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="relative mt-4 rounded-2xl border border-border/90 bg-background/40 p-3 text-xs leading-relaxed text-foreground/75">
              Также в этом разделе можно добавлять теги и управлять ими. Находить стихи своих друзей. И видеть свой прогресс в обучении по конкретному стиху.
            </div>

            <AlertDialogFooter className="relative mt-5">
              <AlertDialogAction
                className="h-10 rounded-xl border border-border/90 bg-background/40 text-foreground/75 px-5 text-sm font-medium"
                onClick={markVerseListIntroAsSeen}
              >
                Понятно
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <motion.div
        className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-4 overflow-hidden"
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

        <motion.div className="shrink-0" {...reveal(0.02)}>
          <VerseListHeader
            onAddVerseClick={vm.header.onAddVerseClick}
            onAboutSectionClick={handleAboutDialogOpen}
          />
        </motion.div>

        <motion.div className="hidden shrink-0 md:block px-4 sm:px-6 lg:px-8" {...reveal(0.04)}>
          <VerseListFilterCard
            totalVisible={
              isOnboardingMock
                ? onboardingMockVisibleVerses.length
                : vm.ui.totalVisible
            }
            totalCount={
              isOnboardingMock ? onboardingMockTotalCount : vm.pagination.totalCount
            }
            currentFilterLabel={
              isOnboardingMock ? onboardingMockFilterLabel : vm.ui.currentFilterLabel
            }
            currentFilterTheme={
              isOnboardingMock ? onboardingMockFilterTheme : vm.ui.currentFilterTheme
            }
            statusFilter={vm.filters.statusFilter}
            defaultStatusFilter={vm.filters.defaultStatusFilter}
            filterOptions={vm.filters.filterOptions}
            hasFriends={hasFriends}
            onTabClick={vm.filterTabs.onTabClick}
            selectedBookId={vm.filters.selectedBookId}
            bookOptions={vm.filters.bookOptions}
            onBookChange={vm.filterTabs.onBookChange}
            sortBy={vm.filters.sortBy}
            sortOptions={vm.filters.sortOptions}
            onSortChange={vm.filterTabs.onSortChange}
            onResetFilters={vm.filterTabs.onResetFilters}
            searchQuery={vm.search.searchQuery}
            onSearchChange={vm.search.setSearchQuery}
            allTags={vm.tagFilter.allTags}
            isLoadingTags={vm.tagFilter.isLoadingTags}
            selectedTagSlugs={vm.tagFilter.selectedTagSlugs}
            hasActiveTags={vm.tagFilter.hasActiveTags}
            onTagClick={vm.tagFilter.onTagClick}
            onClearTags={vm.tagFilter.onClearTags}
            onCreateTagDialogOpen={() => {
              setAddDialogMode("tag");
              setAddDialogOpen(true);
            }}
            onDeleteTag={vm.tagFilter.deleteTag}
          />
        </motion.div>

        {isOnboardingMock ? (
          <motion.div
            data-tour="verse-list-content"
            data-tour-filter={vm.filters.statusFilter}
            data-tour-state="ready"
            className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8"
            {...reveal(0.06)}
          >
            <VerseListSectionShell
              totalCount={onboardingMockTotalCount}
              config={onboardingMockSectionConfig}
              count={onboardingMockVisibleVerses.length}
            >
              {onboardingMockListContent()}
            </VerseListSectionShell>
          </motion.div>
        ) : vm.ui.isListLoading ? (
          <motion.div
            data-tour="verse-list-content"
            data-tour-filter={vm.filters.statusFilter}
            data-tour-state="loading"
            className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8"
            {...reveal(0.05)}
          >
            <VerseListSectionShell
              totalCount={vm.pagination.totalCount}
              config={
                vm.list.sectionConfig ?? {
                  headingId: "my-verses-heading",
                  title: "Загрузка...",
                  subtitle: "Загрузка...",
                  dotClassName: "bg-gray-400",
                  borderClassName:
                    "bg-gradient-to-b from-gray-500/5 to-background",
                  tintClassName: "bg-gray-500/5",
                }
              }
              count={0}
            >
              <VerseListSkeletonCards count={3} />
            </VerseListSectionShell>
          </motion.div>
        ) : vm.ui.isEmptyFiltered ? (
          <motion.div
            data-tour="verse-list-content"
            data-tour-filter={vm.filters.statusFilter}
            data-tour-state="empty"
            className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8"
            {...reveal(0.05)}
          >
            <VerseListSectionShell
              totalCount={vm.pagination.totalCount}
              config={{
                headingId: "empty-verse-list-heading",
                title: vm.ui.currentFilterLabel,
                subtitle: `По фильтру «${vm.ui.currentFilterLabel}» сейчас нет карточек.`,
                dotClassName: "bg-gray-400",
                borderClassName:
                  "bg-gradient-to-b from-gray-500/5 to-background",
                tintClassName: "bg-gray-500/5",
              }}
              count={vm.pagination.totalCount}
              contentHeightMode="auto"
              fillAvailableHeight
            >
              <VerseListEmptyState
                currentFilterLabel={vm.ui.currentFilterLabel}
                isAllFilter={vm.filters.statusFilter === "catalog"}
              />
            </VerseListSectionShell>
          </motion.div>
        ) : vm.list.sectionConfig ? (
          <motion.div
            data-tour="verse-list-content"
            data-tour-filter={vm.filters.statusFilter}
            data-tour-state="ready"
            className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8"
            {...reveal(0.06)}
          >
            <VerseListSectionShell
              totalCount={vm.pagination.totalCount}
              config={vm.list.sectionConfig}
              count={vm.list.sectionItems.length}
            >
              {listContent}
            </VerseListSectionShell>
          </motion.div>
        ) : null}

        <VerseListFiltersDrawer
          open={isFiltersDrawerOpen}
          onOpenChange={setIsFiltersDrawerOpen}
          totalVisible={
            isOnboardingMock
              ? onboardingMockVisibleVerses.length
              : vm.ui.totalVisible
          }
          totalCount={
            isOnboardingMock ? onboardingMockTotalCount : vm.pagination.totalCount
          }
          currentFilterLabel={
            isOnboardingMock ? onboardingMockFilterLabel : vm.ui.currentFilterLabel
          }
          currentFilterTheme={
            isOnboardingMock ? onboardingMockFilterTheme : vm.ui.currentFilterTheme
          }
          statusFilter={vm.filters.statusFilter}
          defaultStatusFilter={vm.filters.defaultStatusFilter}
          filterOptions={vm.filters.filterOptions}
          hasFriends={hasFriends}
          onTabClick={vm.filterTabs.onTabClick}
          selectedBookId={vm.filters.selectedBookId}
          bookOptions={vm.filters.bookOptions}
          onBookChange={vm.filterTabs.onBookChange}
          sortBy={vm.filters.sortBy}
          sortOptions={vm.filters.sortOptions}
          onSortChange={vm.filterTabs.onSortChange}
          onResetFilters={vm.filterTabs.onResetFilters}
          searchQuery={vm.search.searchQuery}
          onSearchChange={vm.search.setSearchQuery}
          allTags={vm.tagFilter.allTags}
          isLoadingTags={vm.tagFilter.isLoadingTags}
          selectedTagSlugs={vm.tagFilter.selectedTagSlugs}
          hasActiveTags={vm.tagFilter.hasActiveTags}
          onTagClick={vm.tagFilter.onTagClick}
          onClearTags={vm.tagFilter.onClearTags}
          onCreateTagDialogOpen={() => {
            setAddDialogMode("tag");
            setAddDialogOpen(true);
          }}
          onDeleteTag={vm.tagFilter.deleteTag}
        />

        {/* <motion.div {...reveal(0.08)}>
        <VerseListLoadMoreFooter
          visible={footerVisible}
          isFetchingMore={vm.pagination.isFetchingMoreVerses}
          showDelayedLoadMoreSkeleton={vm.pagination.showDelayedLoadMoreSkeleton}
          loadMoreError={vm.pagination.loadMoreError}
          hasMoreVerses={vm.pagination.hasMoreVerses}
          versesLength={vm.pagination.verses.length}
          onRetryLoadMore={() => {
            void vm.footerLoadState.onRetryLoadMore();
          }}
        />
      </motion.div> */}

        <AddVerseDialog
          open={addDialogOpen}
          mode={addDialogMode}
          viewerTelegramId={telegramId}
          onClose={() => setAddDialogOpen(false)}
          onAdd={onVerseAdded}
          onCreateTag={vm.tagFilter.createTag}
        />

        <ConfirmDeleteModal
          verse={vm.modal.deleteTargetVerse}
          open={vm.modal.deleteTargetVerse !== null}
          onOpenChange={(open) => {
            if (!open && !vm.modal.isDeleteSubmitting) {
              vm.modal.setDeleteTargetVerse(null);
            }
          }}
          onConfirm={vm.modal.onConfirmDelete}
          isSubmitting={vm.modal.isDeleteSubmitting}
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
          verse={activeVerseProgressTarget}
          open={isActiveVerseProgressDrawerOpen}
          onOpenChange={(open) => {
            if (isOnboardingMock) {
              if (open) {
                // Progress drawer is opened via store.openProgressDrawer
              } else {
                useOnboardingStore.getState().closeProgressDrawer();
              }
              return;
            }

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
