import type { Verse } from "@/app/App";
import { VerseStatus } from "@/shared/domain/verseStatus";

export const ONBOARDING_PRIMARY_VERSE_ID = "onboarding-primary-verse";

export type OnboardingMockVerseAction =
  | "add-to-learning"
  | "add-to-collection"
  | "start-learning"
  | "pause"
  | "resume"
  | "delete";

function buildTimestamp() {
  return new Date().toISOString();
}

function buildFutureTimestamp(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

export function createOnboardingMockVerses(): Verse[] {
  const createdAt = buildTimestamp();

  return [
    {
      id: ONBOARDING_PRIMARY_VERSE_ID,
      externalVerseId: ONBOARDING_PRIMARY_VERSE_ID,
      difficultyLevel: "HARD",
      status: "CATALOG",
      masteryLevel: 0,
      repetitions: 0,
      reviewLapseStreak: 0,
      referenceScore: 0,
      incipitScore: 0,
      contextScore: 0,
      lastTrainingModeId: null,
      lastReviewedAt: null,
      createdAt,
      updatedAt: createdAt,
      translation: "RST",
      nextReview: null,
      nextReviewAt: null,
      tags: [
        { id: "onboarding-tag-truth", slug: "truth", title: "Истина" },
        { id: "onboarding-tag-way", slug: "way", title: "Путь" },
      ],
      popularityScope: "self",
      popularityValue: 0,
      popularityPreviewUsers: [],
      reference: "От Иоанна 14:6",
      text: "Иисус сказал ему: Я есмь путь, и истина, и жизнь; никто не приходит к Отцу, как только через Меня.",
    },
    {
      id: "onboarding-review-verse",
      externalVerseId: "onboarding-review-verse",
      difficultyLevel: "MEDIUM",
      status: "REVIEW",
      masteryLevel: 7,
      repetitions: 3,
      reviewLapseStreak: 0,
      referenceScore: 0,
      incipitScore: 0,
      contextScore: 0,
      lastTrainingModeId: null,
      lastReviewedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
      translation: "RST",
      nextReview: buildFutureTimestamp(6),
      nextReviewAt: buildFutureTimestamp(6),
      tags: [
        { id: "onboarding-tag-hope", slug: "hope", title: "Надежда" },
      ],
      popularityScope: "self",
      popularityValue: 0,
      popularityPreviewUsers: [],
      reference: "Римлянам 8:28",
      text: "Притом знаем, что любящим Бога, призванным по Его изволению, все содействует ко благу.",
    },
  ];
}

function patchVerseForAction(
  verse: Verse,
  action: OnboardingMockVerseAction,
): Verse {
  const updatedAt = buildTimestamp();

  if (action === "add-to-learning") {
    return {
      ...verse,
      status: VerseStatus.LEARNING,
      masteryLevel: 1,
      repetitions: 0,
      reviewLapseStreak: 0,
      nextReview: null,
      nextReviewAt: null,
      lastReviewedAt: null,
      updatedAt,
    };
  }

  if (action === "add-to-collection") {
    return {
      ...verse,
      status: VerseStatus.MY,
      masteryLevel: 0,
      repetitions: 0,
      reviewLapseStreak: 0,
      nextReview: null,
      nextReviewAt: null,
      lastReviewedAt: null,
      updatedAt,
    };
  }

  if (action === "start-learning") {
    return {
      ...verse,
      status: VerseStatus.LEARNING,
      masteryLevel: Math.max(1, Number(verse.masteryLevel ?? 0)),
      repetitions: 0,
      reviewLapseStreak: 0,
      nextReview: null,
      nextReviewAt: null,
      lastReviewedAt: null,
      updatedAt,
    };
  }

  if (action === "pause") {
    return {
      ...verse,
      status: VerseStatus.STOPPED,
      updatedAt,
    };
  }

  if (action === "resume") {
    return {
      ...verse,
      status: VerseStatus.LEARNING,
      masteryLevel: Math.max(1, Number(verse.masteryLevel ?? 0)),
      updatedAt,
    };
  }

  return {
    ...verse,
    status: "CATALOG",
    masteryLevel: 0,
    repetitions: 0,
    reviewLapseStreak: 0,
    nextReview: null,
    nextReviewAt: null,
    lastReviewedAt: null,
    updatedAt,
  };
}

export function reduceOnboardingMockVerses(
  verses: ReadonlyArray<Verse>,
  verseId: string,
  action: OnboardingMockVerseAction,
): Verse[] {
  return verses.map((verse) =>
    verse.externalVerseId === verseId ? patchVerseForAction(verse, action) : verse,
  );
}
