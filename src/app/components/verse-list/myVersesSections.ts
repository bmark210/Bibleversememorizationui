import type { Verse } from "@/app/domain/verse";
import type { MyVersesSectionKey } from "./constants";
import { VerseStatus } from "@/shared/domain/verseStatus";
import {
  getVerseDisplayStatus,
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

    if (getVerseDisplayStatus(verse) === VerseStatus.MY) {
      groups.my.push(verse);
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
