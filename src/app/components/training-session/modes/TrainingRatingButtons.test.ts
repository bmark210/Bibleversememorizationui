import assert from "node:assert/strict";
import test from "node:test";
import type { HintRatingPolicy } from "@/modules/training/hints/types";
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
    [
      { rating: 0, label: "Забыл" },
      { rating: 1, label: "С подсказкой" },
    ]
  );
});
