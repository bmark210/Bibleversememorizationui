"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Layout } from "./components/Layout";
import { OpenAPI } from "@/api/core/OpenAPI";
import { request as apiRequest } from "@/api/core/request";
import { UserVersesService } from "@/api/services/UserVersesService";
import type { ApiError } from "@/api/core/ApiError";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { toast } from "@/app/lib/toast";
import { showVerseActionToast } from "@/app/lib/semanticToast";
import { Toaster } from "./components/ui/toaster";
import type { VersePatchEvent } from "@/app/types/verseSync";
import {
  getVerseSyncKey,
  mergeVersePatch,
} from "@/app/utils/versePatch";
import type { AppRootPage, PlayerProfilePreview } from "@/app/domain/appPages";
import { useAppBootstrap } from "@/app/hooks/app/useAppBootstrap";
import { useAppDataRefetchEffects } from "@/app/hooks/app/useAppDataRefetchEffects";
import { useAppNavigation } from "@/app/hooks/app/useAppNavigation";
import { useAppTheme } from "@/app/hooks/app/useAppTheme";
import { useDashboardData } from "@/app/hooks/app/useDashboardData";
import { useTelegramWebAppSetup } from "@/app/hooks/app/useTelegramWebAppSetup";
import { useTrainingVersesPool } from "@/app/hooks/app/useTrainingVersesPool";
import { cancelIdleTask, scheduleIdleTask } from "@/app/lib/idleTask";
import { cn } from "@/app/components/ui/utils";

const loadVerseListModule = () => import("./components/VerseList");
const loadProfileModule = () => import("./components/Profile");
const loadAddVerseDialogModule = () => import("./components/AddVerseDialog");
const loadTrainingModule = () => import("./components/Training");
const loadDashboardModule = () => import("./components/Dashboard");
const loadPlayerProfileDrawerModule = () => import("./components/PlayerProfileDrawer");

const ROOT_PAGE_MODULE_LOADERS: Record<AppRootPage, () => Promise<unknown>> = {
  dashboard: loadDashboardModule,
  verses: loadVerseListModule,
  training: loadTrainingModule,
  profile: loadProfileModule,
};

const AUXILIARY_MODULE_LOADERS = [
  loadAddVerseDialogModule,
  loadPlayerProfileDrawerModule,
] as const;

const VerseList = dynamic(() => loadVerseListModule().then((m) => m.VerseList), {
  loading: () => <div className="min-h-[60vh]" />,
});

const Profile = dynamic(() => loadProfileModule().then((m) => m.Profile), {
  loading: () => <div className="min-h-[60vh]" />,
});

const AddVerseDialog = dynamic(
  () => loadAddVerseDialogModule().then((m) => m.AddVerseDialog),
  {
    loading: () => null,
  }
);

const Training = dynamic(() => loadTrainingModule().then((m) => m.Training), {
  loading: () => <div className="min-h-[60vh]" />,
});

const Dashboard = dynamic(() => loadDashboardModule().then((m) => m.Dashboard), {
  loading: () => <div className="min-h-[50vh]" />,
});

const PlayerProfileDrawer = dynamic(
  () => loadPlayerProfileDrawerModule().then((m) => m.PlayerProfileDrawer),
  {
    loading: () => null,
  }
);

export type { Verse } from "@/app/domain/verse";

type AppProps = {
  onInitialContentReady?: () => void;
};

