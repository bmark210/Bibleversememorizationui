import assert from "node:assert/strict";
import test from "node:test";
import type { HintRatingPolicy } from "@/modules/training/hints/types";
import { TrainingModeId } from "@/shared/training/modeEngine";
import { resolveTrainingRatingButtonsConfig } from "./TrainingRatingButtons";

test("learning rating buttons still show forgot when policy allows only rating 0", () => {
  const ratingPolicy: HintRatingPolicy = {
    maxRating: 0,
    allowedRatings: [0],
    assisted: true,
  };

  const result = resolveTrainingRatingButtonsConfig({
    stage: "learning",
    ratingPolicy,
    allowEasySkip: true,
    excludeForget: false,
  });

  assert.equal(result.title, "Оценка запоминания");
  assert.deepEqual(
    result.buttons.map(({ rating, label }) => ({ rating, label })),
    [{ rating: 0, label: "Забыл" }]
  );
});

test("review rating buttons respect assisted cap without going empty", () => {
  const ratingPolicy: HintRatingPolicy = {
    maxRating: 1,
    allowedRatings: [0, 1],
    assisted: true,
  };

  const result = resolveTrainingRatingButtonsConfig({
    stage: "review",
    ratingPolicy,
  });

  assert.deepEqual(
    result.buttons.map(({ rating, label }) => ({ rating, label })),
    [{ rating: 1, label: "С подсказкой" }]
  );
});

test("learning hides easy rating on late progress modes", () => {
  const result = resolveTrainingRatingButtonsConfig({
    stage: "learning",
    allowEasySkip: true,
    excludeForget: true,
    currentTrainingModeId: TrainingModeId.FullRecall,
  });

  assert.deepEqual(
    result.buttons.map(({ rating }) => rating),
    [1, 2]
  );
});

test("learning shows easy on first progress mode", () => {
  const result = resolveTrainingRatingButtonsConfig({
    stage: "learning",
    allowEasySkip: true,
    excludeForget: true,
    currentTrainingModeId: TrainingModeId.ClickChunks,
  });

  assert.deepEqual(
    result.buttons.map(({ rating }) => rating),
    [1, 2, 3]
  );
});
