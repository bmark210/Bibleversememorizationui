"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { domain_UserDashboardStats } from "@/api/models/domain_UserDashboardStats";
import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import {
  fetchDashboardFriendsActivity,
  type DashboardCompactFriendsActivityResponse,
} from "@/api/services/friendsActivity";
import {
  DASHBOARD_LEADERBOARD_WINDOW_SIZE,
  fetchDashboardLeaderboard,
} from "@/api/services/leaderboard";
import { fetchUserDashboardStats } from "@/api/services/userStats";
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";

type DashboardLeaderboardQuery = {
  offset?: number;
  limit?: number;
};

export function useDashboardData(telegramId: string | null) {
  const [dashboardStats, setDashboardStats] = useState<domain_UserDashboardStats | null>(null);
  const [isDashboardStatsLoading, setIsDashboardStatsLoading] = useState(false);
  const [dashboardLeaderboard, setDashboardLeaderboard] =
    useState<domain_UserLeaderboardResponse | null>(null);
  const [isDashboardLeaderboardLoading, setIsDashboardLeaderboardLoading] = useState(false);
  const [dashboardFriendsActivity, setDashboardFriendsActivity] =
    useState<DashboardCompactFriendsActivityResponse | null>(null);
  const [isDashboardFriendsActivityLoading, setIsDashboardFriendsActivityLoading] =
    useState(false);

  const dashboardStatsRequestIdRef = useRef(0);
  const dashboardLeaderboardRequestIdRef = useRef(0);
  const dashboardFriendsActivityRequestIdRef = useRef(0);
  const leaderboardQueryRef = useRef<DashboardLeaderboardQuery>({
    offset: 0,
    limit: DASHBOARD_LEADERBOARD_WINDOW_SIZE,
  });

  const dashboardFetchFailedRef = useRef({
    stats: false,
    leaderboard: false,
    friendsActivity: false,
  });

  useEffect(() => {
    dashboardFetchFailedRef.current = {
      stats: false,
      leaderboard: false,
      friendsActivity: false,
    };
    setDashboardFriendsActivity(null);
    leaderboardQueryRef.current = {
      offset: 0,
      limit: DASHBOARD_LEADERBOARD_WINDOW_SIZE,
    };
  }, [telegramId]);

  const loadDashboardStats = useCallback(async (telegramIdValue: string) => {
    if (!telegramIdValue) return null;

    const requestId = ++dashboardStatsRequestIdRef.current;
    setIsDashboardStatsLoading(true);

    try {
      const nextStats = await fetchUserDashboardStats(telegramIdValue);
      if (dashboardStatsRequestIdRef.current === requestId) {
        dashboardFetchFailedRef.current.stats = false;
        setDashboardStats(nextStats);
        useCurrentUserStatsStore
          .getState()
          .setFromDashboardStats(telegramIdValue, nextStats);
      }
      return nextStats;
    } catch (error) {
      console.error("Не удалось получить статистику пользователя:", error);
      if (dashboardStatsRequestIdRef.current === requestId) {
        dashboardFetchFailedRef.current.stats = true;
        setDashboardStats(null);
        useCurrentUserStatsStore
          .getState()
          .setFromDashboardStats(telegramIdValue, null);
      }
      return null;
    } finally {
      if (dashboardStatsRequestIdRef.current === requestId) {
        setIsDashboardStatsLoading(false);
      }
    }
  }, []);

  const loadDashboardLeaderboard = useCallback(
    async (telegramIdValue: string, queryOverride?: DashboardLeaderboardQuery) => {
      if (!telegramIdValue) return null;

      if (queryOverride) {
        leaderboardQueryRef.current = queryOverride;
      }

      const requestId = ++dashboardLeaderboardRequestIdRef.current;
      setIsDashboardLeaderboardLoading(true);

      const q = leaderboardQueryRef.current;

      try {
        const nextLeaderboard = await fetchDashboardLeaderboard({
          telegramId: telegramIdValue,
          limit: q.limit,
          offset: q.offset,
        });
        if (dashboardLeaderboardRequestIdRef.current === requestId) {
          dashboardFetchFailedRef.current.leaderboard = false;
          setDashboardLeaderboard(nextLeaderboard);
          leaderboardQueryRef.current = {
            offset: nextLeaderboard.offset ?? q.offset ?? 0,
            limit: nextLeaderboard.limit ?? q.limit ?? DASHBOARD_LEADERBOARD_WINDOW_SIZE,
          };
        }
        return nextLeaderboard;
      } catch (error) {
        console.error("Не удалось получить лидерборд:", error);
        if (dashboardLeaderboardRequestIdRef.current === requestId) {
          dashboardFetchFailedRef.current.leaderboard = true;
          setDashboardLeaderboard(null);
        }
        return null;
      } finally {
        if (dashboardLeaderboardRequestIdRef.current === requestId) {
          setIsDashboardLeaderboardLoading(false);
        }
      }
    },
    []
  );

  const loadDashboardFriendsActivity = useCallback(async (telegramIdValue: string) => {
    if (!telegramIdValue) return null;

    const requestId = ++dashboardFriendsActivityRequestIdRef.current;
    setIsDashboardFriendsActivityLoading(true);

    try {
      const nextFriendsActivity = await fetchDashboardFriendsActivity({
        telegramId: telegramIdValue,
      });
      if (dashboardFriendsActivityRequestIdRef.current === requestId) {
        dashboardFetchFailedRef.current.friendsActivity = false;
        setDashboardFriendsActivity(nextFriendsActivity);
      }
      return nextFriendsActivity;
    } catch (error) {
      console.error("Не удалось получить активность друзей:", error);
      if (dashboardFriendsActivityRequestIdRef.current === requestId) {
        dashboardFetchFailedRef.current.friendsActivity = true;
        setDashboardFriendsActivity(null);
      }
      return null;
    } finally {
      if (dashboardFriendsActivityRequestIdRef.current === requestId) {
        setIsDashboardFriendsActivityLoading(false);
      }
    }
  }, []);

  const handleLeaderboardWindowRequest = useCallback(
    (query: DashboardLeaderboardQuery) => {
      if (!telegramId) return Promise.resolve(null);
      return loadDashboardLeaderboard(telegramId, query);
    },
    [loadDashboardLeaderboard, telegramId]
  );

  return {
    dashboardStats,
    setDashboardStats,
    isDashboardStatsLoading,
    dashboardLeaderboard,
    setDashboardLeaderboard,
    isDashboardLeaderboardLoading,
    dashboardFriendsActivity,
    setDashboardFriendsActivity,
    isDashboardFriendsActivityLoading,
    loadDashboardStats,
    loadDashboardLeaderboard,
    loadDashboardFriendsActivity,
    handleLeaderboardWindowRequest,
    dashboardFetchFailedRef,
  };
}
