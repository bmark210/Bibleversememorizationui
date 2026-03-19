"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/app/components/ui/alert-dialog";

const AddVerseDialog = dynamic(
  () => import("./AddVerseDialog").then((m) => m.AddVerseDialog),
  { ssr: false },
);

import { VerseGallery } from "./VerseGallery";
import { ConfirmDeleteModal } from "./verse-list/components/ConfirmDeleteModal";
import { SwipeableVerseCard } from "./verse-list/components/SwipeableVerseCard";
import { VerseListEmptyState } from "./verse-list/components/VerseListEmptyState";
import { VerseListFiltersDrawer } from "./verse-list/components/VerseListFiltersDrawer";
import { VerseListFiltersTrigger } from "./verse-list/components/VerseListFiltersTrigger";
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
import {
  parseStoredBoolean,
  VERSE_LIST_STORAGE_KEYS,
} from "./verse-list/storage";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { useTelegramUiStore } from "@/app/stores/telegramUiStore";
import { useVerseListController } from "./verse-list/hooks/useVerseListController";
import { VerseStaticList } from "./verse-list/virtualization/VerseStaticList";
import { VerseVirtualizedList } from "./verse-list/virtualization/VerseVirtualizedList";
import type { Verse } from "@/app/App";
import type { Tag } from "@/api/models/Tag";
import type { DirectLaunchVerse } from "@/app/components/Training/types";
import { ONBOARDING_PRIMARY_VERSE_ID } from "@/app/onboarding/onboardingMockVerseFlow";
import {
  type VerseSectionTutorialSource,
  readVerseSectionTutorialPromptSeen,
  // writeVerseSectionTutorialPromptSeen,
} from "@/app/verseSectionTutorial/storage";
import {
  useVerseSectionTutorialStore,
  selectShouldUseVerseSectionTutorialMockData,
  getVerseSectionTutorialMockSectionConfig,
  filterAndSortVerseSectionTutorialMockVerses,
} from "@/app/verseSectionTutorial/store";

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
  onStartVerseSectionTutorial?: (
    source: VerseSectionTutorialSource,
  ) => void | Promise<void>;
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
const VERSE_SECTION_TUTORIAL_STATUS_FILTER: VerseListStatusFilter = "catalog";

