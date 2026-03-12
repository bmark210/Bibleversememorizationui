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

test("first hinted review keeps repetitions and accumulates one lapse strike", () => {
  const result = computeReviewResult({
    rating: 1,
    currentRepetitions: 3,
    currentReviewLapseStreak: 0,
    now: NOW,
  });

  assert.equal(result.repetitions, 3);
  assert.equal(result.reviewLapseStreak, 1);
  assert.equal(result.reviewWasSuccessful, false);
  assert.equal(result.nextReviewAt.toISOString(), "2026-03-14T10:00:00.000Z");
});

test("second consecutive hinted review applies repetition penalty and resets lapse streak", () => {
  const result = computeReviewResult({
    rating: 1,
    currentRepetitions: 3,
    currentReviewLapseStreak: 1,
    now: NOW,
  });

  assert.equal(result.repetitions, 2);
  assert.equal(result.reviewLapseStreak, 0);
  assert.equal(result.reviewWasSuccessful, false);
  assert.equal(result.nextReviewAt.toISOString(), "2026-03-14T10:00:00.000Z");
});

test("failed review immediately applies the stronger repetition penalty", () => {
  const result = computeReviewResult({
    rating: 0,
    currentRepetitions: 4,
    currentReviewLapseStreak: 0,
    now: NOW,
  });

  assert.equal(result.repetitions, 2);
  assert.equal(result.reviewLapseStreak, 0);
  assert.equal(result.reviewWasSuccessful, false);
  assert.equal(result.nextReviewAt.toISOString(), "2026-03-13T16:00:00.000Z");
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
