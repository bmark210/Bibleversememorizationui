import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Verse } from "@/app/domain/verse";
import type { domain_Tag } from "@/api/models/domain_Tag";
import type { DirectLaunchVerse } from "@/app/components/Training/types";
import { VerseStatus } from "@/shared/domain/verseStatus";
import {
  getVerseTrainingLaunchMode,
  matchesVerseListFilter,
  resolveVerseState,
} from "@/shared/verseRules";
import { toast } from "@/app/lib/toast";
import {
  DEFAULT_VERSE_LIST_STATUS_FILTER,
  DEFAULT_VERSE_LIST_SORT_BY,
  FILTER_VISUAL_THEME,
  LOAD_MORE_SKELETON_DELAY_MS,
  PREFETCH_ROWS,
  VERSE_LIST_PAGE_SIZE,
  getVerseCardLayoutSignature,
  type VerseListSortBy,
  type VerseListStatusFilter,
} from "../constants";
import {
  parseStoredBookId,
  parseStoredSortBy,
  parseStoredStatusFilter,
  VERSE_LIST_STORAGE_KEYS,
} from "../storage";
import { fetchUserVersesPage } from "@/api/services/userVersesPagination";
import { haptic } from "../haptics";
import { SwipeableVerseCard } from "../components/SwipeableVerseCard";
import { useTelegramId } from "./useTelegramId";
import { useVerseActions } from "./useVerseActions";
import { useVersePagination } from "./useVersePagination";
import { useTagFilter } from "./useTagFilter";
import type {
  DebugInfiniteScroll,
  VerseListController,
  VerseListFilterOption,
  VerseListLoadRange,
  VerseListSectionConfig,
  VerseListSortOption,
} from "../types";
import type { VersePatchEvent } from "@/app/types/verseSync";
import { parseExternalVerseId } from "@/shared/bible/externalVerseId";
import { VERSE_LIST_BOOK_OPTIONS } from "../bookOptions";
import type { VerseCardColorConfig } from "@/app/components/verseCardColorConfig";

type UseVerseListControllerParams = {
  disabled?: boolean;
  initialTags?: domain_Tag[];
  isFocusMode?: boolean;
  onOpenVerseOwners?: (verse: Verse) => void;
  onOpenVerseTags?: (verse: Verse) => void;
  onOpenVerseProgress?: (verse: Verse) => void;
  onNavigateToTraining?: (launch: DirectLaunchVerse) => void;
  isAnchorEligible?: boolean;
  reopenGalleryVerseId?: string | null;
  reopenGalleryStatusFilter?: VerseListStatusFilter | null;
  onReopenGalleryHandled?: () => void;
  verseListExternalSyncVersion?: number;
  onVerseMutationCommitted?: () => void;
  onLearningCapacityExceeded?: (verse: Verse) => void;
  onEditQueuePosition?: (verse: Verse) => void;
  onRemoveFromQueue?: (verse: Verse) => void;
  cardColorConfig?: VerseCardColorConfig;
};

function getDefaultStatusFilter(hasOwnVerses: boolean): VerseListStatusFilter {
  return hasOwnVerses ? DEFAULT_VERSE_LIST_STATUS_FILTER : "catalog";
}

function getRootStatusFilter(filter: VerseListStatusFilter): "catalog" | "my" {
  return filter === "catalog" ? "catalog" : "my";
}

function normalizeStatusFilterToRoot(
  filter: VerseListStatusFilter,
): VerseListStatusFilter {
  return getRootStatusFilter(filter);
}

function readInitialStoredStatusFilter(): VerseListStatusFilter | null {
  if (typeof window === "undefined") return null;

  return (
    parseStoredStatusFilter(
      window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.statusFilter),
    ) ?? null
  );
}

