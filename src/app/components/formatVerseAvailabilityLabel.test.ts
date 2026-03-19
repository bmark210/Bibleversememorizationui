import assert from "node:assert/strict";
import test from "node:test";
import { formatVerseAvailabilityLabel } from "./formatVerseAvailabilityLabel";

const NOW = new Date("2026-03-19T10:00:00.000Z");

test("formats current availability when review window is already open", () => {
  const label = formatVerseAvailabilityLabel(new Date("2026-03-19T09:59:00.000Z"), {
    now: NOW,
    timeZone: "UTC",
  });

  assert.equal(label, "Следующий шаг доступен сейчас");
});

test("formats same-day waiting window", () => {
  const label = formatVerseAvailabilityLabel(new Date("2026-03-19T15:45:00.000Z"), {
    now: NOW,
    timeZone: "UTC",
  });

  assert.equal(label, "Следующий шаг сегодня в 15:45");
});

test("formats tomorrow waiting window", () => {
  const label = formatVerseAvailabilityLabel(new Date("2026-03-20T08:15:00.000Z"), {
    now: NOW,
    timeZone: "UTC",
  });

  assert.equal(label, "Следующий шаг завтра в 08:15");
});

test("formats later waiting window", () => {
  const label = formatVerseAvailabilityLabel(new Date("2026-03-24T18:20:00.000Z"), {
    now: NOW,
    timeZone: "UTC",
  });

  assert.equal(label, "Следующий шаг 24 мар в 18:20");
});

test("returns null for invalid date", () => {
  const label = formatVerseAvailabilityLabel(new Date("invalid"), {
    now: NOW,
    timeZone: "UTC",
  });

  assert.equal(label, null);
});
