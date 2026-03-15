import assert from "node:assert/strict";
import test from "node:test";
import { TrainingModeId } from "@/shared/training/modeEngine";
import { createExerciseProgressSnapshot } from "./exerciseProgress";
import {
  createTrainingAttempt,
  requestTrainingAttemptHint,
  updateTrainingAttemptProgress,
} from "./hintEngine";

test("learning context hint caps rating at 2", () => {
  const attempt = createTrainingAttempt({
    key: "verse-1:2",
    modeId: TrainingModeId.ClickWordsHinted,
    phase: "learning",
    difficultyLevel: "MEDIUM",
    verseText: "Ибо так возлюбил Бог мир",
  });

  const result = requestTrainingAttemptHint({
    attempt,
    type: "context",
    contextPromptText: "Соседний стих",
    contextPromptReference: "Ин. 3:15",
    remainingBudget: 5,
  });

  assert.equal(result.kind, "applied");
  if (result.kind !== "applied") return;

  assert.equal(result.tokensToConsume, 0);
  assert.equal(result.attempt.ratingPolicy.maxRating, 2);
  assert.deepEqual(result.attempt.ratingPolicy.allowedRatings, [0, 1, 2]);
  assert.equal(result.content.text, "Ин. 3:15\nСоседний стих");
});

test("review nextWord hint uses expectedWordIndex and caps rating at 1", () => {
  const baseAttempt = createTrainingAttempt({
    key: "verse-1:7",
    modeId: TrainingModeId.FullRecall,
    phase: "review",
    difficultyLevel: "HARD",
    verseText: "Господь пастырь мой я ни в чем не буду нуждаться",
  });
  const attempt = updateTrainingAttemptProgress(
    baseAttempt,
    createExerciseProgressSnapshot({
      kind: "full-recall",
      expectedWordIndex: 3,
      completedUnits: 3,
      totalUnits: 10,
      isCompleted: false,
    })
  );

  const result = requestTrainingAttemptHint({
    attempt,
    type: "nextWord",
    remainingBudget: 5,
  });

  assert.equal(result.kind, "applied");
  if (result.kind !== "applied") return;

  assert.equal(result.tokensToConsume, 1);
  assert.equal(result.content.text, "я");
  assert.equal(result.attempt.nextWordCount, 1);
  assert.equal(result.attempt.ratingPolicy.maxRating, 1);
  assert.deepEqual(result.attempt.ratingPolicy.allowedRatings, [0, 1]);
});

test("completed attempt rejects further hints", () => {
  const baseAttempt = createTrainingAttempt({
    key: "verse-1:6",
    modeId: TrainingModeId.FirstLettersTyping,
    phase: "learning",
    difficultyLevel: "EASY",
    verseText: "Благодать вам и мир",
  });
  const completedAttempt = updateTrainingAttemptProgress(
    baseAttempt,
    createExerciseProgressSnapshot({
      kind: "first-letters-typing",
      expectedWordIndex: null,
      completedUnits: 4,
      totalUnits: 4,
      isCompleted: true,
    })
  );

  const result = requestTrainingAttemptHint({
    attempt: completedAttempt,
    type: "firstWords",
    remainingBudget: 5,
  });

  assert.deepEqual(result, {
    kind: "rejected",
    reason: "attempt-locked",
  });
});

test("surrender locks attempt and forces only forgot rating", () => {
  const attempt = createTrainingAttempt({
    key: "verse-1:3",
    modeId: TrainingModeId.ClickWordsNoHints,
    phase: "learning",
    difficultyLevel: "EXPERT",
    verseText: "Все Писание богодухновенно и полезно",
  });

  const result = requestTrainingAttemptHint({
    attempt,
    type: "surrender",
    remainingBudget: 5,
  });

  assert.equal(result.kind, "applied");
  if (result.kind !== "applied") return;

  assert.equal(result.attempt.status, "surrendered");
  assert.equal(result.attempt.ratingPolicy.maxRating, 0);
  assert.deepEqual(result.attempt.ratingPolicy.allowedRatings, [0]);
  assert.equal(result.content.text, "Все Писание богодухновенно и полезно");
});
