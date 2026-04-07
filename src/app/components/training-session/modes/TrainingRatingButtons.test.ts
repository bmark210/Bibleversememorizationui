import assert from "node:assert/strict";
import test from "node:test";
import type { HintRatingPolicy } from "@/modules/training/hints/types";
import type { TrainingModeRating } from "./types";

// Replicates resolveRatingButtons logic for unit testing without DOM
function resolveRatingButtons(params: {
  stage: "learning" | "review";
  allowedRatings?: readonly TrainingModeRating[];
}): { rating: TrainingModeRating; label: string }[] {
  const defaultRatings: TrainingModeRating[] =
    params.stage === "review" ? [0, 1] : [-1, 0, 1];

  const effective =
    params.allowedRatings && params.allowedRatings.length > 0
      ? ([...params.allowedRatings].sort((a, b) => a - b) as TrainingModeRating[])
      : defaultRatings;

  const labelFor = (r: TrainingModeRating): string => {
    if (r === -1) return "Забыл";
    if (r === 0) return "Сложно";
    return "Далее";
  };

  return effective.map((r) => ({ rating: r, label: labelFor(r) }));
}

test("learning default: shows забыл / сложно / далее", () => {
  const buttons = resolveRatingButtons({ stage: "learning" });
  assert.deepEqual(buttons, [
    { rating: -1, label: "Забыл" },
    { rating: 0, label: "Сложно" },
    { rating: 1, label: "Далее" },
  ]);
});

test("review default: shows сложно / далее (no забыл)", () => {
  const buttons = resolveRatingButtons({ stage: "review" });
  assert.deepEqual(buttons, [
    { rating: 0, label: "Сложно" },
    { rating: 1, label: "Далее" },
  ]);
});

test("assisted: only сложно available (ratingPolicy cap = 0)", () => {
  const ratingPolicy: HintRatingPolicy = {
    maxRating: 0,
    allowedRatings: [0],
    assisted: true,
  };

  const buttons = resolveRatingButtons({
    stage: "learning",
    allowedRatings: ratingPolicy.allowedRatings,
  });

  assert.deepEqual(buttons, [{ rating: 0, label: "Сложно" }]);
});

test("assisted review: only сложно available", () => {
  const ratingPolicy: HintRatingPolicy = {
    maxRating: 0,
    allowedRatings: [0],
    assisted: true,
  };

  const buttons = resolveRatingButtons({
    stage: "review",
    allowedRatings: ratingPolicy.allowedRatings,
  });

  assert.deepEqual(buttons, [{ rating: 0, label: "Сложно" }]);
});
