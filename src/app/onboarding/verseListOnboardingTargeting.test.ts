import assert from "node:assert/strict";
import test from "node:test";
import {
  selectVerseListAction,
  type VerseListRowActionCandidate,
} from "./verseListOnboardingTargeting";

function createRow(
  {
    index,
    verseId,
    actions,
    top = 0,
    left = 0,
  }: {
    index: number;
    verseId?: string | null;
    actions?: Record<string, string>;
    top?: number;
    left?: number;
  },
): VerseListRowActionCandidate<string> {
  return {
    index,
    top,
    left,
    verseId: verseId ?? null,
    getAction: (selector: string) => actions?.[selector] ?? null,
  };
}

test("selectVerseListAction picks the earliest list row with a matching action", () => {
  const selector = "[data-tour='verse-card-add-button']";
  const action = selectVerseListAction(
    [
      createRow({ index: 3, verseId: "verse-3", actions: { [selector]: "row-3-add" } }),
      createRow({ index: 1, verseId: "verse-1", actions: { [selector]: "row-1-add" } }),
      createRow({ index: 2, verseId: "verse-2" }),
    ],
    selector,
  );

  assert.equal(action, "row-1-add");
});

test("selectVerseListAction prefers the tracked verse when it has the requested action", () => {
  const selector = "[data-tour='verse-card-progress-button']";
  const action = selectVerseListAction(
    [
      createRow({ index: 0, verseId: "verse-0", actions: { [selector]: "row-0-progress" } }),
      createRow({ index: 2, verseId: "target-verse", actions: { [selector]: "target-progress" } }),
    ],
    selector,
    { targetVerseId: "target-verse" },
  );

  assert.equal(action, "target-progress");
});

test("selectVerseListAction falls back to list order when the tracked verse lacks the action", () => {
  const selector = "[data-tour='verse-card-promote-button']";
  const action = selectVerseListAction(
    [
      createRow({ index: 0, verseId: "verse-0", actions: { [selector]: "row-0-promote" } }),
      createRow({ index: 1, verseId: "target-verse" }),
    ],
    selector,
    { targetVerseId: "target-verse" },
  );

  assert.equal(action, "row-0-promote");
});
