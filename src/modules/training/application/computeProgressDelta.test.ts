import assert from "node:assert/strict";
import test from "node:test";
import {
  computeProgressDelta,
  computeReviewResult,
} from "./computeProgressDelta";

const NOW = new Date("2026-03-13T10:00:00.000Z");

test("review success resets lapse streak and advances repetitions", () => {
  const result = computeReviewResult({
    rating: 2,
    currentRepetitions: 2,
    currentReviewLapseStreak: 1,
    now: NOW,
  });

  assert.equal(result.repetitions, 3);
  assert.equal(result.reviewLapseStreak, 0);
  assert.equal(result.reviewWasSuccessful, true);
  assert.equal(result.nextReviewAt.toISOString(), "2026-03-27T10:00:00.000Z");
});

test("hinted review always moves repetition to the next day without penalty", () => {
  const result = computeReviewResult({
    rating: 1,
    currentRepetitions: 3,
    currentReviewLapseStreak: 0,
    now: NOW,
  });

  assert.equal(result.repetitions, 3);
  assert.equal(result.reviewLapseStreak, 0);
  assert.equal(result.reviewWasSuccessful, false);
  assert.equal(result.nextReviewAt.toISOString(), "2026-03-14T10:00:00.000Z");
});

test("hinted review ignores stale lapse streak and still keeps repetitions", () => {
  const result = computeReviewResult({
    rating: 1,
    currentRepetitions: 3,
    currentReviewLapseStreak: 1,
    now: NOW,
  });

  assert.equal(result.repetitions, 3);
  assert.equal(result.reviewLapseStreak, 0);
  assert.equal(result.reviewWasSuccessful, false);
  assert.equal(result.nextReviewAt.toISOString(), "2026-03-14T10:00:00.000Z");
});

test("failed review (early stage) immediately applies the stronger repetition penalty", () => {
  const result = computeReviewResult({
    rating: 0,
    currentRepetitions: 3,
    currentReviewLapseStreak: 0,
    now: NOW,
  });

  assert.equal(result.repetitions, 1);
  assert.equal(result.reviewLapseStreak, 0);
  assert.equal(result.reviewWasSuccessful, false);
  assert.equal(result.nextReviewAt.toISOString(), "2026-03-13T16:00:00.000Z");
});

test("late-stage review (reps 4+) forgot: no repetition penalty, 6h retry", () => {
  const result = computeReviewResult({
    rating: 0,
    currentRepetitions: 5,
    currentReviewLapseStreak: 0,
    now: NOW,
  });

  assert.equal(result.repetitions, 5, "repetitions should stay unchanged");
  assert.equal(result.reviewLapseStreak, 0);
  assert.equal(result.reviewWasSuccessful, false);
  assert.equal(result.nextReviewAt.toISOString(), "2026-03-13T16:00:00.000Z");
});

test("late-stage review (reps 4+) with hint still uses next-day retry", () => {
  const result = computeReviewResult({
    rating: 1,
    currentRepetitions: 4,
    currentReviewLapseStreak: 1,
    now: NOW,
  });

  assert.equal(result.repetitions, 4, "repetitions should stay unchanged");
  assert.equal(result.reviewLapseStreak, 0);
  assert.equal(result.reviewWasSuccessful, false);
  assert.equal(result.nextReviewAt.toISOString(), "2026-03-14T10:00:00.000Z");
});

test("late-stage review (reps 4+) success still advances", () => {
  const result = computeReviewResult({
    rating: 2,
    currentRepetitions: 5,
    currentReviewLapseStreak: 0,
    now: NOW,
  });

  assert.equal(result.repetitions, 6, "should advance to next repetition");
  assert.equal(result.reviewLapseStreak, 0);
  assert.equal(result.reviewWasSuccessful, true);
});

test("learning progress clears any stale review lapse streak", () => {
  const result = computeProgressDelta({
    phase: "learning",
    rating: 2,
    rawMasteryLevel: 3,
    repetitions: 0,
    reviewLapseStreak: 2,
    now: NOW,
    trainingModeId: null,
    isLearningVerse: true,
  });

  assert.equal(result.reviewLapseStreak, 0);
  assert.equal(result.canUpdateRepetitions, false);
});
