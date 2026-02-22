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
    localStorage.setItem("telegramId", telegramId);

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

    getVerces(telegramId);
    fetchUser();
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setIsTraining(false);
    setTrainingStartVerseId(null);
    setReturnToGalleryContext(null);
  };

  const getVerces = async (telegramId: string) => {
    try {
      const verses = await UserVersesService.getApiUsersVerses(telegramId);
      setVerses(verses as Array<Verse>);
    } catch (err) {
      console.error("Не удалось получить стихи:", err);
      setVerses([] as Array<Verse>);
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
    const telegramId = localStorage.getItem("telegramId") ?? "";
    if (!telegramId) {
      toast.error("Не найден telegramId");
      return;
    }

    try {
      const learningVerses = await getLearningVerses(telegramId);
      if (learningVerses.length === 0) {
        toast.info("Нет стихов в изучении", {
          description: "В тренировку попадают только стихи со статусом LEARNING.",
        });
        return;
      }
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
