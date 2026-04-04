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
import { VerseListSkeletonCards } from "./verse-list/components/VerseListSkeletonCards";
import { VerseListModeSwitch } from "./verse-list/components/VerseListModeSwitch";
import { VerseListReadingModeBar } from "./verse-list/components/VerseListReadingModeBar";
import { VerseOwnersDrawer } from "./VerseOwnersDrawer";
import { VerseProgressDrawer } from "./VerseProgressDrawer";
import { VerseProgressValue } from "@/app/components/VerseStatusSummary";
import {
  getVerseCardLayoutSignature,
  type VerseListStatusFilter,
} from "./verse-list/constants";
import { MyVersesSectionsLayout } from "./verse-list/components/MyVersesSectionsLayout";
import { buildMyVersesSections } from "./verse-list/myVersesSections";
import {
  parseStoredBoolean,
  VERSE_LIST_STORAGE_KEYS,
} from "./verse-list/storage";
import type { VerseListPrimaryFilterKey } from "./verse-list/components/primaryFilterTabs";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { cn } from "@/app/components/ui/utils";
import { useVerseListController } from "./verse-list/hooks/useVerseListController";
import { VerseVirtualizedList } from "./verse-list/virtualization/VerseVirtualizedList";
import { useVerseItemHeightEstimator } from "./verse-list/hooks/useVerseItemHeightEstimator";
import { VERSE_CARD_COLOR_CONFIG } from "@/app/components/verseCardColorConfig";
import {
  mapUserVerseToAppVerse,
  type AppVerseApiRecord,
  type Verse,
} from "@/app/domain/verse";
import type { DirectLaunchVerse } from "@/app/components/Training/types";
import {
  addVerseToQueue,
  removeVerseFromQueue,
  reorderVerseInQueue,
  QueueApiError,
} from "@/app/components/Training/queue/queueApi";
import { fetchUserVersesPage } from "@/api/services/userVersesPagination";
import { WheelPicker } from "@/app/components/ui/WheelPicker";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import {
  getVerseProgressPercent,
  isVerseLearning,
  isVerseQueued,
} from "@/shared/verseRules";
import {
  ArrowLeft,
  ArrowRightLeft,
  ListOrdered,
  Loader2,
} from "lucide-react";
import { toast } from "@/app/lib/toast";

const LIST_OVERLAY_SPACER_GAP_PX = 12;
const FIXED_LEARNING_SLOTS_CAPACITY = 5;


type LearningSlotDrawerStep = "actions" | "replace";

