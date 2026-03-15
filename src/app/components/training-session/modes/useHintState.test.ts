import assert from "node:assert/strict";
import test from "node:test";
import { TrainingModeId } from "@/shared/training/modeEngine";
import { createExerciseProgressSnapshot } from "@/modules/training/hints/exerciseProgress";
import {
  createTrainingAttempt,
  requestTrainingAssist,
  requestTrainingShowVerse,
  updateTrainingAttemptProgress,
} from "@/modules/training/hints/hintEngine";
import { executeHintRequestWithBudget } from "./useHintState";

test("rejected hint request does not consume budget", () => {
  let consumeCalls = 0;
  const attempt = createTrainingAttempt({
    key: "verse-budget:1",
    modeId: TrainingModeId.FullRecall,
    phase: "learning",
    difficultyLevel: "MEDIUM",
    verseText: "Слово Твое светильник ноге моей",
  });

  const result = executeHintRequestWithBudget({
    readBudget: () => ({ remaining: 5, total: 5 }),
    consumeToken: () => {
      consumeCalls += 1;
      return true;
    },
    request: () => requestTrainingAssist({ attempt }),
  });

  assert.deepEqual(result.requestResult, {
    kind: "rejected",
    reason: "hint-unavailable",
  });
  assert.equal(result.consumedBudget, false);
  assert.equal(consumeCalls, 0);
});

test("successful next_word request consumes one budget token", () => {
  let consumeCalls = 0;
  const baseAttempt = createTrainingAttempt({
    key: "verse-budget:2",
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

  const result = executeHintRequestWithBudget({
    readBudget: () => ({ remaining: 5, total: 5 }),
    consumeToken: () => {
      consumeCalls += 1;
      return true;
    },
    request: () => requestTrainingAssist({ attempt }),
  });

  assert.equal(result.requestResult?.kind, "applied");
  assert.equal(result.consumedBudget, true);
  assert.equal(consumeCalls, 1);
});

test("successful show verse request consumes one budget token", () => {
  let consumeCalls = 0;
  const attempt = createTrainingAttempt({
    key: "verse-budget:3",
    modeId: TrainingModeId.FullRecall,
    phase: "learning",
    difficultyLevel: "EXPERT",
    verseText: "Все Писание богодухновенно и полезно",
  });

  const result = executeHintRequestWithBudget({
    readBudget: () => ({ remaining: 5, total: 5 }),
    consumeToken: () => {
      consumeCalls += 1;
      return true;
    },
    request: () => requestTrainingShowVerse({ attempt }),
  });

  assert.equal(result.requestResult?.kind, "applied");
  assert.equal(result.consumedBudget, true);
  assert.equal(consumeCalls, 1);
});
