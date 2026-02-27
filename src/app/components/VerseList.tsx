'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { VerseGallery } from './VerseGallery';
import type { Verse } from '@/app/App';
import { ConfirmDeleteModal } from './verse-list/components/ConfirmDeleteModal';
import { VerseListEmptyState } from './verse-list/components/VerseListEmptyState';
import { VerseListFilterCard } from './verse-list/components/VerseListFilterCard';
import { VerseListHeader } from './verse-list/components/VerseListHeader';
import { VerseListLoadMoreFooter } from './verse-list/components/VerseListLoadMoreFooter';
import { VerseListSectionShell } from './verse-list/components/VerseListSectionShell';
import { VerseListSkeletonCards } from './verse-list/components/VerseListSkeletonCards';
import type { VerseListStatusFilter } from './verse-list/constants';
import { useVerseListController } from './verse-list/hooks/useVerseListController';
import { VerseVirtualizedList } from './verse-list/virtualization/VerseVirtualizedList';
import type {
  DailyGoalGalleryContext,
  DailyGoalProgressEvent,
  DailyGoalResumeMode,
  DailyGoalTrainingStartDecision,
  DailyGoalVerseListReminder,
} from '@/app/features/daily-goal/types';

interface VerseListProps {
  onAddVerse: () => void;
  reopenGalleryVerseId?: string | null;
  reopenGalleryStatusFilter?: VerseListStatusFilter | null;
  onReopenGalleryHandled?: () => void;
  verseListExternalSyncVersion?: number;
  onVerseMutationCommitted?: () => void;
  dailyGoalReminder?: DailyGoalVerseListReminder;
  dailyGoalGalleryContext?: DailyGoalGalleryContext | null;
  onBeforeStartTrainingFromGalleryVerse?:
    | ((verse: Verse) => Promise<DailyGoalTrainingStartDecision> | DailyGoalTrainingStartDecision)
    | undefined;
  onDailyGoalProgressEvent?: ((event: DailyGoalProgressEvent) => void) | undefined;
  onDailyGoalJumpToVerseRequest?: ((externalVerseId: string) => void) | undefined;
  onDailyGoalPreferredResumeModeChange?: ((mode: DailyGoalResumeMode) => void) | undefined;
}

