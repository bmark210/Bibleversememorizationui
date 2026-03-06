"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import { VerseListEmptyState } from "./verse-list/components/VerseListEmptyState";
import { VerseListFilterCard } from "./verse-list/components/VerseListFilterCard";
import { VerseListHeader } from "./verse-list/components/VerseListHeader";
import { VerseListSectionShell } from "./verse-list/components/VerseListSectionShell";
import { VerseListSkeletonCards } from "./verse-list/components/VerseListSkeletonCards";
import type { VerseListStatusFilter } from "./verse-list/constants";
import { useVerseListController } from "./verse-list/hooks/useVerseListController";
import { VerseVirtualizedList } from "./verse-list/virtualization/VerseVirtualizedList";

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
}: VerseListProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogMode, setAddDialogMode] = useState<"verse" | "tag">("verse");
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

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
      const hasSeenIntro = window.localStorage.getItem(storageKey) === "1";
      if (!hasSeenIntro) {
        setIsAboutDialogOpen(true);
      }
    } catch {
      setIsAboutDialogOpen(true);
    }
  }, []);

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

  const vm = useVerseListController({
    onAddVerse: () => {
      setAddDialogMode("verse");
      setAddDialogOpen(true);
    },
    reopenGalleryVerseId,
    reopenGalleryStatusFilter,
    onReopenGalleryHandled,
    verseListExternalSyncVersion,
    onVerseMutationCommitted,
  });

  const reveal = vm.view.getRevealProps;
  const shouldReduceMotion = vm.ui.shouldReduceMotion;
  const isAllMode = vm.filters.statusFilter === "catalog";
  const visibleListItems = isAllMode ? vm.list.listItems : vm.list.sectionItems;

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
        className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto h-full"
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

        <motion.div {...reveal(0.02)}>
          <VerseListHeader
            onAddVerseClick={vm.header.onAddVerseClick}
            onAboutSectionClick={handleAboutDialogOpen}
          />
        </motion.div>

        <motion.div {...reveal(0.04)}>
          <VerseListFilterCard
            totalVisible={vm.ui.totalVisible}
            totalCount={vm.pagination.totalCount}
            currentFilterLabel={vm.ui.currentFilterLabel}
            currentFilterTheme={vm.ui.currentFilterTheme}
            statusFilter={vm.filters.statusFilter}
            filterOptions={vm.filters.filterOptions}
            onTabClick={vm.filterTabs.onTabClick}
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

        {vm.ui.isListLoading ? (
          <motion.div className="space-y-4 h-full" {...reveal(0.05)}>
            <VerseListSectionShell
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
          <motion.div {...reveal(0.05)}>
            <VerseListSectionShell
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
            >
              <VerseListEmptyState
                currentFilterLabel={vm.ui.currentFilterLabel}
                isAllFilter={vm.filters.statusFilter === "catalog"}
              />
            </VerseListSectionShell>
          </motion.div>
        ) : vm.list.sectionConfig ? (
          <motion.div {...reveal(0.06)}>
            <VerseListSectionShell
              config={vm.list.sectionConfig}
              count={vm.list.sectionItems.length}
            >
              {listContent}
            </VerseListSectionShell>
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
              launchMode="preview"
              onClose={vm.gallery.onClose}
              onStatusChange={vm.gallery.onStatusChange}
              onVersePatched={vm.gallery.onVersePatched}
              onDelete={vm.gallery.onDelete}
              previewTotalCount={vm.pagination.totalCount}
              previewHasMore={vm.pagination.hasMoreVerses}
              previewIsLoadingMore={vm.pagination.isFetchingMoreVerses}
              onRequestMorePreviewVerses={vm.gallery.onRequestMorePreviewVerses}
            />,
            document.body,
          )}
      </motion.div>
    </>
  );
}