export default function App({ onInitialContentReady }: AppProps) {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [showAddVerseDialog, setShowAddVerseDialog] = useState(false);
  const [verseListExternalSyncVersion, setVerseListExternalSyncVersion] = useState(0);
  const [isTrainingSessionFullscreen, setIsTrainingSessionFullscreen] = useState(false);
  const [friendsRefreshVersion, setFriendsRefreshVersion] = useState(0);
  const [activePlayerProfile, setActivePlayerProfile] =
    useState<PlayerProfilePreview | null>(null);
  const [isPlayerProfileDrawerOpen, setIsPlayerProfileDrawerOpen] =
    useState(false);

  const { theme, handleToggleTheme } = useAppTheme();
  const nav = useAppNavigation();

  const {
    dashboardStats,
    setDashboardStats,
    dashboardFriendsActivity,
    setDashboardFriendsActivity,
    setDashboardLeaderboard,
    setVerseListFriendsPresence,
    isDashboardStatsLoading,
    dashboardLeaderboard,
    isDashboardLeaderboardLoading,
    isDashboardFriendsActivityLoading,
    verseListFriendsPresence,
    isVerseListFriendsPresenceLoading,
    loadDashboardStats,
    loadDashboardLeaderboard,
    loadDashboardFriendsActivity,
    loadVerseListFriendsPresence,
    handleLeaderboardWindowRequest,
    dashboardFetchFailedRef,
    verseListFriendsFetchFailedRef,
  } = useDashboardData(telegramId);

  const {
    verses,
    setVerses,
    hasLoadedTrainingVerses,
    isTrainingVersesLoading,
    loadTrainingVersesForDashboard,
    ensureTrainingVersesLoaded,
    scheduleTrainingVersePrefetch,
    trainingVersesPromiseRef,
    trainingVersesFetchFailedRef,
  } = useTrainingVersesPool(telegramId, nav.currentPage);

  useTelegramWebAppSetup();

  useAppBootstrap({
    setTelegramId,
    setCurrentUserAvatarUrl,
    setIsBootstrapping,
    setDashboardStats,
    setDashboardLeaderboard,
    setDashboardFriendsActivity,
    setVerseListFriendsPresence,
    loadDashboardStats,
    loadDashboardLeaderboard,
    loadDashboardFriendsActivity,
    loadVerseListFriendsPresence,
    scheduleTrainingVersePrefetch,
  });

  useAppDataRefetchEffects({
    telegramId,
    isBootstrapping,
    dashboardStats,
    dashboardLeaderboard,
    dashboardFriendsActivity,
    verseListFriendsPresence,
    isDashboardStatsLoading,
    isDashboardLeaderboardLoading,
    isDashboardFriendsActivityLoading,
    isVerseListFriendsPresenceLoading,
    hasLoadedTrainingVerses,
    trainingVersesPromiseRef,
    dashboardFetchFailedRef,
    verseListFriendsFetchFailedRef,
    trainingVersesFetchFailedRef,
    loadDashboardStats,
    loadDashboardLeaderboard,
    loadDashboardFriendsActivity,
    loadVerseListFriendsPresence,
    scheduleTrainingVersePrefetch,
  });

  const hasNotifiedInitialContentReadyRef = useRef(false);
  const pendingMutationRefetchRef = useRef(false);
  const prefetchedPagesRef = useRef<Set<AppRootPage>>(new Set(["dashboard"]));

  const hasVerseListFriends = verseListFriendsPresence === true;
  const shouldKeepRootPagesAlive = !isBootstrapping;

  const handleNavigateBackInApp = nav.handleNavigateBackInApp;

  const handleTelegramBack = useCallback(() => {
    if (showAddVerseDialog) {
      setShowAddVerseDialog(false);
      return;
    }

    handleNavigateBackInApp();
  }, [handleNavigateBackInApp, showAddVerseDialog]);

  useTelegramBackButton({
    enabled: showAddVerseDialog || nav.canGoBackInApp,
    onBack: handleTelegramBack,
    priority: 10,
  });

  const handleTrainingVersePatched = useCallback((event: VersePatchEvent) => {
    setVerses((prev) =>
      prev.map((verse) =>
        getVerseSyncKey(verse) === getVerseSyncKey(event.target)
          ? mergeVersePatch(verse, event.patch)
          : verse
      )
    );
  }, [setVerses]);

  const handleVerseListMutationCommitted = useCallback(() => {
    if (!telegramId) return;

    if (isTrainingSessionFullscreen) {
      pendingMutationRefetchRef.current = true;
      return;
    }

    dashboardFetchFailedRef.current.stats = false;
    dashboardFetchFailedRef.current.leaderboard = false;
    dashboardFetchFailedRef.current.friendsActivity = false;
    trainingVersesFetchFailedRef.current = false;
    void loadTrainingVersesForDashboard(telegramId);
    void loadDashboardStats(telegramId);
    void loadDashboardLeaderboard(telegramId);
    void loadDashboardFriendsActivity(telegramId);
  }, [
    dashboardFetchFailedRef,
    isTrainingSessionFullscreen,
    loadDashboardFriendsActivity,
    loadDashboardLeaderboard,
    loadDashboardStats,
    loadTrainingVersesForDashboard,
    telegramId,
    trainingVersesFetchFailedRef,
  ]);

  const handleFriendsChanged = useCallback(() => {
    setFriendsRefreshVersion((prev) => prev + 1);
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (!telegramIdValue) return;
    dashboardFetchFailedRef.current.friendsActivity = false;
    void loadDashboardFriendsActivity(telegramIdValue);
    verseListFriendsFetchFailedRef.current = false;
    void loadVerseListFriendsPresence(telegramIdValue);
  }, [
    dashboardFetchFailedRef,
    loadDashboardFriendsActivity,
    loadVerseListFriendsPresence,
    telegramId,
    verseListFriendsFetchFailedRef,
  ]);

  const handleOpenPlayerProfile = useCallback((player: PlayerProfilePreview) => {
    if (!player.telegramId) return;
    setActivePlayerProfile({
      telegramId: player.telegramId,
      name: player.name,
      avatarUrl: player.avatarUrl ?? null,
    });
    setIsPlayerProfileDrawerOpen(true);
  }, []);

  const handlePlayerProfileDrawerOpenChange = useCallback((open: boolean) => {
    setIsPlayerProfileDrawerOpen(open);
    if (!open) {
      setActivePlayerProfile(null);
    }
  }, []);

  const handleOpenTraining = useCallback(() => {
    if (telegramId) {
      void ensureTrainingVersesLoaded(telegramId);
    }
    nav.pushPage("training");
  }, [ensureTrainingVersesLoaded, nav, telegramId]);

  const prefetchRootPage = useCallback(async (page: AppRootPage) => {
    if (prefetchedPagesRef.current.has(page)) {
      return;
    }

    prefetchedPagesRef.current.add(page);

    try {
      await ROOT_PAGE_MODULE_LOADERS[page]();
    } catch (error) {
      prefetchedPagesRef.current.delete(page);
      console.error(`Не удалось предзагрузить страницу ${page}`, error);
    }
  }, []);

  const handleRootPagePrefetchIntent = useCallback((page: string) => {
    const nextPage = page as AppRootPage;

    if (!(nextPage in ROOT_PAGE_MODULE_LOADERS)) {
      return;
    }

    void prefetchRootPage(nextPage);
  }, [prefetchRootPage]);

  const handleVerseAdded = useCallback(
    async (verse: {
      externalVerseId: string;
      reference: string;
      tags: string[];
      replaceTags?: boolean;
    }): Promise<void> => {
      const tid = localStorage.getItem("telegramId") ?? "";

      try {
        await UserVersesService.upsertUserVerse(tid, {
          externalVerseId: verse.externalVerseId,
        });

        await UserVersesService.patchUserVerse(tid, verse.externalVerseId, {
          status: "MY",
        });

        if (verse.replaceTags === false) {
          if (verse.tags.length > 0) {
            await Promise.allSettled(
              verse.tags.map((slug) =>
                apiRequest(OpenAPI, {
                  method: "POST",
                  url: "/api/verses/{externalVerseId}/tags",
                  path: {
                    externalVerseId: verse.externalVerseId,
                  },
                  body: {
                    tagSlug: slug,
                  },
                  mediaType: "application/json",
                })
              )
            );
          }
        } else {
          await apiRequest(OpenAPI, {
            method: "PUT",
            url: "/api/verses/{externalVerseId}/tags",
            path: {
              externalVerseId: verse.externalVerseId,
            },
            body: {
              tagSlugs: verse.tags,
            },
            mediaType: "application/json",
          });
        }

        await loadTrainingVersesForDashboard(tid);
        await Promise.all([
          loadDashboardStats(tid),
          loadDashboardLeaderboard(tid),
          loadDashboardFriendsActivity(tid),
        ]);

        setVerseListExternalSyncVersion((prev) => prev + 1);

        showVerseActionToast({
          kind: "add-to-my",
          reference: verse.reference,
        });
      } catch (err) {
        const errorMessage = (err as ApiError)?.body?.error as string;
        console.error("Не удалось добавить стих:", errorMessage);
        toast.error(errorMessage ?? "Не удалось добавить стих", {
          label: "Коллекция",
        });
        throw err;
      }
    },
    [
      loadDashboardFriendsActivity,
      loadDashboardLeaderboard,
      loadDashboardStats,
      loadTrainingVersesForDashboard,
    ]
  );

  useEffect(() => {
    if (isBootstrapping || hasNotifiedInitialContentReadyRef.current) return;
    hasNotifiedInitialContentReadyRef.current = true;
    onInitialContentReady?.();
  }, [isBootstrapping, onInitialContentReady]);

  useEffect(() => {
    prefetchedPagesRef.current.add(nav.currentPage);
  }, [nav.currentPage]);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    const idleHandle = scheduleIdleTask(() => {
      const pagesToPrefetch = (Object.keys(ROOT_PAGE_MODULE_LOADERS) as AppRootPage[])
        .filter((page) => page !== nav.currentPage);

      void Promise.allSettled(pagesToPrefetch.map((page) => prefetchRootPage(page)));
      void Promise.allSettled(AUXILIARY_MODULE_LOADERS.map((loader) => loader()));
    });

    return () => {
      cancelIdleTask(idleHandle);
    };
  }, [isBootstrapping, nav.currentPage, prefetchRootPage]);

  useEffect(() => {
    if (nav.currentPage !== "training" && isTrainingSessionFullscreen) {
      setIsTrainingSessionFullscreen(false);
    }
  }, [isTrainingSessionFullscreen, nav.currentPage]);

  useEffect(() => {
    if (!isTrainingSessionFullscreen && pendingMutationRefetchRef.current && telegramId) {
      pendingMutationRefetchRef.current = false;
      dashboardFetchFailedRef.current.stats = false;
      dashboardFetchFailedRef.current.leaderboard = false;
      dashboardFetchFailedRef.current.friendsActivity = false;
      trainingVersesFetchFailedRef.current = false;
      void loadTrainingVersesForDashboard(telegramId);
      void loadDashboardStats(telegramId);
      void loadDashboardLeaderboard(telegramId);
      void loadDashboardFriendsActivity(telegramId);
    }
  }, [
    dashboardFetchFailedRef,
    isTrainingSessionFullscreen,
    loadDashboardFriendsActivity,
    loadDashboardLeaderboard,
    loadDashboardStats,
    loadTrainingVersesForDashboard,
    telegramId,
    trainingVersesFetchFailedRef,
  ]);

  return (
    <>
      <div
        aria-hidden={false}
        className="h-dvh transition-colors"
      >
        <Layout
          currentPage={nav.currentPage}
          onNavigate={nav.handleRootNavigate}
          onNavigateIntent={handleRootPagePrefetchIntent}
          isContentReady={!isBootstrapping}
          hideChrome={nav.currentPage === "training" && isTrainingSessionFullscreen}
          contentMode={
            nav.currentPage === "dashboard"
              ? "fit"
              : nav.currentPage === "training" || nav.currentPage === "verses"
                ? "fit-strict"
                : "scroll"
          }
        >
          <div className="relative h-full min-h-0">
            {(shouldKeepRootPagesAlive || nav.currentPage === "dashboard") && (
              <section
                aria-busy={isBootstrapping}
                aria-hidden={nav.currentPage !== "dashboard"}
                className={cn(
                  "h-full min-h-0",
                  nav.currentPage === "dashboard"
                    ? "relative"
                    : "pointer-events-none absolute inset-0 overflow-hidden opacity-0",
                )}
              >
                <Dashboard
                  todayVerses={verses}
                  dashboardStats={dashboardStats}
                  isDashboardStatsLoading={isDashboardStatsLoading}
                  dashboardLeaderboard={dashboardLeaderboard}
                  isDashboardLeaderboardLoading={isDashboardLeaderboardLoading}
                  dashboardFriendsActivity={dashboardFriendsActivity}
                  isDashboardFriendsActivityLoading={isDashboardFriendsActivityLoading}
                  currentTelegramId={telegramId}
                  currentUserAvatarUrl={currentUserAvatarUrl}
                  onOpenTraining={handleOpenTraining}
                  onOpenPlayerProfile={handleOpenPlayerProfile}
                  onLeaderboardWindowRequest={handleLeaderboardWindowRequest}
                  isInitializingData={isBootstrapping}
                />
              </section>
            )}

            {(shouldKeepRootPagesAlive || nav.currentPage === "verses") && (
              <section
                aria-hidden={nav.currentPage !== "verses"}
                className={cn(
                  "h-full min-h-0",
                  nav.currentPage === "verses"
                    ? "relative"
                    : "pointer-events-none absolute inset-0 overflow-hidden opacity-0",
                )}
              >
                <VerseList
                  onVerseAdded={handleVerseAdded}
                  reopenGalleryVerseId={null}
                  reopenGalleryStatusFilter={
                    nav.pendingVerseListReturn?.statusFilter ?? null
                  }
                  onReopenGalleryHandled={nav.handleVerseListReturnHandled}
                  verseListExternalSyncVersion={verseListExternalSyncVersion}
                  onVerseMutationCommitted={handleVerseListMutationCommitted}
                  onNavigateToTraining={nav.handleNavigateToTrainingWithVerse}
                  telegramId={telegramId}
                  hasFriends={hasVerseListFriends}
                  onFriendsChanged={handleFriendsChanged}
                  onOpenPlayerProfile={handleOpenPlayerProfile}
                  isAnchorEligible={
                    (dashboardStats?.reviewVerses ?? 0) >= 10 ||
                    (dashboardStats?.masteredCount ?? 0) >= 10
                  }
                />
              </section>
            )}

            {nav.currentPage === "training" && (
              <section className="relative h-full min-h-0">
                <Training
                  allVerses={verses}
                  isLoadingVerses={isTrainingVersesLoading && !hasLoadedTrainingVerses}
                  dashboardStats={dashboardStats}
                  telegramId={telegramId}
                  directLaunch={nav.trainingDirectLaunch}
                  onDirectLaunchExit={nav.handleDirectLaunchExit}
                  onVersePatched={handleTrainingVersePatched}
                  onRequestVerseSelection={() => nav.pushPage("verses")}
                  onVerseMutationCommitted={handleVerseListMutationCommitted}
                  onSessionFullscreenChange={setIsTrainingSessionFullscreen}
                />
              </section>
            )}

            {(shouldKeepRootPagesAlive || nav.currentPage === "profile") && (
              <section
                aria-hidden={nav.currentPage !== "profile"}
                className={cn(
                  "h-full min-h-0",
                  nav.currentPage === "profile"
                    ? "relative"
                    : "pointer-events-none absolute inset-0 overflow-hidden opacity-0",
                )}
              >
                <Profile
                  theme={theme}
                  onToggleTheme={handleToggleTheme}
                  telegramId={telegramId}
                  currentUserAvatarUrl={currentUserAvatarUrl}
                  onFriendsChanged={handleFriendsChanged}
                  onOpenPlayerProfile={handleOpenPlayerProfile}
                  friendsRefreshVersion={friendsRefreshVersion}
                />
              </section>
            )}
          </div>
        </Layout>
      </div>

      <AddVerseDialog
        open={showAddVerseDialog}
        viewerTelegramId={telegramId}
        onClose={() => setShowAddVerseDialog(false)}
        onAdd={handleVerseAdded}
      />

      <PlayerProfileDrawer
        viewerTelegramId={telegramId}
        preview={activePlayerProfile}
        open={isPlayerProfileDrawerOpen}
        onOpenChange={handlePlayerProfileDrawerOpenChange}
        onFriendsChanged={handleFriendsChanged}
      />
      <Toaster />
    </>
  );
}
