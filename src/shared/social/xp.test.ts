import assert from "node:assert/strict";
import test from "node:test";
import { VerseStatus } from "@/generated/prisma";
import {
  computeSocialUserXpSummary,
  computeSocialVerseXp,
} from "./xp";

test("social verse XP keeps mastered above review and review above learning", () => {
  const learning = computeSocialVerseXp({
    status: VerseStatus.LEARNING,
    masteryLevel: 2,
    repetitions: 1,
    referenceScore: 100,
    incipitScore: 100,
    contextScore: 100,
  });
  const review = computeSocialVerseXp({
    status: VerseStatus.LEARNING,
    masteryLevel: 7,
    repetitions: 1,
    referenceScore: 100,
    incipitScore: 100,
    contextScore: 100,
  });
  const mastered = computeSocialVerseXp({
    status: VerseStatus.LEARNING,
    masteryLevel: 7,
    repetitions: 7,
    referenceScore: 100,
    incipitScore: 100,
    contextScore: 100,
  });

  assert.equal(learning.countsForXp, true);
  assert.equal(review.countsForXp, true);
  assert.equal(mastered.countsForXp, true);
  assert.equal(mastered.totalXp > review.totalXp, true);
  assert.equal(review.totalXp > learning.totalXp, true);
});

test("learning verse with zero progress does not count for XP", () => {
  const breakdown = computeSocialVerseXp({
    status: VerseStatus.LEARNING,
    masteryLevel: 0,
    repetitions: 0,
    referenceScore: 100,
    incipitScore: 100,
    contextScore: 100,
  });

  assert.equal(breakdown.countsForXp, false);
  assert.equal(breakdown.totalXp, 0);
});

test("anchor bonus stays secondary to verse progress and MY or STOPPED do not affect XP", () => {
  const mastered = computeSocialVerseXp({
    status: VerseStatus.LEARNING,
    masteryLevel: 7,
    repetitions: 7,
    referenceScore: 0,
    incipitScore: 0,
    contextScore: 0,
  });
  const weakLearning = computeSocialVerseXp({
    status: VerseStatus.LEARNING,
    masteryLevel: 1,
    repetitions: 0,
    referenceScore: 100,
    incipitScore: 100,
    contextScore: 100,
  });
  const summary = computeSocialUserXpSummary({
    storedStreak: 4,
    now: Date.parse("2026-03-11T12:00:00.000Z"),
    verses: [
      {
        status: VerseStatus.MY,
        masteryLevel: 10,
        repetitions: 10,
        lastReviewedAt: null,
      },
      {
        status: VerseStatus.STOPPED,
        masteryLevel: 7,
        repetitions: 7,
        lastReviewedAt: null,
      },
      {
        status: VerseStatus.LEARNING,
        masteryLevel: 7,
        repetitions: 7,
        referenceScore: 0,
        incipitScore: 0,
        contextScore: 0,
        lastReviewedAt: new Date("2026-03-10T12:00:00.000Z"),
      },
    ],
  });

  assert.equal(mastered.totalXp > weakLearning.totalXp, true);
  assert.equal(summary.xp > 0, true);
  assert.equal(summary.masteredVerses, 1);
  assert.equal(summary.weeklyRepetitions, 1);
});
