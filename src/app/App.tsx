"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { UsersService } from "@/api/services/UsersService";
import type { ApiError } from "@/api/core/ApiError";
import type { UserWithVerses } from "@/api/models/UserWithVerses";
import { fetchDailyGoalState } from "@/api/services/dailyGoalState";
import {
  postDailyGoalEvent,
  postDailyGoalSkip,
} from "@/api/services/dailyGoalMutations";
import { UserVersesService } from "@/api/services/UserVersesService";
import { TagsService } from "@/api/services/TagsService";
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
import { getLocalDayKey } from "@/app/features/daily-goal/storage";
import type {
  DailyGoalEventAction,
  DailyGoalMutationResponse,
  DailyGoalServerStateV2,
  DailyGoalReadinessResponse,
  DailyGoalResumeMode,
  DailyGoalProgressEvent,
  DailyGoalStateResponse,
  DailyGoalTargetKind,
  DailyGoalVerseListReminder,
} from "@/app/features/daily-goal/types";

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
// externalVerseId is the primary identifier (bolls.life format "book-chapter-verse").
export type Verse = {
  id?: string | number;
  externalVerseId: string;
  status: DisplayVerseStatus;
  masteryLevel: number;
  repetitions: number;
  lastTrainingModeId?: number | null;
  lastReviewedAt: string | null;
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

type TrainingBatchPreferences = {
  newVersesCount: number;
  reviewVersesCount: number;
};

type RefreshDailyGoalStateOptions = {
  force?: boolean;
};

type AppProps = {
  onInitialContentReady?: () => void;
};

const TRAINING_BATCH_PREFERENCES_KEY = "bible-memory.training-batch-preferences.v1";
const MY_VERSE_COUNT_OPTIONS = [1, 2, 3, 4] as const;
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

export default function App({ onInitialContentReady }: AppProps) {
  const shouldReduceMotion = useReducedMotion();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [showAddVerseDialog, setShowAddVerseDialog] = useState(false);
  const [verseListExternalSyncVersion, setVerseListExternalSyncVersion] = useState(0);
  const [user, setUser] = useState<UserWithVerses | null>(null);
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [dailyGoalVersePool, setDailyGoalVersePool] = useState<Array<Verse>>([]);
  const [dashboardGalleryVerses, setDashboardGalleryVerses] = useState<Array<Verse>>([]);
  const [dashboardGalleryIndex, setDashboardGalleryIndex] = useState<number | null>(null);
  const [dashboardGalleryLaunchMode, setDashboardGalleryLaunchMode] = useState<"preview" | "training">("preview");
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [trainingBatchPreferences, setTrainingBatchPreferences] = useState<TrainingBatchPreferences | null>(null);
  const [dailyGoalServerState, setDailyGoalServerState] = useState<DailyGoalServerStateV2 | null>(null);
  const [dailyGoalStateRev, setDailyGoalStateRev] = useState<number | null>(null);
  const [dailyGoalReadiness, setDailyGoalReadiness] = useState<DailyGoalReadinessResponse | null>(null);
  const [isDailyGoalReadinessLoading, setIsDailyGoalReadinessLoading] = useState(false);
  const [isTrainingBatchPromptOpen, setIsTrainingBatchPromptOpen] = useState(false);
  const [selectedNewVersesCount, setSelectedNewVersesCount] = useState<number>(
    DEFAULT_TRAINING_BATCH_PREFERENCES.newVersesCount
  );
  const [selectedReviewVersesCount, setSelectedReviewVersesCount] = useState<number>(
    DEFAULT_TRAINING_BATCH_PREFERENCES.reviewVersesCount
  );
  const hasNotifiedInitialContentReadyRef = useRef(false);
  const dailyGoalStateRequestIdRef = useRef(0);
  const dailyGoalStateInFlightRef = useRef<{
    key: string;
    requestId: number;
    promise: Promise<DailyGoalStateResponse | null>;
  } | null>(null);
  const dailyGoalStateLastSuccessKeyRef = useRef<string | null>(null);
  const dailyGoal = useDailyGoalController({
    telegramId,
    trainingBatchPreferences,
    todayVerses: dailyGoalVersePool,
    hasAnyUserVerses: user ? (user.verses?.length ?? 0) > 0 : undefined,
    dailyGoalServerState,
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
    setDashboardGalleryIndex(null);
    setDashboardGalleryVerses([]);
    setDashboardGalleryLaunchMode("preview");
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

  const applyDailyGoalSnapshot = (
    snapshot: {
      state: DailyGoalServerStateV2;
      stateRev: number;
      readiness: DailyGoalReadinessResponse;
    } | null
  ) => {
    if (!snapshot) {
      setDailyGoalServerState(null);
      setDailyGoalStateRev(null);
      setDailyGoalReadiness(null);
      return;
    }
    setDailyGoalServerState(snapshot.state);
    setDailyGoalStateRev(snapshot.stateRev);
    setDailyGoalReadiness(snapshot.readiness);
  };

  const extractConflictMutation = (error: unknown): DailyGoalMutationResponse | null => {
    const apiError = error as ApiError | undefined;
    if (!apiError || apiError.status !== 409) return null;
    const body = apiError.body as unknown;
    if (!body || typeof body !== "object") return null;
    if (!("stateRev" in (body as Record<string, unknown>))) return null;
    return body as DailyGoalMutationResponse;
  };

  const refreshDailyGoalState = async (
    telegramIdValue: string,
    prefs: TrainingBatchPreferences,
    options?: RefreshDailyGoalStateOptions
  ) => {
    const todayKey = getLocalDayKey();
    const timezone = getClientTimezone();
    const requestKey = `${telegramIdValue}:${prefs.newVersesCount}:${prefs.reviewVersesCount}:${todayKey}:${timezone}`;
    const force = options?.force === true;

    if (!force) {
      const inFlight = dailyGoalStateInFlightRef.current;
      if (inFlight?.key === requestKey) {
        return inFlight.promise;
      }
      if (
        dailyGoalStateLastSuccessKeyRef.current === requestKey &&
        dailyGoalReadiness !== null &&
        dailyGoalServerState !== null &&
        dailyGoalStateRev !== null
      ) {
        return {
          state: dailyGoalServerState,
          stateRev: dailyGoalStateRev,
          readiness: dailyGoalReadiness,
          dayKey: todayKey,
          timezone,
        } as DailyGoalStateResponse;
      }
    }

    const requestId = ++dailyGoalStateRequestIdRef.current;
    setIsDailyGoalReadinessLoading(true);

    const requestPromise = (async () => {
      try {
        const snapshot = await fetchDailyGoalState({
          telegramId: telegramIdValue,
          newVersesCount: prefs.newVersesCount,
          reviewVersesCount: prefs.reviewVersesCount,
          dayKey: todayKey,
          timezone,
        });
        if (dailyGoalStateRequestIdRef.current !== requestId) return null;
        dailyGoalStateLastSuccessKeyRef.current = requestKey;
        applyDailyGoalSnapshot(snapshot);
        return snapshot;
      } catch (error) {
        if (dailyGoalStateRequestIdRef.current === requestId) {
          applyDailyGoalSnapshot(null);
        }
        console.error("Не удалось получить состояние ежедневной цели:", error);
        return null;
      } finally {
        if (dailyGoalStateRequestIdRef.current === requestId) {
          setIsDailyGoalReadinessLoading(false);
        }
        if (
          dailyGoalStateInFlightRef.current?.key === requestKey &&
          dailyGoalStateInFlightRef.current?.requestId === requestId
        ) {
          dailyGoalStateInFlightRef.current = null;
        }
      }
    })();

    dailyGoalStateInFlightRef.current = {
      key: requestKey,
      requestId,
      promise: requestPromise,
    };

    return requestPromise;
  };

  const ensureDailyGoalStateRev = async (
    telegramIdValue: string,
    prefs: TrainingBatchPreferences
  ) => {
    if (dailyGoalStateRev != null) return dailyGoalStateRev;
    const snapshot = await refreshDailyGoalState(telegramIdValue, prefs, { force: true });
    return snapshot?.stateRev ?? null;
  };

  const mutateDailyGoalEventWithRetry = async (params: {
    telegramIdValue: string;
    prefs: TrainingBatchPreferences;
    action: DailyGoalEventAction;
  }): Promise<DailyGoalMutationResponse | null> => {
    const timezone = getClientTimezone();
    const dayKey = getLocalDayKey();
    const initialRev = await ensureDailyGoalStateRev(params.telegramIdValue, params.prefs);
    if (initialRev == null) return null;

    const send = async (
      expectedStateRev: number,
      attempt: number
    ): Promise<DailyGoalMutationResponse | null> => {
      try {
        const response = await postDailyGoalEvent({
          telegramId: params.telegramIdValue,
          body: {
            expectedStateRev,
            newVersesCount: params.prefs.newVersesCount,
            reviewVersesCount: params.prefs.reviewVersesCount,
            dayKey,
            timezone,
            action: params.action,
          },
        });
        applyDailyGoalSnapshot(response);
        return response;
      } catch (error) {
        const conflict = extractConflictMutation(error);
        if (!conflict) throw error;
        applyDailyGoalSnapshot(conflict);
        if (attempt >= 1) return conflict;
        return send(conflict.stateRev, attempt + 1);
      }
    };

    return send(initialRev, 0);
  };

  const mutateDailyGoalSkipWithRetry = async (params: {
    telegramIdValue: string;
    prefs: TrainingBatchPreferences;
    externalVerseId: string;
    targetKind: DailyGoalTargetKind;
  }): Promise<DailyGoalMutationResponse | null> => {
    const timezone = getClientTimezone();
    const dayKey = getLocalDayKey();
    const initialRev = await ensureDailyGoalStateRev(params.telegramIdValue, params.prefs);
    if (initialRev == null) return null;

    const send = async (
      expectedStateRev: number,
      attempt: number
    ): Promise<DailyGoalMutationResponse | null> => {
      try {
        const response = await postDailyGoalSkip({
          telegramId: params.telegramIdValue,
          body: {
            expectedStateRev,
            newVersesCount: params.prefs.newVersesCount,
            reviewVersesCount: params.prefs.reviewVersesCount,
            dayKey,
            timezone,
            externalVerseId: params.externalVerseId,
            targetKind: params.targetKind,
          },
        });
        applyDailyGoalSnapshot(response);
        return response;
      } catch (error) {
        const conflict = extractConflictMutation(error);
        if (!conflict) throw error;
        applyDailyGoalSnapshot(conflict);
        if (attempt >= 1) return conflict;
        return send(conflict.stateRev, attempt + 1);
      }
    };

    return send(initialRev, 0);
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
      void refreshDailyGoalState(telegramIdValue, trainingBatchPreferences, {
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
      void refreshDailyGoalState(telegramIdValue, trainingBatchPreferences, {
        force: true,
      });
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
    await refreshDailyGoalState(telegramIdValue, trainingBatchPreferences, {
      force: true,
    });

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
      dailyGoal.markDailyGoalStarted();
      void mutateDailyGoalEventWithRetry({
        telegramIdValue,
        prefs: trainingBatchPreferences,
        action: { kind: "mark_started" },
      }).catch((error) => {
        console.error("Не удалось отметить старт daily goal:", error);
      });
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

  const handleAddVerse = () => {
    setShowAddVerseDialog(true);
  };

  const handleOpenTrainingPlanSettings = () => {
    setIsTrainingBatchPromptOpen(true);
  };

  const handleDailyGoalProgressEvent = (event: DailyGoalProgressEvent) => {
    if (event.source === "verse-gallery") {
      dailyGoal.markOnboardingSeen("galleryIntro");
      dailyGoal.markOnboardingSeen("trainingIntro");
    }
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (!telegramIdValue || !trainingBatchPreferences) return;
    void (async () => {
      try {
        const response = await mutateDailyGoalEventWithRetry({
          telegramIdValue,
          prefs: trainingBatchPreferences,
          action: {
            kind: "progress_event",
            event,
          },
        });
        if (response?.mutation.completedNow && response.mutation.completionCounterIncremented) {
          toast.success("Ежедневная цель выполнена", {
            description: "Прогресс сохранён. Счётчик выполненных целей обновлён.",
          });
        }
      } catch (error) {
        console.error("Не удалось отправить progress event daily goal:", error);
        void refreshDailyGoalState(telegramIdValue, trainingBatchPreferences, {
          force: true,
        });
      }
    })();
  };

  const handleDailyGoalJumpToVerseRequest = (externalVerseId: string) => {
    setCurrentPage("dashboard");
    setDashboardGalleryIndex(null);
    setDashboardGalleryVerses([]);
    setDashboardGalleryLaunchMode("preview");
    void handleStartTraining({
      launchMode: "training",
      preferredVerseId: externalVerseId,
    });
  };

  const handleVerseListMutationCommitted = () => {
    if (!telegramId || !trainingBatchPreferences) return;
    void loadPlannedVersesForDashboard(telegramId, trainingBatchPreferences);
    void refreshDailyGoalState(telegramId, trainingBatchPreferences, {
      force: true,
    });
  };

  const handleDailyGoalPreferredResumeModeChange = (mode: DailyGoalResumeMode) => {
    dailyGoal.setPreferredResumeMode(mode);
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (!telegramIdValue || !trainingBatchPreferences) return;
    void mutateDailyGoalEventWithRetry({
      telegramIdValue,
      prefs: trainingBatchPreferences,
      action: {
        kind: "set_preferred_resume_mode",
        mode,
      },
    }).catch((error) => {
      console.error("Не удалось сохранить preferredResumeMode daily goal:", error);
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
      await refreshDailyGoalState(telegramIdValue, nextPreferences, { force: true });
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
    tags: string[]; // tag slugs
  }): Promise<void> => {
    const telegramId = localStorage.getItem("telegramId") ?? "";

    try {
      await UserVersesService.postApiUsersVerses(telegramId, {
        externalVerseId: verse.externalVerseId,
      });

      // Attach selected tags (non-blocking per tag — best-effort)
      if (verse.tags.length > 0) {
        await Promise.allSettled(
          verse.tags.map((slug) =>
            TagsService.postApiVersesTags(verse.externalVerseId, { tagSlug: slug })
          )
        );
      }

      setVerseListExternalSyncVersion((prev) => prev + 1);

      toast.success("Стих добавлен в каталог", {
        description: `${verse.reference} добавлен в каталог.`,
      });
    } catch (err) {
      const errorMessage = (err as ApiError)?.body?.error as string;
      console.error("Не удалось добавить стих:", errorMessage);
      toast.error(errorMessage ?? "Не удалось добавить стих");
      throw err;
    }
  };

  const verseListDailyGoalReminder: DailyGoalVerseListReminder | undefined =
    dailyGoal.reminder && dailyGoal.reminder.visible
      ? {
          visible: true,
          phase: dailyGoal.reminder.phase,
          progressLabel: dailyGoal.reminder.progressLabel,
          onResume: () => {
            dailyGoal.markOnboardingSeen("verseListReminderIntro");
            void handleStartTraining({ launchMode: "training" });
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
      setDailyGoalServerState(null);
      setDailyGoalStateRev(null);
      setDailyGoalReadiness(null);
      setIsDailyGoalReadinessLoading(false);
      return;
    }
    void refreshDailyGoalState(telegramId, trainingBatchPreferences);
  }, [telegramId, trainingBatchPreferences]);

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
                onStartTraining={handleStartTraining}
                onAddVerse={handleAddVerse}
                onViewAll={() => setCurrentPage("verses")}
                dailyGoal={dailyGoal.dashboardCard}
                onStartDailyGoal={() => {
                  dailyGoal.markOnboardingSeen("dashboardIntro");
                  void handleStartTraining({ launchMode: "training" });
                }}
                onResumeDailyGoal={() => {
                  dailyGoal.markOnboardingSeen("dashboardIntro");
                  void handleStartTraining({ launchMode: "training" });
                }}
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
              dailyGoalReminder={verseListDailyGoalReminder}
              dailyGoalGalleryContext={dailyGoal.galleryContext}
              onBeforeStartTrainingFromGalleryVerse={(verse) =>
                dailyGoal.decideStartFromVerse(String(verse.externalVerseId ?? verse.id))
              }
              onDailyGoalProgressEvent={handleDailyGoalProgressEvent}
              onDailyGoalJumpToVerseRequest={handleDailyGoalJumpToVerseRequest}
              onDailyGoalPreferredResumeModeChange={handleDailyGoalPreferredResumeModeChange}
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

          {currentPage === "profile" && <Profile />}
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
          dailyGoalContext={dailyGoal.galleryContext ?? undefined}
          onBeforeStartTrainingFromGalleryVerse={(verse) =>
            dailyGoal.decideStartFromVerse(String(verse.externalVerseId ?? verse.id))
          }
          onDailyGoalProgressEvent={handleDailyGoalProgressEvent}
          onDailyGoalJumpToVerseRequest={handleDailyGoalJumpToVerseRequest}
          onDailyGoalPreferredResumeModeChange={handleDailyGoalPreferredResumeModeChange}
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
