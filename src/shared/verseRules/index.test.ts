import assert from "node:assert/strict";
import test from "node:test";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { normalizeVerseFlow } from "@/shared/domain/verseFlow";
import {
  getVerseDisplayStatus,
  getVerseProgressPercent,
  getVerseResolvedProgress,
  getVerseTrainingLaunchMode,
  isVerseDueForTraining,
  matchesVerseListFilter,
} from "@/shared/verseRules";

test("flow is the primary source for display status", () => {
  assert.equal(
    getVerseDisplayStatus({
      status: VerseStatus.LEARNING,
      flow: normalizeVerseFlow({ code: "QUEUE" }),
      masteryLevel: 0,
      repetitions: 0,
      nextReviewAt: null,
      nextReview: null,
    }),
    VerseStatus.QUEUE,
  );

  assert.equal(
    getVerseDisplayStatus({
      status: VerseStatus.LEARNING,
      flow: normalizeVerseFlow({ code: "REVIEW_WAITING" }),
      masteryLevel: 7,
      repetitions: 2,
      nextReviewAt: "2099-01-01T00:00:00.000Z",
      nextReview: "2099-01-01T00:00:00.000Z",
    }),
    "REVIEW",
  );
});

test("rules gracefully fall back when flow is absent", () => {
  const reviewVerse = {
    status: "REVIEW" as const,
    flow: null,
    masteryLevel: 7,
    repetitions: 2,
    nextReviewAt: "2000-01-01T00:00:00.000Z",
    nextReview: "2000-01-01T00:00:00.000Z",
  };

  assert.equal(isVerseDueForTraining(reviewVerse, new Date("2026-03-19T10:00:00.000Z")), true);
  assert.equal(matchesVerseListFilter(reviewVerse, "review"), true);
});

test("resolved progress prefers backend flow values", () => {
  const verse = {
    status: VerseStatus.LEARNING,
    flow: normalizeVerseFlow({
      code: "REVIEW_WAITING",
      remainingLearnings: 0,
      remainingReviews: 3,
      progressPercent: 79,
    }),
    masteryLevel: 7,
    repetitions: 4,
    nextReviewAt: "2099-01-01T00:00:00.000Z",
    nextReview: "2099-01-01T00:00:00.000Z",
  };

  assert.equal(getVerseProgressPercent(verse), 79);
  assert.deepEqual(getVerseResolvedProgress(verse), {
    totalCompleted: 11,
    totalRemaining: 3,
    remainingLearnings: 0,
    remainingRepeats: 3,
    progressPercent: 79,
  });
});

test("training launch mode follows resolved flow availability", () => {
  assert.equal(
    getVerseTrainingLaunchMode({
      status: VerseStatus.LEARNING,
      flow: normalizeVerseFlow({ code: "LEARNING" }),
      masteryLevel: 2,
      repetitions: 0,
      nextReviewAt: null,
      nextReview: null,
    }),
    "learning",
  );

  assert.equal(
    getVerseTrainingLaunchMode({
      status: VerseStatus.LEARNING,
      flow: normalizeVerseFlow({ code: "REVIEW_DUE" }),
      masteryLevel: 7,
      repetitions: 1,
      nextReviewAt: null,
      nextReview: null,
    }),
    "review",
  );

  assert.equal(
    getVerseTrainingLaunchMode({
      status: VerseStatus.LEARNING,
      flow: normalizeVerseFlow({
        code: "REVIEW_WAITING",
        availableAt: "2099-01-01T00:00:00.000Z",
      }),
      masteryLevel: 7,
      repetitions: 1,
      nextReviewAt: "2099-01-01T00:00:00.000Z",
      nextReview: "2099-01-01T00:00:00.000Z",
    }),
    null,
  );

  assert.equal(
    getVerseTrainingLaunchMode({
      status: VerseStatus.LEARNING,
      flow: normalizeVerseFlow({ code: "MASTERED" }),
      masteryLevel: 7,
      repetitions: 7,
      nextReviewAt: null,
      nextReview: null,
    }),
    "anchor",
  );
});