export function VerseList({
  onVerseAdded,
  reopenGalleryVerseId = null,
  reopenGalleryStatusFilter = null,
  onReopenGalleryHandled,
  verseListExternalSyncVersion,
  onVerseMutationCommitted,
  onNavigateToTraining,
  // onStartVerseSectionTutorial,
  telegramId = null,
  hasFriends = false,
  onOpenPlayerProfile,
  isAnchorEligible = false,
  onFriendsChanged,
  suppressSectionIntro = false,
}: VerseListProps) {
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen,
  );
  const { contentSafeAreaInset } = useTelegramSafeArea();
  // --- Verse tutorial store subscriptions (only primitive/stable selectors) ---
  const isVerseSectionTutorialMock = useVerseSectionTutorialStore(
    selectShouldUseVerseSectionTutorialMockData,
  );
  const tutorialMockVerses = useVerseSectionTutorialStore((s) => s.mockVerses);
  const tutorialProgressTargetVerseId = useVerseSectionTutorialStore(
    (s) => s.progressTargetVerseId,
  );
  const tutorialGalleryTargetVerseId = useVerseSectionTutorialStore(
    (s) => s.galleryTargetVerseId,
  );

  // Derived values via useMemo (avoids new-reference selectors causing infinite loops)
  const tutorialProgressTarget = useMemo(
    () =>
      tutorialProgressTargetVerseId == null
        ? null
        : tutorialMockVerses.find(
            (v) => v.externalVerseId === tutorialProgressTargetVerseId,
          ) ?? null,
    [tutorialProgressTargetVerseId, tutorialMockVerses],
  );
  const tutorialMockFilterTheme = useMemo(
    () => FILTER_VISUAL_THEME[VERSE_SECTION_TUTORIAL_STATUS_FILTER],
    [],
  );
  const tutorialMockSectionConfig = useMemo(
    () =>
      getVerseSectionTutorialMockSectionConfig(
        VERSE_SECTION_TUTORIAL_STATUS_FILTER,
      ),
    [],
  );
  const tutorialMockInitialTags = useMemo(
    () =>
      tutorialMockVerses
        .flatMap((verse) => verse.tags ?? [])
        .filter(
          (tag, index, tags) =>
            tags.findIndex((candidate) => candidate.slug === tag.slug) === index,
        ) as Tag[],
    [tutorialMockVerses],
  );
  const tutorialMockTotalCount = tutorialMockVerses.length;
  const stickyFiltersTop = isTelegramFullscreen
    ? contentSafeAreaInset.top + 60
    : 0;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogMode, setAddDialogMode] = useState<"verse" | "tag">("verse");
  const [isTutorialPromptOpen, setIsTutorialPromptOpen] = useState(false);
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

  const activeVerseProgressTarget = isVerseSectionTutorialMock
    ? tutorialProgressTarget
    : verseProgressTarget;
  const isActiveVerseProgressDrawerOpen = isVerseSectionTutorialMock
    ? tutorialProgressTarget !== null
    : isVerseProgressDrawerOpen;

  useEffect(() => {
    if (
      suppressSectionIntro ||
      isVerseSectionTutorialMock ||
      typeof window === "undefined"
    ) {
      setIsTutorialPromptOpen(false);
      return;
    }

    if (readVerseSectionTutorialPromptSeen(telegramId)) {
      return;
    }

    setIsTutorialPromptOpen(true);
  }, [isVerseSectionTutorialMock, suppressSectionIntro, telegramId]);

  const handleTutorialPromptOpenChange = useCallback((open: boolean) => {
    setIsTutorialPromptOpen(open);
  }, []);

  const handleTutorialPromptOpen = useCallback(() => {
    setIsTutorialPromptOpen(true);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev);
  }, []);

  // const handleSkipVerseSectionTutorial = useCallback(() => {
  //   writeVerseSectionTutorialPromptSeen(telegramId);
  //   setIsTutorialPromptOpen(false);
  // }, [telegramId]);

  // const handleStartVerseSectionTutorial = useCallback(() => {
  //   writeVerseSectionTutorialPromptSeen(telegramId);
  //   setIsTutorialPromptOpen(false);
  //   void Promise.resolve(onStartVerseSectionTutorial?.("prompt"));
  // }, [onStartVerseSectionTutorial, telegramId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      VERSE_LIST_STORAGE_KEYS.focusMode,
      isFocusMode ? "1" : "0",
    );
  }, [isFocusMode]);

  const closeVerseTagsDrawer = useCallback(() => {
    setIsVerseTagsDrawerOpen(false);
    setVerseTagsTarget(null);
  }, []);

  const vm = useVerseListController({
    disabled: isVerseSectionTutorialMock,
    initialTags: tutorialMockInitialTags,
    hasFriends,
    isFocusMode,
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
  const tutorialMockVisibleVerses = useMemo(
    () =>
      filterAndSortVerseSectionTutorialMockVerses(
        tutorialMockVerses,
        VERSE_SECTION_TUTORIAL_STATUS_FILTER,
        vm.filters.selectedBookId,
        vm.filters.sortBy,
        vm.search.searchQuery,
        vm.tagFilter.selectedTagSlugs,
      ),
    [
      tutorialMockVerses,
      vm.filters.selectedBookId,
      vm.filters.sortBy,
      vm.search.searchQuery,
      vm.tagFilter.selectedTagSlugs,
    ],
  );
  const tutorialGalleryIndex = useMemo(() => {
    if (tutorialGalleryTargetVerseId == null) return null;
    const index = tutorialMockVisibleVerses.findIndex(
      (verse) => verse.externalVerseId === tutorialGalleryTargetVerseId,
    );
    return index >= 0 ? index : null;
  }, [tutorialGalleryTargetVerseId, tutorialMockVisibleVerses]);

  const reveal = useCallback(
    (delay: number) =>
      isVerseSectionTutorialMock ? {} : vm.view.getRevealProps(delay),
    [isVerseSectionTutorialMock, vm.view.getRevealProps],
  );
  const getListItemLayoutSignature = useCallback(
    (verse: Verse) =>
      `${getVerseCardLayoutSignature(verse)}:${isFocusMode ? "focus" : "default"}`,
    [isFocusMode],
  );
  const shouldReduceMotion =
    isVerseSectionTutorialMock || vm.ui.shouldReduceMotion;
  const isAllMode = vm.filters.statusFilter === "catalog";
  const visibleListItems = isAllMode ? vm.list.listItems : vm.list.sectionItems;
  const isDeleteModalOpen =
    vm.modal.deleteTargetVerse !== null && !vm.modal.isDeleteSubmitting;
  const isGalleryOpen = isVerseSectionTutorialMock
    ? tutorialGalleryIndex !== null
    : vm.gallery.galleryIndex !== null;

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
      if (isVerseSectionTutorialMock) {
        useVerseSectionTutorialStore.getState().closeGallery();
      } else {
        vm.gallery.onClose();
      }
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

    if (isActiveVerseProgressDrawerOpen) {
      if (isVerseSectionTutorialMock) {
        useVerseSectionTutorialStore.getState().closeProgressDrawer();
      } else {
        setIsVerseProgressDrawerOpen(false);
        setVerseProgressTarget(null);
      }
      return;
    }

    if (isTutorialPromptOpen) {
      handleTutorialPromptOpenChange(false);
    }
  }, [
    addDialogOpen,
    handleTutorialPromptOpenChange,
    isDeleteModalOpen,
    isFiltersDrawerOpen,
    isGalleryOpen,
    isActiveVerseProgressDrawerOpen,
    isTutorialPromptOpen,
    isVerseTagsDrawerOpen,
    isVerseOwnersDrawerOpen,
    isVerseSectionTutorialMock,
    closeVerseTagsDrawer,
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
      isTutorialPromptOpen,
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

  const renderTutorialMockVerseRow = useCallback(
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
          isFocusMode={isFocusMode}
          onOpen={() => useVerseSectionTutorialStore.getState().openGallery(verse)}
          onOpenProgress={(v) =>
            useVerseSectionTutorialStore.getState().openProgressDrawer(v)
          }
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
            useVerseSectionTutorialStore
              .getState()
              .applyVerseAction(targetVerse.externalVerseId, action);
          }}
          onPauseLearning={(targetVerse) =>
            useVerseSectionTutorialStore
              .getState()
              .applyVerseAction(targetVerse.externalVerseId, "pause")
          }
          onResumeLearning={(targetVerse) =>
            useVerseSectionTutorialStore
              .getState()
              .applyVerseAction(targetVerse.externalVerseId, "resume")
          }
          onRequestDelete={(targetVerse) =>
            useVerseSectionTutorialStore
              .getState()
              .applyVerseAction(targetVerse.externalVerseId, "delete")
          }
        />
      </div>
    ),
    [isFocusMode],
  );

  const tutorialMockListContent = useCallback(
    () => (
      <VerseStaticList
        items={tutorialMockVisibleVerses}
        renderRow={renderTutorialMockVerseRow}
        getItemKey={(verse) => verse.externalVerseId}
        getItemLayoutSignature={getListItemLayoutSignature}
      />
    ),
    [getListItemLayoutSignature, tutorialMockVisibleVerses, renderTutorialMockVerseRow],
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
    totalVisible: isVerseSectionTutorialMock
      ? tutorialMockVisibleVerses.length
      : vm.ui.totalVisible,
    totalCount: isVerseSectionTutorialMock
      ? tutorialMockTotalCount
      : vm.pagination.totalCount,
    currentFilterLabel: isVerseSectionTutorialMock
      ? "Каталог"
      : vm.ui.currentFilterLabel,
    currentFilterTheme: isVerseSectionTutorialMock
      ? tutorialMockFilterTheme
      : vm.ui.currentFilterTheme,
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

  return (
    <>
      {/* <AlertDialog
        open={isTutorialPromptOpen}
        onOpenChange={handleTutorialPromptOpenChange}
      >
        <AlertDialogContent className="overflow-hidden backdrop-blur-xl rounded-3xl border-border/70 bg-gradient-to-br from-amber-500/15 via-background to-primary/10 p-0 shadow-2xl">
          <div className="relative px-6 py-6 sm:px-7">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-amber-500/20 blur-2xl" />
              <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            </div>

            <AlertDialogHeader className="relative gap-3">
              <AlertDialogTitle className="text-xl text-primary">
                Короткое обучение по разделу «Стихи»
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-foreground/80">
                Могу за пару шагов показать главное: как добавить стих,
                посмотреть его путь и где открывается подробный просмотр с
                запуском тренировки.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="relative mt-4 rounded-2xl border border-border/90 bg-background/40 p-3 text-xs leading-relaxed text-foreground/75">
              Обучение касается только раздела «Стихи» и не уводит в
              тренировку. Отдельный tutorial по тренировке можно добавить
              позже.
            </div>

            <AlertDialogFooter className="relative mt-5">
              <AlertDialogCancel
                className="h-10 rounded-xl border border-border/90 bg-background/40 px-5 text-sm font-medium text-foreground/75"
                onClick={handleSkipVerseSectionTutorial}
              >
                Не сейчас
              </AlertDialogCancel>
              <AlertDialogAction
                className="h-10 rounded-xl border border-border/90 bg-background/40 text-foreground/75 px-5 text-sm font-medium"
                onClick={handleStartVerseSectionTutorial}
              >
                Пройти обучение
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog> */}

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

        <motion.div className="shrink-0 pb-2" {...reveal(0.02)}>
          <VerseListHeader
            onAddVerseClick={vm.header.onAddVerseClick}
            isFocusMode={isFocusMode}
            onToggleFocusMode={toggleFocusMode}
            onAboutSectionClick={handleTutorialPromptOpen}
          />
        </motion.div>

        <VerseListFiltersTrigger
          open={isFiltersDrawerOpen}
          onOpen={() => setIsLocalFiltersDrawerOpen(true)}
          stickyTop={stickyFiltersTop}
          {...filterCardProps}
        />

        {isVerseSectionTutorialMock ? (
          <motion.div
            data-tour="verse-list-content"
            data-tour-filter={vm.filters.statusFilter}
            data-tour-state="ready"
            className="px-4 sm:px-6 lg:px-8"
            {...reveal(0.06)}
          >
            <VerseListSectionShell
              totalCount={tutorialMockTotalCount}
              config={tutorialMockSectionConfig}
              count={tutorialMockVisibleVerses.length}
              contentHeightMode="auto"
            >
              {tutorialMockListContent()}
            </VerseListSectionShell>
          </motion.div>
        ) : vm.ui.isListLoading ? (
          <motion.div
            data-tour="verse-list-content"
            data-tour-filter={vm.filters.statusFilter}
            data-tour-state="loading"
            className="px-4 sm:px-6 lg:px-8"
            {...reveal(0.05)}
          >
            {/* <VerseListSectionShell
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
              contentHeightMode="auto"
            > */}
              <VerseListSkeletonCards count={3} />
            {/* </VerseListSectionShell> */}
          </motion.div>
        ) : vm.ui.isEmptyFiltered ? (
          <motion.div
            data-tour="verse-list-content"
            data-tour-filter={vm.filters.statusFilter}
            data-tour-state="empty"
            className="px-4 sm:px-6 lg:px-8"
            {...reveal(0.05)}
          >
            {/* <VerseListSectionShell
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
            > */}
              <VerseListEmptyState
                currentFilterLabel={vm.ui.currentFilterLabel}
                isAllFilter={vm.filters.statusFilter === "catalog"}
              />
            {/* </VerseListSectionShell> */}
          </motion.div>
        ) : vm.list.sectionConfig ? (
          <motion.div
            data-tour="verse-list-content"
            data-tour-filter={vm.filters.statusFilter}
            data-tour-state="ready"
            className="px-4 sm:px-6 lg:px-8"
            {...reveal(0.06)}
          >
            {/* <VerseListSectionShell
              totalCount={vm.pagination.totalCount}
              config={vm.list.sectionConfig}
              count={vm.list.sectionItems.length}
              contentHeightMode="auto"
            > */}
              {listContent}
            {/* </VerseListSectionShell> */}
          </motion.div>
        ) : null}

       

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

        <VerseListFiltersDrawer
          open={isFiltersDrawerOpen}
          onOpenChange={setIsLocalFiltersDrawerOpen}
          {...filterCardProps}
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

        {isVerseSectionTutorialMock &&
          tutorialGalleryIndex !== null &&
          tutorialMockVisibleVerses[tutorialGalleryIndex] &&
          typeof document !== "undefined" &&
          createPortal(
            <VerseGallery
              verses={tutorialMockVisibleVerses}
              initialIndex={tutorialGalleryIndex}
              activeTagSlugs={vm.tagFilter.selectedTagSlugs}
              viewerTelegramId={telegramId}
              isFocusMode={isFocusMode}
              onToggleFocusMode={toggleFocusMode}
              onClose={() => {
                useVerseSectionTutorialStore.getState().closeGallery();
              }}
              onStatusChange={async () => {}}
              onDelete={async () => ({ xpLoss: 0 })}
              onSelectTag={handleVerseTagSelect}
              onFriendsChanged={onFriendsChanged}
              onNavigateToTraining={() => {}}
              previewTotalCount={tutorialMockVisibleVerses.length}
              previewHasMore={false}
              previewIsLoadingMore={false}
              isAnchorEligible={isAnchorEligible}
            />,
            document.body,
          )}

        {!isVerseSectionTutorialMock &&
          vm.gallery.galleryIndex !== null &&
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
          verse={activeVerseProgressTarget}
          open={isActiveVerseProgressDrawerOpen}
          onOpenChange={(open) => {
            if (isVerseSectionTutorialMock) {
              if (open) {
                // Progress drawer is opened via store.openProgressDrawer
              } else {
                useVerseSectionTutorialStore.getState().closeProgressDrawer();
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
