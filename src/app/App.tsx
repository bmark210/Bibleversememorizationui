"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { TrainingSession } from "./components/TrainingSession";
import { VerseList } from "./components/VerseList";
import { Collections } from "./components/Collections";
import { Statistics } from "./components/Statistics";
import { Settings } from "./components/Settings";
import { AddVerseDialog } from "./components/AddVerseDialog";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { UsersService } from "@/api/services/UsersService";
import type { ApiError } from "@/api/core/ApiError";
import type { UserWithVerses } from "@/api/models/UserWithVerses";
import { OpenAPI } from "@/api/core/OpenAPI";
import { request as apiRequest } from "@/api/core/request";
import { mockCollections, mockStats } from "./data/mockData";
import { UserVerse } from "@/generated/prisma/client";
import { UserVersesService } from "@/api/services/UserVersesService";
import { VerseStatus } from "@/generated/prisma";

export type Verse = UserVerse & {
  status: VerseStatus;
  text: string;
  reference: string;
};

type StartTrainingOptions = {
  returnToGallery?: boolean;
  returnToGalleryFilter?: "all" | "learning" | "stopped" | "new";
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

function sortByOldestReviewNeed(a: Verse, b: Verse) {
  const aNext = parseDateValue(a.nextReviewAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bNext = parseDateValue(b.nextReviewAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aNext !== bNext) return aNext - bNext;

  const aLast = parseDateValue(a.lastReviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bLast = parseDateValue(b.lastReviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aLast !== bLast) return aLast - bLast;

  const aUpdated = parseDateValue((a as any).updatedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bUpdated = parseDateValue((b as any).updatedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aUpdated !== bUpdated) return aUpdated - bUpdated;

  return String(a.externalVerseId ?? a.id).localeCompare(String(b.externalVerseId ?? b.id));
}

function sortByCreatedAtAsc(a: Verse, b: Verse) {
  const aCreated = parseDateValue((a as any).createdAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  const bCreated = parseDateValue((b as any).createdAt)?.getTime() ?? Number.POSITIVE_INFINITY;
  if (aCreated !== bCreated) return aCreated - bCreated;
  return String(a.externalVerseId ?? a.id).localeCompare(String(b.externalVerseId ?? b.id));
}

function buildTrainingBatchVerses(
  allVerses: Array<Verse>,
  prefs: TrainingBatchPreferences
): Array<Verse> {
  const now = Date.now();

  const newVerses = allVerses
    .filter((verse) => verse.status === VerseStatus.NEW)
    .sort(sortByCreatedAtAsc)
    .slice(0, prefs.newVersesCount);

  const learningVerses = allVerses.filter((verse) => verse.status === VerseStatus.LEARNING);
  const dueReviews = learningVerses
    .filter((verse) => {
      const next = parseDateValue(verse.nextReviewAt);
      return !next || next.getTime() <= now;
    })
    .sort(sortByOldestReviewNeed);

  const futureReviews = learningVerses
    .filter((verse) => {
      const next = parseDateValue(verse.nextReviewAt);
      return !!next && next.getTime() > now;
    })
    .sort(sortByOldestReviewNeed);

  const reviewVerses = [...dueReviews, ...futureReviews].slice(0, prefs.reviewVersesCount);

  const seen = new Set<string>();
  return [...newVerses, ...reviewVerses].filter((verse) => {
    const key = String(verse.externalVerseId ?? verse.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [isTraining, setIsTraining] = useState(false);
  const [showAddVerseDialog, setShowAddVerseDialog] = useState(false);
  const [user, setUser] = useState<UserWithVerses | null>(null);
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [trainingVerses, setTrainingVerses] = useState<Array<Verse>>([]);
  const [trainingStartVerseId, setTrainingStartVerseId] = useState<string | null>(null);
  const [returnToGalleryContext, setReturnToGalleryContext] = useState<ReturnToGalleryContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [trainingBatchPreferences, setTrainingBatchPreferences] = useState<TrainingBatchPreferences | null>(null);
  const [isTrainingBatchPromptOpen, setIsTrainingBatchPromptOpen] = useState(false);
  const [selectedNewVersesCount, setSelectedNewVersesCount] = useState<number>(
    DEFAULT_TRAINING_BATCH_PREFERENCES.newVersesCount
  );
  const [selectedReviewVersesCount, setSelectedReviewVersesCount] = useState<number>(
    DEFAULT_TRAINING_BATCH_PREFERENCES.reviewVersesCount
  );
  const initUserRef = useRef(false);

  // Инициализация пользователя в окружении Telegram (idempotent).
  useEffect(() => {
    if (initUserRef.current) return;
    initUserRef.current = true;

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

    if (savedPreferences) {
      void loadPlannedVersesForDashboard(telegramId, savedPreferences);
    } else {
      setVerses([]);
    }
    fetchUser();
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setIsTraining(false);
    setTrainingStartVerseId(null);
    setReturnToGalleryContext(null);
  };

  const loadPlannedVersesForDashboard = async (
    telegramIdValue: string,
    prefs: TrainingBatchPreferences
  ) => {
    try {
      const response = await UserVersesService.getApiUsersVerses(telegramIdValue);
      const allVerses = response as Array<Verse>;
      const planned = buildTrainingBatchVerses(allVerses, prefs);
      setVerses(planned);
      return planned;
    } catch (err) {
      console.error("Не удалось получить стихи для дневной подборки:", err);
      setVerses([]);
      throw err;
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
        (verse) => verse.status === VerseStatus.LEARNING
      );
      setTrainingVerses(learningOnly);
      return learningOnly;
    } catch (err) {
      console.error("Не удалось получить стихи LEARNING:", err);
      setTrainingVerses([]);
      throw err;
    }
  };

  const handleStartTraining = async () => {
    const telegramIdValue = telegramId ?? localStorage.getItem("telegramId") ?? "";
    if (!telegramIdValue) {
      toast.error("Не найден telegramId");
      return;
    }

    if (!trainingBatchPreferences) {
      setIsTrainingBatchPromptOpen(true);
      toast.info("Сначала выберите формат тренировки", {
        description: "Сколько новых стихов и сколько повторений загружать за раз.",
      });
      return;
    }

    try {
      const plannedVerses = await loadPlannedVersesForDashboard(telegramIdValue, trainingBatchPreferences);
      if (plannedVerses.length === 0) {
        toast.info("Нет стихов для тренировки", {
          description: "Добавьте новые стихи или дождитесь времени повторения изучаемых.",
        });
        return;
      }
      setTrainingVerses(plannedVerses);
      setTrainingStartVerseId(null);
      setReturnToGalleryContext(null);
      setIsTraining(true);
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
        description: `Новых: ${nextPreferences.newVersesCount}, повторений: ${nextPreferences.reviewVersesCount}.`,
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
  }) => {
    const telegramId = localStorage.getItem("telegramId") ?? "";

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

      toast.success("Стих успешно добавлен", {
        description: `${verse.reference} добавлен в ваш список стихов.`,
      });
    } catch (err) {
      const errorMessage = (err as ApiError)?.body?.error as string;
      console.error("Не удалось добавить стих:", errorMessage);
      toast.error(errorMessage ?? "Не удалось добавить стих");
    }

    if (telegramId && trainingBatchPreferences) {
      void loadPlannedVersesForDashboard(telegramId, trainingBatchPreferences);
    }

    return verse;
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
      const learningVerses = await getLearningVerses(telegramId);
      const verse = learningVerses.find(
        (v) => String(v.id) === String(verseId) || v.externalVerseId === verseId
      );
      if (verse) {
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

  return (
    <>
      <div aria-hidden={isTraining}>
        <Layout currentPage={currentPage} onNavigate={handleNavigate}>
          {currentPage === "dashboard" && (
            <Dashboard
              todayVerses={verses}
              onStartTraining={handleStartTraining}
              onAddVerse={handleAddVerse}
              onViewAll={() => setCurrentPage("verses")}
            />
          )}

          {currentPage === "verses" && (
            <VerseList
              onAddVerse={handleAddVerse}
              onStartTraining={handleStartTrainingFromVerse}
              reopenGalleryVerseId={!isTraining ? returnToGalleryContext?.verseId ?? null : null}
              reopenGalleryStatusFilter={!isTraining ? returnToGalleryContext?.filter ?? null : null}
              onReopenGalleryHandled={() => setReturnToGalleryContext(null)}
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

      {isTrainingBatchPromptOpen && (
        <div className="fixed inset-0 z-[450] bg-background/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <Card className="w-full max-w-lg p-6 sm:p-7 border-border/70 shadow-xl">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Настройка тренировки</h2>
                <p className="text-sm text-muted-foreground">
                  Выберите, сколько новых стихов и сколько повторений загружать за одну тренировку.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Новых стихов за раз</div>
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
                <div className="text-sm font-medium">Повторять старые (выученные) за раз</div>
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
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster />
    </>
  );
}
