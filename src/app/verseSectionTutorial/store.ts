"use client";

import { create } from "zustand";
import type { Verse } from "@/app/App";
import {
  type VerseListSortBy,
  type VerseListStatusFilter,
} from "@/app/components/verse-list/constants";
import {
  ONBOARDING_PRIMARY_VERSE_ID,
  createOnboardingMockVerses,
  reduceOnboardingMockVerses,
  type OnboardingMockVerseAction,
} from "@/app/onboarding/onboardingMockVerseFlow";
import {
  type VerseSectionTutorialSource,
  writeVerseSectionTutorialCompleted,
  writeVerseSectionTutorialPromptSeen,
} from "./storage";

function getMockVerseBookId(reference: string) {
  if (reference.startsWith("От Иоанна")) return 43;
  if (reference.startsWith("Римлянам")) return 45;
  if (reference.startsWith("Евреям")) return 58;
  if (reference.startsWith("Псалом")) return 19;
  return null;
}

type VerseSectionTutorialMockSectionConfig = {
  headingId: string;
  title: string;
  subtitle: string;
  dotClassName: string;
  borderClassName: string;
  tintClassName: string;
};

export function getVerseSectionTutorialMockSectionConfig(
  statusFilter: VerseListStatusFilter,
): VerseSectionTutorialMockSectionConfig {
  if (statusFilter === "catalog") {
    return {
      headingId: "verse-section-tutorial-catalog-heading",
      title: "Каталог",
      subtitle: "Демо-стихи для обучения",
      dotClassName: "bg-gray-400",
      borderClassName: "bg-gradient-to-b from-gray-500/5 to-background",
      tintClassName: "bg-gray-500/5",
    };
  }

  if (statusFilter === "learning") {
    return {
      headingId: "verse-section-tutorial-learning-heading",
      title: "Изучение",
      subtitle: "Демо-стихи в активной практике",
      dotClassName: "bg-emerald-500",
      borderClassName: "bg-gradient-to-b from-emerald-500/5 to-background",
      tintClassName: "bg-emerald-500/5",
    };
  }

  if (statusFilter === "review") {
    return {
      headingId: "verse-section-tutorial-review-heading",
      title: "Повторение",
      subtitle: "Стихи, которые ждут повторения",
      dotClassName: "bg-violet-500",
      borderClassName: "bg-gradient-to-b from-violet-500/5 to-background",
      tintClassName: "bg-violet-500/5",
    };
  }

  if (statusFilter === "mastered") {
    return {
      headingId: "verse-section-tutorial-mastered-heading",
      title: "Выучены",
      subtitle: "Демо-стихи, дошедшие до закрепления",
      dotClassName: "bg-amber-500",
      borderClassName: "bg-gradient-to-b from-amber-500/8 to-background",
      tintClassName: "bg-amber-500/8",
    };
  }

  if (statusFilter === "stopped") {
    return {
      headingId: "verse-section-tutorial-stopped-heading",
      title: "На паузе",
      subtitle: "Стихи, которые можно возобновить позже",
      dotClassName: "bg-rose-500",
      borderClassName: "bg-gradient-to-b from-rose-500/5 to-background",
      tintClassName: "bg-rose-500/5",
    };
  }

  return {
    headingId: "verse-section-tutorial-my-heading",
    title: "Мои стихи",
    subtitle: "Личный демо-список для обучения",
    dotClassName: "bg-sky-500",
    borderClassName: "bg-gradient-to-b from-sky-500/5 to-background",
    tintClassName: "bg-sky-500/5",
  };
}

function matchesMockStatusFilter(
  verse: Verse,
  statusFilter: VerseListStatusFilter,
) {
  if (statusFilter === "catalog") return true;
  if (statusFilter === "my") return verse.status !== "CATALOG";
  if (statusFilter === "learning") return verse.status === "LEARNING";
  if (statusFilter === "review") return verse.status === "REVIEW";
  if (statusFilter === "mastered") return verse.status === "MASTERED";
  if (statusFilter === "stopped") return verse.status === "STOPPED";
  return false;
}

function matchesMockSearch(verse: Verse, normalizedQuery: string) {
  if (normalizedQuery.length === 0) return true;
  return (
    verse.reference.toLowerCase().includes(normalizedQuery) ||
    verse.text.toLowerCase().includes(normalizedQuery)
  );
}

function matchesMockTags(verse: Verse, selectedTagSlugs: Set<string>) {
  if (selectedTagSlugs.size === 0) return true;
  return Boolean(verse.tags?.some((tag) => selectedTagSlugs.has(tag.slug)));
}

function compareVerseSectionTutorialPriority(left: Verse, right: Verse) {
  const leftPriority = left.externalVerseId === ONBOARDING_PRIMARY_VERSE_ID ? 0 : 1;
  const rightPriority =
    right.externalVerseId === ONBOARDING_PRIMARY_VERSE_ID ? 0 : 1;
  return leftPriority - rightPriority;
}

