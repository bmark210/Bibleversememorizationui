import test from "node:test";
import assert from "node:assert/strict";
import { buildOnboardingSteps } from "./buildOnboardingSteps";

test("onboarding keeps only the core route through dashboard, verses, and training", () => {
  const steps = buildOnboardingSteps({
    source: "auto",
  });

  assert.deepEqual(
    steps.map((step) => step.id),
    [
      "dashboard-home",
      "verses-overview",
      "verses-card",
      "verses-add-card",
      "verses-open-progress",
      "verses-progress-summary",
      "training-overview",
      "training-start",
      "training-open-session",
      "training-session",
      "onboarding-finish",
    ],
  );
});

test("replay onboarding still finishes in training without profile steps", () => {
  const steps = buildOnboardingSteps({
    source: "profile",
  });

  assert.equal(steps.some((step) => step.page === "profile"), false);
  assert.equal(steps.at(-1)?.page, "training");
});
