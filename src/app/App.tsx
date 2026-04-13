"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Layout } from "./components/Layout";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { Toaster } from "./components/ui/toaster";
import type { VersePatchEvent } from "@/app/types/verseSync";
import {
  getVerseSyncKey,
  mergeVersePatch,
} from "@/app/utils/versePatch";
import type { AppRootPage, PlayerProfilePreview } from "@/app/domain/appPages";
import { useAppBootstrap } from "@/app/hooks/app/useAppBootstrap";
import { useAppDataRefetchEffects } from "@/app/hooks/app/useAppDataRefetchEffects";
import { useAppTheme } from "@/app/hooks/app/useAppTheme";
import { useDashboardData } from "@/app/hooks/app/useDashboardData";
import { useAppViewportSync } from "@/app/hooks/app/useAppViewportSync";
import { useTelegramWebAppSetup } from "@/app/hooks/app/useTelegramWebAppSetup";
import { useTrainingVersesPool } from "@/app/hooks/app/useTrainingVersesPool";
import { cancelIdleTask, scheduleIdleTask } from "@/app/lib/idleTask";
import { useScreenStore } from "@/app/stores/screenStore";
import { cn } from "@/app/components/ui/utils";

const loadVerseListModule = () => import("./components/VerseList");
const loadProfileModule = () => import("./components/Profile");
const loadCommunityModule = () => import("./components/Community");
const loadTrainingModule = () => import("./components/Training");
const loadDashboardModule = () => import("./components/Dashboard");
const loadPlayerProfileDrawerModule = () => import("./components/PlayerProfileDrawer");

const ROOT_PAGE_MODULE_LOADERS: Record<AppRootPage, () => Promise<unknown>> = {
  dashboard: loadDashboardModule,
  verses: loadVerseListModule,
  training: loadTrainingModule,
  community: loadCommunityModule,
  profile: loadProfileModule,
};

const ROOT_PAGES: AppRootPage[] = [
  "dashboard",
  "verses",
  "training",
  "community",
  "profile",
];

const AUXILIARY_MODULE_LOADERS = [loadPlayerProfileDrawerModule] as const;

const VerseList = dynamic(() => loadVerseListModule().then((m) => m.VerseList), {
  loading: () => <div className="min-h-[60vh]" />,
});

const Profile = dynamic(() => loadProfileModule().then((m) => m.Profile), {
  loading: () => <div className="min-h-[60vh]" />,
});

