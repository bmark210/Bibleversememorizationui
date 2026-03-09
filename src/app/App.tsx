"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
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
  fetchUserVersesPage,
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
import { VerseStatus } from "@/generated/prisma";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import type { VerseMutablePatch, VersePatchEvent } from "@/app/types/verseSync";
import {
  getVerseSyncKey,
  mergeVersePatch,
  pickMutableVersePatchFromApiResponse,
} from "@/app/utils/versePatch";
import {
  ProgressMap,
  type ProgressMapAction,
} from "./components/ProgressMap";

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

const VerseGallery = dynamic(
  () => import("./components/VerseGallery").then((m) => m.VerseGallery),
  {
    loading: () => <div className="fixed inset-0 z-50" />,
  }
);

const Training = dynamic(
  () => import("./components/Training").then((m) => m.Training),
  {
    loading: () => <div className="min-h-[60vh]" />,
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

type Theme = "light" | "dark";

type AppProps = {
  onInitialContentReady?: () => void;
};

const THEME_STORAGE_KEY = "theme";
const DASHBOARD_WELCOME_SEEN_STORAGE_KEY = "bible-memory.dashboard-welcome-seen.v1";
const TRAINING_GALLERY_PAGE_SIZE = 40;
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
  const shouldReduceMotion = useReducedMotion();
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());
  const [pageStack, setPageStack] = useState<Page[]>(["dashboard"]);
  const [showAddVerseDialog, setShowAddVerseDialog] = useState(false);
  const [verseListExternalSyncVersion, setVerseListExternalSyncVersion] = useState(0);
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [dashboardGalleryVerses, setDashboardGalleryVerses] = useState<Array<Verse>>([]);
  const [dashboardGalleryIndex, setDashboardGalleryIndex] = useState<number | null>(null);
  const [dashboardGalleryLaunchMode, setDashboardGalleryLaunchMode] = useState<"preview" | "training">("preview");
  const [, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<UserDashboardStats | null>(null);
  const [isDashboardStatsLoading, setIsDashboardStatsLoading] = useState(false);
  const [dashboardLeaderboard, setDashboardLeaderboard] = useState<DashboardLeaderboard | null>(null);
  const [isDashboardLeaderboardLoading, setIsDashboardLeaderboardLoading] = useState(false);
  const [dashboardFriendsActivity, setDashboardFriendsActivity] = useState<DashboardFriendsActivity | null>(null);
  const [isDashboardFriendsActivityLoading, setIsDashboardFriendsActivityLoading] = useState(false);
  const [progressMapFriends, setProgressMapFriends] = useState<FriendPlayerListItem[]>([]);
  const [isProgressMapFriendsLoading, setIsProgressMapFriendsLoading] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [dashboardTrainingHasMore, setDashboardTrainingHasMore] = useState(false);
  const [dashboardTrainingIsLoadingMore, setDashboardTrainingIsLoadingMore] = useState(false);
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
  const progressMapFriendsRequestIdRef = useRef(0);
  const hasLoadedProgressMapFriendsRef = useRef(false);
  const dashboardTrainingStartWithRef = useRef(0);
  const dashboardTrainingTotalCountRef = useRef(0);
  const dashboardTrainingHasMoreRef = useRef(false);
  const canGoBackInApp = pageStack.length > 1;
  const isDashboardRootPage = currentPage === "dashboard" && !canGoBackInApp;

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

  const loadDashboardStats = async (telegramIdValue: string) => {
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
  };

  const loadDashboardLeaderboard = async (telegramIdValue: string) => {
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
  };

  const loadDashboardFriendsActivity = async (telegramIdValue: string) => {
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
  };

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
        setIsLoading(false);
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

      const fetchDashboardData = async () => {
        try {
          setIsLoading(true);
          await Promise.all([
            loadTrainingVersesForDashboard(telegramId),
            loadDashboardStats(telegramId),
            loadDashboardLeaderboard(telegramId),
            loadDashboardFriendsActivity(telegramId),
          ]);
        } catch (err) {
          console.error("Не удалось получить данные дашборда:", err);
          toast.error("Ошибка при подключении к базе данных");
          setVerses([]);
        } finally {
          setIsLoading(false);
        }
      };

      await fetchDashboardData();
      finishBootstrapping();
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNavigate = (page: string) => {
    setPageStack((prev) => {
      const nextPage = page as Page;
      const activePage = prev[prev.length - 1] ?? "dashboard";
      if (activePage === nextPage) return prev;
      return [...prev, nextPage];
    });
    setDashboardGalleryIndex(null);
    setDashboardGalleryVerses([]);
    setDashboardGalleryLaunchMode("preview");
  };

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
  }, [currentPage, telegramId]);

  useEffect(() => {
    if (currentPage !== "progress-map" || !telegramId) return;
    if (hasLoadedProgressMapFriendsRef.current) return;

    hasLoadedProgressMapFriendsRef.current = true;
    void loadProgressMapFriends(telegramId);
  }, [currentPage, loadProgressMapFriends, telegramId]);

  const handleToggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const loadAllUserVerses = async (telegramIdValue: string) => {
    try {
      const response = await fetchAllUserVerses({ telegramId: telegramIdValue });
      const allVerses = response as Array<AppVerseApiRecord>;
      return allVerses;
    } catch (err) {
      console.error("Не удалось получить стихи пользователя:", err);
      throw err;
    }
  };

  const loadTrainingVersesForDashboard = async (telegramIdValue: string) => {
    try {
      const allVerses = await loadAllUserVerses(telegramIdValue);
      const trainingPool = pickTrainingDashboardVerses(
        allVerses.map((verse) => mapUserVerseToAppVerse(verse))
      );
      setVerses(trainingPool);
      return trainingPool;
    } catch (err) {
      setVerses([]);
      throw err;
    }
  };

  const mergeVerseListsUnique = (base: Array<Verse>, incoming: Array<Verse>) => {
    if (incoming.length === 0) return base;
    const seen = new Set(base.map((verse) => getVerseSyncKey(verse)));
    const additions = incoming.filter((verse) => {
      const key = getVerseSyncKey(verse);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return additions.length > 0 ? [...base, ...additions] : base;
  };

  const loadDashboardTrainingGalleryChunk = async (
    options?: { reset?: boolean }
  ): Promise<Array<Verse>> => {
    const reset = options?.reset === true;
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (!telegramIdValue) return [];
    if (dashboardTrainingIsLoadingMore) return [];
    if (!reset && !dashboardTrainingHasMoreRef.current) return [];

    if (reset) {
      dashboardTrainingStartWithRef.current = 0;
      dashboardTrainingTotalCountRef.current = 0;
      dashboardTrainingHasMoreRef.current = true;
      setDashboardTrainingHasMore(true);
    }

    setDashboardTrainingIsLoadingMore(true);
    try {
      const page = await fetchUserVersesPage({
        telegramId: telegramIdValue,
        status: VerseStatus.LEARNING,
        orderBy: "createdAt",
        order: "desc",
        limit: TRAINING_GALLERY_PAGE_SIZE,
        startWith: dashboardTrainingStartWithRef.current,
      });

      const mappedChunk = (page.items as Array<AppVerseApiRecord>)
        .map((item) => mapUserVerseToAppVerse(item))
        .filter(isTrainingDashboardVerse)
        .sort(sortByUpdatedAtDesc);

      dashboardTrainingStartWithRef.current += page.items.length;
      dashboardTrainingTotalCountRef.current = page.totalCount;
      const hasMore = dashboardTrainingStartWithRef.current < page.totalCount;
      dashboardTrainingHasMoreRef.current = hasMore;
      setDashboardTrainingHasMore(hasMore);

      if (reset) {
        setDashboardGalleryVerses(mappedChunk);
      } else {
        setDashboardGalleryVerses((prev) => mergeVerseListsUnique(prev, mappedChunk));
      }

      return mappedChunk;
    } catch (error) {
      console.error("Не удалось подгрузить стихи для тренировки:", error);
      dashboardTrainingHasMoreRef.current = false;
      setDashboardTrainingHasMore(false);
      return [];
    } finally {
      setDashboardTrainingIsLoadingMore(false);
    }
  };


  const getVerseKey = (verse: Pick<Verse, "id" | "externalVerseId">) =>
    getVerseSyncKey(verse);

  const applyPatchToDashboardGalleryVerses = (event: VersePatchEvent) => {
    setDashboardGalleryVerses((prev) =>
      prev.map((verse) =>
        getVerseSyncKey(verse) === getVerseSyncKey(event.target)
          ? mergeVersePatch(verse, event.patch)
          : verse
      )
    );
  };

  const handleDashboardGalleryClose = () => {
    setDashboardGalleryIndex(null);
    setDashboardGalleryVerses([]);
    setDashboardGalleryLaunchMode("preview");
    dashboardTrainingStartWithRef.current = 0;
    dashboardTrainingTotalCountRef.current = 0;
    dashboardTrainingHasMoreRef.current = false;
    setDashboardTrainingHasMore(false);
    setDashboardTrainingIsLoadingMore(false);

    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (telegramIdValue) {
      void loadTrainingVersesForDashboard(telegramIdValue);
      void loadDashboardStats(telegramIdValue);
      void loadDashboardLeaderboard(telegramIdValue);
    }
  };

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

    if (dashboardGalleryIndex !== null) {
      handleDashboardGalleryClose();
      return;
    }

    handleNavigateBackInApp();
  }, [
    dashboardGalleryIndex,
    handleDashboardGalleryClose,
    handleNavigateBackInApp,
    showAddVerseDialog,
  ]);

  useTelegramBackButton({
    enabled: showAddVerseDialog || dashboardGalleryIndex !== null || canGoBackInApp,
    onBack: handleTelegramBack,
    priority: 10,
  });

  const handleDashboardGalleryStatusChange = async (
    verse: Verse,
    status: VerseStatus
  ): Promise<VerseMutablePatch | void> => {
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (!telegramIdValue) throw new Error("No telegramId");

    const response = await UserVersesService.patchApiUsersVerses(telegramIdValue, verse.externalVerseId, {
      status,
    });
    const patch = pickMutableVersePatchFromApiResponse(response) ?? { status };
    applyPatchToDashboardGalleryVerses({
      target: { id: verse.id, externalVerseId: verse.externalVerseId },
      patch,
    });

    void loadTrainingVersesForDashboard(telegramIdValue);
    void loadDashboardStats(telegramIdValue);
    void loadDashboardLeaderboard(telegramIdValue);

    return patch;
  };

  const handleDashboardGalleryVersePatched = (event: VersePatchEvent) => {
    applyPatchToDashboardGalleryVerses(event);
  };

  const handleDashboardGalleryDelete = async (verse: Verse) => {
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (!telegramIdValue) throw new Error("No telegramId");

    await UserVersesService.deleteApiUsersVerses(telegramIdValue, verse.externalVerseId);

    setDashboardGalleryVerses((prev) => prev.filter((v) => getVerseKey(v) !== getVerseKey(verse)));

    void loadTrainingVersesForDashboard(telegramIdValue);
    void loadDashboardStats(telegramIdValue);
    void loadDashboardLeaderboard(telegramIdValue);
  };

  const requestMoreDashboardTrainingVerses = async (): Promise<Array<Verse>> => {
    return loadDashboardTrainingGalleryChunk({ reset: false });
  };

  const handleVerseListMutationCommitted = () => {
    if (!telegramId) return;
    void loadTrainingVersesForDashboard(telegramId);
    void loadDashboardStats(telegramId);
    void loadDashboardLeaderboard(telegramId);
  };

  const handleFriendsChanged = () => {
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (!telegramIdValue) return;
    hasLoadedProgressMapFriendsRef.current = false;
    void loadDashboardFriendsActivity(telegramIdValue);
    if (currentPage === "progress-map") {
      void loadProgressMapFriends(telegramIdValue);
    }
  };

  const openProgressMapTraining = (action: Exclude<ProgressMapAction, "open-verses">) => {
    const nextTrainingVerses = pickTrainingDashboardVerses([...verses]);
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
      handleNavigate("verses");
      return;
    }

    const targetIndex = nextTrainingVerses.findIndex(
      (verse) => getVerseKey(verse) === getVerseKey(targetVerse)
    );

    if (targetIndex < 0) {
      handleNavigate("verses");
      return;
    }

    setDashboardGalleryVerses(nextTrainingVerses);
    setDashboardGalleryIndex(targetIndex);
    setDashboardGalleryLaunchMode("training");
  };

  const handleProgressMapAction = (action: ProgressMapAction) => {
    if (action === "open-verses") {
      handleNavigate("verses");
      return;
    }

    openProgressMapTraining(action);
  };

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

  return (
    <>
      <div
        aria-hidden={dashboardGalleryIndex !== null}
        className="min-h-screen transition-colors"
      >
        <Layout
          currentPage={currentPage}
          onNavigate={handleNavigate}
          isContentReady={!isBootstrapping}
          showTelegramExitButton={
            isDashboardRootPage &&
            !showAddVerseDialog &&
            dashboardGalleryIndex === null
          }
          onTelegramExit={handleTelegramExitRequest}
        >
          {currentPage === "dashboard" && (
            <motion.div
              aria-busy={isBootstrapping}
              {...(shouldReduceMotion
                ? {}
                : {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    transition: { duration: 0.2, ease: "easeOut" as const },
                  })}
            >
              <Dashboard
                todayVerses={verses}
                dashboardStats={dashboardStats}
                isDashboardStatsLoading={isDashboardStatsLoading}
                dashboardLeaderboard={dashboardLeaderboard}
                isDashboardLeaderboardLoading={isDashboardLeaderboardLoading}
                dashboardFriendsActivity={dashboardFriendsActivity}
                isDashboardFriendsActivityLoading={isDashboardFriendsActivityLoading}
                onViewAll={() => handleNavigate("verses")}
                onOpenTraining={() => handleNavigate("training")}
                isInitializingData={isBootstrapping}
              />
            </motion.div>
          )}

          {currentPage === "verses" && (
            <VerseList
              onVerseAdded={handleVerseAdded}
              verseListExternalSyncVersion={verseListExternalSyncVersion}
              onVerseMutationCommitted={handleVerseListMutationCommitted}
            />
          )}

          {currentPage === "training" && (
            <Training
              allVerses={verses}
              dashboardStats={dashboardStats}
              telegramId={telegramId}
              onVersePatched={handleDashboardGalleryVersePatched}
              onRequestVerseSelection={() => handleNavigate("verses")}
              onVerseMutationCommitted={handleVerseListMutationCommitted}
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
              onAction={handleProgressMapAction}
            />
          )}

          {currentPage === "profile" && (
            <Profile
              theme={theme}
              onToggleTheme={handleToggleTheme}
              telegramId={telegramId}
              onFriendsChanged={handleFriendsChanged}
            />
          )}
        </Layout>
      </div>

      <AddVerseDialog
        open={showAddVerseDialog}
        onClose={() => setShowAddVerseDialog(false)}
        onAdd={handleVerseAdded}
      />

      {dashboardGalleryIndex !== null && dashboardGalleryVerses[dashboardGalleryIndex] && (
        <VerseGallery
          verses={dashboardGalleryVerses}
          initialIndex={dashboardGalleryIndex}
          launchMode={dashboardGalleryLaunchMode}
          onClose={handleDashboardGalleryClose}
          onStatusChange={handleDashboardGalleryStatusChange}
          onVersePatched={handleDashboardGalleryVersePatched}
          onDelete={handleDashboardGalleryDelete}
          previewHasMore={dashboardTrainingHasMore}
          previewIsLoadingMore={dashboardTrainingIsLoadingMore}
          onRequestMorePreviewVerses={async () => {
            const nextChunk = await requestMoreDashboardTrainingVerses();
            return nextChunk.length > 0;
          }}
          onRequestMoreTrainingVerses={requestMoreDashboardTrainingVerses}
        />
      )}

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

