import assert from "node:assert/strict";
import test from "node:test";
import { TrainingModeId } from "@/shared/training/modeEngine";
import { createExerciseProgressSnapshot } from "./exerciseProgress";
import {
  createTrainingAttempt,
  getNextAssistPreview,
  requestTrainingAssist,
  requestTrainingShowVerse,
  updateTrainingAttemptProgress,
} from "./hintEngine";

test("next_word assist in learning caps rating at 0 (сложно only)", () => {
  const baseAttempt = createTrainingAttempt({
    key: "verse-1:7",
    modeId: TrainingModeId.FullRecall,
    phase: "learning",
    difficultyLevel: "HARD",
    verseText: "Господь пастырь мой я ни в чем не буду нуждаться",
  });
  const attempt = updateTrainingAttemptProgress(
    baseAttempt,
    createExerciseProgressSnapshot({
      kind: "full-recall",
      unitType: "typed-word",
      expectedIndex: 3,
      completedCount: 3,
      totalCount: 10,
      isCompleted: false,
    })
  );

  const result = requestTrainingAssist({ attempt });

  assert.equal(result.kind, "applied");
  if (result.kind !== "applied") return;

  assert.equal(result.content.kind, "content_reveal");
  assert.equal(result.content.variant, "next_word");
  assert.equal(result.content.text, "я");
  assert.equal(result.attempt.ratingPolicy.maxRating, 0);
  assert.deepEqual(result.attempt.ratingPolicy.allowedRatings, [0]);
});

test("HARD difficulty allows 3 next_word uses", () => {
  const baseAttempt = createTrainingAttempt({
    key: "verse-1:9",
    modeId: TrainingModeId.FullRecall,
    phase: "learning",
    difficultyLevel: "HARD",
    verseText: "Господь пастырь мой я ни в чем не буду нуждаться",
  });

  let attempt = updateTrainingAttemptProgress(
    baseAttempt,
    createExerciseProgressSnapshot({
      kind: "full-recall",
      unitType: "typed-word",
      expectedIndex: 0,
      completedCount: 0,
      totalCount: 10,
      isCompleted: false,
    })
  );

  for (let i = 0; i < 3; i++) {
    const result = requestTrainingAssist({ attempt });
    assert.equal(result.kind, "applied", `next_word #${i + 1} should apply`);
    if (result.kind !== "applied") return;
    assert.equal(result.content.variant, "next_word");
    attempt = result.attempt;
  }

  // 4th request is unavailable; full verse reveal is a separate action now.
  const final = requestTrainingAssist({ attempt });
  assert.deepEqual(final, {
    kind: "rejected",
    reason: "hint-unavailable",
  });
});

test("EASY difficulty allows only 1 next_word use", () => {
  const baseAttempt = createTrainingAttempt({
    key: "verse-1:10",
    modeId: TrainingModeId.FullRecall,
    phase: "learning",
    difficultyLevel: "EASY",
    verseText: "Благодать вам и мир",
  });

  let attempt = updateTrainingAttemptProgress(
    baseAttempt,
    createExerciseProgressSnapshot({
      kind: "full-recall",
      unitType: "typed-word",
      expectedIndex: 0,
      completedCount: 0,
      totalCount: 4,
      isCompleted: false,
    })
  );

  const r1 = requestTrainingAssist({ attempt });
  assert.equal(r1.kind, "applied");
  if (r1.kind !== "applied") return;
  assert.equal(r1.content.variant, "next_word");
  attempt = r1.attempt;

  // 2nd request is unavailable; full verse reveal is a separate action now.
  const r2 = requestTrainingAssist({ attempt });
  assert.deepEqual(r2, {
    kind: "rejected",
    reason: "hint-unavailable",
  });
});

test("completed attempt rejects further adaptive assists", () => {
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
      unitType: "letter",
      expectedIndex: null,
      completedCount: 4,
      totalCount: 4,
      isCompleted: true,
    })
  );

  const result = requestTrainingAssist({ attempt: completedAttempt });

  assert.deepEqual(result, {
    kind: "rejected",
    reason: "attempt-locked",
  });
  assert.equal(completedAttempt.flowState, "awaiting_rating");
});

