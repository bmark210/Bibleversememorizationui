"use client";

import { create } from "zustand";
import type { bible_memory_db_internal_domain_UserDashboardStats as domain_UserDashboardStats } from "@/api/models/bible_memory_db_internal_domain_UserDashboardStats";

export type CurrentUserStatsSnapshot = {
  telegramId: string | null;
  xp: number | null;
  dailyStreak: number | null;
  masteredVerses: number | null;
  syncedAt: string | null;
};

type CurrentUserStatsStore = CurrentUserStatsSnapshot & {
  setFromDashboardStats: (
    telegramId: string | null | undefined,
    stats: domain_UserDashboardStats | null
  ) => void;
  clear: () => void;
};

const EMPTY_CURRENT_USER_STATS: CurrentUserStatsSnapshot = {
  telegramId: null,
  xp: null,
  dailyStreak: null,
  masteredVerses: null,
  syncedAt: null,
};

function normalizeTelegramId(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function toNullableNonNegativeInt(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
}

export const useCurrentUserStatsStore = create<CurrentUserStatsStore>((set) => ({
  ...EMPTY_CURRENT_USER_STATS,
  setFromDashboardStats: (telegramId, stats) => {
    const normalizedTelegramId = normalizeTelegramId(telegramId);
    if (!normalizedTelegramId) {
      set(EMPTY_CURRENT_USER_STATS);
      return;
    }

    set({
      telegramId: normalizedTelegramId,
      xp: toNullableNonNegativeInt(stats?.xp),
      dailyStreak: toNullableNonNegativeInt(stats?.dailyStreak),
      masteredVerses: toNullableNonNegativeInt(stats?.masteredCount),
      syncedAt: stats ? new Date().toISOString() : null,
    });
  },
  clear: () => set(EMPTY_CURRENT_USER_STATS),
}));

export function getCurrentUserStatsSnapshot(): CurrentUserStatsSnapshot {
  const { telegramId, xp, dailyStreak, masteredVerses, syncedAt } =
    useCurrentUserStatsStore.getState();

  return {
    telegramId,
    xp,
    dailyStreak,
    masteredVerses,
    syncedAt,
  };
}
