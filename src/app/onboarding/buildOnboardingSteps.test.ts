import test from "node:test";
import assert from "node:assert/strict";
import { buildOnboardingSteps } from "./buildOnboardingSteps";

test("mock onboarding includes verse progress walkthrough after opening progress", () => {
  const steps = buildOnboardingSteps({
    source: "auto",
    hasOwnedVerses: false,
    hasProgressVerse: false,
    useMockVerseFlow: true,
  });

  const stepIds = steps.map((step) => step.id);
  const openProgressIndex = stepIds.indexOf("verses-open-progress");

  assert.notEqual(openProgressIndex, -1);
  assert.deepEqual(
    stepIds.slice(openProgressIndex + 1, openProgressIndex + 6),
    [
      "verse-progress-summary",
      "verse-progress-collection",
      "verse-progress-learning",
      "verse-progress-review",
      "verse-progress-mastered",
    ],
  );
});
