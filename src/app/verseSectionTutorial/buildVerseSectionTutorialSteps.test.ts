import test from "node:test";
import assert from "node:assert/strict";
import { buildVerseSectionTutorialSteps } from "./buildVerseSectionTutorialSteps";

test("verse section tutorial contains only the verses route", () => {
  const steps = buildVerseSectionTutorialSteps({
    source: "prompt",
  });

  assert.deepEqual(
    steps.map((step) => step.id),
    [
      "verses-overview",
      "verses-card",
      "verses-add-card",
      "verses-open-progress",
      "verses-progress-summary",
      "verses-progress-learning",
      "verses-progress-review",
      "verses-progress-mastered",
      "verses-return-to-card",
      "verses-open-gallery",
      "gallery-overview",
      "gallery-training-cta",
      "verse-section-tutorial-finish",
    ],
  );
  assert.equal(steps.every((step) => step.page === "verses"), true);
});

test("profile replay still uses the verses-only tutorial flow", () => {
  const steps = buildVerseSectionTutorialSteps({
    source: "profile",
  });

  assert.equal(steps.some((step) => step.page === "training"), false);
  assert.equal(steps.some((step) => step.page === "dashboard"), false);
  assert.equal(steps.at(-1)?.page, "verses");
});
