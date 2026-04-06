import assert from "node:assert/strict";
import test from "node:test";
import { buildTrainingProgressPopupPayload } from "./trainingProgressFeedback";

test("core learning success produces positive XP popup with learning stage", () => {
  const popup = buildTrainingProgressPopupPayload({
    reference: "Ин. 3:16",
    context: "core",
    xpDelta: 10,
    before: {
      status: "LEARNING",
    },
    after: {
      status: "LEARNING",
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
    xpDelta: 18,
    before: {
      status: "REVIEW",
    },
    after: {
      status: "REVIEW",
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
    xpDelta: -10,
    before: {
      status: "LEARNING",
    },
    after: {
      status: "MY",
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
    xpDelta: 0,
    before: {
      status: "MY",
    },
    after: {
      status: "MY",
    },
  });

  assert.equal(popup, null);
});

test("anchor popup includes track detail and uses score delta for XP", () => {
  const popup = buildTrainingProgressPopupPayload({
    reference: "Флп. 4:13",
    context: "anchor",
    track: "reference",
    xpDelta: 2,
    before: {
      status: "REVIEW",
    },
    after: {
      status: "REVIEW",
    },
  });

  assert.ok(popup);
  assert.equal(popup.detail, "Закрепление · Ссылка");
  assert.equal(popup.xpDelta > 0, true);
});

test("difficulty changes XP delta even with same progress delta", () => {
  const easyPopup = buildTrainingProgressPopupPayload({
    reference: "Иак. 1:5",
    context: "core",
    xpDelta: 10,
    before: {
      status: "LEARNING",
    },
    after: {
      status: "LEARNING",
    },
  });
  const hardPopup = buildTrainingProgressPopupPayload({
    reference: "Иак. 1:5",
    context: "core",
    xpDelta: 15,
    before: {
      status: "LEARNING",
    },
    after: {
      status: "LEARNING",
    },
  });

  assert.ok(easyPopup);
  assert.ok(hardPopup);
  assert.equal((hardPopup?.xpDelta ?? 0) > (easyPopup?.xpDelta ?? 0), true);
});
