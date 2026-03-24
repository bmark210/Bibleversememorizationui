"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { domain_UserDashboardStats } from "@/api/models/domain_UserDashboardStats";
import type { domain_UserLeaderboardResponse } from "@/api/models/domain_UserLeaderboardResponse";
import { fetchFriendsPage } from "@/api/services/friends";
import {
  DASHBOARD_LEADERBOARD_PAGE_SIZE,
  fetchDashboardLeaderboard,
} from "@/api/services/leaderboard";
import { fetchUserDashboardStats } from "@/api/services/userStats";
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";

type DashboardLeaderboardQuery =
  | { mode: "anchor" }
  | { mode: "page"; page: number };

export function useDashboardData(telegramId: string | null) {
  const [dashboardStats, setDashboardStats] = useState<domain_UserDashboardStats | null>(null);
  const [isDashboardStatsLoading, setIsDashboardStatsLoading] = useState(false);
  const [dashboardLeaderboard, setDashboardLeaderboard] =
    useState<domain_UserLeaderboardResponse | null>(null);
  const [isDashboardLeaderboardLoading, setIsDashboardLeaderboardLoading] = useState(false);
  const [verseListFriendsPresence, setVerseListFriendsPresence] = useState<boolean | null>(null);
  const [isVerseListFriendsPresenceLoading, setIsVerseListFriendsPresenceLoading] =
    useState(false);

  const dashboardStatsRequestIdRef = useRef(0);
  const dashboardLeaderboardRequestIdRef = useRef(0);
  const leaderboardQueryRef = useRef<DashboardLeaderboardQuery>({ mode: "anchor" });
  const verseListFriendsPresenceRequestIdRef = useRef(0);

  const dashboardFetchFailedRef = useRef({
    stats: false,
    leaderboard: false,
  });
  const verseListFriendsFetchFailedRef = useRef(false);

  useEffect(() => {
    dashboardFetchFailedRef.current = {
      stats: false,
      leaderboard: false,
    };
    verseListFriendsFetchFailedRef.current = false;
    setVerseListFriendsPresence(null);
    leaderboardQueryRef.current = { mode: "anchor" };
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
          pageSize: DASHBOARD_LEADERBOARD_PAGE_SIZE,
          ...(q.mode === "page" ? { page: q.page } : {}),
        });
        if (dashboardLeaderboardRequestIdRef.current === requestId) {
          dashboardFetchFailedRef.current.leaderboard = false;
          setDashboardLeaderboard(nextLeaderboard);
          const resolvedPage = nextLeaderboard.page;
          if (typeof resolvedPage === "number" && resolvedPage >= 1) {
            leaderboardQueryRef.current = { mode: "page", page: resolvedPage };
          }
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

  const handleLeaderboardPageChange = useCallback(
    (page: number) => {
      if (!telegramId) return;
      if (page < 1) return;
      void loadDashboardLeaderboard(telegramId, { mode: "page", page });
    },
    [loadDashboardLeaderboard, telegramId]
  );

  const handleLeaderboardJumpToMe = useCallback(() => {
    if (!telegramId) return;
    void loadDashboardLeaderboard(telegramId, { mode: "anchor" });
  }, [loadDashboardLeaderboard, telegramId]);

  const loadVerseListFriendsPresence = useCallback(async (telegramIdValue: string) => {
    if (!telegramIdValue) return null;

    const requestId = ++verseListFriendsPresenceRequestIdRef.current;
    setIsVerseListFriendsPresenceLoading(true);

    try {
      const page = await fetchFriendsPage(telegramIdValue, { limit: 1 });
      if (verseListFriendsPresenceRequestIdRef.current !== requestId) {
        return null;
      }
      verseListFriendsFetchFailedRef.current = false;
      const total = page.total ?? 0;
      const hasItems = (page.items?.length ?? 0) > 0;
      const hasFriends = total > 0 || hasItems;
      setVerseListFriendsPresence(hasFriends);
      return hasFriends;
    } catch (error) {
      console.error("Не удалось проверить список друзей:", error);
      if (verseListFriendsPresenceRequestIdRef.current === requestId) {
        verseListFriendsFetchFailedRef.current = true;
        setVerseListFriendsPresence(null);
      }
      return null;
    } finally {
      if (verseListFriendsPresenceRequestIdRef.current === requestId) {
        setIsVerseListFriendsPresenceLoading(false);
      }
    }
  }, []);

  return {
    dashboardStats,
    setDashboardStats,
    isDashboardStatsLoading,
    dashboardLeaderboard,
    setDashboardLeaderboard,
    isDashboardLeaderboardLoading,
    verseListFriendsPresence,
    setVerseListFriendsPresence,
    isVerseListFriendsPresenceLoading,
    loadDashboardStats,
    loadDashboardLeaderboard,
    loadVerseListFriendsPresence,
    handleLeaderboardPageChange,
    handleLeaderboardJumpToMe,
    dashboardFetchFailedRef,
    verseListFriendsFetchFailedRef,
  };
}
