"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { mockVerses, mockCollections, mockStats } from "./data/mockData";
import { UserVerse } from "@/generated/prisma/client";
import { UserVersesService } from "@/api/services/UserVersesService";
import { VerseStatus } from "@/generated/prisma";

export type Verse = UserVerse & {
  status: VerseStatus;
  text: string;
  reference: string;
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

  const handleStartTraining = () => {
    if (verses.length === 0) {
      toast.info("На сегодня стихов не запланировано", {
        description: "Отлично! Вы всё успели.",
      });
      return;
    }
    setIsTraining(true);
  };

  const handleCompleteTraining = () => {
    setIsTraining(false);
    setCurrentPage("dashboard");
    toast.success("Тренировка завершена!", {
      description: "Отличная работа! Ваш прогресс сохранён.",
    });
  };

  const handleExitTraining = () => {
    setIsTraining(false);
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

  const handleStartTrainingFromVerse = (verseId: string) => {
    const verse = mockVerses.find((v) => v.id === verseId);
    if (verse) {
      setIsTraining(true);
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

  // Training mode - full screen
  if (isTraining) {
    return (
      <>
        {/* <TrainingSession
          verses={verses.length > 0 ? verses as Array<UserVerse> : mockVerses.slice(0, 3)}
          allVerses={verses as Array<UserVerse>}
          onComplete={handleCompleteTraining}
          onExit={handleExitTraining}
        /> */}
        <Toaster />
      </>
    );
  }

  // Regular app layout
  return (
    <>
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

      <AddVerseDialog
        open={showAddVerseDialog}
        onClose={() => setShowAddVerseDialog(false)}
        onAdd={handleVerseAdded}
      />

      <Toaster />
    </>
  );
}
