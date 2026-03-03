"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { GALLERY_TOASTER_ID, toast } from "@/app/lib/toast";
import { Toaster } from "./components/ui/toaster";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { OpenAPI } from "@/api/core/OpenAPI";
import { request as apiRequest } from "@/api/core/request";
import { UsersService } from "@/api/services/UsersService";
import type { ApiError } from "@/api/core/ApiError";
import type { UserWithVerses } from "@/api/models/UserWithVerses";
import { UserVersesService } from "@/api/services/UserVersesService";
import { TagsService } from "@/api/services/TagsService";
import { fetchAllUserVerses } from "@/api/services/userVersesPagination";
import {
  fetchDashboardLeaderboard,
  type DashboardLeaderboard,
} from "@/api/services/leaderboard";
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

const VerseList = dynamic(
  () => import("./components/VerseList").then((m) => m.VerseList),
  {
    loading: () => <div className="min-h-[60vh]" />,
  }
);

// const Collections = dynamic(
//   () => import("./components/Collections").then((m) => m.Collections),
//   {
//     loading: () => <div className="min-h-[60vh]" />,
//   }
// );

// const Statistics = dynamic(
//   () => import("./components/Statistics").then((m) => m.Statistics),
//   {
//     loading: () => <div className="min-h-[60vh]" />,
//   }
// );

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

// Frontend verse model — matches the VerseCardDto shape returned by the API.
// externalVerseId is the primary identifier ("book-chapter-verse").
export type Verse = {
  id?: string | number;
  externalVerseId: string;
  status: DisplayVerseStatus;
  masteryLevel: number;
  repetitions: number;
  lastTrainingModeId?: number | null;
  lastReviewedAt: string | null;
  translation?: string;
  nextReview?: string | null;
  nextReviewAt: string | null;
  tags?: Array<{ id: string; slug: string; title: string }>;
  text: string;
  reference: string;
};

type DashboardTrainingLaunchOptions = {
  launchMode?: "preview" | "training";
  preferredVerseId?: string | null;
};

type Page =
  | "dashboard"
  | "verses"
  // | "collections"
  // | "stats"
  | "profile"
  // | "training";

type Theme = "light" | "dark";

type TrainingBatchPreferences = {
  newVersesCount: number;
  reviewVersesCount: number;
};

type AppProps = {
  onInitialContentReady?: () => void;
};

const TRAINING_BATCH_PREFERENCES_KEY = "bible-memory.training-batch-preferences.v1";
const THEME_STORAGE_KEY = "theme";
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
const MY_VERSE_COUNT_OPTIONS = [1, 2, 3, 4] as const;
const REVIEW_VERSE_COUNT_OPTIONS = [3, 5, 10, 15] as const;
const DEFAULT_TRAINING_BATCH_PREFERENCES: TrainingBatchPreferences = {
  newVersesCount: 1,
  reviewVersesCount: 5,
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

  const backgroundColor = theme === "dark" ? "#1a1410" : "#ede3d2";
  const foregroundColor = theme === "dark" ? "#f5ead5" : "#2b2015";

  document.documentElement.style.colorScheme = theme;
  document.body.style.colorScheme = theme;
  document.documentElement.style.backgroundColor = backgroundColor;
  document.body.style.backgroundColor = backgroundColor;
  document.documentElement.style.color = foregroundColor;
  document.body.style.color = foregroundColor;
}

function getTelegramColorScheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const colorScheme = (window as any)?.Telegram?.WebApp?.colorScheme;
  return colorScheme === "light" || colorScheme === "dark" ? colorScheme : null;
}

function syncTelegramChromeTheme(theme: Theme) {
  if (typeof window === "undefined") return;

  const webApp = (window as any)?.Telegram?.WebApp;
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

function getClientTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return typeof tz === "string" && tz.length > 0 ? tz : "UTC";
}

function readTrainingBatchPreferences(): TrainingBatchPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TRAINING_BATCH_PREFERENCES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TrainingBatchPreferences>;
    const newVersesCount = Number(parsed?.newVersesCount);
    const reviewVersesCount = Number(parsed?.reviewVersesCount);
    if (!Number.isFinite(newVersesCount) || !Number.isFinite(reviewVersesCount)) return null;
    return {
      newVersesCount: Math.max(0, Math.round(newVersesCount)),
      reviewVersesCount: Math.max(0, Math.round(reviewVersesCount)),
    };
  } catch {
    return null;
  }
}

function writeTrainingBatchPreferences(value: TrainingBatchPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRAINING_BATCH_PREFERENCES_KEY, JSON.stringify(value));
}

