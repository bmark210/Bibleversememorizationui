import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVerseDeletionXpFeedback,
  computeVerseXpContribution,
} from "./verseXp";

test("computeVerseXpContribution includes anchor-skill bonus for progressed verse", () => {
  const xp = computeVerseXpContribution({
    status: "REVIEW",
    difficultyLevel: "HARD",
    masteryLevel: 7,
    repetitions: 2,
    referenceScore: 80,
    incipitScore: 70,
    contextScore: 60,
  });

  assert.equal(xp > 0, true);
});

test("computeVerseXpContribution grows with verse difficulty", () => {
  const easyXp = computeVerseXpContribution({
    status: "REVIEW",
    difficultyLevel: "EASY",
    masteryLevel: 7,
    repetitions: 2,
    referenceScore: 80,
    incipitScore: 70,
    contextScore: 60,
  });
  const expertXp = computeVerseXpContribution({
    status: "REVIEW",
    difficultyLevel: "EXPERT",
    masteryLevel: 7,
    repetitions: 2,
    referenceScore: 80,
    incipitScore: 70,
    contextScore: 60,
  });

  assert.equal(expertXp > easyXp, true);
});

test("buildVerseDeletionXpFeedback shows XP decrease when verse had progress", () => {
  const feedback = buildVerseDeletionXpFeedback({
    xpLoss: 187,
  });

  assert.equal(feedback.title, "Стих удалён");
  assert.equal(
    feedback.description,
    "Прогресс удалённого стиха убран из рейтинга: -187 XP."
  );
});

test("buildVerseDeletionXpFeedback reports unchanged XP when verse had no progress", () => {
  const feedback = buildVerseDeletionXpFeedback({
    xpLoss: 0,
    resetToCatalog: true,
  });

  assert.equal(feedback.title, "Сброшено в каталог");
  assert.equal(feedback.description, "Удаление прошло успешно. XP не изменился.");
});
