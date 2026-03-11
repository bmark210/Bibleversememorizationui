"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { toast } from "@/app/lib/toast";
import {
  getTelegramWebApp,
  getTelegramWebAppUser,
} from "@/app/lib/telegramWebApp";
import { Toaster } from "./components/ui/toaster";
import { OpenAPI } from "@/api/core/OpenAPI";
import { request as apiRequest } from "@/api/core/request";
import { UsersService } from "@/api/services/UsersService";
import type { ApiError } from "@/api/core/ApiError";
import { UserVersesService } from "@/api/services/UserVersesService";
import {
  fetchAllUserVerses,
} from "@/api/services/userVersesPagination";
import {
  fetchDashboardLeaderboard,
  type DashboardLeaderboard,
} from "@/api/services/leaderboard";
import {
  fetchDashboardFriendsActivity,
  fetchFriendsPage,
  type DashboardFriendsActivity,
  type FriendPlayerListItem,
} from "@/api/services/friends";
import {
  fetchUserDashboardStats,
  type UserDashboardStats,
} from "@/api/services/userStats";
import { VerseStatus } from "@/shared/domain/verseStatus";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import type { VersePatchEvent } from "@/app/types/verseSync";
import {
  getVerseSyncKey,
  mergeVersePatch,
} from "@/app/utils/versePatch";
import type { ProgressMapAction } from "./components/ProgressMap";

const VerseList = dynamic(
  () => import("./components/VerseList").then((m) => m.VerseList),
  {
    loading: () => <div className="min-h-[60vh]" />,
  }
);

const Profile = dynamic(
  () => import("./components/Profile").then((m) => m.Profile),
  {
    loading: () => <div className="min-h-[60vh]" />,
  }
);

const AddVerseDialog = dynamic(
  () => import("./components/AddVerseDialog").then((m) => m.AddVerseDialog),
  {
    loading: () => null,
  }
);

const Training = dynamic(
  () => import("./components/Training").then((m) => m.Training),
  {
    loading: () => <div className="min-h-[60vh]" />,
  }
);

const ProgressMap = dynamic(
  () => import("./components/ProgressMap").then((m) => m.ProgressMap),
  {
    loading: () => <div className="min-h-[60vh]" />,
  }
);

const PlayerProfileDrawer = dynamic(
  () => import("./components/PlayerProfileDrawer").then((m) => m.PlayerProfileDrawer),
  {
    loading: () => null,
  }
);

// Frontend verse model — matches the VerseCardDto shape returned by the API.
// externalVerseId is the primary identifier:
// - single verse: "book-chapter-verse"
// - chapter range: "book-chapter-verseStart-verseEnd"
export type Verse = {
  id?: string | number;
  externalVerseId: string;
  status: DisplayVerseStatus;
  masteryLevel: number;
  repetitions: number;
  lastTrainingModeId?: number | null;
  lastReviewedAt: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  translation?: string;
  nextReview?: string | null;
  nextReviewAt: string | null;
  tags?: Array<{ id: string; slug: string; title: string }>;
  popularityScope?: "friends" | "players" | "self";
  popularityValue?: number;
  popularityPreviewUsers?: Array<{
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }>;
  text: string;
  reference: string;
};

type AppVerseApiRecord = {
  id?: string | number | null;
  externalVerseId?: string | number | null;
  status?: string | null;
  masteryLevel?: number | null;
  repetitions?: number | null;
  lastTrainingModeId?: number | null;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  tags?: Array<{ id: string; slug: string; title: string }> | null;
  popularityScope?: "friends" | "players" | "self" | null;
  popularityValue?: number | null;
  popularityPreviewUsers?:
    | Array<{
        telegramId?: string | null;
        name?: string | null;
        avatarUrl?: string | null;
      }>
    | null;
  text?: string | null;
  reference?: string | null;
};

type Page =
  | "dashboard"
  | "verses"
  | "training"
  | "progress-map"
  // | "collections"
  // | "stats"
  | "profile";

type RootPage = Exclude<Page, "progress-map">;

type Theme = "light" | "dark";
type PlayerProfilePreview = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
};
type IdleTaskHandle = number | ReturnType<typeof setTimeout>;
type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type AppProps = {
  onInitialContentReady?: () => void;
};