export function VerseList({
  onAddVerse,
  reopenGalleryVerseId = null,
  reopenGalleryStatusFilter = null,
  onReopenGalleryHandled,
  verseListExternalSyncVersion,
  onVerseMutationCommitted,
  dailyGoalReminder,
  dailyGoalGalleryContext = null,
  onBeforeStartTrainingFromGalleryVerse,
  onDailyGoalProgressEvent,
  onDailyGoalJumpToVerseRequest,
  onDailyGoalPreferredResumeModeChange,
}: VerseListProps) {
  const vm = useVerseListController({
    onAddVerse,
    reopenGalleryVerseId,
    reopenGalleryStatusFilter,
    onReopenGalleryHandled,
    verseListExternalSyncVersion,
    onVerseMutationCommitted,
  });

  const reveal = vm.view.getRevealProps;
  const shouldReduceMotion = vm.ui.shouldReduceMotion;
  const isAllMode = vm.filters.statusFilter === 'all';
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

  const footerVisible = Boolean(
    !vm.ui.isListLoading &&
      !vm.pagination.isFetchingMoreVerses &&
      (vm.pagination.verses.length > 0 ||
        vm.pagination.hasMoreVerses ||
        vm.pagination.loadMoreError)
  );

  return (
    <motion.div
      className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto"
      {...(shouldReduceMotion
        ? {}
        : {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.2, ease: 'easeOut' as const },
          })}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {vm.ui.announcement}
      </div>

      <motion.div {...reveal(0.02)}>
        <VerseListHeader onAddVerseClick={vm.header.onAddVerseClick} />
      </motion.div>

      {dailyGoalReminder?.visible ? (
        <motion.div {...reveal(0.03)} className="mb-3">
          <div
            data-tour-id="daily-goal-verse-list-reminder"
            className="rounded-2xl border border-border/70 bg-gradient-to-r from-primary/8 via-background to-amber-500/6 p-3.5 sm:p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge className="rounded-full px-3 py-1">Ежедневная цель</Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1"
                  >
                    {dailyGoalReminder.phase === 'learning' ? 'Этап 1: Изучение' : 'Этап 2: Повторение'}
                  </Badge>
                </div>
                <div className="text-sm font-medium">{dailyGoalReminder.progressLabel}</div>
                {dailyGoalReminder.onShowHowToAddFirstVerse ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    Добавьте первый стих, чтобы начать ежедневную цель.
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {dailyGoalReminder.onShowHowToAddFirstVerse ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto rounded-2xl"
                    onClick={dailyGoalReminder.onShowHowToAddFirstVerse}
                  >
                    Добавить стих
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="w-full sm:w-auto rounded-2xl"
                  onClick={dailyGoalReminder.onResume}
                  data-tour-id="daily-goal-verse-list-resume-cta"
                >
                  Продолжить
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      <motion.div {...reveal(0.04)}>
        <VerseListFilterCard
          totalVisible={vm.ui.totalVisible}
          totalCount={vm.pagination.totalCount}
          currentFilterLabel={vm.ui.currentFilterLabel}
          currentFilterTheme={vm.ui.currentFilterTheme}
          statusFilter={vm.filters.statusFilter}
          filterOptions={vm.filters.filterOptions}
          onTabClick={vm.filterTabs.onTabClick}
        />
      </motion.div>

      {vm.ui.isListLoading ? (
        <motion.div className="space-y-4" {...reveal(0.05)}>
          <VerseListSkeletonCards count={3} />
        </motion.div>
      ) : vm.ui.isEmptyFiltered ? (
        <motion.div {...reveal(0.05)}>
          <VerseListEmptyState
            currentFilterLabel={vm.ui.currentFilterLabel}
            isAllFilter={vm.filters.statusFilter === 'all'}
          />
        </motion.div>
      ) : isAllMode ? (
        <motion.div className="space-y-3" {...reveal(0.06)}>
          {listContent}
        </motion.div>
      ) : vm.list.sectionConfig ? (
        <motion.div {...reveal(0.06)}>
          <VerseListSectionShell config={vm.list.sectionConfig} count={vm.list.sectionItems.length}>
            {listContent}
          </VerseListSectionShell>
        </motion.div>
      ) : null}

      <motion.div {...reveal(0.08)}>
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
      </motion.div>

      <ConfirmDeleteModal
        verse={vm.modal.deleteTargetVerse}
        open={vm.modal.deleteTargetVerse !== null}
        onOpenChange={(open) => {
          if (!open && !vm.modal.deleteSubmitting) {
            vm.modal.setDeleteTargetVerse(null);
          }
        }}
        onConfirm={vm.modal.onConfirmDelete}
        isSubmitting={vm.modal.deleteSubmitting}
      />

      {vm.gallery.galleryIndex !== null &&
        vm.pagination.verses[vm.gallery.galleryIndex] &&
        typeof document !== 'undefined' &&
        createPortal(
          <VerseGallery
            verses={vm.pagination.verses}
            initialIndex={vm.gallery.galleryIndex}
            onClose={vm.gallery.onClose}
            onStatusChange={vm.gallery.onStatusChange}
            onVersePatched={vm.gallery.onVersePatched}
            onDelete={vm.gallery.onDelete}
            dailyGoalContext={dailyGoalGalleryContext ?? undefined}
            onBeforeStartTrainingFromGalleryVerse={onBeforeStartTrainingFromGalleryVerse}
            onDailyGoalProgressEvent={onDailyGoalProgressEvent}
            onDailyGoalJumpToVerseRequest={onDailyGoalJumpToVerseRequest}
            onDailyGoalPreferredResumeModeChange={onDailyGoalPreferredResumeModeChange}
            previewTotalCount={vm.pagination.totalCount}
            previewHasMore={vm.pagination.hasMoreVerses}
            previewIsLoadingMore={vm.pagination.isFetchingMoreVerses}
            onRequestMorePreviewVerses={vm.gallery.onRequestMorePreviewVerses}
          />,
          document.body
        )}
    </motion.div>
  );
}
