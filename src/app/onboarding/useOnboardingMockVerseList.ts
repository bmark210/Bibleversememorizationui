"use client";

import React from "react";
import type { Tag } from "@/api/models/Tag";
import type { Verse } from "@/app/App";
import {
  FILTER_VISUAL_THEME,
  type VerseListSortBy,
  type VerseListStatusFilter,
} from "@/app/components/verse-list/constants";
import {
  ONBOARDING_PRIMARY_VERSE_ID,
  createOnboardingMockVerses,
  reduceOnboardingMockVerses,
  type OnboardingMockVerseAction,
} from "./onboardingMockVerseFlow";

type OnboardingMockVerseSectionConfig = {
  headingId: string;
  title: string;
  subtitle: string;
  dotClassName: string;
  borderClassName: string;
  tintClassName: string;
};

type UseOnboardingMockVerseListOptions = {
  enabled: boolean;
  statusFilter: VerseListStatusFilter;
  selectedBookId: number | null;
  sortBy: VerseListSortBy;
  searchQuery: string;
  selectedTagSlugs: Set<string>;
};

function getMockVerseBookId(reference: string) {
  if (reference.startsWith("От Иоанна")) return 43;
  if (reference.startsWith("Римлянам")) return 45;
  if (reference.startsWith("Евреям")) return 58;
  if (reference.startsWith("Псалом")) return 19;
  return null;
}

function getMockVerseFilterLabel(statusFilter: VerseListStatusFilter) {
  if (statusFilter === "catalog") return "Каталог";
  if (statusFilter === "friends") return "Друзья";
  if (statusFilter === "my") return "Мои стихи";
  if (statusFilter === "learning") return "Изучаю";
  if (statusFilter === "review") return "Повторяю";
  if (statusFilter === "mastered") return "Выучены";
  return "На паузе";
}

function getMockVerseSectionConfig(
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
    if (priorityComparison !== 0) {
      return priorityComparison;
    }

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

export function useOnboardingMockVerseList({
  enabled,
  statusFilter,
  selectedBookId,
  sortBy,
  searchQuery,
  selectedTagSlugs,
}: UseOnboardingMockVerseListOptions) {
  const [verses, setVerses] = React.useState<Array<Verse>>(() =>
    createOnboardingMockVerses(),
  );
  const [isProgressDrawerOpen, setIsProgressDrawerOpen] = React.useState(false);
  const [progressTargetVerseId, setProgressTargetVerseId] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!enabled) return;
    setVerses(createOnboardingMockVerses());
    setIsProgressDrawerOpen(false);
    setProgressTargetVerseId(null);
  }, [enabled]);

  const initialTags = React.useMemo(
    () =>
      verses.flatMap((verse) => verse.tags ?? []).filter((tag, index, tags) => {
        return tags.findIndex((candidate) => candidate.slug === tag.slug) === index;
      }) as Tag[],
    [verses],
  );

  const visibleVerses = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = verses.filter((verse) => {
      const verseBookId = getMockVerseBookId(verse.reference);
      const matchesBook =
        selectedBookId == null || verseBookId === selectedBookId;

      return (
        matchesMockStatusFilter(verse, statusFilter) &&
        matchesBook &&
        matchesMockSearch(verse, normalizedQuery) &&
        matchesMockTags(verse, selectedTagSlugs)
      );
    });

    return sortMockVerses(filtered, sortBy);
  }, [searchQuery, selectedBookId, selectedTagSlugs, sortBy, statusFilter, verses]);

  const progressTarget = React.useMemo(
    () =>
      progressTargetVerseId == null
        ? null
        : verses.find((verse) => verse.externalVerseId === progressTargetVerseId) ?? null,
    [progressTargetVerseId, verses],
  );

  const openProgressDrawer = React.useCallback((verse: Verse) => {
    setProgressTargetVerseId(verse.externalVerseId);
    setIsProgressDrawerOpen(true);
  }, []);

  const closeProgressDrawer = React.useCallback(() => {
    setIsProgressDrawerOpen(false);
    setProgressTargetVerseId(null);
  }, []);

  const handleProgressDrawerOpenChange = React.useCallback((open: boolean) => {
    setIsProgressDrawerOpen(open);
    if (!open) {
      setProgressTargetVerseId(null);
    }
  }, []);

  const applyVerseAction = React.useCallback(
    (verse: Verse, action: OnboardingMockVerseAction) => {
      setVerses((prev) =>
        reduceOnboardingMockVerses(prev, verse.externalVerseId, action),
      );

      if (action === "delete" && progressTargetVerseId === verse.externalVerseId) {
        setIsProgressDrawerOpen(false);
        setProgressTargetVerseId(null);
      }
    },
    [progressTargetVerseId],
  );

  return {
    verses,
    visibleVerses,
    totalCount: verses.length,
    initialTags,
    isProgressDrawerOpen,
    progressTarget,
    openProgressDrawer,
    closeProgressDrawer,
    handleProgressDrawerOpenChange,
    applyVerseAction,
    currentFilterLabel: getMockVerseFilterLabel(statusFilter),
    currentFilterTheme: FILTER_VISUAL_THEME[statusFilter],
    sectionConfig: getMockVerseSectionConfig(statusFilter),
  };
}
