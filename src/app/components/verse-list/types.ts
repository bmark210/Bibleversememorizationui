import type * as React from 'react';
import type { Verse } from '@/app/App';
import type { VerseStatus } from '@/generated/prisma';
import type { FilterVisualTheme, VerseListStatusFilter } from './constants';
import type { AppendRevealRange } from './hooks/useVersePagination';
import type { VerseMutablePatch, VersePatchEvent } from '@/app/types/verseSync';

export type DebugInfiniteScroll = (event: string, payload?: Record<string, unknown>) => void;
export type VerseListLoadRange = { startIndex: number; stopIndex: number };

export type VerseCardLayoutSignature =
  | 'new'
  | 'learning-progress'
  | 'waiting-pill'
  | 'review-pill'
  | 'stopped-progress'
  | 'stopped-repeat'
  | 'stopped-mastered';

export type VerseListFilterOption = {
  key: VerseListStatusFilter;
  label: string;
};

export type VerseListSectionConfig = {
  headingId: string;
  title: string;
  subtitle: string;
  dotClassName: string;
  borderClassName: string;
  tintClassName: string;
};

export type VerseListController = {
  ui: {
    announcement: string;
    isListLoading: boolean;
    shouldReduceMotion: boolean;
    totalVisible: number;
    currentFilterLabel: string;
    currentFilterTheme: FilterVisualTheme;
    isEmptyFiltered: boolean;
  };
  filters: {
    statusFilter: VerseListStatusFilter;
    filterOptions: VerseListFilterOption[];
  };
  pagination: {
    verses: Verse[];
    totalCount: number;
    hasMoreVerses: boolean;
    isFetchingVerses: boolean;
    isFetchingMoreVerses: boolean;
    loadMoreError: string | null;
    showDelayedInitialFetchSkeleton: boolean;
    showDelayedLoadMoreSkeleton: boolean;
    appendRevealRange: AppendRevealRange;
  };
  list: {
    listItems: Verse[];
    sectionConfig: VerseListSectionConfig | null;
    sectionItems: Verse[];
    enableInfiniteLoader: boolean;
    pageSize: number;
    prefetchRows: number;
    renderVerseRow: (verse: Verse) => React.ReactNode;
    getItemKey: (verse: Pick<Verse, 'id' | 'externalVerseId'>) => string;
    getItemLayoutSignature: (verse: Verse) => VerseCardLayoutSignature;
    onLoadMoreRows: (range: VerseListLoadRange) => Promise<void>;
    debugInfiniteScroll: DebugInfiniteScroll;
  };
  header: {
    onAddVerseClick: () => void;
  };
  filterTabs: {
    onTabClick: (filter: VerseListStatusFilter, label: string) => void;
  };
  footerLoadState: {
    onRetryLoadMore: () => Promise<void>;
  };
  modal: {
    deleteTargetVerse: Verse | null;
    deleteSubmitting: boolean;
    setDeleteTargetVerse: (verse: Verse | null) => void;
    onConfirmDelete: () => Promise<void>;
  };
  gallery: {
    galleryIndex: number | null;
    onClose: () => void;
    onStatusChange: (verse: Verse, status: VerseStatus) => Promise<VerseMutablePatch | void>;
    onVersePatched: (event: VersePatchEvent) => void;
    onDelete: (verse: Verse) => Promise<void>;
    onRequestMorePreviewVerses: () => Promise<boolean>;
  };
  view: {
    getRevealProps: (delay?: number) => Record<string, unknown>;
  };
};