interface VerseListProps {
  reopenGalleryVerseId?: string | null;
  reopenGalleryStatusFilter?: VerseListStatusFilter | null;
  onReopenGalleryHandled?: () => void;
  verseListExternalSyncVersion?: number;
  onVerseMutationCommitted?: () => void;
  onNavigateToTraining?: (launch: DirectLaunchVerse) => void;
  telegramId?: string | null;
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
  telegramId = null,
  onOpenPlayerProfile,
  isAnchorEligible = false,
  onFriendsChanged,
}: VerseListProps) {
  const [isFocusMode, setIsFocusMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      parseStoredBoolean(
        window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.focusMode),
      ) ?? false
    );
  });
  const [isLocalFiltersDrawerOpen, setIsLocalFiltersDrawerOpen] =
    useState(false);
  const [isVerseTagsDrawerOpen, setIsVerseTagsDrawerOpen] = useState(false);
  const [verseTagsTarget, setVerseTagsTarget] = useState<Pick<
    Verse,
    "reference" | "tags"
  > | null>(null);
  const [isVerseOwnersDrawerOpen, setIsVerseOwnersDrawerOpen] = useState(false);
  const [verseOwnersTarget, setVerseOwnersTarget] = useState<{
    externalVerseId: string;
    reference: string;
    scope: "players";
    totalCount: number;
  } | null>(null);
  const [isVerseProgressDrawerOpen, setIsVerseProgressDrawerOpen] =
    useState(false);
  const [verseProgressTarget, setVerseProgressTarget] = useState<Verse | null>(
    null,
  );
  // Queue drawer: shown when user tries to start learning but slots are full
  const [queueTargetVerse, setQueueTargetVerse] = useState<Verse | null>(null);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [learningSlotDrawerStep, setLearningSlotDrawerStep] =
    useState<LearningSlotDrawerStep>("actions");
  const [replaceableLearningVerses, setReplaceableLearningVerses] = useState<
    Verse[]
  >([]);
  const [
    isLoadingReplaceableLearningVerses,
    setIsLoadingReplaceableLearningVerses,
  ] = useState(false);
  const [replaceableLearningVersesError, setReplaceableLearningVersesError] =
    useState<string | null>(null);
  const [selectedReplacementVerseId, setSelectedReplacementVerseId] = useState<
    string | null
  >(null);
  const [isReplacingLearningVerse, setIsReplacingLearningVerse] =
    useState(false);
  // Position picker for queue reordering
  const [positionEditVerse, setPositionEditVerse] = useState<Verse | null>(
    null,
  );
  const [positionEditValue, setPositionEditValue] = useState(1);
  const filterOverlayRef = useRef<HTMLDivElement | null>(null);
  const listViewportHostRef = useRef<HTMLDivElement | null>(null);
  const [filterOverlayHeight, setFilterOverlayHeight] = useState(0);
  const [listViewportHeight, setListViewportHeight] = useState<number | null>(
    null,
  );
  // Pixel width of the scrollable list area — used by the pretext-based
  // verse card height estimator.  Default 375 matches a typical mobile screen.
  const [listContainerWidth, setListContainerWidth] = useState(375);
  const refetchVersesRef = useRef<(() => Promise<void>) | null>(null);
  const replaceableLearningVersesRequestIdRef = useRef(0);
  const replaceableLearningVersesScrollRef = useRef<HTMLDivElement | null>(
    null,
  );
  const [
    replaceableLearningVersesScrollState,
    setReplaceableLearningVersesScrollState,
  ] = useState(() => ({
    hasOverflow: false,
    isAtBottom: true,
  }));
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

      const nextHeight = Math.ceil(
        currentOverlay.getBoundingClientRect().height,
      );
      setFilterOverlayHeight((prev) =>
        prev === nextHeight ? prev : nextHeight,
      );
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
      const paddingLeft = Number.parseFloat(styles.paddingLeft || "0") || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight || "0") || 0;
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
      const nextWidth = Math.max(
        240,
        Math.floor(currentHost.clientWidth - paddingLeft - paddingRight),
      );

      setListViewportHeight((prev) =>
        prev === nextHeight ? prev : nextHeight,
      );
      setListContainerWidth((prev) =>
        prev === nextWidth ? prev : nextWidth,
      );
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
    window.visualViewport?.addEventListener(
      "resize",
      scheduleViewportHeightUpdate,
    );
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

  const handleOpenPositionEdit = useCallback((verse: Verse) => {
    setPositionEditVerse(verse);
    setPositionEditValue(
      typeof verse.queuePosition === "number" && verse.queuePosition > 0
        ? verse.queuePosition
        : 1,
    );
  }, []);

  const handleRemoveFromQueue = useCallback(
    async (externalVerseId: string) => {
      if (!telegramId) return;
      try {
        await removeVerseFromQueue({ telegramId, externalVerseId });
        onVerseMutationCommitted?.();
        await refetchVersesRef.current?.();
      } catch {
        toast.error("Ошибка — попробуйте ещё раз", { label: "Очередь" });
      }
    },
    [telegramId, onVerseMutationCommitted],
  );

  const vm = useVerseListController({
    disabled: false,
    initialTags: [],
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
        scope: "players",
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
    onEditQueuePosition: handleOpenPositionEdit,
    onRemoveFromQueue: (verse) =>
      void handleRemoveFromQueue(verse.externalVerseId),
    cardColorConfig: VERSE_CARD_COLOR_CONFIG,
  });

  refetchVersesRef.current = vm.refetch.refetchVerses;

  const getListItemLayoutSignature = useCallback(
    (verse: Verse) =>
      `${getVerseCardLayoutSignature(verse)}:${isFocusMode ? "focus" : "default"}`,
    [isFocusMode],
  );
  const isCatalogMode = vm.filters.statusFilter === "catalog";
  const isMyMode = vm.filters.statusFilter === "my";
  const activeMode: VerseListPrimaryFilterKey = isCatalogMode ? "catalog" : "my";
  const showCatalogFilters = isCatalogMode;
  // "Мои стихи" mode renders its own sectioned layout via myModeContent.
  // For catalog and sub-filter modes use the standard virtualized list items.
  const visibleListItems = isCatalogMode
    ? vm.list.listItems
    : vm.list.sectionItems;
  const myModeQueueVerses = useMemo(
    () =>
      vm.list.sectionItems
        .filter((verse) => isVerseQueued(verse))
        .sort((a, b) => (a.queuePosition ?? 999) - (b.queuePosition ?? 999)),
    [vm.list.sectionItems],
  );
  const learningSlotsSummary = useMemo(() => {
    const activeLearning = vm.list.sectionItems.filter((verse) =>
      isVerseLearning(verse),
    ).length;

    return {
      activeLearning,
      capacity: FIXED_LEARNING_SLOTS_CAPACITY,
      canAddMore: activeLearning < FIXED_LEARNING_SLOTS_CAPACITY,
      queueCount: myModeQueueVerses.length,
    };
  }, [myModeQueueVerses.length, vm.list.sectionItems]);

  const handleModeChange = useCallback(
    (nextMode: VerseListPrimaryFilterKey) => {
      vm.filterTabs.onTabClick(
        nextMode,
        nextMode === "catalog" ? "Каталог" : "Мои стихи",
      );
    },
    [vm.filterTabs.onTabClick],
  );

  useEffect(() => {
    if (!showCatalogFilters && isLocalFiltersDrawerOpen) {
      setIsLocalFiltersDrawerOpen(false);
    }
  }, [showCatalogFilters, isLocalFiltersDrawerOpen]);

  const handleSavePosition = useCallback(async () => {
    if (!positionEditVerse || !telegramId) return;
    const { externalVerseId, queuePosition } = positionEditVerse;
    if (positionEditValue === queuePosition) {
      setPositionEditVerse(null);
      return;
    }
    try {
      await reorderVerseInQueue({
        telegramId,
        externalVerseId,
        queuePosition: positionEditValue,
      });
      setPositionEditVerse(null);
      toast.success("Позиция обновлена", { label: "Очередь" });
      onVerseMutationCommitted?.();
      await vm.refetch.refetchVerses();
    } catch {
      toast.error("Ошибка — попробуйте ещё раз", { label: "Очередь" });
    }
  }, [
    positionEditVerse,
    positionEditValue,
    telegramId,
    onVerseMutationCommitted,
    vm.refetch,
  ]);

  const handleAddToQueue = useCallback(async () => {
    if (!queueTargetVerse || !telegramId) return;
    setIsAddingToQueue(true);
    try {
      const result = await addVerseToQueue({
        telegramId,
        externalVerseId: queueTargetVerse.externalVerseId,
      });

      if (result.status === "slot_available") {
        setQueueTargetVerse(null);
        toast.info("Освободился слот изучения", {
          description: "Стих можно запустить без очереди.",
          label: "Стихи",
        });
        await vm.refetch.refetchVerses();
        return;
      }

      if (result.status !== "queued") {
        throw new Error(`Unexpected queue status: ${result.status}`);
      }

      setQueueTargetVerse(null);
      toast.success("Добавлено в очередь", {
        description: queueTargetVerse.reference,
        label: "Стихи",
      });
      onVerseMutationCommitted?.();
      await vm.refetch.refetchVerses();
    } catch (error) {
      if (
        error instanceof QueueApiError &&
        (error.status === 404 || error.status === 409)
      ) {
        setQueueTargetVerse(null);
        await vm.refetch.refetchVerses();
        toast.info("Список уже изменился", {
          description: "Обновили данные, попробуйте ещё раз.",
          label: "Стихи",
        });
        return;
      }
      toast.error("Ошибка — попробуйте ещё раз", { label: "Стихи" });
    } finally {
      setIsAddingToQueue(false);
    }
  }, [queueTargetVerse, telegramId, onVerseMutationCommitted, vm.refetch]);

  const loadReplaceableLearningVerses = useCallback(
    async (targetExternalVerseId: string) => {
      if (!telegramId) {
        setReplaceableLearningVerses([]);
        setReplaceableLearningVersesError(
          "Профиль Telegram ещё не инициализирован.",
        );
        return;
      }

      const requestId = ++replaceableLearningVersesRequestIdRef.current;
      setIsLoadingReplaceableLearningVerses(true);
      setReplaceableLearningVersesError(null);

      try {
        const page = await fetchUserVersesPage({
          telegramId,
          filter: "learning",
          orderBy: "updatedAt",
          order: "desc",
          limit: 50,
        });

        if (replaceableLearningVersesRequestIdRef.current !== requestId) return;

        const learningVerses = (page.items ?? [])
          .map((item) => mapUserVerseToAppVerse(item as AppVerseApiRecord))
          .filter((verse) => verse.externalVerseId !== targetExternalVerseId);

        setReplaceableLearningVerses(learningVerses);
        setSelectedReplacementVerseId((current) => {
          if (
            current &&
            learningVerses.some((verse) => verse.externalVerseId === current)
          ) {
            return current;
          }
          return learningVerses[0]?.externalVerseId ?? null;
        });
      } catch (error) {
        if (replaceableLearningVersesRequestIdRef.current !== requestId) return;
        console.error(
          "Не удалось загрузить стихи в изучении для замены:",
          error,
        );
        setReplaceableLearningVerses([]);
        setReplaceableLearningVersesError(
          "Не удалось загрузить активные слоты.",
        );
        setSelectedReplacementVerseId(null);
      } finally {
        if (replaceableLearningVersesRequestIdRef.current === requestId) {
          setIsLoadingReplaceableLearningVerses(false);
        }
      }
    },
    [telegramId],
  );

  useEffect(() => {
    if (!queueTargetVerse) {
      replaceableLearningVersesRequestIdRef.current += 1;
      setLearningSlotDrawerStep("actions");
      setReplaceableLearningVerses([]);
      setReplaceableLearningVersesError(null);
      setSelectedReplacementVerseId(null);
      setIsLoadingReplaceableLearningVerses(false);
      setIsReplacingLearningVerse(false);
      return;
    }

    setLearningSlotDrawerStep("actions");
    void loadReplaceableLearningVerses(queueTargetVerse.externalVerseId);
  }, [loadReplaceableLearningVerses, queueTargetVerse]);

  const isGalleryOpen = vm.gallery.galleryIndex !== null;
  const selectedReplacementVerse = useMemo(
    () =>
      replaceableLearningVerses.find(
        (verse) => verse.externalVerseId === selectedReplacementVerseId,
      ) ?? null,
    [replaceableLearningVerses, selectedReplacementVerseId],
  );
  const showReplaceFooterShadow =
    replaceableLearningVersesScrollState.hasOverflow &&
    !replaceableLearningVersesScrollState.isAtBottom;

  const updateReplaceableLearningVersesScrollState = useCallback(() => {
    const element = replaceableLearningVersesScrollRef.current;
    if (!element) {
      setReplaceableLearningVersesScrollState((prev) =>
        prev.hasOverflow || !prev.isAtBottom
          ? { hasOverflow: false, isAtBottom: true }
          : prev,
      );
      return;
    }

    const hasOverflow = element.scrollHeight - element.clientHeight > 6;
    const isAtBottom =
      !hasOverflow ||
      element.scrollTop + element.clientHeight >= element.scrollHeight - 6;

    setReplaceableLearningVersesScrollState((prev) =>
      prev.hasOverflow === hasOverflow && prev.isAtBottom === isAtBottom
        ? prev
        : { hasOverflow, isAtBottom },
    );
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (learningSlotDrawerStep !== "replace") return;

    const element = replaceableLearningVersesScrollRef.current;
    if (!element) return;

    let frameId = 0;

    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateReplaceableLearningVersesScrollState();
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleUpdate())
        : null;

    resizeObserver?.observe(element);
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [
    learningSlotDrawerStep,
    isLoadingReplaceableLearningVerses,
    replaceableLearningVerses,
    replaceableLearningVersesError,
    updateReplaceableLearningVersesScrollState,
  ]);

  const handleNavigateToCatalog = useCallback(() => {
    vm.filterTabs.onTabClick("catalog", "Каталог");
  }, [vm.filterTabs.onTabClick]);

  const handleOpenReplaceLearningStep = useCallback(() => {
    setLearningSlotDrawerStep("replace");
    if (
      queueTargetVerse &&
      !isLoadingReplaceableLearningVerses &&
      (replaceableLearningVerses.length === 0 || replaceableLearningVersesError)
    ) {
      void loadReplaceableLearningVerses(queueTargetVerse.externalVerseId);
    }
  }, [
    isLoadingReplaceableLearningVerses,
    loadReplaceableLearningVerses,
    queueTargetVerse,
    replaceableLearningVerses.length,
    replaceableLearningVersesError,
  ]);

  const handleReplaceLearningVerse = useCallback(async () => {
    if (!queueTargetVerse || !selectedReplacementVerse) return;

    setIsReplacingLearningVerse(true);

    try {
      const outcome = await vm.mutations.replaceLearningVerse(
        queueTargetVerse,
        selectedReplacementVerse,
      );

      if (outcome === "stale") {
        setQueueTargetVerse(null);
        toast.info("Список уже изменился", {
          description: "Попробуйте ещё раз.",
          label: "Стихи",
        });
        return;
      }

      if (outcome === "error") {
        toast.error("Не удалось заменить стих", {
          description: "Попробуйте ещё раз.",
          label: "Стихи",
        });
        return;
      }

      toast.success("Стих поставлен в изучение", {
        description: (
          <>
            <div>{queueTargetVerse.reference}</div>
            <div className="text-xs text-foreground/65">
              Вместо {selectedReplacementVerse.reference}
            </div>
          </>
        ),
        label: "Стихи",
      });
      setQueueTargetVerse(null);
    } catch (error) {
      console.error("Не удалось заменить стих в изучении:", error);
      toast.error("Не удалось заменить стих", {
        description: "Попробуйте ещё раз.",
        label: "Стихи",
      });
    } finally {
      setIsReplacingLearningVerse(false);
    }
  }, [queueTargetVerse, selectedReplacementVerse, vm.mutations]);

  const listTopInset =
    showCatalogFilters && filterOverlayHeight > 0
      ? filterOverlayHeight + LIST_OVERLAY_SPACER_GAP_PX
      : 0;
  const listBottomInset = 0;

  const myModeSections = useMemo(() => {
    if (!isMyMode) return null;

    return buildMyVersesSections(vm.list.sectionItems, myModeQueueVerses);
  }, [isMyMode, vm.list.sectionItems, myModeQueueVerses]);

  const myModeContent = useMemo(() => {
    if (!isMyMode || !myModeSections) return null;

    return (
      <MyVersesSectionsLayout
        sections={myModeSections}
        renderVerseRow={vm.list.renderVerseRow}
        getItemKey={vm.list.getItemKey}
        learningCapacity={learningSlotsSummary.capacity}
        currentFilterLabel={vm.ui.currentFilterLabel}
        onNavigateToCatalog={handleNavigateToCatalog}
      />
    );
  }, [
    isMyMode,
    myModeSections,
    vm.list.renderVerseRow,
    vm.list.getItemKey,
    vm.ui.currentFilterLabel,
    handleNavigateToCatalog,
    learningSlotsSummary.capacity,
  ]);

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

  const handleVerseOwnersOpenChange = useCallback((open: boolean) => {
    setIsVerseOwnersDrawerOpen(open);
    if (!open) {
      setVerseOwnersTarget(null);
    }
  }, []);

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

  const handleVerseProgressOpenChange = useCallback((open: boolean) => {
    setIsVerseProgressDrawerOpen(open);
    if (!open) {
      setVerseProgressTarget(null);
    }
  }, []);

  const handleVerseTagSelect = useCallback(
    (slug: string) => {
      if (!vm.tagFilter.selectedTagSlugs.has(slug)) {
        vm.tagFilter.onTagClick(slug);
      }
      closeVerseTagsDrawer();
    },
    [
      closeVerseTagsDrawer,
      vm.tagFilter.onTagClick,
      vm.tagFilter.selectedTagSlugs,
    ],
  );
  // Pretext-based per-verse card height estimator.
  // Feeds accurate heights into the ScrollSeek placeholder so fast-scroll
  // placeholders match the real card heights (no layout jumps on deceleration).
  const getVerseHeightEstimate = useVerseItemHeightEstimator(
    visibleListItems,
    listContainerWidth,
  );

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
        renderRow={
          isCatalogMode ? vm.list.renderCatalogRow : vm.list.renderVerseRow
        }
        getItemKey={vm.list.getItemKey}
        getItemLayoutSignature={getListItemLayoutSignature}
        statusFilter={vm.filters.statusFilter}
        totalCount={vm.pagination.totalCount}
        pageSize={vm.list.pageSize}
        prefetchRows={vm.list.prefetchRows}
        debugInfiniteScroll={vm.list.debugInfiniteScroll}
        getItemHeightEstimate={getVerseHeightEstimate}
      />
    ) : null;

  const filterCardProps = useMemo(
    () => ({
      totalCount: vm.pagination.totalCount,
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
      vm.pagination.totalCount,
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

        <div className="relative min-h-0 flex-1">
          <div
            ref={filterOverlayRef}
            className="pointer-events-none absolute inset-x-0 top-0 z-40"
          >
            {showCatalogFilters ? (
              <VerseListFiltersTrigger
                className="pointer-events-auto"
                open={isFiltersDrawerOpen}
                onOpen={() => setIsLocalFiltersDrawerOpen(true)}
                {...filterCardProps}
              />
            ) : null}
          </div>

          <div
            ref={listViewportHostRef}
            className="flex h-full min-h-0 flex-col pt-0 pb-0 sm:px-6 lg:px-8"
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
              {!vm.ui.isListLoading && vm.ui.isEmptyFiltered && !isMyMode ? (
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
                        isMyFilter={false}
                        onNavigateToCatalog={undefined}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              {!vm.ui.isListLoading &&
              (isMyMode ||
                (!vm.ui.isEmptyFiltered && vm.list.sectionConfig)) ? (
                <div className="relative flex h-full min-h-0 flex-col">
                  <div className="min-h-0 flex-1">
                    {isMyMode ? myModeContent : listContent}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative shrink-0">
          <VerseListReadingModeBar
            isFocusMode={isFocusMode}
            onToggle={toggleFocusMode}
            isMyVersesMode={isMyMode}
          />
          <VerseListModeSwitch
            activeMode={activeMode}
            totalCount={vm.pagination.totalCount}
            onModeChange={handleModeChange}
          />
        </div>

        {showCatalogFilters ? (
          <VerseListFiltersDrawer
            open={isFiltersDrawerOpen}
            onOpenChange={setIsLocalFiltersDrawerOpen}
            {...filterCardProps}
          />
        ) : null}

        {vm.gallery.galleryIndex !== null &&
          vm.pagination.verses[vm.gallery.galleryIndex] &&
          typeof document !== "undefined" &&
          createPortal(
            <VerseGallery
              verses={vm.pagination.verses}
              initialIndex={vm.gallery.galleryIndex}
              sourceMode={activeMode}
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
              onEditQueuePosition={handleOpenPositionEdit}
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

        {/* Queue position picker drawer */}
        <Drawer
          open={positionEditVerse !== null}
          onOpenChange={(open) => {
            if (!open) setPositionEditVerse(null);
          }}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Позиция в очереди</DrawerTitle>
              {positionEditVerse && (
                <DrawerDescription>
                  {positionEditVerse.reference}
                </DrawerDescription>
              )}
            </DrawerHeader>
            <div className="flex flex-col items-center px-4 pb-2">
              <WheelPicker
                values={Array.from(
                  {
                    length: Math.max(
                      learningSlotsSummary.queueCount || 1,
                      positionEditVerse?.queuePosition ?? 1,
                    ),
                  },
                  (_, i) => i + 1,
                )}
                value={positionEditValue}
                onChange={setPositionEditValue}
                className="w-40"
              />
              <p className="mt-1 text-[11px] text-text-subtle">
                {positionEditValue === 1
                  ? "Первым начнёт изучение"
                  : `Позиция ${positionEditValue} в очереди`}
              </p>
            </div>
            <div className="flex gap-3 px-4 pb-6 pt-2">
              <button
                type="button"
                onClick={() => setPositionEditVerse(null)}
                className={cn(
                  "flex-1 rounded-2xl border border-border bg-transparent py-3",
                  "text-[14px] font-medium text-text-secondary transition-colors hover:bg-bg-subtle",
                )}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSavePosition}
                className={cn(
                  "flex-1 rounded-2xl bg-brand-primary py-3",
                  "text-[14px] font-semibold text-white transition-opacity hover:opacity-90",
                )}
              >
                Сохранить
              </button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Queue full drawer */}
        <Drawer
          open={queueTargetVerse !== null}
          onOpenChange={(open) => {
            if (!open) setQueueTargetVerse(null);
          }}
        >
          <DrawerContent className="rounded-t-[32px] border-border/70 bg-card/95 px-4 shadow-2xl backdrop-blur-xl sm:px-6">
            <DrawerHeader className="px-0 pb-0 pt-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-foreground/72">
                  {learningSlotDrawerStep === "replace" ? (
                    <ArrowRightLeft className="h-5 w-5" />
                  ) : (
                    <ListOrdered className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <DrawerTitle>
                    {learningSlotDrawerStep === "replace"
                      ? "Заменить"
                      : "Слоты заняты"}
                  </DrawerTitle>
                  <DrawerDescription className="mt-1 truncate text-sm text-foreground/58">
                    {learningSlotDrawerStep === "replace"
                      ? "Выберите стих для паузы"
                      : (queueTargetVerse?.reference ?? "Новый стих")}
                  </DrawerDescription>
                  <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/48">
                    {learningSlotsSummary.activeLearning}/
                    {learningSlotsSummary.capacity} занято
                  </div>
                </div>
              </div>
            </DrawerHeader>
            <div className="mt-5 flex min-h-0 flex-1 flex-col gap-3 pb-4">
              {learningSlotDrawerStep === "replace" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setLearningSlotDrawerStep("actions")}
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground/68 transition-colors hover:bg-background"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Назад
                  </button>

                  {isLoadingReplaceableLearningVerses ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={`replace-learning-skeleton-${index}`}
                          className="h-20 animate-pulse rounded-2xl border border-border/60 bg-background/60"
                        />
                      ))}
                    </div>
                  ) : replaceableLearningVersesError ? (
                    <div className="rounded-2xl border border-destructive/25 bg-destructive/8 p-4">
                      <p className="text-sm text-destructive">
                        {replaceableLearningVersesError}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (queueTargetVerse) {
                            void loadReplaceableLearningVerses(
                              queueTargetVerse.externalVerseId,
                            );
                          }
                        }}
                        className="mt-3 inline-flex rounded-full border border-destructive/20 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground/78 transition-colors hover:bg-background"
                      >
                        Повторить
                      </button>
                    </div>
                  ) : replaceableLearningVerses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-background/50 p-4 text-sm text-foreground/56">
                      Нет стихов для замены.
                    </div>
                  ) : (
                    <>
                      <div
                        ref={replaceableLearningVersesScrollRef}
                        onScroll={updateReplaceableLearningVersesScrollState}
                        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1"
                      >
                        {replaceableLearningVerses.map((verse) => {
                          const isSelected =
                            selectedReplacementVerseId ===
                            verse.externalVerseId;
                          const progressPercent =
                            getVerseProgressPercent(verse);
                          return (
                            <button
                              key={verse.externalVerseId}
                              type="button"
                              onClick={() =>
                                setSelectedReplacementVerseId(
                                  verse.externalVerseId,
                                )
                              }
                              className={cn(
                                "w-full rounded-[22px] border px-4 py-3 text-left transition-colors",
                                isSelected
                                  ? "border-brand-primary/22 bg-brand-primary/8"
                                  : "border-border/60 bg-background/70 hover:bg-background",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[15px] font-semibold text-foreground/84">
                                    {verse.reference}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-foreground/56">
                                    {verse.text}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-start gap-2">
                                  <div
                                    className={cn(
                                      "inline-flex rounded-full border px-3 py-1",
                                      isSelected
                                        ? "border-status-learning/22 bg-status-learning-soft"
                                        : "border-border/60 bg-background/80",
                                    )}
                                  >
                                    <VerseProgressValue
                                      progressPercent={progressPercent}
                                      size="sm"
                                      className={
                                        VERSE_CARD_COLOR_CONFIG.tones.learning
                                          .progressClassName
                                      }
                                    />
                                  </div>
                                  <div
                                    className={cn(
                                      "mt-1 h-4 w-4 rounded-full border transition-colors",
                                      isSelected
                                        ? "border-brand-primary bg-brand-primary"
                                        : "border-border/60 bg-transparent",
                                    )}
                                  />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative shrink-0 pt-3">
                        <div
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-card/95 via-card/70 to-transparent transition-opacity duration-200",
                            showReplaceFooterShadow
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex gap-3 border-t border-border/40 bg-card/95 pt-3">
                          <button
                            type="button"
                            onClick={() => setLearningSlotDrawerStep("actions")}
                            className={cn(
                              "flex-1 rounded-2xl border border-border bg-transparent py-3 text-[14px] font-medium text-text-secondary transition-colors hover:bg-bg-subtle",
                              isReplacingLearningVerse &&
                                "pointer-events-none opacity-60",
                            )}
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            disabled={
                              !selectedReplacementVerse ||
                              isReplacingLearningVerse
                            }
                            onClick={handleReplaceLearningVerse}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-2 rounded-2xl border border-brand-primary/25 bg-brand-primary py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90",
                              (!selectedReplacementVerse ||
                                isReplacingLearningVerse) &&
                                "pointer-events-none opacity-60",
                            )}
                          >
                            {isReplacingLearningVerse ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ArrowRightLeft className="h-4 w-4" />
                            )}
                            <span>Заменить стих</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isAddingToQueue || isReplacingLearningVerse}
                    onClick={handleAddToQueue}
                    className={cn(
                      "flex items-center gap-3.5 rounded-[24px] border border-border/65 bg-background/72 px-4 py-4 text-left transition-colors hover:bg-background",
                      (isAddingToQueue || isReplacingLearningVerse) &&
                        "pointer-events-none opacity-60",
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/90 text-foreground/68">
                      {isAddingToQueue ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ListOrdered className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-foreground/82">
                        В очередь
                      </p>
                      <p className="mt-1 text-[12px] text-foreground/56">
                        Автостарт позже
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={
                      isLoadingReplaceableLearningVerses ||
                      isReplacingLearningVerse ||
                      replaceableLearningVerses.length === 0
                    }
                    onClick={handleOpenReplaceLearningStep}
                    className={cn(
                      "flex items-center gap-3.5 rounded-[24px] border border-border/65 bg-background/72 px-4 py-4 text-left transition-colors hover:bg-background",
                      (isLoadingReplaceableLearningVerses ||
                        isReplacingLearningVerse ||
                        replaceableLearningVerses.length === 0) &&
                        "opacity-75",
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/90 text-foreground/68">
                      {isLoadingReplaceableLearningVerses ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-foreground/82">
                        Заменить
                      </p>
                      <p className="mt-1 text-[12px] text-foreground/56">
                        {replaceableLearningVerses.length > 0
                          ? "Сразу в активный слот"
                          : "Нет доступных стихов"}
                      </p>
                    </div>
                    {replaceableLearningVerses.length > 0 ? (
                      <div className="text-[12px] font-semibold tabular-nums text-foreground/52">
                        {replaceableLearningVerses.length}
                      </div>
                    ) : null}
                  </button>

                  {replaceableLearningVersesError ? (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-xs text-destructive">
                      {replaceableLearningVersesError}
                    </div>
                  ) : null}

                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
