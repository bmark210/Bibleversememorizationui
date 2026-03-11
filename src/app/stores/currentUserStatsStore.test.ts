import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_USER_DASHBOARD_STATS } from "@/api/services/userStats";
import { useCurrentUserStatsStore } from "./currentUserStatsStore";

test("hydrates current user stats from dashboard payload and clears them", () => {
  useCurrentUserStatsStore.getState().clear();

  useCurrentUserStatsStore.getState().setFromDashboardStats("12345", {
    ...EMPTY_USER_DASHBOARD_STATS,
    xp: 620,
    dailyStreak: 8,
    masteredVerses: 14,
  });

  let state = useCurrentUserStatsStore.getState();
  assert.equal(state.telegramId, "12345");
  assert.equal(state.xp, 620);
  assert.equal(state.dailyStreak, 8);
  assert.equal(state.masteredVerses, 14);
  assert.notEqual(state.syncedAt, null);

  useCurrentUserStatsStore.getState().clear();

  state = useCurrentUserStatsStore.getState();
  assert.equal(state.telegramId, null);
  assert.equal(state.xp, null);
  assert.equal(state.dailyStreak, null);
  assert.equal(state.masteredVerses, null);
  assert.equal(state.syncedAt, null);
});
