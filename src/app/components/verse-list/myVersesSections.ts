import type { Verse } from "@/app/domain/verse";
import type { MyVersesSectionKey } from "./constants";
import {
  isVerseLearning,
  isVerseMastered,
  isVersePaused,
  isVerseQueued,
  isVerseReview,
} from "@/shared/verseRules";

export type MyVersesSectionData = {
  key: MyVersesSectionKey;
  verses: Verse[];
  alwaysShow?: boolean;
};

export type MyVersesNavItem = {
  key: MyVersesSectionKey;
  count: number;
  sectionIndex: number;
  rowIndex: number;
};

export type MyVersesVirtualRow =
  | {
      kind: "section";
      rowKey: string;
      sectionKey: MyVersesSectionKey;
      sectionIndex: number;
      count: number;
    }
  | {
      kind: "verse";
      rowKey: string;
      sectionKey: MyVersesSectionKey;
      sectionIndex: number;
      verse: Verse;
    }
  | {
      kind: "learning-placeholders";
      rowKey: string;
      sectionKey: "learning";
      sectionIndex: number;
      filledCount: number;
      emptyCount: number;
      capacity: number;
    };

export type MyVersesVirtualModel = {
  sections: MyVersesSectionData[];
  navItems: MyVersesNavItem[];
  rows: MyVersesVirtualRow[];
};

type MyVersesSectionBuckets = Record<MyVersesSectionKey, Verse[]>;

function createEmptyBuckets(): MyVersesSectionBuckets {
  return {
    learning: [],
    queue: [],
    review: [],
    mastered: [],
    stopped: [],
    my: [],
  };
}

export function groupMyVersesBySection(
  verses: Verse[],
): MyVersesSectionBuckets {
  const groups = createEmptyBuckets();

  for (const verse of verses) {
    if (isVerseLearning(verse)) {
      groups.learning.push(verse);
      continue;
    }

    if (isVerseQueued(verse)) {
      groups.queue.push(verse);
      continue;
    }

    if (isVerseReview(verse)) {
      groups.review.push(verse);
      continue;
    }

    if (isVersePaused(verse)) {
      groups.stopped.push(verse);
      continue;
    }

    if (isVerseMastered(verse)) {
      groups.mastered.push(verse);
      continue;
    }
  }

  return groups;
}

export function buildMyVersesSections(
  sectionItems: Verse[],
  queueVerses: Verse[],
): MyVersesSectionData[] {
  const groups = groupMyVersesBySection(
    sectionItems.filter((verse) => !isVerseQueued(verse)),
  );

  return [
    { key: "learning", verses: groups.learning, alwaysShow: true },
    { key: "queue", verses: queueVerses },
    { key: "review", verses: groups.review },
    { key: "mastered", verses: groups.mastered },
    { key: "stopped", verses: groups.stopped },
    { key: "my", verses: groups.my },
  ];
}

export function getVisibleMyVersesSections(
  sections: MyVersesSectionData[],
): MyVersesSectionData[] {
  return sections.filter(
    (section) => section.alwaysShow || section.verses.length > 0,
  );
}

export function buildMyVersesVirtualModel(
  sections: MyVersesSectionData[],
  learningCapacity: number,
): MyVersesVirtualModel {
  const visibleSections = getVisibleMyVersesSections(sections);
  const rows: MyVersesVirtualRow[] = [];
  const navItems: MyVersesNavItem[] = [];

  visibleSections.forEach((section, sectionIndex) => {
    navItems.push({
      key: section.key,
      count: section.verses.length,
      sectionIndex,
      rowIndex: rows.length,
    });

    rows.push({
      kind: "section",
      rowKey: `section-${section.key}`,
      sectionKey: section.key,
      sectionIndex,
      count: section.verses.length,
    });

    for (const verse of section.verses) {
      rows.push({
        kind: "verse",
        rowKey: `verse-${verse.externalVerseId}`,
        sectionKey: section.key,
        sectionIndex,
        verse,
      });
    }

    if (section.key !== "learning") {
      return;
    }

    const emptyCount = Math.max(0, learningCapacity - section.verses.length);
    if (emptyCount === 0) {
      return;
    }

    rows.push({
      kind: "learning-placeholders",
      rowKey: "learning-placeholders",
      sectionKey: "learning",
      sectionIndex,
      filledCount: section.verses.length,
      emptyCount,
      capacity: learningCapacity,
    });
  });

  return {
    sections: visibleSections,
    navItems,
    rows,
  };
}