const THEME_STORAGE_KEY = "theme";
const DASHBOARD_WELCOME_SEEN_STORAGE_KEY = "bible-memory.dashboard-welcome-seen.v1";
const TRAINING_VERSE_PREFETCH_DELAY_MS = 350;
const TRAINING_VERSE_PREFETCH_TIMEOUT_MS = 1500;
const TELEGRAM_THEME_COLORS: Record<Theme, { background: string; header: string; bottomBar: string }> = {
  light: {
    background: "#ede3d2",
    header: "#f2e8d8",
    bottomBar: "#f2e8d8",
  },
  dark: {
    background: "#1a1410",
    header: "#24201a",
    bottomBar: "#24201a",
  },
};

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;

  const targets = [document.documentElement, document.body].filter(Boolean);
  for (const target of targets) {
    target.classList.remove("light", "dark");
    target.classList.add(theme);
    target.setAttribute("data-theme", theme);
  }

  const foregroundColor = theme === "dark" ? "#f5ead5" : "#2b2015";

  document.documentElement.style.colorScheme = theme;
  document.body.style.colorScheme = theme;
  document.documentElement.style.color = foregroundColor;
  document.body.style.color = foregroundColor;
}

function getTelegramColorScheme(): Theme | null {
  const colorScheme = getTelegramWebApp()?.colorScheme;
  return colorScheme === "light" || colorScheme === "dark" ? colorScheme : null;
}

function syncTelegramChromeTheme(theme: Theme) {
  const webApp = getTelegramWebApp();
  if (!webApp) return;

  const palette = TELEGRAM_THEME_COLORS[theme];

  try {
    if (typeof webApp.setBackgroundColor === "function") {
      webApp.setBackgroundColor(palette.background);
    }
  } catch (error) {
    console.warn("Telegram setBackgroundColor failed:", error);
  }

  try {
    if (typeof webApp.setHeaderColor === "function") {
      webApp.setHeaderColor(palette.header);
    }
  } catch (error) {
    console.warn("Telegram setHeaderColor failed:", error);
  }

  try {
    if (typeof webApp.setBottomBarColor === "function") {
      webApp.setBottomBarColor(palette.bottomBar);
    }
  } catch (error) {
    console.warn("Telegram setBottomBarColor failed:", error);
  }
}

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = readStoredTheme();
  if (stored) return stored;
  const telegramTheme = getTelegramColorScheme();
  if (telegramTheme) return telegramTheme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function scheduleIdleTask(callback: () => void): IdleTaskHandle | null {
  if (typeof window === "undefined") return null;

  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.requestIdleCallback === "function") {
    return idleWindow.requestIdleCallback(() => callback(), {
      timeout: TRAINING_VERSE_PREFETCH_TIMEOUT_MS,
    });
  }

  return setTimeout(callback, TRAINING_VERSE_PREFETCH_DELAY_MS);
}

