import assert from "node:assert/strict";
import test from "node:test";
import type { HintRatingPolicy } from "@/modules/training/hints/types";
import { resolveTrainingRatingButtonsConfig } from "./TrainingRatingButtons";

function simplifyButtons(
  buttons: ReturnType<typeof resolveTrainingRatingButtonsConfig>["buttons"]
) {
  return buttons.map((button) =>
    button.kind === "retry"
      ? { kind: button.kind, label: button.label }
      : {
          kind: button.kind,
          rating: button.rating,
          label: button.label,
        }
  );
}

test("success actions no longer show memorization title", () => {
  const result = resolveTrainingRatingButtonsConfig({
    stage: "learning",
  });

  assert.equal(result.title, null);
});

test("learning success actions are retry and continue", () => {
  const result = resolveTrainingRatingButtonsConfig({
    stage: "learning",
  });

  assert.deepEqual(simplifyButtons(result.buttons), [
    { kind: "continue", rating: 2, label: "Далее" },
    { kind: "retry", label: "Повторить ещё раз" },
  ]);
});

test("learning continue falls back to capped non-forget rating", () => {
  const ratingPolicy: HintRatingPolicy = {
    maxRating: 1,
    allowedRatings: [0, 1],
    assisted: true,
  };

  const result = resolveTrainingRatingButtonsConfig({
    stage: "learning",
    ratingPolicy,
  });

  assert.deepEqual(simplifyButtons(result.buttons), [
    { kind: "continue", rating: 1, label: "Далее" },
    { kind: "retry", label: "Повторить ещё раз" },
  ]);
});

test("review success actions are retry and continue", () => {
  const result = resolveTrainingRatingButtonsConfig({
    stage: "review",
  });

  assert.deepEqual(simplifyButtons(result.buttons), [
    { kind: "continue", rating: 2, label: "Далее" },
    { kind: "retry", label: "Повторить ещё раз" },
  ]);
});

test("review continue respects assisted cap", () => {
  const ratingPolicy: HintRatingPolicy = {
    maxRating: 1,
    allowedRatings: [0, 1],
    assisted: true,
  };

  const result = resolveTrainingRatingButtonsConfig({
    stage: "review",
    ratingPolicy,
  });

  assert.deepEqual(simplifyButtons(result.buttons), [
    { kind: "continue", rating: 1, label: "Далее" },
    { kind: "retry", label: "Повторить ещё раз" },
  ]);
});
