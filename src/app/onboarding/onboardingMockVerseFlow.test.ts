import assert from "node:assert/strict";
import test from "node:test";
import {
  createOnboardingMockVerses,
  ONBOARDING_PRIMARY_VERSE_ID,
  reduceOnboardingMockVerses,
} from "./onboardingMockVerseFlow";

test("mock onboarding verses start with a catalog verse first", () => {
  const verses = createOnboardingMockVerses();

  assert.equal(verses[0]?.externalVerseId, ONBOARDING_PRIMARY_VERSE_ID);
  assert.equal(verses[0]?.status, "CATALOG");
});

test("add-to-collection moves the primary mock verse to MY", () => {
  const updated = reduceOnboardingMockVerses(
    createOnboardingMockVerses(),
    ONBOARDING_PRIMARY_VERSE_ID,
    "add-to-collection",
  );

  assert.equal(updated[0]?.status, "MY");
  assert.equal(updated[0]?.masteryLevel, 0);
});

test("add-to-learning moves the primary mock verse straight to LEARNING", () => {
  const updated = reduceOnboardingMockVerses(
    createOnboardingMockVerses(),
    ONBOARDING_PRIMARY_VERSE_ID,
    "add-to-learning",
  );

  assert.equal(updated[0]?.status, "LEARNING");
  assert.equal(updated[0]?.masteryLevel, 1);
});

test("start-learning moves the primary mock verse to LEARNING", () => {
  const added = reduceOnboardingMockVerses(
    createOnboardingMockVerses(),
    ONBOARDING_PRIMARY_VERSE_ID,
    "add-to-collection",
  );
  const updated = reduceOnboardingMockVerses(
    added,
    ONBOARDING_PRIMARY_VERSE_ID,
    "start-learning",
  );

  assert.equal(updated[0]?.status, "LEARNING");
  assert.equal(updated[0]?.masteryLevel, 1);
});

test("delete resets the primary mock verse back to catalog", () => {
  const learning = reduceOnboardingMockVerses(
    reduceOnboardingMockVerses(
      createOnboardingMockVerses(),
      ONBOARDING_PRIMARY_VERSE_ID,
      "add-to-collection",
    ),
    ONBOARDING_PRIMARY_VERSE_ID,
    "start-learning",
  );
  const updated = reduceOnboardingMockVerses(
    learning,
    ONBOARDING_PRIMARY_VERSE_ID,
    "delete",
  );

  assert.equal(updated[0]?.status, "CATALOG");
  assert.equal(updated[0]?.masteryLevel, 0);
  assert.equal(updated[0]?.repetitions, 0);
});