function cancelIdleTask(handle: IdleTaskHandle | null) {
  if (handle == null || typeof window === "undefined") return;

  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.cancelIdleCallback === "function" && typeof handle === "number") {
    idleWindow.cancelIdleCallback(handle);
    return;
  }

  clearTimeout(handle);
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortByUpdatedAtDesc(a: Verse, b: Verse) {
  const aUpdated = parseDateValue(a.updatedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bUpdated = parseDateValue(b.updatedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aUpdated !== bUpdated) return bUpdated - aUpdated;

  const aLast = parseDateValue(a.lastReviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bLast = parseDateValue(b.lastReviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aLast !== bLast) return bLast - aLast;

  const aCreated = parseDateValue(a.createdAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bCreated = parseDateValue(b.createdAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aCreated !== bCreated) return bCreated - aCreated;

  return String(a.externalVerseId ?? a.id).localeCompare(String(b.externalVerseId ?? b.id));
}

function mapUserVerseToAppVerse(verse: AppVerseApiRecord): Verse {
  return {
    id: verse.id ?? undefined,
    externalVerseId: String(verse.externalVerseId ?? ""),
    status: normalizeDisplayVerseStatus(verse.status),
    masteryLevel: Math.max(0, Math.round(Number(verse.masteryLevel ?? 0))),
    repetitions: Math.max(0, Math.round(Number(verse.repetitions ?? 0))),
    lastTrainingModeId: verse.lastTrainingModeId ?? null,
    lastReviewedAt: verse.lastReviewedAt ?? null,
    createdAt: verse.createdAt ?? null,
    updatedAt: verse.updatedAt ?? null,
    nextReviewAt: verse.nextReviewAt ?? null,
    tags: verse.tags ?? [],
    popularityScope: verse.popularityScope ?? undefined,
    popularityValue: verse.popularityValue ?? undefined,
    popularityPreviewUsers:
      verse.popularityPreviewUsers
        ?.map((user) => {
          const telegramId = String(user.telegramId ?? "").trim();
          const name = String(user.name ?? "").trim();
          if (!telegramId || !name) return null;
          return {
            telegramId,
            name,
            avatarUrl:
              typeof user.avatarUrl === "string" && user.avatarUrl.trim()
                ? user.avatarUrl.trim()
                : null,
          };
        })
        .filter(
          (
            user
          ): user is {
            telegramId: string;
            name: string;
            avatarUrl: string | null;
          } => user != null
        ) ?? [],
    text: String(verse.text ?? ""),
    reference: String(verse.reference ?? verse.externalVerseId ?? ""),
  };
}

function isTrainingDashboardVerse(verse: Verse) {
  const status = normalizeDisplayVerseStatus(verse.status);
  return status === VerseStatus.LEARNING || status === "REVIEW";
}

function pickTrainingDashboardVerses(allVerses: Array<Verse>): Array<Verse> {
  return allVerses.filter(isTrainingDashboardVerse).sort(sortByUpdatedAtDesc);
}

function isDueReviewVerse(verse: Pick<Verse, "status" | "nextReviewAt">) {
  if (normalizeDisplayVerseStatus(verse.status) !== "REVIEW") return false;
  if (!verse.nextReviewAt) return true;
  const nextReviewTime = new Date(verse.nextReviewAt).getTime();
  return Number.isNaN(nextReviewTime) || nextReviewTime <= Date.now();
}

export default function App({ onInitialContentReady }: AppProps) {
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());
  const [pageStack, setPageStack] = useState<Page[]>(["dashboard"]);
  const [showAddVerseDialog, setShowAddVerseDialog] = useState(false);
  const [verseListExternalSyncVersion, setVerseListExternalSyncVersion] = useState(0);
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [hasLoadedTrainingVerses, setHasLoadedTrainingVerses] = useState(false);
  const [isTrainingVersesLoading, setIsTrainingVersesLoading] = useState(false);
  const [trainingDirectLaunch, setTrainingDirectLaunch] = useState<{ verse: Verse } | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<UserDashboardStats | null>(null);
  const [isDashboardStatsLoading, setIsDashboardStatsLoading] = useState(false);
  const [dashboardLeaderboard, setDashboardLeaderboard] = useState<DashboardLeaderboard | null>(null);
  const [isDashboardLeaderboardLoading, setIsDashboardLeaderboardLoading] = useState(false);
  const [dashboardFriendsActivity, setDashboardFriendsActivity] = useState<DashboardFriendsActivity | null>(null);
  const [isDashboardFriendsActivityLoading, setIsDashboardFriendsActivityLoading] = useState(false);
  const [progressMapFriends, setProgressMapFriends] = useState<FriendPlayerListItem[]>([]);
  const [isProgressMapFriendsLoading, setIsProgressMapFriendsLoading] = useState(false);
  const [isTrainingSessionFullscreen, setIsTrainingSessionFullscreen] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [friendsRefreshVersion, setFriendsRefreshVersion] = useState(0);
  const [activePlayerProfile, setActivePlayerProfile] =
    useState<PlayerProfilePreview | null>(null);
  const [isPlayerProfileDrawerOpen, setIsPlayerProfileDrawerOpen] =
    useState(false);
  const currentPage = pageStack[pageStack.length - 1] ?? "dashboard";

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (window.localStorage.getItem(DASHBOARD_WELCOME_SEEN_STORAGE_KEY) === "1") {
        return;
      }
    } catch {
      return;
    }

    const markDashboardWelcomeSeen = () => {
      try {
        if (window.localStorage.getItem(DASHBOARD_WELCOME_SEEN_STORAGE_KEY) !== "1") {
          window.localStorage.setItem(DASHBOARD_WELCOME_SEEN_STORAGE_KEY, "1");
        }
      } catch {
        // Ignore storage write errors in restricted webviews.
      }
    };

    window.addEventListener("pagehide", markDashboardWelcomeSeen, { once: true });
    window.addEventListener("beforeunload", markDashboardWelcomeSeen, { once: true });

    return () => {
      window.removeEventListener("pagehide", markDashboardWelcomeSeen);
      window.removeEventListener("beforeunload", markDashboardWelcomeSeen);
    };
  }, []);
  const hasNotifiedInitialContentReadyRef = useRef(false);
  const previousPageRef = useRef<Page>("dashboard");
  const dashboardStatsRequestIdRef = useRef(0);
  const dashboardLeaderboardRequestIdRef = useRef(0);
  const dashboardFriendsActivityRequestIdRef = useRef(0);
  const trainingVersesRequestIdRef = useRef(0);
  const trainingVersesPromiseRef = useRef<Promise<Array<Verse>> | null>(null);
  const trainingVersesPrefetchHandleRef = useRef<IdleTaskHandle | null>(null);
  const progressMapFriendsRequestIdRef = useRef(0);
  const hasLoadedProgressMapFriendsRef = useRef(false);
  const canGoBackInApp = pageStack.length > 1;
  const isDashboardRootPage = currentPage === "dashboard" && !canGoBackInApp;
  const hasVerseListFriends =
    (dashboardFriendsActivity?.summary.friendsTotal ?? 0) > 0;

  useEffect(() => {
    applyThemeToDocument(theme);
    writeStoredTheme(theme);
    syncTelegramChromeTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const webApp = getTelegramWebApp();
    if (!webApp || typeof webApp.onEvent !== "function" || typeof webApp.offEvent !== "function") {
      return;
    }

    const handleTelegramThemeChanged = () => {
      // Telegram can re-apply its own theme styles; enforce app-selected theme again.
      applyThemeToDocument(theme);
      syncTelegramChromeTheme(theme);
    };

    webApp.onEvent?.("themeChanged", handleTelegramThemeChanged);
    return () => {
      webApp.offEvent?.("themeChanged", handleTelegramThemeChanged);
    };
  }, [theme]);

  useEffect(() => {
    return () => {
      cancelIdleTask(trainingVersesPrefetchHandleRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedTrainingVerses) return;
    cancelIdleTask(trainingVersesPrefetchHandleRef.current);
  }, [hasLoadedTrainingVerses]);

  const loadDashboardStats = useCallback(async (telegramIdValue: string) => {
    if (!telegramIdValue) return null;

    const requestId = ++dashboardStatsRequestIdRef.current;
    setIsDashboardStatsLoading(true);

    try {
      const nextStats = await fetchUserDashboardStats(telegramIdValue);
      if (dashboardStatsRequestIdRef.current === requestId) {
        setDashboardStats(nextStats);
      }
      return nextStats;
    } catch (error) {
      console.error("Не удалось получить статистику пользователя:", error);
      if (dashboardStatsRequestIdRef.current === requestId) {
        setDashboardStats(null);
      }
      return null;
    } finally {
      if (dashboardStatsRequestIdRef.current === requestId) {
        setIsDashboardStatsLoading(false);
      }
    }
  }, []);

  const loadDashboardLeaderboard = useCallback(async (telegramIdValue: string) => {
    if (!telegramIdValue) return null;

    const requestId = ++dashboardLeaderboardRequestIdRef.current;
    setIsDashboardLeaderboardLoading(true);

    try {
      const nextLeaderboard = await fetchDashboardLeaderboard({
        telegramId: telegramIdValue,
        limit: 4,
      });
      if (dashboardLeaderboardRequestIdRef.current === requestId) {
        setDashboardLeaderboard(nextLeaderboard);
      }
      return nextLeaderboard;
    } catch (error) {
      console.error("Не удалось получить лидерборд:", error);
      if (dashboardLeaderboardRequestIdRef.current === requestId) {
        setDashboardLeaderboard(null);
      }
      return null;
    } finally {
      if (dashboardLeaderboardRequestIdRef.current === requestId) {
        setIsDashboardLeaderboardLoading(false);
      }
    }
  }, []);

  const loadDashboardFriendsActivity = useCallback(async (telegramIdValue: string) => {
    if (!telegramIdValue) return null;

    const requestId = ++dashboardFriendsActivityRequestIdRef.current;
    setIsDashboardFriendsActivityLoading(true);

    try {
      const nextFriendsActivity = await fetchDashboardFriendsActivity(telegramIdValue, {
        limit: 6,
      });
      if (dashboardFriendsActivityRequestIdRef.current === requestId) {
        setDashboardFriendsActivity(nextFriendsActivity);
      }
      return nextFriendsActivity;
    } catch (error) {
      console.error("Не удалось получить активность друзей:", error);
      if (dashboardFriendsActivityRequestIdRef.current === requestId) {
        setDashboardFriendsActivity(null);
      }
      return null;
    } finally {
      if (dashboardFriendsActivityRequestIdRef.current === requestId) {
        setIsDashboardFriendsActivityLoading(false);
      }
    }
  }, []);

  const loadProgressMapFriends = useCallback(async (telegramIdValue: string) => {
    if (!telegramIdValue) return [];

    const requestId = ++progressMapFriendsRequestIdRef.current;
    setIsProgressMapFriendsLoading(true);

    try {
      const nextFriends: FriendPlayerListItem[] = [];
      const seen = new Set<string>();
      let startWith = 0;
      let totalCount = Number.POSITIVE_INFINITY;

      while (startWith < totalCount) {
        const page = await fetchFriendsPage(telegramIdValue, {
          limit: 50,
          startWith,
        });

        totalCount = page.totalCount;
        for (const item of page.items) {
          if (seen.has(item.telegramId)) continue;
          seen.add(item.telegramId);
          nextFriends.push(item);
        }

        if (page.items.length === 0) break;
        startWith += page.items.length;
      }

      nextFriends.sort((a, b) => {
        if (b.masteredVerses !== a.masteredVerses) {
          return b.masteredVerses - a.masteredVerses;
        }
        if (b.weeklyRepetitions !== a.weeklyRepetitions) {
          return b.weeklyRepetitions - a.weeklyRepetitions;
        }
        return a.telegramId.localeCompare(b.telegramId);
      });

      if (progressMapFriendsRequestIdRef.current === requestId) {
        setProgressMapFriends(nextFriends);
      }

      return nextFriends;
    } catch (error) {
      console.error("Не удалось получить друзей для карты:", error);
      if (progressMapFriendsRequestIdRef.current === requestId) {
        setProgressMapFriends([]);
      }
      return [];
    } finally {
      if (progressMapFriendsRequestIdRef.current === requestId) {
        setIsProgressMapFriendsLoading(false);
      }
    }
  }, []);

  const pushPage = useCallback((page: Page) => {
    setPageStack((prev) => {
      const activePage = prev[prev.length - 1] ?? "dashboard";
      if (activePage === page) return prev;
      return [...prev, page];
    });
  }, []);

  const handleRootNavigate = useCallback((page: string) => {
    const nextPage = page as RootPage;

    setPageStack((prev) => {
      const activePage = prev[prev.length - 1] ?? "dashboard";
      if (activePage === nextPage && prev.length === 1) {
        return prev;
      }
      return [nextPage];
    });

    setTrainingDirectLaunch(null);
  }, []);

  const handleNavigateBackInApp = useCallback(() => {
    setPageStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  useEffect(() => {
    const previousPage = previousPageRef.current;
    previousPageRef.current = currentPage;

    const hasEnteredDashboard =
      currentPage === "dashboard" && previousPage !== "dashboard";
    if (!hasEnteredDashboard || !telegramId) return;

    void loadDashboardFriendsActivity(telegramId);
  }, [currentPage, loadDashboardFriendsActivity, telegramId]);

  useEffect(() => {
    if (currentPage !== "progress-map" || !telegramId) return;
    if (hasLoadedProgressMapFriendsRef.current) return;

    hasLoadedProgressMapFriendsRef.current = true;
    void loadProgressMapFriends(telegramId);
  }, [currentPage, loadProgressMapFriends, telegramId]);

  const handleToggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const loadAllUserVerses = useCallback(async (telegramIdValue: string) => {
    try {
      const response = await fetchAllUserVerses({ telegramId: telegramIdValue });
      const allVerses = response as Array<AppVerseApiRecord>;
      return allVerses;
    } catch (err) {
      console.error("Не удалось получить стихи пользователя:", err);
      throw err;
    }
  }, []);

  const loadTrainingVersesForDashboard = useCallback(async (telegramIdValue: string) => {
    if (!telegramIdValue) return [];
    if (trainingVersesPromiseRef.current) {
      return trainingVersesPromiseRef.current;
    }

    const requestId = ++trainingVersesRequestIdRef.current;
    setIsTrainingVersesLoading(true);

    const requestPromise = loadAllUserVerses(telegramIdValue)
      .then((allVerses) => {
        const trainingPool = pickTrainingDashboardVerses(
          allVerses.map((verse) => mapUserVerseToAppVerse(verse))
        );

        if (trainingVersesRequestIdRef.current === requestId) {
          setVerses(trainingPool);
          setHasLoadedTrainingVerses(true);
        }

        return trainingPool;
      })
      .catch((err) => {
        if (trainingVersesRequestIdRef.current === requestId) {
          setVerses([]);
          setHasLoadedTrainingVerses(false);
        }
        throw err;
      })
      .finally(() => {
        if (trainingVersesPromiseRef.current === requestPromise) {
          trainingVersesPromiseRef.current = null;
        }
        if (trainingVersesRequestIdRef.current === requestId) {
          setIsTrainingVersesLoading(false);
        }
      });

    trainingVersesPromiseRef.current = requestPromise;
    return requestPromise;
  }, [loadAllUserVerses]);

  const ensureTrainingVersesLoaded = useCallback(
    async (telegramIdValue?: string | null) => {
      const resolvedTelegramId =
        telegramIdValue?.trim() ??
        telegramId?.trim() ??
        (typeof window !== "undefined" ? window.localStorage.getItem("telegramId") ?? "" : "");

      if (!resolvedTelegramId) {
        return verses;
      }

      if (trainingVersesPromiseRef.current) {
        return trainingVersesPromiseRef.current;
      }

      if (hasLoadedTrainingVerses) {
        return verses;
      }

      return loadTrainingVersesForDashboard(resolvedTelegramId);
    },
    [hasLoadedTrainingVerses, loadTrainingVersesForDashboard, telegramId, verses]
  );

  const scheduleTrainingVersePrefetch = useCallback(
    (telegramIdValue: string) => {
      cancelIdleTask(trainingVersesPrefetchHandleRef.current);
      trainingVersesPrefetchHandleRef.current = scheduleIdleTask(() => {
        if (hasLoadedTrainingVerses || trainingVersesPromiseRef.current) {
          return;
        }

        void loadTrainingVersesForDashboard(telegramIdValue).catch((error) => {
          console.warn("Не удалось предзагрузить стихи для тренировки:", error);
        });
      });
    },
    [hasLoadedTrainingVerses, loadTrainingVersesForDashboard]
  );

  // Инициализация пользователя в окружении Telegram (idempotent).
  useEffect(() => {
    let isMounted = true;

    const finishBootstrapping = () => {
      if (isMounted) {
        setIsBootstrapping(false);
      }
    };

    void (async () => {
      const telegramWebUser = getTelegramWebAppUser();
      const telegramId =
        telegramWebUser?.id?.toString() ??
        process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID ??
        localStorage.getItem("telegramId") ??
        undefined;

      const telegramName = [telegramWebUser?.first_name, telegramWebUser?.last_name]
        .map((part: unknown) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" ")
        .trim();
      const telegramNickname = String(telegramWebUser?.username ?? "").trim();
      const telegramAvatarUrl = String(telegramWebUser?.photo_url ?? "").trim();

      if (!telegramId) {
        setDashboardStats(null);
        setDashboardLeaderboard(null);
        setDashboardFriendsActivity(null);
        finishBootstrapping();
        return;
      }
      setTelegramId(telegramId);
      localStorage.setItem("telegramId", telegramId);

      if (telegramWebUser?.id) {
        try {
          await apiRequest(OpenAPI, {
            method: "POST",
            url: "/api/users/telegram",
            body: {
              telegramId,
              ...(telegramName ? { name: telegramName } : {}),
              ...(telegramNickname ? { nickname: telegramNickname } : {}),
              ...(telegramAvatarUrl ? { avatarUrl: telegramAvatarUrl } : {}),
            },
            mediaType: "application/json",
          });
        } catch (error) {
          console.warn("Не удалось синхронизировать профиль Telegram:", error);
        }
      } else {
        // Browser/dev fallback: make sure the user row exists before loading paginated verses/stats.
        try {
          await UsersService.postApiUsers({
            telegramId,
            ...(telegramName ? { name: telegramName } : {}),
            ...(telegramNickname ? { nickname: telegramNickname } : {}),
            ...(telegramAvatarUrl ? { avatarUrl: telegramAvatarUrl } : {}),
          });
        } catch (error) {
          console.warn("Не удалось инициализировать пользователя:", error);
        }
      }

      try {
        await Promise.all([
          loadDashboardStats(telegramId),
          loadDashboardLeaderboard(telegramId),
          loadDashboardFriendsActivity(telegramId),
        ]);
      } catch (err) {
        console.error("Не удалось получить данные дашборда:", err);
        toast.error("Ошибка при подключении к базе данных");
      } finally {
        finishBootstrapping();
        scheduleTrainingVersePrefetch(telegramId);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    loadDashboardFriendsActivity,
    loadDashboardLeaderboard,
    loadDashboardStats,
    scheduleTrainingVersePrefetch,
  ]);

  useEffect(() => {
    if (!telegramId) return;
    if (currentPage !== "training" && currentPage !== "progress-map") return;
    if (hasLoadedTrainingVerses || trainingVersesPromiseRef.current) return;

    void loadTrainingVersesForDashboard(telegramId);
  }, [currentPage, hasLoadedTrainingVerses, loadTrainingVersesForDashboard, telegramId]);


  const handleTrainingVersePatched = (event: VersePatchEvent) => {
    setVerses((prev) =>
      prev.map((verse) =>
        getVerseSyncKey(verse) === getVerseSyncKey(event.target)
          ? mergeVersePatch(verse, event.patch)
          : verse
      )
    );
  };

  /** Navigate to Training section and start a session for a specific verse */
  const handleNavigateToTrainingWithVerse = useCallback((verse: Verse) => {
    setTrainingDirectLaunch({ verse });
    pushPage("training");
  }, [pushPage]);

  const handleDirectLaunchConsumed = useCallback(() => {
    setTrainingDirectLaunch(null);
  }, []);

  const handleTelegramExitRequest = useCallback(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    if (typeof webApp.showPopup === "function") {
      webApp.showPopup(
        {
          title: "Выйти из B Memory?",
          message: "Приложение закроется, но вы сможете вернуться в него из чата в любой момент.",
          buttons: [
            { id: "stay", type: "cancel", text: "Остаться" },
            { id: "close", type: "destructive", text: "Выйти" },
          ],
        },
        (buttonId) => {
          if (buttonId === "close") {
            webApp.close?.();
          }
        }
      );
      return;
    }

    webApp.close?.();
  }, []);

  const handleTelegramBack = useCallback(() => {
    if (showAddVerseDialog) {
      setShowAddVerseDialog(false);
      return;
    }

    handleNavigateBackInApp();
  }, [
    handleNavigateBackInApp,
    showAddVerseDialog,
  ]);

  useTelegramBackButton({
    enabled: showAddVerseDialog || canGoBackInApp,
    onBack: handleTelegramBack,
    priority: 10,
  });

  const handleVerseListMutationCommitted = () => {
    if (!telegramId) return;
    void loadTrainingVersesForDashboard(telegramId);
    void loadDashboardStats(telegramId);
    void loadDashboardLeaderboard(telegramId);
  };

  const handleFriendsChanged = () => {
    setFriendsRefreshVersion((prev) => prev + 1);
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (!telegramIdValue) return;
    hasLoadedProgressMapFriendsRef.current = false;
    void loadDashboardFriendsActivity(telegramIdValue);
    if (currentPage === "progress-map") {
      void loadProgressMapFriends(telegramIdValue);
    }
  };

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

  const openProgressMapTraining = useCallback(async (action: Exclude<ProgressMapAction, "open-verses">) => {
    let nextTrainingVerses = verses;

    if (!hasLoadedTrainingVerses) {
      try {
        nextTrainingVerses = await ensureTrainingVersesLoaded();
      } catch (error) {
        console.error("Не удалось подготовить стихи для тренировки:", error);
        pushPage("training");
        return;
      }
    }

    const targetVerse =
      action === "start-review"
        ? nextTrainingVerses.find(isDueReviewVerse) ??
          nextTrainingVerses.find(
            (verse) => normalizeDisplayVerseStatus(verse.status) === "REVIEW"
          ) ??
          null
        : nextTrainingVerses.find(
            (verse) => normalizeDisplayVerseStatus(verse.status) === VerseStatus.LEARNING
          ) ?? null;

    if (!targetVerse) {
      pushPage("training");
      return;
    }

    handleNavigateToTrainingWithVerse(targetVerse);
  }, [
    ensureTrainingVersesLoaded,
    handleNavigateToTrainingWithVerse,
    hasLoadedTrainingVerses,
    pushPage,
    verses,
  ]);

  const handleProgressMapAction = useCallback((action: ProgressMapAction) => {
    if (action === "open-verses") {
      pushPage("verses");
      return;
    }

    void openProgressMapTraining(action);
  }, [openProgressMapTraining, pushPage]);

  const handleOpenTraining = useCallback(() => {
    if (telegramId) {
      void ensureTrainingVersesLoaded(telegramId);
    }
    pushPage("training");
  }, [ensureTrainingVersesLoaded, pushPage, telegramId]);

  const handleVerseAdded = async (verse: {
    externalVerseId: string;
    reference: string;
    tags: string[]; // tag slugs
    replaceTags?: boolean;
  }): Promise<void> => {
    const telegramId = localStorage.getItem("telegramId") ?? "";

    try {
      // 1) Ensure verse exists in global catalog.
      await UserVersesService.postApiUsersVerses(telegramId, {
        externalVerseId: verse.externalVerseId,
      });

      // 2) Ensure verse is attached to current user progress (MY by default).
      await apiRequest(OpenAPI, {
        method: "PUT",
        url: "/api/users/{telegramId}/verses/{externalVerseId}",
        path: {
          telegramId,
          externalVerseId: verse.externalVerseId,
        },
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
        // Replace verse tags with the exact selection from the modal.
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

      await loadTrainingVersesForDashboard(telegramId);
      await Promise.all([
        loadDashboardStats(telegramId),
        loadDashboardLeaderboard(telegramId),
      ]);

      setVerseListExternalSyncVersion((prev) => prev + 1);

      toast.success("Стих добавлен", {
        description: `${verse.reference} добавлен в ваши стихи.`,
      });
    } catch (err) {
      const errorMessage = (err as ApiError)?.body?.error as string;
      console.error("Не удалось добавить стих:", errorMessage);
      toast.error(errorMessage ?? "Не удалось добавить стих");
      throw err;
    }
  };


  useEffect(() => {
    if (isBootstrapping || hasNotifiedInitialContentReadyRef.current) return;
    hasNotifiedInitialContentReadyRef.current = true;
    onInitialContentReady?.();
  }, [isBootstrapping, onInitialContentReady]);

  useEffect(() => {
    if (currentPage !== "training" && isTrainingSessionFullscreen) {
      setIsTrainingSessionFullscreen(false);
    }
  }, [currentPage, isTrainingSessionFullscreen]);

  return (
    <>
      <div
        aria-hidden={false}
        className="min-h-screen transition-colors"
      >
        <Layout
          currentPage={currentPage}
          onNavigate={handleRootNavigate}
          isContentReady={!isBootstrapping}
          hideChrome={currentPage === "training" && isTrainingSessionFullscreen}
          showTelegramExitButton={
            isDashboardRootPage &&
            !showAddVerseDialog
          }
          onTelegramExit={handleTelegramExitRequest}
        >
          {currentPage === "dashboard" && (
            <div aria-busy={isBootstrapping}>
              <Dashboard
                todayVerses={verses}
                dashboardStats={dashboardStats}
                isDashboardStatsLoading={isDashboardStatsLoading}
                dashboardLeaderboard={dashboardLeaderboard}
                isDashboardLeaderboardLoading={isDashboardLeaderboardLoading}
                dashboardFriendsActivity={dashboardFriendsActivity}
                isDashboardFriendsActivityLoading={isDashboardFriendsActivityLoading}
                currentTelegramId={telegramId}
                onOpenTraining={handleOpenTraining}
                onOpenProfile={() => handleRootNavigate("profile")}
                onOpenPlayerProfile={handleOpenPlayerProfile}
                isInitializingData={isBootstrapping}
              />
            </div>
          )}

          {currentPage === "verses" && (
            <VerseList
              onVerseAdded={handleVerseAdded}
              verseListExternalSyncVersion={verseListExternalSyncVersion}
              onVerseMutationCommitted={handleVerseListMutationCommitted}
              onNavigateToTraining={handleNavigateToTrainingWithVerse}
              telegramId={telegramId}
              hasFriends={hasVerseListFriends}
              onOpenPlayerProfile={handleOpenPlayerProfile}
            />
          )}

          {currentPage === "training" && (
            <Training
              allVerses={verses}
              isLoadingVerses={isTrainingVersesLoading && !hasLoadedTrainingVerses}
              dashboardStats={dashboardStats}
              telegramId={telegramId}
              directLaunch={trainingDirectLaunch}
              onDirectLaunchConsumed={handleDirectLaunchConsumed}
              onVersePatched={handleTrainingVersePatched}
              onRequestVerseSelection={() => pushPage("verses")}
              onVerseMutationCommitted={handleVerseListMutationCommitted}
              onSessionFullscreenChange={setIsTrainingSessionFullscreen}
            />
          )}

          {currentPage === "progress-map" && (
            <ProgressMap
              dashboardStats={dashboardStats}
              dashboardLeaderboard={dashboardLeaderboard}
              trainingVerses={verses}
              friendsOnMap={progressMapFriends}
              isLoading={
                isBootstrapping ||
                (dashboardStats == null && isDashboardStatsLoading) ||
                (dashboardLeaderboard == null && isDashboardLeaderboardLoading)
              }
              isFriendsLoading={isProgressMapFriendsLoading}
              viewerTelegramId={telegramId}
              onAction={handleProgressMapAction}
              onOpenPlayerProfile={handleOpenPlayerProfile}
            />
          )}

          {currentPage === "profile" && (
            <Profile
              theme={theme}
              onToggleTheme={handleToggleTheme}
              telegramId={telegramId}
              onFriendsChanged={handleFriendsChanged}
              onOpenPlayerProfile={handleOpenPlayerProfile}
              friendsRefreshVersion={friendsRefreshVersion}
            />
          )}
        </Layout>
      </div>

      <AddVerseDialog
        open={showAddVerseDialog}
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


      {/* {isTrainingBatchPromptOpen && (
        <div className="fixed inset-0 z-[450] bg-background/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <Card className="w-full max-w-lg p-6 sm:p-7 border-border/70 shadow-xl">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Настройка тренировки</h2>
                <p className="text-sm text-muted-foreground">
                  Выберите, сколько стихов в изучении и сколько повторений загружать за одну тренировку.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Стихов в изучении за раз</div>
                <div className="grid grid-cols-4 gap-2">
                  {MY_VERSE_COUNT_OPTIONS.map((value) => (
                    <Button
                      key={`new-${value}`}
                      type="button"
                      variant={selectedNewVersesCount === value ? "default" : "outline"}
                      onClick={() => setSelectedNewVersesCount(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Стихов в повторении за раз</div>
                <div className="grid grid-cols-4 gap-2">
                  {REVIEW_VERSE_COUNT_OPTIONS.map((value) => (
                    <Button
                      key={`review-${value}`}
                      type="button"
                      variant={selectedReviewVersesCount === value ? "default" : "outline"}
                      onClick={() => setSelectedReviewVersesCount(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => void handleSaveTrainingBatchPreferences()}>
                  Сохранить и продолжить
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )} */}

      <Toaster />
    </>
  );
}

