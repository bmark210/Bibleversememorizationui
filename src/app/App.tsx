"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { UsersService } from "@/api/services/UsersService";
import type { ApiError } from "@/api/core/ApiError";
import type { UserWithVerses } from "@/api/models/UserWithVerses";
import { OpenAPI } from "@/api/core/OpenAPI";
import { request as apiRequest } from "@/api/core/request";
import { fetchDailyGoalReadiness } from "@/api/services/dailyGoalReadiness";
import { mockCollections, mockStats } from "./data/mockData";
import { UserVerse } from "@/generated/prisma/client";
import { UserVersesService } from "@/api/services/UserVersesService";
import { fetchAllUserVerses } from "@/api/services/userVersesPagination";
import { VerseStatus } from "@/generated/prisma";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import type { VerseMutablePatch, VersePatchEvent } from "@/app/types/verseSync";
import {
  getVerseSyncKey,
  mergeVersePatch,
  pickMutableVersePatchFromApiResponse,
} from "@/app/utils/versePatch";
import { useDailyGoalController } from "@/app/features/daily-goal/useDailyGoalController";
import {
  getLocalDayKey,
  readDailyGoalSession,
} from "@/app/features/daily-goal/storage";
import type {
  DailyGoalReadinessResponse,
  DailyGoalResumeMode,
  DailyGoalProgressEvent,
  DailyGoalVerseListReminder,
} from "@/app/features/daily-goal/types";
import { cn } from "./components/ui/utils";

const VerseList = dynamic(
  () => import("./components/VerseList").then((m) => m.VerseList),
  {
    loading: () => <div className="min-h-[60vh]" />,
  }
);

const Collections = dynamic(
  () => import("./components/Collections").then((m) => m.Collections),
  {
    loading: () => <div className="min-h-[60vh]" />,
  }
);

const Statistics = dynamic(
  () => import("./components/Statistics").then((m) => m.Statistics),
  {
    loading: () => <div className="min-h-[60vh]" />,
  }
);

