"use client";

import { useEffect, type RefObject } from "react";
import type { domain_UserDashboardStats } from "@/api/models/domain_UserDashboardStats";
import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import type { Verse } from "@/app/domain/verse";

type DashboardFetchFailedRef = RefObject<{ stats: boolean; leaderboard: boolean }>;
type FriendsFetchFailedRef = RefObject<boolean>;
type TrainingFetchFailedRef = RefObject<boolean>;
type TrainingPromiseRef = RefObject<Promise<Array<Verse>> | null>;

export function useAppDataRefetchEffects(options: {
  telegramId: string | null;
  isBootstrapping: boolean;
  dashboardStats: domain_UserDashboardStats | null;
  dashboardLeaderboard: domain_UserLeaderboardResponse | null;
  verseListFriendsPresence: boolean | null;
  isDashboardStatsLoading: boolean;
  isDashboardLeaderboardLoading: boolean;
  isVerseListFriendsPresenceLoading: boolean;
  hasLoadedTrainingVerses: boolean;
  trainingVersesPromiseRef: TrainingPromiseRef;
  dashboardFetchFailedRef: DashboardFetchFailedRef;
  verseListFriendsFetchFailedRef: FriendsFetchFailedRef;
  trainingVersesFetchFailedRef: TrainingFetchFailedRef;
  loadDashboardStats: (id: string) => void;
  loadDashboardLeaderboard: (id: string) => void;
  loadVerseListFriendsPresence: (id: string) => void;
  scheduleTrainingVersePrefetch: (id: string) => void;
}) {
  const {
    telegramId,
    isBootstrapping,
    dashboardStats,
    dashboardLeaderboard,
    verseListFriendsPresence,
    isDashboardStatsLoading,
    isDashboardLeaderboardLoading,
    isVerseListFriendsPresenceLoading,
    hasLoadedTrainingVerses,
    trainingVersesPromiseRef,
    dashboardFetchFailedRef,
    verseListFriendsFetchFailedRef,
    trainingVersesFetchFailedRef,
    loadDashboardStats,
    loadDashboardLeaderboard,
    loadVerseListFriendsPresence,
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
      verseListFriendsPresence === null &&
      !isVerseListFriendsPresenceLoading &&
      !verseListFriendsFetchFailedRef.current
    ) {
      void loadVerseListFriendsPresence(telegramId);
    }

    if (
      !hasLoadedTrainingVerses &&
      !trainingVersesPromiseRef.current &&
      !trainingVersesFetchFailedRef.current
    ) {
      scheduleTrainingVersePrefetch(telegramId);
    }
  }, [
    verseListFriendsPresence,
    dashboardLeaderboard,
    dashboardStats,
    hasLoadedTrainingVerses,
    isBootstrapping,
    isVerseListFriendsPresenceLoading,
    isDashboardLeaderboardLoading,
    isDashboardStatsLoading,
    loadVerseListFriendsPresence,
    loadDashboardLeaderboard,
    loadDashboardStats,
    scheduleTrainingVersePrefetch,
    telegramId,
  ]);
}
