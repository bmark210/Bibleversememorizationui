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
import {
  mockVerses,
  mockCollections,
  mockStats,
  getVersesForToday,
} from "./data/mockData";
import { UserVerse } from "@/generated/prisma/client";
import { UserVersesService } from "@/api/services/UserVersesService";

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
  const [isLoading, setIsLoading] = useState(true);
  const initUserRef = useRef(false);

  // Для демонстрации используем моки, пока не настроен маппинг UserVerse -> Verse
  const todayVerses = getVersesForToday();

  // Инициализация пользователя в окружении Telegram (idempotent).
  useEffect(() => {
    if (initUserRef.current) return;
    initUserRef.current = true;

    const telegramId =
      typeof window !== "undefined"
        ? (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() ??
          process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID ??
          localStorage.getItem("telegramId") ??
          undefined
        : undefined;

    console.log("telegramId", telegramId);

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

    fetchUser();
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setIsTraining(false);
  };

  const handleStartTraining = () => {
    if (todayVerses.length === 0) {
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
        lastReviewedAt: new Date().toISOString(),
        nextReviewAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
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
        <TrainingSession
          verses={todayVerses.length > 0 ? todayVerses : mockVerses.slice(0, 3)}
          allVerses={mockVerses}
          onComplete={handleCompleteTraining}
          onExit={handleExitTraining}
        />
        <Toaster />
      </>
    );
  }

  // Regular app layout
  return (
    <>
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        <p className="text-sm text-muted-foreground">
          {"telegramId: " +
            (localStorage.getItem("telegramId") ?? "No telegramId")}
        </p>
        {currentPage === "dashboard" && (
          <Dashboard
            todayVerses={todayVerses}
            onStartTraining={handleStartTraining}
            onAddVerse={handleAddVerse}
            onViewAll={() => setCurrentPage("verses")}
          />
        )}

        {currentPage === "verses" && (
          <VerseList
            verses={mockVerses}
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