const Settings = dynamic(
  () => import("./components/Settings").then((m) => m.Settings),
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

const TrainingSession = dynamic(
  () => import("./components/TrainingSession").then((m) => m.TrainingSession),
  {
    loading: () => <div className="min-h-screen" />,
  }
);

export type Verse = UserVerse & {
  status: DisplayVerseStatus;
  text: string;
  reference: string;
};

type StartTrainingOptions = {
  returnToGallery?: boolean;
  returnToGalleryFilter?: "all" | "learning" | "stopped" | "new";
};

type DashboardTrainingLaunchOptions = {
  autoStartInGallery?: boolean;
};

type ReturnToGalleryContext = {
  verseId: string;
  filter: "all" | "learning" | "stopped" | "new";
};

type Page =
  | "dashboard"
  | "verses"
  | "collections"
  | "stats"
  | "settings"
  | "training";

type TrainingBatchPreferences = {
  newVersesCount: number;
  reviewVersesCount: number;
};

type RefreshDailyGoalReadinessOptions = {
  force?: boolean;
};

type AppProps = {
  onInitialContentReady?: () => void;
};

const TRAINING_BATCH_PREFERENCES_KEY = "bible-memory.training-batch-preferences.v1";
const NEW_VERSE_COUNT_OPTIONS = [1, 2, 3, 4] as const;
const REVIEW_VERSE_COUNT_OPTIONS = [3, 5, 10, 15] as const;
const DEFAULT_TRAINING_BATCH_PREFERENCES: TrainingBatchPreferences = {
  newVersesCount: 1,
  reviewVersesCount: 5,
};

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
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

export default function App({ onInitialContentReady }: AppProps) {
  const shouldReduceMotion = useReducedMotion();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [isTraining, setIsTraining] = useState(false);
  const [showAddVerseDialog, setShowAddVerseDialog] = useState(false);
  const [verseListExternalSyncVersion, setVerseListExternalSyncVersion] = useState(0);
  const [user, setUser] = useState<UserWithVerses | null>(null);
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [dailyGoalVersePool, setDailyGoalVersePool] = useState<Array<Verse>>([]);
  const [trainingVerses, setTrainingVerses] = useState<Array<Verse>>([]);
  const [trainingStartVerseId, setTrainingStartVerseId] = useState<string | null>(null);
  const [returnToGalleryContext, setReturnToGalleryContext] = useState<ReturnToGalleryContext | null>(null);
  const [dashboardGalleryVerses, setDashboardGalleryVerses] = useState<Array<Verse>>([]);
  const [dashboardGalleryIndex, setDashboardGalleryIndex] = useState<number | null>(null);
  const [dashboardGalleryAutoStartTraining, setDashboardGalleryAutoStartTraining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [trainingBatchPreferences, setTrainingBatchPreferences] = useState<TrainingBatchPreferences | null>(null);
  const [dailyGoalReadiness, setDailyGoalReadiness] = useState<DailyGoalReadinessResponse | null>(null);
  const [isDailyGoalReadinessLoading, setIsDailyGoalReadinessLoading] = useState(false);
  const [isTrainingBatchPromptOpen, setIsTrainingBatchPromptOpen] = useState(false);
  const [selectedNewVersesCount, setSelectedNewVersesCount] = useState<number>(
    DEFAULT_TRAINING_BATCH_PREFERENCES.newVersesCount
  );
  const [selectedReviewVersesCount, setSelectedReviewVersesCount] = useState<number>(
    DEFAULT_TRAINING_BATCH_PREFERENCES.reviewVersesCount
  );
  const dailyGoalCompletionSyncRef = useRef<Set<string>>(new Set());
  const hasNotifiedInitialContentReadyRef = useRef(false);
  const dailyGoalReadinessRequestIdRef = useRef(0);
  const dailyGoalReadinessInFlightRef = useRef<{
    key: string;
    requestId: number;
    promise: Promise<DailyGoalReadinessResponse | null>;
  } | null>(null);
  const dailyGoalReadinessLastSuccessKeyRef = useRef<string | null>(null);
  const dailyGoal = useDailyGoalController({
    telegramId,
    trainingBatchPreferences,
    todayVerses: dailyGoalVersePool,
    hasAnyUserVerses: user ? (user.verses?.length ?? 0) > 0 : undefined,
    dailyGoalReadiness,
    isDailyGoalReadinessLoading,
  });

  // Инициализация пользователя в окружении Telegram (idempotent).
  useEffect(() => {
    let isMounted = true;

    const finishBootstrapping = () => {
      if (isMounted) {
        setIsBootstrapping(false);
      }
    };

    void (async () => {
      const telegramId =
        typeof window !== "undefined"
          ? (
              window as any
            )?.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() ??
            process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID ??
            localStorage.getItem("telegramId") ??
            undefined
          : undefined;

      if (!telegramId) {
        setIsLoading(false);
        finishBootstrapping();
        return;
      }
      setTelegramId(telegramId);
      localStorage.setItem("telegramId", telegramId);

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
          const userData = await UsersService.getApiUsers(telegramId);
          setUser(userData);
        } catch (err) {
          const status = (err as ApiError)?.status;
          if (status === 404) {
            try {
              const newUser = await UsersService.postApiUsers({ telegramId });
              setUser({ ...newUser, verses: [] });
            } catch (createErr) {
              console.error("Не удалось создать пользователя:", createErr);
              toast.error("Ошибка при создании профиля");
            }
          } else {
            console.error("Не удалось получить пользователя:", err);
            toast.error("Ошибка при подключении к базе данных");
          }
        } finally {
          setIsLoading(false);
        }
      };

      const startupTasks: Array<Promise<unknown>> = [fetchUser()];
      if (savedPreferences) {
        startupTasks.push(loadPlannedVersesForDashboard(telegramId, savedPreferences));
      } else {
        setVerses([]);
      }
      await Promise.allSettled(startupTasks);
      finishBootstrapping();
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setIsTraining(false);
    setTrainingStartVerseId(null);
    setReturnToGalleryContext(null);
    setDashboardGalleryIndex(null);
    setDashboardGalleryVerses([]);
    setDashboardGalleryAutoStartTraining(false);
  };

  const loadPlannedVersesForDashboard = async (
    telegramIdValue: string,
    prefs: TrainingBatchPreferences
  ) => {
    try {
      const response = await fetchAllUserVerses({ telegramId: telegramIdValue });
      const allVerses = response as Array<Verse>;
      setDailyGoalVersePool(allVerses);
      const planned = buildTrainingBatchVerses(allVerses, prefs);
      setVerses(planned);
      return planned;
    } catch (err) {
      console.error("Не удалось получить стихи для дневной подборки:", err);
      setDailyGoalVersePool([]);
      setVerses([]);
      throw err;
    }
  };

  const refreshDailyGoalReadiness = async (
    telegramIdValue: string,
    prefs: TrainingBatchPreferences,
    options?: RefreshDailyGoalReadinessOptions
  ) => {
    const todayKey = getLocalDayKey();
    const activeSession = dailyGoal.session;
    const isCompletedTodayInActiveSession = Boolean(
      activeSession &&
        activeSession.telegramId === telegramIdValue &&
        activeSession.dayKey === todayKey &&
        activeSession.progress.completedAt
    );
    const isCompletedTodayInStorage =
      !isCompletedTodayInActiveSession &&
      (() => {
        const stored = readDailyGoalSession();
        return Boolean(
          stored &&
            stored.telegramId === telegramIdValue &&
            stored.dayKey === todayKey &&
            stored.progress?.completedAt
        );
      })();

    if (isCompletedTodayInActiveSession || isCompletedTodayInStorage) {
      setIsDailyGoalReadinessLoading(false);
      return dailyGoalReadiness;
    }

    const requestKey = `${telegramIdValue}:${prefs.newVersesCount}:${prefs.reviewVersesCount}:${todayKey}`;
    const force = options?.force === true;

    if (!force) {
      const inFlight = dailyGoalReadinessInFlightRef.current;
      if (inFlight?.key === requestKey) {
        return inFlight.promise;
      }
      if (
        dailyGoalReadinessLastSuccessKeyRef.current === requestKey &&
        dailyGoalReadiness !== null
      ) {
        return dailyGoalReadiness;
      }
    }

    const requestId = ++dailyGoalReadinessRequestIdRef.current;
    setIsDailyGoalReadinessLoading(true);

    const requestPromise = (async () => {
      try {
        const snapshot = await fetchDailyGoalReadiness({
          telegramId: telegramIdValue,
          newVersesCount: prefs.newVersesCount,
          reviewVersesCount: prefs.reviewVersesCount,
        });
        if (dailyGoalReadinessRequestIdRef.current !== requestId) return null;
        dailyGoalReadinessLastSuccessKeyRef.current = requestKey;
        setDailyGoalReadiness(snapshot);
        return snapshot;
      } catch (error) {
        if (dailyGoalReadinessRequestIdRef.current === requestId) {
          setDailyGoalReadiness(null);
        }
        console.error("Не удалось получить readiness ежедневной цели:", error);
        return null;
      } finally {
        if (dailyGoalReadinessRequestIdRef.current === requestId) {
          setIsDailyGoalReadinessLoading(false);
        }
        if (
          dailyGoalReadinessInFlightRef.current?.key === requestKey &&
          dailyGoalReadinessInFlightRef.current?.requestId === requestId
        ) {
          dailyGoalReadinessInFlightRef.current = null;
        }
      }
    })();

    dailyGoalReadinessInFlightRef.current = {
      key: requestKey,
      requestId,
      promise: requestPromise,
    };

    return requestPromise;
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
    setDashboardGalleryAutoStartTraining(false);

    if (
      dailyGoal.ui.phase === "learning" ||
      dailyGoal.ui.phase === "review"
    ) {
      const remainingReview = Math.max(
        0,
        dailyGoal.ui.progressCounts.reviewTotal - dailyGoal.ui.progressCounts.reviewDone
      );
      const remainingNew = Math.max(
        0,
        dailyGoal.ui.progressCounts.newTotal - dailyGoal.ui.progressCounts.newDone
      );
      const remainingParts: string[] = [];
      if (remainingNew > 0) remainingParts.push(`новые: ${remainingNew}`);
      if (remainingReview > 0) remainingParts.push(`повторение: ${remainingReview}`);
      if (remainingParts.length > 0) {
        toast.info("Ежедневная цель не завершена", {
          description: `Осталось: ${remainingParts.join(" · ")}.`,
        });
      }
    }

    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (telegramIdValue && trainingBatchPreferences) {
      void loadPlannedVersesForDashboard(telegramIdValue, trainingBatchPreferences);
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
      void refreshDailyGoalReadiness(telegramIdValue, trainingBatchPreferences, {
        force: true,
      });
    }

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
      void refreshDailyGoalReadiness(telegramIdValue, trainingBatchPreferences, {
        force: true,
      });
    }
  };

  const getLearningVerses = async (telegramId: string) => {
    try {
      const response = await apiRequest<Array<Verse>>(OpenAPI, {
        method: "GET",
        url: "/api/users/{telegramId}/verses",
        path: { telegramId },
        query: { status: VerseStatus.LEARNING },
      });

      // Если backend ещё не применяет query-параметр, дополнительно фильтруем на клиенте.
      const learningOnly = (response as Array<Verse>).filter(
        (verse) => {
          const status = normalizeDisplayVerseStatus(verse.status);
          return status === VerseStatus.LEARNING || status === "REVIEW";
        }
      );
      setTrainingVerses(learningOnly);
      return learningOnly;
    } catch (err) {
      console.error("Не удалось получить стихи LEARNING:", err);
      setTrainingVerses([]);
      throw err;
    }
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

    // Ensure the session exists BEFORE refreshing readiness, since session creation
    // depends only on todayVerses/preferences — not on the readiness API response.
    dailyGoal.ensureSessionForToday();

    // Refresh readiness from the server (force=true bypasses deduplication cache).
    // The returned snapshot is not yet in React state, so getNextTargetVerseId()
    // below reads from the pre-refresh UI. This is acceptable: the gallery opens
    // immediately with existing verses, then a background refresh corrects the list.
    await refreshDailyGoalReadiness(telegramIdValue, trainingBatchPreferences, {
      force: true,
    });

    const preferredTargetVerseId = dailyGoal.getNextTargetVerseId();
    const openDashboardGallery = (
      plannedList: Array<Verse>,
      preferredVerseId?: string | null
    ) => {
      if (plannedList.length === 0) return false;
      setIsTraining(false);
      setReturnToGalleryContext(null);
      setDashboardGalleryAutoStartTraining(Boolean(launchOptions?.autoStartInGallery));
      setDashboardGalleryVerses(plannedList);
      const nextIndex = preferredVerseId
        ? plannedList.findIndex(
            (verse) => String(verse.externalVerseId ?? verse.id) === String(preferredVerseId)
          )
        : -1;
      setDashboardGalleryIndex(nextIndex >= 0 ? nextIndex : 0);
      dailyGoal.markDailyGoalStarted();
      dailyGoal.markOnboardingSeen("dashboardIntro");
      dailyGoal.markOnboardingSeen("galleryIntro");
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

  const handleCompleteTraining = () => {
    setIsTraining(false);
    setTrainingVerses([]);
    setTrainingStartVerseId(null);
    setReturnToGalleryContext(null);
    setCurrentPage("dashboard");
    if (telegramId && trainingBatchPreferences) {
      void loadPlannedVersesForDashboard(telegramId, trainingBatchPreferences);
      void refreshDailyGoalReadiness(telegramId, trainingBatchPreferences, {
        force: true,
      });
    }
    toast.success("Тренировка завершена!", {
      description: "Отличная работа! Ваш прогресс сохранён.",
    });
  };

  const handleExitTraining = () => {
    setIsTraining(false);
    setTrainingVerses([]);
    setTrainingStartVerseId(null);
    if (returnToGalleryContext) {
      setCurrentPage("verses");
      return;
    }
    setCurrentPage("dashboard");
  };

  const handleAddVerse = () => {
    setShowAddVerseDialog(true);
  };

  const handleOpenTrainingPlanSettings = () => {
    setIsTrainingBatchPromptOpen(true);
  };

  const handleDailyGoalProgressEvent = (event: DailyGoalProgressEvent) => {
    if (event.source === "verse-gallery") {
      dailyGoal.markOnboardingSeen("galleryIntro");
    } else if (event.source === "training-session") {
      dailyGoal.markOnboardingSeen("trainingIntro");
    }
    const result = dailyGoal.applyProgressEvent(event);
    if (telegramId && trainingBatchPreferences) {
      void refreshDailyGoalReadiness(telegramId, trainingBatchPreferences, {
        force: true,
      });
    }
    if (result.completedNow) {
      void syncDailyGoalCompletionToServer();
    }
  };

  const handleDailyGoalJumpToVerseRequest = (externalVerseId: string) => {
    setCurrentPage("dashboard");
    setDashboardGalleryIndex(null);
    setDashboardGalleryVerses([]);
    setDashboardGalleryAutoStartTraining(false);
    void handleStartTraining({ autoStartInGallery: true });
  };

  const handleVerseListMutationCommitted = () => {
    if (!telegramId || !trainingBatchPreferences) return;
    void loadPlannedVersesForDashboard(telegramId, trainingBatchPreferences);
    void refreshDailyGoalReadiness(telegramId, trainingBatchPreferences, {
      force: true,
    });
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
      setIsLoading(true);
      await loadPlannedVersesForDashboard(telegramIdValue, nextPreferences);
      toast.success("План тренировки сохранён", {
        description: `В изучении: ${nextPreferences.newVersesCount}, повторений: ${nextPreferences.reviewVersesCount}.`,
      });
    } catch {
      toast.error("Не удалось загрузить стихи по новым настройкам");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerseAdded = async (verse: {
    externalVerseId: string;
    reference: string;
    tags: string[];
  }): Promise<void> => {
    const telegramId = localStorage.getItem("telegramId") ?? "";
    let addedSuccessfully = false;

    try {
      await UserVersesService.postApiUsersVerses(telegramId, {
        externalVerseId: verse.externalVerseId,
        masteryLevel: 0,
        repetitions: 0,
        lastReviewedAt: undefined,
        nextReviewAt: undefined,
      });

      // Обновляем данные пользователя после добавления стиха
      const updatedUser = await UsersService.getApiUsers(telegramId);
      setUser(updatedUser);
      setVerseListExternalSyncVersion((prev) => prev + 1);
      addedSuccessfully = true;

      toast.success("Стих успешно добавлен", {
        description: `${verse.reference} добавлен в ваш список стихов.`,
      });
    } catch (err) {
      const errorMessage = (err as ApiError)?.body?.error as string;
      console.error("Не удалось добавить стих:", errorMessage);
      toast.error(errorMessage ?? "Не удалось добавить стих");
      throw err;
    }

    if (addedSuccessfully && telegramId && trainingBatchPreferences) {
      void loadPlannedVersesForDashboard(telegramId, trainingBatchPreferences);
      void refreshDailyGoalReadiness(telegramId, trainingBatchPreferences, {
        force: true,
      });
    }
  };

  const handleStartTrainingFromVerse = async (
    verseId: string,
    options?: StartTrainingOptions
  ) => {
    const telegramId = localStorage.getItem("telegramId") ?? "";
    if (!telegramId) {
      toast.error("Не найден telegramId");
      return;
    }

    try {
      if (trainingBatchPreferences) {
        await refreshDailyGoalReadiness(telegramId, trainingBatchPreferences, {
          force: true,
        });
      }
      const decision = dailyGoal.decideStartFromVerse(String(verseId));
      if (decision.kind === "redirect") {
        toast.info(decision.message);
        setCurrentPage("dashboard");
        void handleStartTraining();
        return;
      }
      if (decision.kind === "warn") {
        toast.info(decision.message);
      }

      const learningVerses = await getLearningVerses(telegramId);
      const verse = learningVerses.find(
        (v) => String(v.id) === String(verseId) || v.externalVerseId === verseId
      );
      if (verse) {
        dailyGoal.markDailyGoalStarted();
        dailyGoal.markOnboardingSeen("trainingIntro");
        setTrainingStartVerseId(String(verse.externalVerseId ?? verse.id));
        setReturnToGalleryContext(
          options?.returnToGallery
            ? {
                verseId: String(verseId),
                filter: options.returnToGalleryFilter ?? "all",
              }
            : null
        );
        setIsTraining(true);
        return;
      }

      toast.info("Стих не в статусе LEARNING", {
        description: "Тренировка запускается только по стихам в изучении.",
      });
    } catch {
      toast.error("Не удалось загрузить стихи для тренировки");
    }
  };

  const handleSelectCollection = (collectionId: string) => {
    toast.info("Коллекция выбрана", {
      description: "Здесь будут показаны стихи из выбранной коллекции.",
    });
  };

  const handleCreateCollection = () => {
    toast.info("Создать коллекцию", {
      description: "Здесь откроется диалог для создания новой коллекции.",
    });
  };

  const verseListDailyGoalReminder: DailyGoalVerseListReminder | undefined =
    dailyGoal.reminder && dailyGoal.reminder.visible
      ? {
          visible: true,
          phase: dailyGoal.reminder.phase,
          progressLabel: dailyGoal.reminder.progressLabel,
          nextTargetReference: dailyGoal.reminder.nextTargetReference,
          onResume: () => {
            dailyGoal.markOnboardingSeen("verseListReminderIntro");
            void handleStartTraining({ autoStartInGallery: true });
          },
          onShowHowToAddFirstVerse: dailyGoal.reminder.needsFirstVerse ? handleAddVerse : undefined,
        }
      : undefined;

  useEffect(() => {
    if (!telegramId || !trainingBatchPreferences) return;
    void loadPlannedVersesForDashboard(telegramId, trainingBatchPreferences);
  }, [telegramId, trainingBatchPreferences, dailyGoal.session?.dayKey]);

  useEffect(() => {
    if (!telegramId || !trainingBatchPreferences) {
      setDailyGoalReadiness(null);
      setIsDailyGoalReadinessLoading(false);
      return;
    }
    void refreshDailyGoalReadiness(telegramId, trainingBatchPreferences);
  }, [telegramId, trainingBatchPreferences]);

  const syncDailyGoalCompletionToServer = async () => {
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    const session = dailyGoal.session;
    if (!telegramIdValue || !session) return;
    if (!dailyGoal.hasUnsyncedCompletionCounter) return;

    const syncKey = `${telegramIdValue}:${session.dayKey}`;
    if (dailyGoalCompletionSyncRef.current.has(syncKey)) {
      return;
    }
    dailyGoalCompletionSyncRef.current.add(syncKey);

    try {
      await apiRequest(OpenAPI, {
        method: "PATCH",
        url: "/api/users/{telegramId}",
        path: { telegramId: telegramIdValue },
        body: { action: "incrementDailyGoalsCompleted" },
        mediaType: "application/json",
      });
      dailyGoal.markCompletionCounterSynced();
      toast.success("Ежедневная цель выполнена", {
        description: "Прогресс сохранён. Счётчик выполненных целей обновлён.",
      });
    } catch (error) {
      console.error("Не удалось увеличить dailyGoalsCompleted:", error);
      dailyGoalCompletionSyncRef.current.delete(syncKey);
      toast.error("Не удалось обновить счётчик ежедневных целей");
    }
  };

  useEffect(() => {
    if (!dailyGoal.hasUnsyncedCompletionCounter) return;
    void syncDailyGoalCompletionToServer();
  }, [dailyGoal.hasUnsyncedCompletionCounter, dailyGoal.session?.dayKey, telegramId]);

  useEffect(() => {
    if (isBootstrapping || hasNotifiedInitialContentReadyRef.current) return;
    hasNotifiedInitialContentReadyRef.current = true;
    onInitialContentReady?.();
  }, [isBootstrapping, onInitialContentReady]);

  return (
    <>
      <div
        aria-hidden={isTraining || dashboardGalleryIndex !== null}
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
                onStartTraining={handleStartTraining}
                onAddVerse={handleAddVerse}
                onViewAll={() => setCurrentPage("verses")}
                dailyGoal={dailyGoal.dashboardCard}
                onStartDailyGoal={() => {
                  dailyGoal.markOnboardingSeen("dashboardIntro");
                  void handleStartTraining({ autoStartInGallery: true });
                }}
                onResumeDailyGoal={() => {
                  dailyGoal.markOnboardingSeen("dashboardIntro");
                  void handleStartTraining({ autoStartInGallery: true });
                }}
                onOpenTrainingPlanSettings={handleOpenTrainingPlanSettings}
                isInitializingData={isBootstrapping}
              />
            </motion.div>
          )}

          {currentPage === "verses" && (
            <VerseList
              onAddVerse={handleAddVerse}
              reopenGalleryVerseId={!isTraining ? returnToGalleryContext?.verseId ?? null : null}
              reopenGalleryStatusFilter={!isTraining ? returnToGalleryContext?.filter ?? null : null}
              onReopenGalleryHandled={() => setReturnToGalleryContext(null)}
              verseListExternalSyncVersion={verseListExternalSyncVersion}
              onVerseMutationCommitted={handleVerseListMutationCommitted}
              dailyGoalReminder={verseListDailyGoalReminder}
              dailyGoalGalleryContext={dailyGoal.galleryContext}
              onBeforeStartTrainingFromGalleryVerse={(verse) =>
                dailyGoal.decideStartFromVerse(String(verse.externalVerseId ?? verse.id))
              }
              onDailyGoalProgressEvent={handleDailyGoalProgressEvent}
              onDailyGoalJumpToVerseRequest={handleDailyGoalJumpToVerseRequest}
              onDailyGoalPreferredResumeModeChange={(mode: DailyGoalResumeMode) =>
                dailyGoal.setPreferredResumeMode(mode)
              }
            />
          )}

          {currentPage === "collections" && (
            <Collections
              collections={mockCollections}
              onCreateCollection={handleCreateCollection}
              onSelectCollection={handleSelectCollection}
            />
          )}

          {currentPage === "stats" && <Statistics stats={mockStats} />}

          {currentPage === "settings" && <Settings />}
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
          autoStartTrainingOnOpen={dashboardGalleryAutoStartTraining}
          onClose={handleDashboardGalleryClose}
          onStatusChange={handleDashboardGalleryStatusChange}
          onVersePatched={handleDashboardGalleryVersePatched}
          onDelete={handleDashboardGalleryDelete}
          dailyGoalContext={dailyGoal.galleryContext ?? undefined}
          onBeforeStartTrainingFromGalleryVerse={(verse) =>
            dailyGoal.decideStartFromVerse(String(verse.externalVerseId ?? verse.id))
          }
          onDailyGoalProgressEvent={handleDailyGoalProgressEvent}
          onDailyGoalJumpToVerseRequest={handleDailyGoalJumpToVerseRequest}
          onDailyGoalPreferredResumeModeChange={(mode: DailyGoalResumeMode) =>
            dailyGoal.setPreferredResumeMode(mode)
          }
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
                  {NEW_VERSE_COUNT_OPTIONS.map((value) => (
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

      <AnimatePresence mode="wait">
        {isTraining && (
          <motion.div
            key="training-overlay"
            className="fixed inset-0 z-[400]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            />

            <motion.div
              className="relative h-full"
              initial={{ opacity: 0, y: 28, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.995 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <TrainingSession
                verses={trainingVerses as Array<UserVerse>}
                allVerses={trainingVerses as Array<UserVerse>}
                startFromVerseId={trainingStartVerseId}
                onComplete={handleCompleteTraining}
                onExit={handleExitTraining}
                onProgressSaved={handleDailyGoalProgressEvent}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster />
    </>
  );
}
