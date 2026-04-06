import assert from "node:assert/strict";
import test from "node:test";

import { selectCompactLeaderboardEntries } from "@/app/components/dashboard/leaderboardPresentation";

const makeEntry = (rank: number, telegramId: string) => ({
  rank,
  telegramId,
  name: `User ${rank}`,
});

test("selectCompactLeaderboardEntries centers current user when possible", () => {
  const items = [
    makeEntry(7, "u7"),
    makeEntry(8, "me"),
    makeEntry(9, "u9"),
  ];

  assert.deepEqual(
    selectCompactLeaderboardEntries(items, "me").map((item) => item.telegramId),
    ["u7", "me", "u9"],
  );
});

test("selectCompactLeaderboardEntries clamps to available start", () => {
  const items = [
    makeEntry(1, "me"),
    makeEntry(2, "u2"),
    makeEntry(3, "u3"),
    makeEntry(4, "u4"),
  ];

  assert.deepEqual(
    selectCompactLeaderboardEntries(items, "me").map((item) => item.telegramId),
    ["me", "u2", "u3"],
  );
});

test("selectCompactLeaderboardEntries falls back to first rows when current user is absent", () => {
  const items = [
    makeEntry(1, "u1"),
    makeEntry(2, "u2"),
    makeEntry(3, "u3"),
    makeEntry(4, "u4"),
  ];

  assert.deepEqual(
    selectCompactLeaderboardEntries(items, "me").map((item) => item.telegramId),
    ["u1", "u2", "u3"],
  );
});