function sortMockVerses(verses: Verse[], sortBy: VerseListSortBy) {
  return [...verses].sort((left, right) => {
    const priorityComparison = compareVerseSectionTutorialPriority(left, right);
    if (priorityComparison !== 0) return priorityComparison;

    if (sortBy === "popularity") {
      return (right.popularityValue ?? 0) - (left.popularityValue ?? 0);
    }

    if (sortBy === "bible") {
      const leftBook = getMockVerseBookId(left.reference) ?? Number.MAX_SAFE_INTEGER;
      const rightBook =
        getMockVerseBookId(right.reference) ?? Number.MAX_SAFE_INTEGER;
      if (leftBook !== rightBook) return leftBook - rightBook;
      return left.reference.localeCompare(right.reference, "ru");
    }

    return (
      new Date(right.updatedAt ?? 0).getTime() -
      new Date(left.updatedAt ?? 0).getTime()
    );
  });
}

export function filterAndSortVerseSectionTutorialMockVerses(
  verses: Verse[],
  statusFilter: VerseListStatusFilter,
  selectedBookId: number | null,
  sortBy: VerseListSortBy,
  searchQuery: string,
  selectedTagSlugs: Set<string>,
): Verse[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filtered = verses.filter((verse) => {
    const verseBookId = getMockVerseBookId(verse.reference);
    const matchesBook = selectedBookId == null || verseBookId === selectedBookId;

    return (
      matchesMockStatusFilter(verse, statusFilter) &&
      matchesBook &&
      matchesMockSearch(verse, normalizedQuery) &&
      matchesMockTags(verse, selectedTagSlugs)
    );
  });

  return sortMockVerses(filtered, sortBy);
}

type VerseSectionTutorialStoreState = {
  isActive: boolean;
  source: VerseSectionTutorialSource | null;
  mockVerses: Verse[];
  progressTargetVerseId: string | null;
  galleryTargetVerseId: string | null;
};

type VerseSectionTutorialStoreActions = {
  startVerseSectionTutorial: (source: VerseSectionTutorialSource) => void;
  completeVerseSectionTutorial: (telegramId: string | null) => void;
  cancelVerseSectionTutorial: () => void;
  applyVerseAction: (verseId: string, action: OnboardingMockVerseAction) => void;
  openProgressDrawer: (verse: Verse) => void;
  closeProgressDrawer: () => void;
  openGallery: (verse: Verse) => void;
  closeGallery: () => void;
  closeAllOverlays: () => void;
};

type VerseSectionTutorialStore =
  & VerseSectionTutorialStoreState
  & VerseSectionTutorialStoreActions;

const DEFAULT_STATE: VerseSectionTutorialStoreState = {
  isActive: false,
  source: null,
  mockVerses: [],
  progressTargetVerseId: null,
  galleryTargetVerseId: null,
};

export const useVerseSectionTutorialStore = create<VerseSectionTutorialStore>(
  (set, get) => ({
    ...DEFAULT_STATE,

    startVerseSectionTutorial: (source) => {
      writeVerseSectionTutorialPromptSeen();
      set({
        isActive: true,
        source,
        mockVerses: createOnboardingMockVerses(),
        progressTargetVerseId: null,
        galleryTargetVerseId: null,
      });
    },

    completeVerseSectionTutorial: (telegramId) => {
      writeVerseSectionTutorialCompleted(telegramId);
      set({
        isActive: false,
        source: null,
        mockVerses: [],
        progressTargetVerseId: null,
        galleryTargetVerseId: null,
      });
    },

    cancelVerseSectionTutorial: () => {
      set({
        isActive: false,
        source: null,
        mockVerses: [],
        progressTargetVerseId: null,
        galleryTargetVerseId: null,
      });
    },

    applyVerseAction: (verseId, action) => {
      const { mockVerses, progressTargetVerseId, galleryTargetVerseId } = get();
      const nextVerses = reduceOnboardingMockVerses(mockVerses, verseId, action);
      const updates: Partial<VerseSectionTutorialStoreState> = {
        mockVerses: nextVerses,
      };

      if (action === "delete" && progressTargetVerseId === verseId) {
        updates.progressTargetVerseId = null;
      }

      if (action === "delete" && galleryTargetVerseId === verseId) {
        updates.galleryTargetVerseId = null;
      }

      set(updates);
    },

    openProgressDrawer: (verse) => {
      set({
        progressTargetVerseId: verse.externalVerseId,
        galleryTargetVerseId: null,
      });
    },

    closeProgressDrawer: () => {
      set({
        progressTargetVerseId: null,
      });
    },

    openGallery: (verse) => {
      set({
        galleryTargetVerseId: verse.externalVerseId,
        progressTargetVerseId: null,
      });
    },

    closeGallery: () => {
      set({
        galleryTargetVerseId: null,
      });
    },

    closeAllOverlays: () => {
      set({
        progressTargetVerseId: null,
        galleryTargetVerseId: null,
      });
    },
  }),
);

export function selectShouldUseVerseSectionTutorialMockData(
  state: VerseSectionTutorialStore,
) {
  return state.isActive;
}

export { type VerseSectionTutorialMockSectionConfig };
