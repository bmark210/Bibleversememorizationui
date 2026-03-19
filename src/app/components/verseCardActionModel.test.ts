import assert from "node:assert/strict";
import test from "node:test";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { resolveVerseCardActionModel } from "./verseCardActionModel";

const NOW = new Date("2026-03-19T10:00:00.000Z");

test("returns collection CTA for catalog verses", () => {
  const model = resolveVerseCardActionModel({
    status: "CATALOG",
    now: NOW,
  });

  assert.equal(model.primaryAction?.id, "add-to-my");
  assert.equal(model.utilityAction, null);
  assert.equal(model.showProgress, false);
  assert.equal(model.statusTone, null);
});

test("returns learning CTA for MY verses", () => {
  const model = resolveVerseCardActionModel({
    status: VerseStatus.MY,
    now: NOW,
  });

  assert.equal(model.primaryAction?.id, "start-learning");
  assert.equal(model.utilityAction, null);
  assert.equal(model.showProgress, false);
});

test("returns training primary CTA and pause utility for learning verses", () => {
  const model = resolveVerseCardActionModel({
    status: VerseStatus.LEARNING,
    now: NOW,
  });

  assert.equal(model.primaryAction?.id, "train");
  assert.equal(model.utilityAction?.id, "pause");
  assert.equal(model.statusTone?.title, "В изучении");
  assert.equal(model.showProgress, true);
});

test("returns waiting label and pause utility for review verses with future window", () => {
  const model = resolveVerseCardActionModel({
    status: "REVIEW",
    nextReviewAt: new Date("2026-03-19T15:30:00.000Z"),
    now: NOW,
    timeZone: "UTC",
  });

  assert.equal(model.primaryAction, null);
  assert.equal(model.utilityAction?.id, "pause");
  assert.equal(model.waitingLabel, "Сегодня в 15:30");
  assert.equal(model.statusTone?.title, "Повторение");
  assert.match(model.statusTone?.pillClassName ?? "", /violet-500/);
});

test("returns training primary CTA for due review verses", () => {
  const model = resolveVerseCardActionModel({
    status: "REVIEW",
    nextReviewAt: new Date("2026-03-19T09:30:00.000Z"),
    now: NOW,
    timeZone: "UTC",
  });

  assert.equal(model.primaryAction?.id, "train");
  assert.equal(model.utilityAction?.id, "pause");
  assert.equal(model.waitingLabel, null);
  assert.equal(model.statusTone?.title, "Повторение");
  assert.match(model.statusTone?.pillClassName ?? "", /violet-500/);
});

test("returns resume CTA for stopped verses", () => {
  const model = resolveVerseCardActionModel({
    status: VerseStatus.STOPPED,
    now: NOW,
  });

  assert.equal(model.primaryAction?.id, "resume");
  assert.equal(model.utilityAction, null);
  assert.equal(model.statusTone?.title, "На паузе");
});

test("returns anchor CTA only when mastered verse is anchor eligible", () => {
  const eligible = resolveVerseCardActionModel({
    status: "MASTERED",
    isAnchorEligible: true,
    now: NOW,
  });
  const ineligible = resolveVerseCardActionModel({
    status: "MASTERED",
    isAnchorEligible: false,
    now: NOW,
  });

  assert.equal(eligible.primaryAction?.id, "anchor");
  assert.equal(eligible.utilityAction?.id, "pause");
  assert.equal(ineligible.primaryAction, null);
  assert.equal(ineligible.utilityAction?.id, "pause");
  assert.equal(ineligible.statusTone?.title, "Выучен");
});