function sortByUpdatedAtDesc(a: Verse, b: Verse) {
  const aUpdated = parseDateValue((a as any).updatedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bUpdated = parseDateValue((b as any).updatedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aUpdated !== bUpdated) return bUpdated - aUpdated;

  const aLast = parseDateValue(a.lastReviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bLast = parseDateValue(b.lastReviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aLast !== bLast) return bLast - aLast;

  const aCreated = parseDateValue((a as any).createdAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bCreated = parseDateValue((b as any).createdAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aCreated !== bCreated) return bCreated - aCreated;

  return String(a.externalVerseId ?? a.id).localeCompare(String(b.externalVerseId ?? b.id));
}

function buildTrainingBatchVerses(
  allVerses: Array<Verse>,
  prefs: TrainingBatchPreferences
): Array<Verse> {
  const newPool = allVerses
    .filter((verse) => normalizeDisplayVerseStatus(verse.status) === VerseStatus.LEARNING)
    .sort(sortByUpdatedAtDesc);
  const newVerses = newPool.slice(0, Math.max(0, prefs.newVersesCount));

  const reviewPool = allVerses
    .filter((verse) => {
      const status = normalizeDisplayVerseStatus(verse.status);
      return status === "REVIEW";
    })
    .sort(sortByUpdatedAtDesc);
  const reviewVerses = reviewPool.slice(0, Math.max(0, prefs.reviewVersesCount));

  const seen = new Set<string>();
  return [...newVerses, ...reviewVerses].filter((verse) => {
    const key = String(verse.externalVerseId ?? verse.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapUserVersesToAppVerses(userData: UserWithVerses | null): Array<Verse> {
  const source = userData?.verses ?? [];
  return source.map((verse) => ({
    externalVerseId: String(verse.externalVerseId ?? ""),
    status: normalizeDisplayVerseStatus(verse.status),
    masteryLevel: Math.max(0, Math.round(Number(verse.masteryLevel ?? 0))),
    repetitions: Math.max(0, Math.round(Number(verse.repetitions ?? 0))),
    lastTrainingModeId: verse.lastTrainingModeId ?? null,
    lastReviewedAt: verse.lastReviewedAt ?? null,
    nextReviewAt: verse.nextReviewAt ?? null,
    tags: verse.tags ?? [],
    text: String(verse.text ?? ""),
    reference: String(verse.reference ?? verse.externalVerseId ?? ""),
  }));
}

export default function App({ onInitialContentReady }: AppProps) {
  const shouldReduceMotion = useReducedMotion();
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [showAddVerseDialog, setShowAddVerseDialog] = useState(false);
  const [verseListExternalSyncVersion, setVerseListExternalSyncVersion] = useState(0);
  const [user, setUser] = useState<UserWithVerses | null>(null);
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [dashboardGalleryVerses, setDashboardGalleryVerses] = useState<Array<Verse>>([]);
  const [dashboardGalleryIndex, setDashboardGalleryIndex] = useState<number | null>(null);
  const [dashboardGalleryLaunchMode, setDashboardGalleryLaunchMode] = useState<"preview" | "training">("preview");
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<UserDashboardStats | null>(null);
  const [isDashboardStatsLoading, setIsDashboardStatsLoading] = useState(false);
  const [dashboardLeaderboard, setDashboardLeaderboard] = useState<DashboardLeaderboard | null>(null);
  const [isDashboardLeaderboardLoading, setIsDashboardLeaderboardLoading] = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [trainingBatchPreferences, setTrainingBatchPreferences] = useState<TrainingBatchPreferences | null>(null);
  const [isTrainingBatchPromptOpen, setIsTrainingBatchPromptOpen] = useState(false);
  const [selectedNewVersesCount, setSelectedNewVersesCount] = useState<number>(
    DEFAULT_TRAINING_BATCH_PREFERENCES.newVersesCount
  );
  const [selectedReviewVersesCount, setSelectedReviewVersesCount] = useState<number>(
    DEFAULT_TRAINING_BATCH_PREFERENCES.reviewVersesCount
  );
  const [isSavingTrainingPlan, setIsSavingTrainingPlan] = useState(false);
  const hasNotifiedInitialContentReadyRef = useRef(false);
  const dashboardStatsRequestIdRef = useRef(0);
  const dashboardLeaderboardRequestIdRef = useRef(0);

  useEffect(() => {
    applyThemeToDocument(theme);
    writeStoredTheme(theme);
    syncTelegramChromeTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const webApp = (window as any)?.Telegram?.WebApp;
    if (!webApp || typeof webApp.onEvent !== "function" || typeof webApp.offEvent !== "function") {
      return;
    }

    const handleTelegramThemeChanged = () => {
      // Telegram can re-apply its own theme styles; enforce app-selected theme again.
      applyThemeToDocument(theme);
      syncTelegramChromeTheme(theme);
    };

    webApp.onEvent("themeChanged", handleTelegramThemeChanged);
    return () => {
      webApp.offEvent("themeChanged", handleTelegramThemeChanged);
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

  // Инициализация пользователя в окружении Telegram (idempotent).
  useEffect(() => {
    let isMounted = true;

    const finishBootstrapping = () => {
      if (isMounted) {
        setIsBootstrapping(false);
      }
    };

    void (async () => {
      const telegramWebUser =
        typeof window !== "undefined"
          ? (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user
          : undefined;
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
      }

      const savedPreferences = readTrainingBatchPreferences();
      if (savedPreferences) {
        setTrainingBatchPreferences(savedPreferences);
        setSelectedNewVersesCount(savedPreferences.newVersesCount);
        setSelectedReviewVersesCount(savedPreferences.reviewVersesCount);
      } else {
        setTrainingBatchPreferences(null);
        setSelectedNewVersesCount(DEFAULT_TRAINING_BATCH_PREFERENCES.newVersesCount);
        setSelectedReviewVersesCount(DEFAULT_TRAINING_BATCH_PREFERENCES.reviewVersesCount);
        setIsTrainingBatchPromptOpen(true);
      }

      const fetchUser = async () => {
        try {
          setIsLoading(true);
          const [userData] = await Promise.all([
            UsersService.getApiUsers(telegramId),
            loadDashboardStats(telegramId),
            loadDashboardLeaderboard(telegramId),
          ]);
          setUser(userData);
          const userVerses = mapUserVersesToAppVerses(userData);
                    if (savedPreferences) {
            setVerses(buildTrainingBatchVerses(userVerses, savedPreferences));
          } else {
            setVerses([]);
          }
        } catch (err) {
          const status = (err as ApiError)?.status;
          if (status === 404) {
            try {
              const newUser = await UsersService.postApiUsers({ telegramId });
              setUser({ ...newUser, verses: [] });
              setVerses([]);
              await Promise.all([
                loadDashboardStats(telegramId),
                loadDashboardLeaderboard(telegramId),
              ]);
            } catch (createErr) {
              console.error("Не удалось создать пользователя:", createErr);
              toast.error("Ошибка при создании профиля");
            }
          } else {
            console.error("Не удалось получить пользователя:", err);
            toast.error("Ошибка при подключении к базе данных");
            setVerses([]);
          }
        } finally {
          setIsLoading(false);
        }
      };

      await fetchUser();
      finishBootstrapping();
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setDashboardGalleryIndex(null);
    setDashboardGalleryVerses([]);
    setDashboardGalleryLaunchMode("preview");
  };

  const handleToggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const loadAllUserVerses = async (telegramIdValue: string) => {
    try {
      const response = await fetchAllUserVerses({ telegramId: telegramIdValue });
      const allVerses = response as Array<Verse>;
      return allVerses;
    } catch (err) {
      console.error("Не удалось получить стихи пользователя:", err);
      throw err;
    }
  };

  const loadPlannedVersesForDashboard = async (
    telegramIdValue: string,
    prefs: TrainingBatchPreferences
  ) => {
    try {
      const allVerses = await loadAllUserVerses(telegramIdValue);
      const planned = buildTrainingBatchVerses(allVerses, prefs);
      setVerses(planned);
      return planned;
    } catch (err) {
      setVerses([]);
      throw err;
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

    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (telegramIdValue && trainingBatchPreferences) {
      void loadPlannedVersesForDashboard(telegramIdValue, trainingBatchPreferences);
    }
    if (telegramIdValue) {
      void loadDashboardStats(telegramIdValue);
      void loadDashboardLeaderboard(telegramIdValue);
    }
  };

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

    if (trainingBatchPreferences) {
      void loadPlannedVersesForDashboard(telegramIdValue, trainingBatchPreferences);
    }
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

    if (trainingBatchPreferences) {
      void loadPlannedVersesForDashboard(telegramIdValue, trainingBatchPreferences);
    }
    void loadDashboardStats(telegramIdValue);
    void loadDashboardLeaderboard(telegramIdValue);
  };

  const handleStartTraining = async (launchOptions?: DashboardTrainingLaunchOptions) => {
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (!telegramIdValue) {
      toast.error("Не найден telegramId");
      return;
    }

    if (!trainingBatchPreferences) {
      setIsTrainingBatchPromptOpen(true);
      toast.info("Сначала выберите формат тренировки", {
        description: "Сколько стихов в изучении и сколько повторений загружать за раз.",
      });
      return;
    }

    const launchMode = launchOptions?.launchMode ?? "preview";
    const preferredTargetVerseId = launchOptions?.preferredVerseId ?? null;
    const openDashboardGallery = (
      plannedList: Array<Verse>,
      preferredVerseId?: string | null
    ) => {
      if (plannedList.length === 0) return false;
      setDashboardGalleryLaunchMode(launchMode);
      setDashboardGalleryVerses(plannedList);
      const nextIndex = preferredVerseId
        ? plannedList.findIndex(
          (verse) => String(verse.externalVerseId ?? verse.id) === String(preferredVerseId)
        )
        : -1;
      setDashboardGalleryIndex(nextIndex >= 0 ? nextIndex : 0);
      return true;
    };

    // Open immediately from the current dashboard list, then refresh in background.
    // This prevents a visible "dead time" before VerseGallery appears.
    if (verses.length > 0 && openDashboardGallery(verses, preferredTargetVerseId)) {
      void (async () => {
        try {
          const refreshed = await loadPlannedVersesForDashboard(telegramIdValue, trainingBatchPreferences);
          if (refreshed.length > 0) {
            setDashboardGalleryVerses(refreshed);
            setDashboardGalleryIndex((prev) => {
              if (preferredTargetVerseId) {
                const targetIndex = refreshed.findIndex(
                  (verse) => String(verse.externalVerseId ?? verse.id) === String(preferredTargetVerseId)
                );
                if (targetIndex >= 0) return targetIndex;
              }
              return prev === null ? null : Math.min(prev, Math.max(0, refreshed.length - 1));
            });
          }
        } catch (error) {
          console.error("Не удалось обновить подборку перед тренировкой:", error);
        }
      })();
      return;
    }

    try {
      const plannedVerses = await loadPlannedVersesForDashboard(telegramIdValue, trainingBatchPreferences);
      if (plannedVerses.length === 0) {
        toast.info("Нет стихов для тренировки", {
          description: "Выберите стихи в статусах LEARNING/REVIEW или переведите карточки в изучение. Просмотр доступен в разделе «Стихи».",
        });
        return;
      }
      openDashboardGallery(plannedVerses, preferredTargetVerseId);
    } catch {
      toast.error("Не удалось загрузить стихи для тренировки");
    }
  };

  const handleAddVerse = () => {
    setShowAddVerseDialog(true);
  };

  const handleOpenTrainingPlanSettings = () => {
    setIsTrainingBatchPromptOpen(true);
  };

  const handleVerseListMutationCommitted = () => {
    if (!telegramId) return;
    if (trainingBatchPreferences) {
      void loadPlannedVersesForDashboard(telegramId, trainingBatchPreferences);
    }
    void loadDashboardStats(telegramId);
    void loadDashboardLeaderboard(telegramId);
  };

  const handleSaveTrainingBatchPreferences = async () => {
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    const nextPreferences: TrainingBatchPreferences = {
      newVersesCount: selectedNewVersesCount,
      reviewVersesCount: selectedReviewVersesCount,
    };

    writeTrainingBatchPreferences(nextPreferences);
    setTrainingBatchPreferences(nextPreferences);
    setIsTrainingBatchPromptOpen(false);

    if (!telegramIdValue) return;

    try {
      setIsSavingTrainingPlan(true);
      setIsLoading(true);
      await loadPlannedVersesForDashboard(telegramIdValue, nextPreferences);
      toast.success("План тренировки сохранён", {
        description: `В изучении: ${nextPreferences.newVersesCount}, повторений: ${nextPreferences.reviewVersesCount}.`,
      });
    } catch {
      toast.error("Не удалось загрузить стихи по новым настройкам");
    } finally {
      setIsSavingTrainingPlan(false);
      setIsLoading(false);
    }
  };

  const handleVerseAdded = async (verse: {
    externalVerseId: string;
    reference: string;
    tags: string[]; // tag slugs
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

      // Attach selected tags (non-blocking per tag — best-effort)
      if (verse.tags.length > 0) {
        await Promise.allSettled(
          verse.tags.map((slug) =>
            TagsService.postApiVersesTags(verse.externalVerseId, { tagSlug: slug })
          )
        );
      }

      const effectivePreferences =
        trainingBatchPreferences ?? readTrainingBatchPreferences();

      if (effectivePreferences) {
        await loadPlannedVersesForDashboard(telegramId, effectivePreferences);
      } else {
        await loadAllUserVerses(telegramId);
      }
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
        <Layout currentPage={currentPage} onNavigate={handleNavigate} isContentReady={!isBootstrapping}>
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
                onStartTraining={handleStartTraining}
                onAddVerse={handleAddVerse}
                onViewAll={() => setCurrentPage("verses")}
                onOpenTrainingPlanSettings={handleOpenTrainingPlanSettings}
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

          {/* {currentPage === "collections" && (
            <Collections
              collections={mockCollections}
              onCreateCollection={handleCreateCollection}
              onSelectCollection={handleSelectCollection}
            />
          )} */}

          {/* {currentPage === "stats" && <Statistics stats={mockStats} />} */}

          {currentPage === "profile" && (
            <Profile
              theme={theme}
              onToggleTheme={handleToggleTheme}
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
        />
      )}

      {isTrainingBatchPromptOpen && (
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
      )}

      <Toaster />
    </>
  );
}