const Community = dynamic(
  () => loadCommunityModule().then((m) => m.Community),
  {
    loading: () => <div className="min-h-[60vh]" />,
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
  const [verseListExternalSyncVersion, setVerseListExternalSyncVersion] = useState(0);
  const [isTrainingSessionFullscreen, setIsTrainingSessionFullscreen] = useState(false);
  const [friendsRefreshVersion, setFriendsRefreshVersion] = useState(0);
  const [activePlayerProfile, setActivePlayerProfile] =
    useState<PlayerProfilePreview | null>(null);
  const [isPlayerProfileDrawerOpen, setIsPlayerProfileDrawerOpen] =
    useState(false);

  const { theme, handleToggleTheme } = useAppTheme();

  const activeScreen = useScreenStore((s) => s.active);
  const canGoBack = useScreenStore((s) => s.history.length > 0);
  const trainingDirectLaunch = useScreenStore((s) => s.trainingDirectLaunch);
  const trainingBoxScope = useScreenStore((s) => s.trainingBoxScope);
  const pendingTextBoxReturn = useScreenStore((s) => s.pendingTextBoxReturn);
  const push = useScreenStore((s) => s.push);
  const back = useScreenStore((s) => s.back);
  const navigateToTrainingWithVerse = useScreenStore((s) => s.navigateToTrainingWithVerse);
  const navigateToTrainingBox = useScreenStore((s) => s.navigateToTrainingBox);
  const setTrainingBoxScope = useScreenStore((s) => s.setTrainingBoxScope);
  const onDirectLaunchExit = useScreenStore((s) => s.onDirectLaunchExit);
  const onTextBoxReturnHandled = useScreenStore((s) => s.onTextBoxReturnHandled);

  const availableRootPages = ROOT_PAGES;

  const {
    dashboardStats,
    setDashboardStats,
    dashboardFriendsActivity,
    setDashboardFriendsActivity,
    setDashboardLeaderboard,
    isDashboardStatsLoading,
    dashboardLeaderboard,
    isDashboardLeaderboardLoading,
    isDashboardFriendsActivityLoading,
    loadDashboardStats,
    loadDashboardLeaderboard,
    loadDashboardFriendsActivity,
    dashboardFetchFailedRef,
  } = useDashboardData(telegramId);

  const {
    verses,
    setVerses,
    hasLoadedTrainingVerses,
    loadTrainingVersesForDashboard,
    scheduleTrainingVersePrefetch,
    trainingVersesPromiseRef,
    trainingVersesFetchFailedRef,
  } = useTrainingVersesPool(telegramId, activeScreen);

  useTelegramWebAppSetup();
  useAppViewportSync();

  useAppBootstrap({
    setTelegramId,
    setCurrentUserAvatarUrl,
    setIsBootstrapping,
    setDashboardStats,
    setDashboardLeaderboard,
    setDashboardFriendsActivity,
    loadDashboardStats,
    loadDashboardLeaderboard,
    loadDashboardFriendsActivity,
    scheduleTrainingVersePrefetch,
  });

  useAppDataRefetchEffects({
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
  });

  const hasNotifiedInitialContentReadyRef = useRef(false);
  const pendingMutationRefetchRef = useRef(false);
  const prefetchedPagesRef = useRef<Set<AppRootPage>>(new Set(["dashboard"]));

  const shouldKeepRootPagesAlive = !isBootstrapping;

  useTelegramBackButton({
    enabled: canGoBack,
    onBack: back,
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

    setVerseListExternalSyncVersion((prev) => prev + 1);

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
  }, [
    dashboardFetchFailedRef,
    loadDashboardFriendsActivity,
    telegramId,
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
    push("training");
  }, [push]);

  const prefetchRootPage = useCallback(async (page: AppRootPage) => {
    if (!availableRootPages.includes(page)) {
      return;
    }

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
  }, [availableRootPages]);

  const handleRootPagePrefetchIntent = useCallback((page: string) => {
    const nextPage = page as AppRootPage;

    if (!availableRootPages.includes(nextPage)) {
      return;
    }

    void prefetchRootPage(nextPage);
  }, [availableRootPages, prefetchRootPage]);

  useEffect(() => {
    if (isBootstrapping || hasNotifiedInitialContentReadyRef.current) return;
    hasNotifiedInitialContentReadyRef.current = true;
    onInitialContentReady?.();
  }, [isBootstrapping, onInitialContentReady]);

  useEffect(() => {
    prefetchedPagesRef.current.add(activeScreen);
  }, [activeScreen]);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    const idleHandle = scheduleIdleTask(() => {
      const pagesToPrefetch = availableRootPages.filter(
        (page) => page !== activeScreen,
      );

      void Promise.allSettled(pagesToPrefetch.map((page) => prefetchRootPage(page)));
      void Promise.allSettled(AUXILIARY_MODULE_LOADERS.map((loader) => loader()));
    });

    return () => {
      cancelIdleTask(idleHandle);
    };
  }, [availableRootPages, isBootstrapping, activeScreen, prefetchRootPage]);

  useEffect(() => {
    if (activeScreen !== "training" && isTrainingSessionFullscreen) {
      setIsTrainingSessionFullscreen(false);
    }
  }, [isTrainingSessionFullscreen, activeScreen]);

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
          onNavigateIntent={handleRootPagePrefetchIntent}
          isContentReady={!isBootstrapping}
          hideChrome={activeScreen === "training" && isTrainingSessionFullscreen}
          contentMode={
            activeScreen === "dashboard" || activeScreen === "community" || activeScreen === "profile"
              ? "fit"
              : activeScreen === "training" || activeScreen === "verses"
                ? "fit-strict"
                : "scroll"
          }
        >
          <div className="relative h-full min-h-0">
            {(shouldKeepRootPagesAlive || activeScreen === "dashboard") && (
              <section
                aria-busy={isBootstrapping}
                aria-hidden={activeScreen !== "dashboard"}
                {...(activeScreen !== "dashboard" ? ({ inert: "" } as unknown as React.HTMLAttributes<HTMLElement>) : {})}
                className={cn(
                  "h-full min-h-0",
                  activeScreen === "dashboard"
                    ? "relative"
                    : "pointer-events-none absolute inset-0 overflow-hidden opacity-0",
                )}
              >
                <Dashboard
                  todayVerses={verses}
                  dashboardStats={dashboardStats}
                  isDashboardStatsLoading={isDashboardStatsLoading}
                  currentTelegramId={telegramId}
                  currentUserAvatarUrl={currentUserAvatarUrl}
                  onOpenTraining={handleOpenTraining}
                  onOpenPlayerProfile={handleOpenPlayerProfile}
                  isInitializingData={isBootstrapping}
                />
              </section>
            )}

            {(shouldKeepRootPagesAlive || activeScreen === "verses") && (
              <section
                aria-hidden={activeScreen !== "verses"}
                {...(activeScreen !== "verses" ? ({ inert: "" } as unknown as React.HTMLAttributes<HTMLElement>) : {})}
                className={cn(
                  "h-full min-h-0",
                  activeScreen === "verses"
                    ? "relative"
                    : "pointer-events-none absolute inset-0 overflow-hidden opacity-0",
                )}
              >
                <VerseList
                  reopenTextBoxId={pendingTextBoxReturn?.boxId ?? null}
                  reopenTextBoxTitle={pendingTextBoxReturn?.boxTitle ?? null}
                  onReopenTextBoxHandled={onTextBoxReturnHandled}
                  verseListExternalSyncVersion={verseListExternalSyncVersion}
                  onVerseMutationCommitted={handleVerseListMutationCommitted}
                  onNavigateToTraining={navigateToTrainingWithVerse}
                  onNavigateToTrainingBox={navigateToTrainingBox}
                  telegramId={telegramId}
                />
              </section>
            )}

            {activeScreen === "training" && (
              <section className="relative h-full min-h-0">
                <Training
                  telegramId={telegramId}
                  boxScope={trainingBoxScope}
                  directLaunch={trainingDirectLaunch}
                  onDirectLaunchExit={onDirectLaunchExit}
                  onBoxScopeChange={setTrainingBoxScope}
                  onVersePatched={handleTrainingVersePatched}
                  onVerseMutationCommitted={handleVerseListMutationCommitted}
                  onSessionFullscreenChange={setIsTrainingSessionFullscreen}
                />
              </section>
            )}

            {(shouldKeepRootPagesAlive || activeScreen === "community") && (
              <section
                aria-hidden={activeScreen !== "community"}
                {...(activeScreen !== "community" ? ({ inert: "" } as unknown as React.HTMLAttributes<HTMLElement>) : {})}
                className={cn(
                  "h-full min-h-0",
                  activeScreen === "community"
                    ? "relative"
                    : "pointer-events-none absolute inset-0 overflow-hidden opacity-0",
                )}
              >
                <Community
                  telegramId={telegramId}
                  onFriendsChanged={handleFriendsChanged}
                  onOpenPlayerProfile={handleOpenPlayerProfile}
                  friendsRefreshVersion={friendsRefreshVersion}
                />
              </section>
            )}

            {(shouldKeepRootPagesAlive || activeScreen === "profile") && (
              <section
                aria-hidden={activeScreen !== "profile"}
                {...(activeScreen !== "profile" ? ({ inert: "" } as unknown as React.HTMLAttributes<HTMLElement>) : {})}
                className={cn(
                  "h-full min-h-0",
                  activeScreen === "profile"
                    ? "relative"
                    : "pointer-events-none absolute inset-0 overflow-hidden opacity-0",
                )}
              >
                <Profile
                  theme={theme}
                  onToggleTheme={handleToggleTheme}
                  telegramId={telegramId}
                  currentUserAvatarUrl={currentUserAvatarUrl}
                  onOpenPlayerProfile={handleOpenPlayerProfile}
                />
              </section>
            )}
          </div>
        </Layout>
      </div>

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