export function useVerseListController({
  disabled = false,
  initialTags = [],
  isFocusMode = false,
  onOpenVerseOwners,
  onOpenVerseTags,
  onOpenVerseProgress,
  onNavigateToTraining,
  isAnchorEligible = false,
  reopenGalleryVerseId = null,
  reopenGalleryStatusFilter = null,
  onReopenGalleryHandled,
  verseListExternalSyncVersion,
  onVerseMutationCommitted,
  onLearningCapacityExceeded,
  onEditQueuePosition,
  onRemoveFromQueue,
  cardColorConfig,
}: UseVerseListControllerParams): VerseListController {
  const debugInfiniteScroll = useCallback<DebugInfiniteScroll>(() => {}, []);
  const hasOwnVersesRequestIdRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState(() => {
    if (disabled) return "";
    if (typeof window === "undefined") return "";
    return (
      window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.searchQuery) ?? ""
    );
  });
  const tagFilter = useTagFilter({
    disabled,
    initialTags,
    reloadVersion: verseListExternalSyncVersion,
  });
  const [initialStoredStatusFilter] = useState<VerseListStatusFilter | null>(
    () => {
      if (reopenGalleryStatusFilter) return null;
      return readInitialStoredStatusFilter();
    },
  );
  const [statusFilter, setStatusFilter] = useState<VerseListStatusFilter>(
    () => {
      if (disabled) return "catalog";
      if (reopenGalleryStatusFilter)
        return normalizeStatusFilterToRoot(reopenGalleryStatusFilter);
      return normalizeStatusFilterToRoot(initialStoredStatusFilter ?? "my");
    },
  );
  const [hasOwnVerses, setHasOwnVerses] = useState<boolean | null>(() =>
    disabled ? false : null,
  );
  const [sortBy, setSortBy] = useState<VerseListSortBy>(() => {
    if (disabled) return DEFAULT_VERSE_LIST_SORT_BY;
    if (typeof window === "undefined") return DEFAULT_VERSE_LIST_SORT_BY;
    return (
      parseStoredSortBy(
        window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.sortBy),
      ) ?? DEFAULT_VERSE_LIST_SORT_BY
    );
  });
  const [selectedBookId, setSelectedBookId] = useState<number | null>(() => {
    if (disabled) return null;
    if (typeof window === "undefined") return null;
    return parseStoredBookId(
      window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.selectedBookId),
    );
  });
  const rootStatusFilter = getRootStatusFilter(statusFilter);
  const isCatalogRootFilter = rootStatusFilter === "catalog";
  const selectedTagSlugsForServer = useMemo(
    () =>
      isCatalogRootFilter ? Array.from(tagFilter.selectedTagSlugs).sort() : [],
    [isCatalogRootFilter, tagFilter.selectedTagSlugs],
  );
  const searchQueryForServer = isCatalogRootFilter ? searchQuery : "";
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const lastHandledExternalSyncVersionRef = useRef<number | null>(
    typeof verseListExternalSyncVersion === "number"
      ? verseListExternalSyncVersion
      : null,
  );

  const { telegramId } = useTelegramId();
  const defaultStatusFilter = disabled
    ? "catalog"
    : getDefaultStatusFilter(Boolean(hasOwnVerses));
  const shouldAutoSwitchToCatalog =
    !disabled &&
    hasOwnVerses === false &&
    !reopenGalleryStatusFilter &&
    statusFilter !== "catalog" &&
    statusFilter !== "my"; // stay on 'my' even when empty — guided empty state handles it
  const shouldDelayListFetch =
    !disabled &&
    Boolean(telegramId) &&
    (hasOwnVerses === null || shouldAutoSwitchToCatalog);

  const refreshHasOwnVerses = useCallback(
    async (telegramIdOverride?: string | null) => {
      if (disabled) {
        setHasOwnVerses(false);
        return false;
      }
      const resolvedTelegramId =
        telegramIdOverride?.trim() || telegramId?.trim() || "";
      if (!resolvedTelegramId) {
        setHasOwnVerses(null);
        return null;
      }

      const requestId = ++hasOwnVersesRequestIdRef.current;

      try {
        const page = await fetchUserVersesPage({
          telegramId: resolvedTelegramId,
          filter: "my",
          orderBy: "updatedAt",
          order: "desc",
          limit: 1,
        });

        if (hasOwnVersesRequestIdRef.current !== requestId) return null;
        const total = page.totalCount ?? page.total ?? page.items?.length ?? 0;
        const nextHasOwnVerses = total > 0;
        setHasOwnVerses(nextHasOwnVerses);
        return nextHasOwnVerses;
      } catch (error) {
        if (hasOwnVersesRequestIdRef.current !== requestId) return null;
        console.error(
          "Не удалось определить наличие пользовательских стихов:",
          error,
        );
        const fallbackHasOwnVerses = statusFilter !== "catalog";
        setHasOwnVerses(fallbackHasOwnVerses);
        return fallbackHasOwnVerses;
      }
    },
    [disabled, statusFilter, telegramId],
  );

  const pagination = useVersePagination({
    telegramId,
    disabled,
    statusFilter,
    searchQuery: searchQueryForServer,
    bookId: isCatalogRootFilter ? selectedBookId : null,
    tagSlugs: selectedTagSlugsForServer,
    sortBy,
    pageSize: VERSE_LIST_PAGE_SIZE,
    loadMoreSkeletonDelayMs: LOAD_MORE_SKELETON_DELAY_MS,
  });

  const matchesListFilter = useCallback(
    (
      verse: Pick<Verse, "status" | "flow" | "masteryLevel" | "repetitions">,
      filter: VerseListStatusFilter,
    ) => {
      if (filter === "catalog") return true;
      return matchesVerseListFilter(verse, filter);
    },
    [],
  );

  const handleSlotFreed = useCallback(
    (promotedIds: string[]) => {
      // Show a toast for each verse promoted QUEUE → LEARNING.
      for (const externalId of promotedIds) {
        const verse = pagination.verses.find((v) => v.externalVerseId === externalId);
        const ref = verse?.reference ?? externalId;
        toast.success(`${ref} начинает изучение`, { label: 'Очередь' });
      }
      // Refetch so the boxes reflect the new LEARNING / QUEUE state.
      void pagination.refetchCurrentListFromExternalSync();
    },
    [pagination.verses, pagination.refetchCurrentListFromExternalSync],
  );

  const actions = useVerseActions({
    telegramId,
    statusFilter,
    matchesListFilter,
    resetAndFetchFirstPage: pagination.resetAndFetchFirstPage,
    refetchCurrentList: pagination.refetchCurrentListFromExternalSync,
    setVerses: pagination.setVerses,
    setTotalCount: pagination.setTotalCount,
    setGalleryIndex,
    setAnnouncement,
    applyVersePatch: pagination.applyVersePatch,
    onVerseMutationCommitted: () => {
      void refreshHasOwnVerses();
      onVerseMutationCommitted?.();
    },
    onLearningCapacityExceeded,
    onSlotFreed: handleSlotFreed,
  });

  useEffect(() => {
    if (disabled) {
      setHasOwnVerses(false);
      setStatusFilter("catalog");
      setSearchQuery("");
      setSortBy(DEFAULT_VERSE_LIST_SORT_BY);
      setSelectedBookId(null);
      tagFilter.clearTags();
      pagination.clearPaginationState();
      return;
    }
    if (!telegramId) {
      pagination.clearPaginationState();
      setHasOwnVerses(null);
      return;
    }
    void refreshHasOwnVerses(telegramId);
  }, [
    disabled,
    pagination.clearPaginationState,
    refreshHasOwnVerses,
    tagFilter.clearTags,
    telegramId,
  ]);

  useEffect(() => {
    if (disabled) return;
    if (hasOwnVerses == null) return;

    if (shouldAutoSwitchToCatalog) {
      setStatusFilter("catalog");
    }
  }, [disabled, hasOwnVerses, shouldAutoSwitchToCatalog]);

  useEffect(() => {
    if (disabled) return;
    if (!telegramId || shouldDelayListFetch) return;
    void pagination.resetAndFetchFirstPage(telegramId, statusFilter);
  }, [
    disabled,
    telegramId,
    statusFilter,
    shouldDelayListFetch,
    pagination.resetAndFetchFirstPage,
  ]);

  useEffect(() => {
    if (disabled) return;
    if (verseListExternalSyncVersion == null) return;
    if (
      lastHandledExternalSyncVersionRef.current === verseListExternalSyncVersion
    )
      return;
    lastHandledExternalSyncVersionRef.current = verseListExternalSyncVersion;
    if (!telegramId) return;
    if (!pagination.hasFetchedVersesOnce) return;
    void refreshHasOwnVerses(telegramId);
    void pagination.refetchCurrentListFromExternalSync();
  }, [
    disabled,
    refreshHasOwnVerses,
    telegramId,
    pagination.hasFetchedVersesOnce,
    pagination.refetchCurrentListFromExternalSync,
    verseListExternalSyncVersion,
  ]);

  useEffect(() => {
    if (disabled) return;
    if (!reopenGalleryStatusFilter) return;
    if (reopenGalleryVerseId) return;
    if (statusFilter !== normalizeStatusFilterToRoot(reopenGalleryStatusFilter))
      return;
    onReopenGalleryHandled?.();
  }, [
    disabled,
    onReopenGalleryHandled,
    reopenGalleryStatusFilter,
    reopenGalleryVerseId,
    statusFilter,
  ]);

  useEffect(() => {
    if (disabled) return;
    if (!reopenGalleryStatusFilter) return;
    const normalizedReopenFilter = normalizeStatusFilterToRoot(
      reopenGalleryStatusFilter,
    );
    if (statusFilter === normalizedReopenFilter) return;
    setStatusFilter(normalizedReopenFilter);
  }, [disabled, reopenGalleryStatusFilter, statusFilter]);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      VERSE_LIST_STORAGE_KEYS.statusFilter,
      statusFilter,
    );
  }, [disabled, statusFilter]);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VERSE_LIST_STORAGE_KEYS.sortBy, sortBy);
  }, [disabled, sortBy]);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;
    if (selectedBookId == null) {
      window.localStorage.removeItem(VERSE_LIST_STORAGE_KEYS.selectedBookId);
      return;
    }
    window.localStorage.setItem(
      VERSE_LIST_STORAGE_KEYS.selectedBookId,
      String(selectedBookId),
    );
  }, [disabled, selectedBookId]);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      VERSE_LIST_STORAGE_KEYS.searchQuery,
      searchQuery,
    );
  }, [disabled, searchQuery]);

  useEffect(() => {
    if (disabled) return;
    if (!reopenGalleryVerseId) return;
    if (
      reopenGalleryStatusFilter &&
      statusFilter !== normalizeStatusFilterToRoot(reopenGalleryStatusFilter)
    ) {
      return;
    }
    if (!pagination.hasFetchedVersesOnce) return;
    if (pagination.isFetchingVerses) return;

    const index = pagination.verses.findIndex(
      (v) =>
        String(v.id) === String(reopenGalleryVerseId) ||
        v.externalVerseId === reopenGalleryVerseId,
    );

    if (index === -1) {
      if (pagination.hasMoreVerses && !pagination.isFetchingMoreVerses) {
        void pagination.ensureVerseLoadedForReopen(
          String(reopenGalleryVerseId),
        );
        return;
      }
      onReopenGalleryHandled?.();
      return;
    }

    if (typeof window === "undefined") {
      setGalleryIndex(index);
      onReopenGalleryHandled?.();
      return;
    }

    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setGalleryIndex(index);
        onReopenGalleryHandled?.();
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [
    disabled,
    reopenGalleryVerseId,
    reopenGalleryStatusFilter,
    statusFilter,
    pagination.verses,
    pagination.isFetchingVerses,
    pagination.isFetchingMoreVerses,
    pagination.hasMoreVerses,
    pagination.hasFetchedVersesOnce,
    pagination.ensureVerseLoadedForReopen,
    onReopenGalleryHandled,
  ]);

  // Single-pass filtering + classification: O(n) instead of O(5n).
  const {
    filteredVerses,
    reviewVerses,
    masteredVerses,
    learningVerses,
    stoppedVerses,
  } = useMemo(() => {
    const normalizedQuery = isCatalogRootFilter
      ? searchQuery.trim().toLowerCase()
      : "";
    const filtered: Verse[] = [];
    const review: Verse[] = [];
    const mastered: Verse[] = [];
    const learning: Verse[] = [];
    const stopped: Verse[] = [];

    for (const verse of pagination.verses) {
      const matchesStatus = matchesListFilter(verse, statusFilter);
      const verseBookId =
        parseExternalVerseId(verse.externalVerseId)?.book ?? null;
      const matchesBook =
        !isCatalogRootFilter ||
        selectedBookId == null ||
        verseBookId === selectedBookId;
      const matchesSearch =
        !normalizedQuery ||
        verse.reference.toLowerCase().includes(normalizedQuery) ||
        verse.text.toLowerCase().includes(normalizedQuery);

      if (!(matchesStatus && matchesBook && matchesSearch)) continue;
      filtered.push(verse);

      const resolved = resolveVerseState(verse);
      if (resolved.isReview) review.push(verse);
      else if (resolved.isMastered) mastered.push(verse);
      else if (resolved.isLearning) learning.push(verse);
      else if (resolved.isPaused) stopped.push(verse);
    }

    return {
      filteredVerses: filtered,
      reviewVerses: review,
      masteredVerses: mastered,
      learningVerses: learning,
      stoppedVerses: stopped,
    };
  }, [
    pagination.verses,
    isCatalogRootFilter,
    selectedBookId,
    statusFilter,
    matchesListFilter,
    searchQuery,
  ]);

  const hasLocalClientFiltersActive = false;

  const filterOptions = useMemo<VerseListFilterOption[]>(
    () => [
      // { key: 'catalog', label: 'Каталог' },
      // { key: 'my', label: 'Мои' },
      { key: "learning", label: "Изучаю" },
      { key: "review", label: "Повторяю" },
      { key: "mastered", label: "Выучены" },
      { key: "stopped", label: "На паузе" },
    ],
    [],
  );

  const isListLoading =
    (!disabled && shouldDelayListFetch && !pagination.hasFetchedVersesOnce) ||
    (pagination.isFetchingVerses &&
      !pagination.hasFetchedVersesOnce &&
      pagination.verses.length === 0);
  const isEmptyFiltered =
    !disabled &&
    pagination.hasFetchedVersesOnce &&
    !pagination.isFetchingVerses &&
    filteredVerses.length === 0;
  const currentFilterLabel =
    statusFilter === "catalog"
      ? "Каталог"
      : statusFilter === "my"
        ? "Мои стихи"
        : (filterOptions.find((option) => option.key === statusFilter)?.label ??
          "Мои стихи");
  const currentFilterTheme = FILTER_VISUAL_THEME[statusFilter];
  const totalVisible = filteredVerses.length;
  const bookOptions = VERSE_LIST_BOOK_OPTIONS;

  const openVerseInGallery = useCallback(
    (verse: Verse) => {
      const index = pagination.verses.findIndex((v) =>
        actions.isSameVerse(v, verse),
      );
      if (index === -1) return;
      haptic("light");
      setGalleryIndex(index);
    },
    [pagination.verses, actions],
  );

  const renderVerseRow = useCallback(
    (verse: Verse) => (
      <SwipeableVerseCard
        verse={verse}
        isFocusMode={isFocusMode}
        onOpen={() => openVerseInGallery(verse)}
        onOpenProgress={onOpenVerseProgress}
        onOpenOwners={onOpenVerseOwners}
        onOpenTags={onOpenVerseTags}
        onEditQueuePosition={onEditQueuePosition}
        onRemoveFromQueue={onRemoveFromQueue}
        onStartTraining={(v) => {
          const preferredMode = getVerseTrainingLaunchMode(v);
          if (!preferredMode || !onNavigateToTraining) return;
          onNavigateToTraining({
            verse: v,
            preferredMode,
            returnTarget: {
              kind: "verse-list",
              statusFilter,
            },
          });
        }}
        onAddToLearning={(v) => {
          const isCatalog = resolveVerseState(v).isCatalog;
          void actions.updateVerseStatus(
            v,
            isCatalog ? VerseStatus.MY : VerseStatus.LEARNING,
          );
        }}
        onPauseLearning={(v) =>
          void actions.updateVerseStatus(v, VerseStatus.STOPPED)
        }
        onResumeLearning={(v) =>
          void actions.updateVerseStatus(v, VerseStatus.LEARNING)
        }
        isPending={actions.pendingVerseKeys.has(actions.getVerseKey(verse))}
        isAnchorEligible={isAnchorEligible}
        colorConfig={cardColorConfig}
      />
    ),
    [
      actions,
      cardColorConfig,
      isAnchorEligible,
      isFocusMode,
      onEditQueuePosition,
      onRemoveFromQueue,
      onNavigateToTraining,
      onOpenVerseOwners,
      onOpenVerseProgress,
      onOpenVerseTags,
      openVerseInGallery,
      statusFilter,
    ],
  );

  const renderCatalogRow = useCallback(
    (verse: Verse) => (
      <SwipeableVerseCard
        verse={verse}
        isCatalogMode
        isFocusMode={isFocusMode}
        onOpen={() => openVerseInGallery(verse)}
        onOpenProgress={onOpenVerseProgress}
        onOpenOwners={onOpenVerseOwners}
        onOpenTags={onOpenVerseTags}
        onAddToLearning={(v) =>
          void actions.updateVerseStatus(v, VerseStatus.MY)
        }
        onRemoveFromMy={(v) => actions.confirmDeleteVerse(v)}
        onPauseLearning={() => {}}
        onResumeLearning={() => {}}
        isPending={actions.pendingVerseKeys.has(actions.getVerseKey(verse))}
        colorConfig={cardColorConfig}
      />
    ),
    [
      actions,
      cardColorConfig,
      isFocusMode,
      onOpenVerseOwners,
      onOpenVerseProgress,
      onOpenVerseTags,
      openVerseInGallery,
    ],
  );

  const handleLoadMoreRows = useCallback(
    async (range: VerseListLoadRange) => {
      if (hasLocalClientFiltersActive) {
        debugInfiniteScroll("virtualized-loadMoreRows-skip:local-filters", {
          range,
        });
        return;
      }
      debugInfiniteScroll("virtualized-loadMoreRows", {
        range,
        hasMoreVerses: pagination.hasMoreVerses,
        isFetchingMoreVerses: pagination.isFetchingMoreVerses,
      });
      await pagination.fetchNextPage({ source: "auto" });
    },
    [
      hasLocalClientFiltersActive,
      debugInfiniteScroll,
      pagination.hasMoreVerses,
      pagination.isFetchingMoreVerses,
      pagination.fetchNextPage,
    ],
  );

  const handleRetryLoadMore = useCallback(async () => {
    await pagination.fetchNextPage({ source: "manual" });
  }, [pagination.fetchNextPage]);

  const handleTabClick = useCallback(
    (nextFilter: VerseListStatusFilter, _label: string) => {
      const currentRootFilter = getRootStatusFilter(statusFilter);
      const nextRootFilter = getRootStatusFilter(nextFilter);
      const resolvedNextFilter = normalizeStatusFilterToRoot(nextFilter);
      if (statusFilter === resolvedNextFilter) return;

      haptic("light");

      if (currentRootFilter !== nextRootFilter) {
        setSelectedBookId(null);
        setSortBy(DEFAULT_VERSE_LIST_SORT_BY);
        setSearchQuery("");
        tagFilter.clearTags();
      }

      setStatusFilter(resolvedNextFilter);
      setAnnouncement(
        `Раздел: ${nextRootFilter === "catalog" ? "Каталог" : "Мои стихи"}`,
      );
    },
    [statusFilter, tagFilter.clearTags],
  );

  const handleBookChange = useCallback(
    (nextBookId: number | null, label: string) => {
      if (selectedBookId === nextBookId) return;
      haptic("light");
      setSelectedBookId(nextBookId);
      setAnnouncement(`Книга: ${label}`);
    },
    [selectedBookId],
  );

  const isMyScopeFilter = statusFilter !== "catalog";
  const sortOptions = useMemo<VerseListSortOption[]>(
    () => [
      { key: "bible", label: "Канон" },
      { key: "updatedAt", label: "Активность" },
      { key: "popularity", label: "Прогресс" },
    ],
    [isMyScopeFilter],
  );

  const handleSortChange = useCallback(
    (nextSortBy: VerseListSortBy, label: string) => {
      if (sortBy === nextSortBy) return;
      haptic("light");
      setSortBy(nextSortBy);
      setAnnouncement(`Сортировка: ${label}`);
    },
    [sortBy],
  );

  const handleResetFilters = useCallback(() => {
    const resetStatusFilter =
      statusFilter === "catalog" ? "catalog" : defaultStatusFilter;
    const hasChanges =
      statusFilter !== resetStatusFilter ||
      selectedBookId !== null ||
      sortBy !== DEFAULT_VERSE_LIST_SORT_BY ||
      searchQuery.trim().length > 0 ||
      tagFilter.hasActiveTags;
    if (!hasChanges) return;
    haptic("light");
    setStatusFilter(resetStatusFilter);
    setSelectedBookId(null);
    setSortBy(DEFAULT_VERSE_LIST_SORT_BY);
    setSearchQuery("");
    tagFilter.clearTags();
    setAnnouncement("Фильтры сброшены");
  }, [
    defaultStatusFilter,
    searchQuery,
    selectedBookId,
    sortBy,
    statusFilter,
    tagFilter.clearTags,
    tagFilter.hasActiveTags,
  ]);

  const activeFilteredSection = useMemo<{
    items: Verse[];
    config: VerseListSectionConfig;
  } | null>(() => {
    if (statusFilter === "catalog")
      return {
        items: filteredVerses,
        config: {
          headingId: "my-verses-heading",
          title: "Каталог",
          subtitle: "Глобальный каталог стихов",
          dotClassName: "bg-status-collection",
          borderClassName:
            "bg-gradient-to-b from-status-collection-soft to-bg-app",
          tintClassName: "bg-status-collection-soft",
        },
      };
    if (statusFilter === "learning") {
      return {
        items: learningVerses,
        config: {
          headingId: "learning-verses-heading",
          title: "Изучение",
          subtitle: "Стихи, которые вы изучаете",
          dotClassName: "bg-status-learning",
          borderClassName:
            "bg-gradient-to-b from-status-learning-soft to-bg-app",
          tintClassName: "bg-status-learning-soft",
        },
      };
    }
    if (statusFilter === "review") {
      return {
        items: reviewVerses,
        config: {
          headingId: "review-verses-heading",
          title: "Повторение",
          subtitle: "Ваши стихи для повторения",
          dotClassName: "bg-status-review",
          borderClassName: "bg-gradient-to-b from-status-review-soft to-bg-app",
          tintClassName: "bg-status-review-soft",
        },
      };
    }
    if (statusFilter === "mastered") {
      return {
        items: masteredVerses,
        config: {
          headingId: "mastered-verses-heading",
          title: "Выученные",
          subtitle: "Ваши выученные стихи",
          dotClassName: "bg-status-mastered",
          borderClassName:
            "bg-gradient-to-b from-status-mastered-soft to-bg-app",
          tintClassName: "bg-status-mastered-soft",
        },
      };
    }
    if (statusFilter === "stopped") {
      return {
        items: stoppedVerses,
        config: {
          headingId: "stopped-verses-heading",
          title: "На паузе",
          subtitle: "Ваши стихи на паузе",
          dotClassName: "bg-status-paused",
          borderClassName: "bg-gradient-to-b from-status-paused-soft to-bg-app",
          tintClassName: "bg-status-paused-soft",
        },
      };
    }
    return {
      items: filteredVerses,
      config: {
        headingId: "my-verses-heading",
        title: "Мои стихи",
        subtitle: "Стихи, добавленные в мой список",
        dotClassName: "bg-brand-primary",
        borderClassName: "bg-gradient-to-b from-brand-primary/12 to-bg-app",
        tintClassName: "bg-brand-primary/10",
      },
    };
  }, [
    statusFilter,
    learningVerses,
    reviewVerses,
    masteredVerses,
    stoppedVerses,
    filteredVerses,
  ]);

  const listItems =
    statusFilter === "catalog"
      ? hasLocalClientFiltersActive
        ? filteredVerses
        : pagination.verses
      : [];
  const sectionItems = activeFilteredSection?.items ?? [];

  return {
    ui: {
      announcement,
      isListLoading,
      totalVisible,
      currentFilterLabel,
      currentFilterTheme,
      isEmptyFiltered,
    },
    filters: {
      statusFilter,
      defaultStatusFilter,
      filterOptions,
      selectedBookId,
      bookOptions,
      sortBy,
      sortOptions,
    },
    search: {
      searchQuery,
      setSearchQuery,
    },
    tagFilter: {
      allTags: tagFilter.allTags,
      selectedTagSlugs: tagFilter.selectedTagSlugs,
      hasActiveTags: tagFilter.hasActiveTags,
      isLoadingTags: tagFilter.isLoadingTags,
      onTagClick: tagFilter.toggleTag,
      onClearTags: tagFilter.clearTags,
    },
    pagination: {
      verses: pagination.verses,
      totalCount: pagination.totalCount,
      hasMoreVerses: pagination.hasMoreVerses,
      isFetchingVerses: pagination.isFetchingVerses,
      isFetchingMoreVerses: pagination.isFetchingMoreVerses,
      loadMoreError: pagination.loadMoreError,
      showDelayedInitialFetchSkeleton:
        pagination.showDelayedInitialFetchSkeleton,
      showDelayedLoadMoreSkeleton: pagination.showDelayedLoadMoreSkeleton,
      appendRevealRange: pagination.appendRevealRange,
    },
    list: {
      listItems,
      sectionConfig: activeFilteredSection?.config ?? null,
      sectionItems,
      enableInfiniteLoader: !hasLocalClientFiltersActive,
      pageSize: VERSE_LIST_PAGE_SIZE,
      prefetchRows: PREFETCH_ROWS,
      renderVerseRow,
      renderCatalogRow,
      getItemKey: actions.getVerseKey,
      getItemLayoutSignature: getVerseCardLayoutSignature,
      onLoadMoreRows: handleLoadMoreRows,
      debugInfiniteScroll,
    },
    filterTabs: {
      onTabClick: handleTabClick,
      onBookChange: handleBookChange,
      onSortChange: handleSortChange,
      onResetFilters: handleResetFilters,
    },
    refetch: {
      refetchVerses: pagination.refetchCurrentListFromExternalSync,
    },
    mutations: {
      replaceLearningVerse: actions.replaceLearningVerse,
    },
    footerLoadState: {
      onRetryLoadMore: handleRetryLoadMore,
    },
    modal: {
      deleteTargetVerse: actions.deleteTargetVerse,
      isDeleteSubmitting: actions.isDeleteSubmitting,
      setDeleteTargetVerse: actions.setDeleteTargetVerse,
      onConfirmDelete: actions.handleConfirmDeleteVerse,
    },
    gallery: {
      galleryIndex,
      onClose: () => setGalleryIndex(null),
      onStatusChange: actions.handleStatusChange,
      onVersePatched: (event: VersePatchEvent) =>
        actions.applyVersePatchedFromGallery(event),
      onDelete: actions.handleDeleteVerse,
      onRequestMorePreviewVerses: () =>
        pagination.fetchNextPage({ source: "gallery" }),
    },
  };
}
