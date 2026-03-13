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
} from "./onboardingMockVerseFlow";
import {
  readOnboardingCompletion,
  writeOnboardingCompletion,
  clearOnboardingReplayState,
  type OnboardingSource,
} from "./onboardingStorage";

// ---------------------------------------------------------------------------
// Pure utility functions (moved from useOnboardingMockVerseList.ts)
// ---------------------------------------------------------------------------

function getMockVerseBookId(reference: string) {
  if (reference.startsWith("От Иоанна")) return 43;
  if (reference.startsWith("Римлянам")) return 45;
  if (reference.startsWith("Евреям")) return 58;
  if (reference.startsWith("Псалом")) return 19;
  return null;
}

type OnboardingMockVerseSectionConfig = {
  headingId: string;
  title: string;
  subtitle: string;
  dotClassName: string;
  borderClassName: string;
  tintClassName: string;
};

export function getMockVerseSectionConfig(
  statusFilter: VerseListStatusFilter,
): OnboardingMockVerseSectionConfig {
  if (statusFilter === "catalog") {
    return {
      headingId: "onboarding-mock-catalog-heading",
      title: "Каталог",
      subtitle: "Демо-стихи для обучения",
      dotClassName: "bg-gray-400",
      borderClassName: "bg-gradient-to-b from-gray-500/5 to-background",
      tintClassName: "bg-gray-500/5",
    };
  }

  if (statusFilter === "learning") {
    return {
      headingId: "onboarding-mock-learning-heading",
      title: "Изучение",
      subtitle: "Демо-стихи в активной практике",
      dotClassName: "bg-emerald-500",
      borderClassName: "bg-gradient-to-b from-emerald-500/5 to-background",
      tintClassName: "bg-emerald-500/5",
    };
  }

  if (statusFilter === "review") {
    return {
      headingId: "onboarding-mock-review-heading",
      title: "Повторение",
      subtitle: "Стихи, которые ждут повторения",
      dotClassName: "bg-violet-500",
      borderClassName: "bg-gradient-to-b from-violet-500/5 to-background",
      tintClassName: "bg-violet-500/5",
    };
  }

  if (statusFilter === "mastered") {
    return {
      headingId: "onboarding-mock-mastered-heading",
      title: "Выучены",
      subtitle: "Демо-стихи, дошедшие до закрепления",
      dotClassName: "bg-amber-500",
      borderClassName: "bg-gradient-to-b from-amber-500/8 to-background",
      tintClassName: "bg-amber-500/8",
    };
  }

  if (statusFilter === "stopped") {
    return {
      headingId: "onboarding-mock-stopped-heading",
      title: "На паузе",
      subtitle: "Стихи, которые можно возобновить позже",
      dotClassName: "bg-rose-500",
      borderClassName: "bg-gradient-to-b from-rose-500/5 to-background",
      tintClassName: "bg-rose-500/5",
    };
  }

  return {
    headingId: "onboarding-mock-my-heading",
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

function compareOnboardingPriority(left: Verse, right: Verse) {
  const leftPriority = left.externalVerseId === ONBOARDING_PRIMARY_VERSE_ID ? 0 : 1;
  const rightPriority = right.externalVerseId === ONBOARDING_PRIMARY_VERSE_ID ? 0 : 1;
  return leftPriority - rightPriority;
}

function sortMockVerses(verses: Verse[], sortBy: VerseListSortBy) {
  return [...verses].sort((left, right) => {
    const priorityComparison = compareOnboardingPriority(left, right);
    if (priorityComparison !== 0) return priorityComparison;

    if (sortBy === "popularity") {
      return (right.popularityValue ?? 0) - (left.popularityValue ?? 0);
    }

    if (sortBy === "bible") {
      const leftBook = getMockVerseBookId(left.reference) ?? Number.MAX_SAFE_INTEGER;
      const rightBook = getMockVerseBookId(right.reference) ?? Number.MAX_SAFE_INTEGER;
      if (leftBook !== rightBook) return leftBook - rightBook;
      return left.reference.localeCompare(right.reference, "ru");
    }

    return (
      new Date(right.updatedAt ?? 0).getTime() -
      new Date(left.updatedAt ?? 0).getTime()
    );
  });
}

export function filterAndSortMockVerses(
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

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

type OnboardingStoreState = {
  // Lifecycle
  isActive: boolean;
  source: OnboardingSource | null;
  hasCompletedOnboarding: boolean;
  hasHydratedCompletion: boolean;

  // Mock verse data
  mockVerses: Verse[];

  // UI state controlled by onboarding steps
  isProgressDrawerOpen: boolean;
  progressTargetVerseId: string | null;
};

type OnboardingStoreActions = {
  // Lifecycle
  startOnboarding: (source: OnboardingSource) => void;
  completeOnboarding: (telegramId: string | null) => void;
  cancelOnboarding: () => void;
  hydrateCompletion: (telegramId: string | null) => void;

  // Mock verse mutations
  applyVerseAction: (verseId: string, action: OnboardingMockVerseAction) => void;

  // UI controls
  openProgressDrawer: (verse: Verse) => void;
  closeProgressDrawer: () => void;
  closeAllOverlays: () => void;
};

type OnboardingStore = OnboardingStoreState & OnboardingStoreActions;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_STATE: OnboardingStoreState = {
  isActive: false,
  source: null,
  hasCompletedOnboarding: false,
  hasHydratedCompletion: false,
  mockVerses: [],
  isProgressDrawerOpen: false,
  progressTargetVerseId: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  ...DEFAULT_STATE,

  // -- Lifecycle --

  startOnboarding: (source) => {
    const mockVerses = createOnboardingMockVerses();
    set({
      isActive: true,
      source,
      mockVerses,
      isProgressDrawerOpen: false,
      progressTargetVerseId: null,
    });
  },

  completeOnboarding: (telegramId) => {
    writeOnboardingCompletion(telegramId);
    clearOnboardingReplayState();
    set({
      isActive: false,
      source: null,
      hasCompletedOnboarding: true,
      isProgressDrawerOpen: false,
      progressTargetVerseId: null,
    });
  },

  cancelOnboarding: () => {
    clearOnboardingReplayState();
    set({
      isActive: false,
      source: null,
      isProgressDrawerOpen: false,
      progressTargetVerseId: null,
    });
  },

  hydrateCompletion: (telegramId) => {
    const completed = readOnboardingCompletion(telegramId);
    set({
      hasCompletedOnboarding: completed,
      hasHydratedCompletion: true,
    });
  },

  // -- Mock verse mutations --

  applyVerseAction: (verseId, action) => {
    const { mockVerses, progressTargetVerseId } = get();
    const nextVerses = reduceOnboardingMockVerses(mockVerses, verseId, action);
    const updates: Partial<OnboardingStoreState> = { mockVerses: nextVerses };

    if (action === "delete" && progressTargetVerseId === verseId) {
      updates.isProgressDrawerOpen = false;
      updates.progressTargetVerseId = null;
    }

    set(updates);
  },

  // -- UI controls --

  openProgressDrawer: (verse) => {
    set({
      isProgressDrawerOpen: true,
      progressTargetVerseId: verse.externalVerseId,
    });
  },

  closeProgressDrawer: () => {
    set({
      isProgressDrawerOpen: false,
      progressTargetVerseId: null,
    });
  },

  closeAllOverlays: () => {
    set({
      isProgressDrawerOpen: false,
      progressTargetVerseId: null,
    });
  },
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function selectShouldUseMockData(state: OnboardingStore) {
  return (
    state.isActive ||
    (state.hasHydratedCompletion && !state.hasCompletedOnboarding)
  );
}

export { type OnboardingMockVerseSectionConfig };
