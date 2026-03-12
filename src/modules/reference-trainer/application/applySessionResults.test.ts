import assert from "node:assert/strict";
import test from "node:test";
import { applySessionResults } from "./applySessionResults";

test("ending track updates incipit score without touching other anchor scores", () => {
  const rowsByExternalVerseId = new Map([
    [
      "43-3-16",
      {
        id: 1,
        externalVerseId: "43-3-16",
        referenceScore: 41,
        incipitScore: 52,
        contextScore: 63,
      },
    ],
  ]);

  const [updated] = applySessionResults({
    rowsByExternalVerseId,
    updates: [
      {
        externalVerseId: "43-3-16",
        track: "ending",
        outcome: "correct_first",
      },
    ],
  });

  assert.ok(updated);
  assert.equal(updated.referenceScore, 41);
  assert.equal(updated.contextScore, 63);
  assert.equal(updated.incipitScore > 52, true);
});
