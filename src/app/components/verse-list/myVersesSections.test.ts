import assert from "node:assert/strict";
import test from "node:test";
import type { Verse } from "@/app/domain/verse";
import {
  getDisplayStatusFromFlow,
  type VerseFlow,
  VerseFlowCode,
} from "@/shared/domain/verseFlow";
import {
  buildMyVersesSections,
  getVisibleMyVersesSections,
} from "./myVersesSections";

function createFlow(code: VerseFlowCode): VerseFlow {
  switch (code) {
    case VerseFlowCode.LEARNING:
      return {
        code,
        group: "active",
        phase: "learning",
        availability: "READY",
        allowedActions: [],
        remainingLearnings: 3,
        remainingReviews: 0,
        progressPercent: 25,
      };
    case VerseFlowCode.QUEUE:
      return {
        code,
        group: "library",
        phase: "my",
        availability: "WAITING",
        allowedActions: [],
        remainingLearnings: 4,
        remainingReviews: 0,
        progressPercent: 0,
      };
    case VerseFlowCode.REVIEW_DUE:
      return {
        code,
        group: "active",
        phase: "review",
        availability: "READY",
        allowedActions: [],
        remainingLearnings: 0,
        remainingReviews: 2,
        progressPercent: 70,
      };
    case VerseFlowCode.MASTERED:
      return {
        code,
        group: "complete",
        phase: "mastered",
        availability: "NONE",
        allowedActions: [],
        remainingLearnings: 0,
        remainingReviews: 0,
        progressPercent: 100,
      };
    case VerseFlowCode.PAUSED_LEARNING:
      return {
        code,
        group: "paused",
        phase: "learning",
        availability: "PAUSED",
        allowedActions: [],
        remainingLearnings: 2,
        remainingReviews: 0,
        progressPercent: 35,
      };
    case VerseFlowCode.MY:
    default:
      return {
        code: VerseFlowCode.MY,
        group: "library",
        phase: "my",
        availability: "NONE",
        allowedActions: [],
        remainingLearnings: 4,
        remainingReviews: 0,
        progressPercent: 0,
      };
  }
}

function createVerse(code: VerseFlowCode, externalVerseId: string): Verse {
  const flow = createFlow(code);

  return {
    externalVerseId,
    difficultyLevel: "MEDIUM",
    status: getDisplayStatusFromFlow(flow) ?? "MY",
    flow,
    masteryLevel:
      code === VerseFlowCode.MASTERED ? 7 : code === VerseFlowCode.REVIEW_DUE ? 7 : 2,
    repetitions: code === VerseFlowCode.MASTERED ? 7 : 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    text: "Test verse text",
    reference: externalVerseId,
  };
}

test("buildMyVersesSections keeps canonical order and injects queue once", () => {
  const queueVerse = createVerse(VerseFlowCode.QUEUE, "queue-1");
  const sections = buildMyVersesSections(
    [
      createVerse(VerseFlowCode.LEARNING, "learning-1"),
      queueVerse,
      createVerse(VerseFlowCode.REVIEW_DUE, "review-1"),
      createVerse(VerseFlowCode.MASTERED, "mastered-1"),
      createVerse(VerseFlowCode.PAUSED_LEARNING, "stopped-1"),
      createVerse(VerseFlowCode.MY, "my-1"),
    ],
    [queueVerse],
  );

  assert.deepEqual(
    sections.map((section) => section.key),
    ["learning", "queue", "review", "mastered", "stopped", "my"],
  );
  assert.equal(sections.find((section) => section.key === "queue")?.verses.length, 1);
  assert.equal(
    sections.reduce((total, section) => total + section.verses.length, 0),
    6,
  );
});

test("getVisibleMyVersesSections keeps learning available and omits empty sections", () => {
  const visibleSections = getVisibleMyVersesSections(
    buildMyVersesSections([createVerse(VerseFlowCode.MY, "my-1")], []),
  );

  assert.deepEqual(
    visibleSections.map((section) => section.key),
    ["learning", "my"],
  );
});
