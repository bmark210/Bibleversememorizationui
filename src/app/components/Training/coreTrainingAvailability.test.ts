import assert from "node:assert/strict";
import test from "node:test";
import { getCoreTrainingCountsFromVerses } from "./coreTrainingAvailability";
import type { Verse } from "@/app/domain/verse";
import { normalizeVerseFlow } from "@/shared/domain/verseFlow";

function buildVerse(overrides: Partial<Verse>): Verse {
  return {
    externalVerseId: overrides.externalVerseId ?? "43-1-1",
    difficultyLevel: overrides.difficultyLevel ?? "MEDIUM",
    status: overrides.status ?? "MY",
    flow: overrides.flow ?? null,
    masteryLevel: overrides.masteryLevel ?? 0,
    repetitions: overrides.repetitions ?? 0,
    lastReviewedAt: overrides.lastReviewedAt ?? null,
    createdAt: overrides.createdAt ?? null,
    updatedAt: overrides.updatedAt ?? null,
    nextReviewAt: overrides.nextReviewAt ?? null,
    text: overrides.text ?? "Текст стиха",
    reference: overrides.reference ?? "Ин 1:1",
  };
}

test("training counts distinguish interactive anchor and flashcard availability", () => {
  const counts = getCoreTrainingCountsFromVerses([
    buildVerse({
      externalVerseId: "43-1-1",
      status: "LEARNING",
      flow: normalizeVerseFlow({ code: "LEARNING" }),
      masteryLevel: 2,
    }),
    buildVerse({
      externalVerseId: "43-1-2",
      status: "REVIEW",
      flow: normalizeVerseFlow({ code: "REVIEW_DUE" }),
      masteryLevel: 7,
      repetitions: 2,
    }),
    buildVerse({
      externalVerseId: "43-1-3",
      status: "REVIEW",
      flow: normalizeVerseFlow({
        code: "REVIEW_WAITING",
        availableAt: "2099-01-02T12:00:00.000Z",
      }),
      masteryLevel: 7,
      repetitions: 3,
      nextReviewAt: "2099-01-02T12:00:00.000Z",
    }),
    buildVerse({
      externalVerseId: "43-1-4",
      status: "MASTERED",
      flow: normalizeVerseFlow({ code: "MASTERED" }),
      masteryLevel: 7,
      repetitions: 7,
    }),
  ]);

  assert.equal(counts.learningCount, 1);
  assert.equal(counts.dueReviewCount, 1);
  assert.equal(counts.totalReviewCount, 2);
  assert.equal(counts.waitingReviewCount, 1);
  assert.equal(counts.masteredCount, 1);
  assert.equal(counts.anchorEligibleCount, 3);
  assert.equal(counts.flashcardCount, 4);
  assert.equal(counts.allCount, 4);
  assert.equal(
    counts.earliestWaitingReviewAt?.toISOString(),
    "2099-01-02T12:00:00.000Z",
  );
});
