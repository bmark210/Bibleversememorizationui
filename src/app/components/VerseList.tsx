'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ArrowRight, Dot, Target } from 'lucide-react';

const AddVerseDialog = dynamic(
  () => import('./AddVerseDialog').then((m) => m.AddVerseDialog),
  { ssr: false }
);
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
  onVerseAdded: (verse: { externalVerseId: string; reference: string; tags: string[] }) => Promise<void>;
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

type ParsedDailyGoalReminderProgress = {
  done: number;
  total: number;
  percent: number;
};

function parseDailyGoalReminderProgress(label: string): ParsedDailyGoalReminderProgress | null {
  if (!label) return null;

  const learningMatch = label.match(/Изучение\s+(\d+)\/(\d+)/i);
  const reviewMatch = label.match(/Повторение\s+(\d+)\/(\d+)/i);

  const learningDone = Number(learningMatch?.[1] ?? 0);
  const learningTotal = Number(learningMatch?.[2] ?? 0);
  const reviewDone = Number(reviewMatch?.[1] ?? 0);
  const reviewTotal = Number(reviewMatch?.[2] ?? 0);

  const total = learningTotal + reviewTotal;
  if (total <= 0) return null;

  const done = Math.min(total, Math.max(0, learningDone + reviewDone));
  const percent = Math.max(0, Math.min(100, (done / total) * 100));

  return { done, total, percent };
}

export function VerseList({
  onVerseAdded,
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogMode, setAddDialogMode] = useState<'verse' | 'tag'>('verse');

  const vm = useVerseListController({
    onAddVerse: () => { setAddDialogMode('verse'); setAddDialogOpen(true); },
    reopenGalleryVerseId,
    reopenGalleryStatusFilter,
    onReopenGalleryHandled,
    verseListExternalSyncVersion,
    onVerseMutationCommitted,
  });

  const reveal = vm.view.getRevealProps;
  const shouldReduceMotion = vm.ui.shouldReduceMotion;
  const isAllMode = vm.filters.statusFilter === 'catalog';
  const visibleListItems = isAllMode ? vm.list.listItems : vm.list.sectionItems;
  const reminderProgress = dailyGoalReminder
    ? parseDailyGoalReminderProgress(dailyGoalReminder.progressLabel)
    : null;

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
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full px-3 py-1">Ежедневная цель</Badge>
                <Badge variant="outline" className="rounded-full px-2.5 py-1 gap-0.5">
                  <Dot className="h-4 w-4 -ml-1 text-primary" />
                  {dailyGoalReminder.phase === 'learning' ? 'Этап 1: Изучение' : 'Этап 2: Повторение'}
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium mt-1 text-foreground/90">
                    {dailyGoalReminder.progressLabel}
                  </div>

                  {/* {reminderProgress ? (
                    <div className="mt-2.5">
                      <div className="h-2 rounded-full overflow-hidden border border-border/60 bg-background/70">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-amber-500/70 transition-[width] duration-300"
                          style={{ width: `${reminderProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  ) : null} */}

                  {dailyGoalReminder.onShowHowToAddFirstVerse ? (
                    <div className="text-xs text-muted-foreground mt-2">
                      Добавьте первый стих, чтобы начать ежедневную цель.
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center sm:justify-end sm:shrink-0">
                  {dailyGoalReminder.onShowHowToAddFirstVerse ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl w-full sm:w-auto"
                      onClick={dailyGoalReminder.onShowHowToAddFirstVerse}
                    >
                      Добавить стих
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    className="rounded-2xl w-full sm:w-auto gap-2 font-semibold"
                    onClick={dailyGoalReminder.onResume}
                    data-tour-id="daily-goal-verse-list-resume-cta"
                  >
                    <Target className="h-4 w-4" />
                    Продолжить цель
                  </Button>
                </div>
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
          searchQuery={vm.search.searchQuery}
          onSearchChange={vm.search.setSearchQuery}
          allTags={vm.tagFilter.allTags}
          isLoadingTags={vm.tagFilter.isLoadingTags}
          selectedTagSlugs={vm.tagFilter.selectedTagSlugs}
          hasActiveTags={vm.tagFilter.hasActiveTags}
          onTagClick={vm.tagFilter.onTagClick}
          onClearTags={vm.tagFilter.onClearTags}
          onCreateTagDialogOpen={() => { setAddDialogMode('tag'); setAddDialogOpen(true); }}
          onDeleteTag={vm.tagFilter.deleteTag}
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
            isAllFilter={vm.filters.statusFilter === 'catalog'}
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
            launchMode="preview"
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