test("completed attempt rejects show verse because it is already awaiting rating", () => {
  const baseAttempt = createTrainingAttempt({
    key: "verse-1:8",
    modeId: TrainingModeId.FullRecall,
    phase: "learning",
    difficultyLevel: "MEDIUM",
    verseText: "Слово Твое светильник ноге моей",
  });
  const completedAttempt = updateTrainingAttemptProgress(
    baseAttempt,
    createExerciseProgressSnapshot({
      kind: "full-recall",
      unitType: "typed-word",
      expectedIndex: null,
      completedCount: 6,
      totalCount: 6,
      isCompleted: true,
    })
  );

  const result = requestTrainingShowVerse({
    attempt: completedAttempt,
  });

  assert.deepEqual(result, {
    kind: "rejected",
    reason: "attempt-locked",
  });
});

test("show verse keeps attempt active and caps rating at 0 (any assist = сложно only)", () => {
  const attempt = createTrainingAttempt({
    key: "verse-1:3",
    modeId: TrainingModeId.ClickWordsNoHints,
    phase: "learning",
    difficultyLevel: "EXPERT",
    verseText: "Все Писание богодухновенно и полезно",
  });

  const result = requestTrainingShowVerse({
    attempt,
  });

  assert.equal(result.kind, "applied");
  if (result.kind !== "applied") return;

  assert.equal(result.attempt.status, "active");
  assert.equal(result.attempt.flowState, "active");
  assert.equal(result.attempt.ratingPolicy.maxRating, 0);
  assert.deepEqual(result.attempt.ratingPolicy.allowedRatings, [0]);
  assert.equal(result.content.variant, "full_text_preview");
  assert.equal(result.content.durationSeconds, 12);
  assert.equal(result.content.text, "Все Писание богодухновенно и полезно");
});

test("show verse can be used only once per attempt", () => {
  const attempt = createTrainingAttempt({
    key: "verse-1:12",
    modeId: TrainingModeId.FullRecall,
    phase: "learning",
    difficultyLevel: "MEDIUM",
    verseText: "Слово Твое светильник ноге моей",
  });

  const first = requestTrainingShowVerse({ attempt });
  assert.equal(first.kind, "applied");
  if (first.kind !== "applied") return;

  const second = requestTrainingShowVerse({ attempt: first.attempt });
  assert.deepEqual(second, {
    kind: "rejected",
    reason: "hint-unavailable",
  });
});

test("show verse does not consume next_word assist slots", () => {
  const baseAttempt = createTrainingAttempt({
    key: "verse-1:13",
    modeId: TrainingModeId.FullRecall,
    phase: "learning",
    difficultyLevel: "HARD",
    verseText: "Господь пастырь мой я ни в чем не буду нуждаться",
  });
  const attempt = updateTrainingAttemptProgress(
    baseAttempt,
    createExerciseProgressSnapshot({
      kind: "full-recall",
      unitType: "typed-word",
      expectedIndex: 3,
      completedCount: 3,
      totalCount: 10,
      isCompleted: false,
    })
  );

  const showVerse = requestTrainingShowVerse({ attempt });
  assert.equal(showVerse.kind, "applied");
  if (showVerse.kind !== "applied") return;

  const preview = getNextAssistPreview({ attempt: showVerse.attempt });
  assert.deepEqual(preview, {
    label: "След. слово",
    description: "Подсказка следующего ожидаемого слова",
    nextWordUsed: 0,
    nextWordMax: 3,
  });

  const nextWord = requestTrainingAssist({ attempt: showVerse.attempt });
  assert.equal(nextWord.kind, "applied");
  if (nextWord.kind !== "applied") return;
  assert.equal(nextWord.content.variant, "next_word");
});

test("review next_word assist caps rating at 0 (сложно only)", () => {
  const baseAttempt = createTrainingAttempt({
    key: "verse-1:11",
    modeId: TrainingModeId.FullRecall,
    phase: "review",
    difficultyLevel: "MEDIUM",
    verseText: "Господь пастырь мой я ни в чем не буду нуждаться",
  });
  const attempt = updateTrainingAttemptProgress(
    baseAttempt,
    createExerciseProgressSnapshot({
      kind: "full-recall",
      unitType: "typed-word",
      expectedIndex: 3,
      completedCount: 3,
      totalCount: 10,
      isCompleted: false,
    })
  );

  const result = requestTrainingAssist({ attempt });

  assert.equal(result.kind, "applied");
  if (result.kind !== "applied") return;

  assert.equal(result.content.kind, "content_reveal");
  assert.equal(result.attempt.ratingPolicy.maxRating, 0);
  assert.deepEqual(result.attempt.ratingPolicy.allowedRatings, [0]);
});
