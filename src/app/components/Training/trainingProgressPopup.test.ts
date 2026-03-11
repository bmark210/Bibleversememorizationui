import assert from "node:assert/strict";
import test from "node:test";
import { buildTrainingProgressPopupPayload } from "./trainingProgressFeedback";

test("core learning success produces positive XP popup with learning stage", () => {
  const popup = buildTrainingProgressPopupPayload({
    reference: "Ин. 3:16",
    context: "core",
    before: {
      status: "LEARNING",
      masteryLevel: 2,
      repetitions: 0,
    },
    after: {
      status: "LEARNING",
      masteryLevel: 3,
      repetitions: 0,
    },
  });

  assert.ok(popup);
  assert.equal(popup.tone, "positive");
  assert.equal(popup.stageLabel, "Изучение");
  assert.equal(popup.xpDelta > 0, true);
});

test("review success keeps review stage and adds XP", () => {
  const popup = buildTrainingProgressPopupPayload({
    reference: "Рим. 8:28",
    context: "core",
    before: {
      status: "REVIEW",
      masteryLevel: 7,
      repetitions: 1,
    },
    after: {
      status: "REVIEW",
      masteryLevel: 7,
      repetitions: 2,
    },
  });

  assert.ok(popup);
  assert.equal(popup.stageLabel, "Повторение");
  assert.equal(popup.xpDelta > 0, true);
});

test("downgrade builds negative popup with lower stage", () => {
  const popup = buildTrainingProgressPopupPayload({
    reference: "Пс. 22:1",
    context: "core",
    before: {
      status: "LEARNING",
      masteryLevel: 1,
      repetitions: 0,
    },
    after: {
      status: "MY",
      masteryLevel: 0,
      repetitions: 0,
    },
  });

  assert.ok(popup);
  assert.equal(popup.tone, "negative");
  assert.equal(popup.title, "Этап понижен");
  assert.equal(popup.stageLabel, "Мой");
  assert.equal(popup.xpDelta < 0, true);
});

test("same stage without XP delta does not create popup", () => {
  const popup = buildTrainingProgressPopupPayload({
    reference: "Мф. 5:9",
    context: "core",
    before: {
      status: "MY",
      masteryLevel: 0,
      repetitions: 0,
    },
    after: {
      status: "MY",
      masteryLevel: 0,
      repetitions: 0,
    },
  });

  assert.equal(popup, null);
});

test("anchor popup includes track detail and uses score delta for XP", () => {
  const popup = buildTrainingProgressPopupPayload({
    reference: "Флп. 4:13",
    context: "anchor",
    track: "reference",
    before: {
      status: "REVIEW",
      masteryLevel: 7,
      repetitions: 1,
      referenceScore: 0,
      incipitScore: 0,
      contextScore: 0,
    },
    after: {
      status: "REVIEW",
      masteryLevel: 7,
      repetitions: 1,
      referenceScore: 30,
      incipitScore: 0,
      contextScore: 0,
    },
  });

  assert.ok(popup);
  assert.equal(popup.detail, "Закрепление · Ссылка");
  assert.equal(popup.xpDelta > 0, true);
});
