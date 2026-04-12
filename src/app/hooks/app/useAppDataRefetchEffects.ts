"use client";

import { useEffect, type RefObject } from "react";
import type { bible_memory_db_internal_domain_UserDashboardStats as domain_UserDashboardStats } from "@/api/models/bible_memory_db_internal_domain_UserDashboardStats";
import type { bible_memory_db_internal_domain_UserLeaderboardResponse as domain_UserLeaderboardResponse } from "@/api/models/bible_memory_db_internal_domain_UserLeaderboardResponse";
import type { DashboardCompactFriendsActivityResponse } from "@/api/services/friendsActivity";
import type { Verse } from "@/app/domain/verse";

type DashboardFetchFailedRef = RefObject<{
  stats: boolean;
  leaderboard: boolean;
  friendsActivity: boolean;
}>;
type TrainingFetchFailedRef = RefObject<boolean>;
type TrainingPromiseRef = RefObject<Promise<Array<Verse>> | null>;

export function useAppDataRefetchEffects(options: {
  telegramId: string | null;
  isBootstrapping: boolean;
  dashboardStats: domain_UserDashboardStats | null;
  dashboardLeaderboard: domain_UserLeaderboardResponse | null;
  dashboardFriendsActivity: DashboardCompactFriendsActivityResponse | null;
  isDashboardStatsLoading: boolean;
  isDashboardLeaderboardLoading: boolean;
  isDashboardFriendsActivityLoading: boolean;
  hasLoadedTrainingVerses: boolean;
  trainingVersesPromiseRef: TrainingPromiseRef;
  dashboardFetchFailedRef: DashboardFetchFailedRef;
  trainingVersesFetchFailedRef: TrainingFetchFailedRef;
  loadDashboardStats: (id: string) => void;
  loadDashboardLeaderboard: (id: string) => void;
  loadDashboardFriendsActivity: (id: string) => void;
  scheduleTrainingVersePrefetch: (id: string) => void;
}) {
  const {
    telegramId,
    isBootstrapping,
    dashboardStats,
    dashboardLeaderboard,
    dashboardFriendsActivity,
    isDashboardStatsLoading,
    isDashboardLeaderboardLoading,
    isDashboardFriendsActivityLoading,
    hasLoadedTrainingVerses,
    trainingVersesPromiseRef,
    dashboardFetchFailedRef,
    trainingVersesFetchFailedRef,
    loadDashboardStats,
    loadDashboardLeaderboard,
    loadDashboardFriendsActivity,
    scheduleTrainingVersePrefetch,
  } = options;

  useEffect(() => {
    if (!telegramId) return;
    if (isBootstrapping) return;

    if (
      dashboardStats == null &&
      !isDashboardStatsLoading &&
      !dashboardFetchFailedRef.current.stats
    ) {
      void loadDashboardStats(telegramId);
    }

    if (
      dashboardLeaderboard == null &&
      !isDashboardLeaderboardLoading &&
      !dashboardFetchFailedRef.current.leaderboard
    ) {
      void loadDashboardLeaderboard(telegramId);
    }

    if (
      dashboardFriendsActivity == null &&
      !isDashboardFriendsActivityLoading &&
      !dashboardFetchFailedRef.current.friendsActivity
    ) {
      void loadDashboardFriendsActivity(telegramId);
    }

    if (
      !hasLoadedTrainingVerses &&
      !trainingVersesPromiseRef.current &&
      !trainingVersesFetchFailedRef.current
    ) {
      scheduleTrainingVersePrefetch(telegramId);
    }
  }, [
    dashboardFriendsActivity,
    dashboardLeaderboard,
    dashboardStats,
    hasLoadedTrainingVerses,
    isBootstrapping,
    isDashboardFriendsActivityLoading,
    isDashboardLeaderboardLoading,
    isDashboardStatsLoading,
    loadDashboardFriendsActivity,
    loadDashboardLeaderboard,
    loadDashboardStats,
    scheduleTrainingVersePrefetch,
    telegramId,
  ]);
}
