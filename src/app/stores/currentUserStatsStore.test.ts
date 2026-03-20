import assert from "node:assert/strict";
import test from "node:test";
import type { domain_UserDashboardStats } from "@/api/models/domain_UserDashboardStats";
import { useCurrentUserStatsStore } from "./currentUserStatsStore";

test("hydrates current user stats from dashboard payload and clears them", () => {
  useCurrentUserStatsStore.getState().clear();

  const payload: domain_UserDashboardStats = {
    xp: 620,
    dailyStreak: 8,
    masteredCount: 14,
  };

  useCurrentUserStatsStore.getState().setFromDashboardStats("12345", payload);

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
