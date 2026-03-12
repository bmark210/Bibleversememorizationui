import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTrainingPendingOutcome,
  formatTrainingOutcomeAvailability,
} from "./trainingPendingOutcome";

test("builds waiting outcome when learning verse moves to review", () => {
  const outcome = buildTrainingPendingOutcome({
    verseKey: "john-3-16",
    reference: "Ин. 3:16",
    previousStatus: "LEARNING",
    nextStatus: "REVIEW",
    nextReviewAt: new Date("2026-03-12T17:40:00.000Z"),
    wasReviewExercise: false,
    reviewWasSuccessful: false,
    nowMs: Date.parse("2026-03-12T17:00:00.000Z"),
  });

  assert.ok(outcome);
  assert.equal(outcome.kind, "review-waiting");
  assert.equal(outcome.previousStatus, "LEARNING");
});

test("builds waiting outcome for review verse with future retry window", () => {
  const outcome = buildTrainingPendingOutcome({
    verseKey: "rom-8-28",
    reference: "Рим. 8:28",
    previousStatus: "REVIEW",
    nextStatus: "REVIEW",
    nextReviewAt: new Date("2026-03-12T17:10:00.000Z"),
    wasReviewExercise: true,
    reviewWasSuccessful: false,
    nowMs: Date.parse("2026-03-12T17:00:00.000Z"),
  });

  assert.ok(outcome);
  assert.equal(outcome.kind, "review-waiting");
  assert.equal(outcome.reviewWasSuccessful, false);
});

test("builds mastered outcome when verse reaches mastered status", () => {
  const outcome = buildTrainingPendingOutcome({
    verseKey: "phil-4-13",
    reference: "Флп. 4:13",
    previousStatus: "REVIEW",
    nextStatus: "MASTERED",
    nextReviewAt: null,
    wasReviewExercise: true,
    reviewWasSuccessful: true,
    nowMs: Date.parse("2026-03-12T17:00:00.000Z"),
  });

  assert.ok(outcome);
  assert.equal(outcome.kind, "mastered");
  assert.equal(outcome.status, "MASTERED");
});

test("does not build pending outcome for ordinary learning progress", () => {
  const outcome = buildTrainingPendingOutcome({
    verseKey: "ps-22-1",
    reference: "Пс. 22:1",
    previousStatus: "LEARNING",
    nextStatus: "LEARNING",
    nextReviewAt: new Date("2026-03-12T17:05:00.000Z"),
    wasReviewExercise: false,
    reviewWasSuccessful: false,
    nowMs: Date.parse("2026-03-12T17:00:00.000Z"),
  });

  assert.equal(outcome, null);
});

test("formats exact review availability in Russian", () => {
  const label = formatTrainingOutcomeAvailability(
    new Date("2026-03-12T19:40:00.000Z"),
    { timeZone: "UTC" }
  );

  assert.equal(label, "12 мар в 19:40");
});

test("falls back when review availability is missing", () => {
  const label = formatTrainingOutcomeAvailability(null);

  assert.equal(label, "Следующее повторение откроется позже.");
});

